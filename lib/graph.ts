import type { Entity, Relationship } from "@/lib/types";

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  entity: Entity;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship: Relationship;
}

export interface GraphFilters {
  search: string;
  type: "all" | Entity["type"];
  minConfidence: number;
  strength: "all" | Relationship["strength"];
}

export type GraphLayoutMode = "corkboard" | "circular";

/**
 * Filters graph entities/relationships based on toolbar controls.
 *
 * Why this is separate:
 * - Keeps components focused on rendering.
 * - Makes test coverage straightforward.
 */
export function applyGraphFilters(
  entities: Entity[],
  relationships: Relationship[],
  filters: GraphFilters,
): { entities: Entity[]; relationships: Relationship[] } {
  const searchText = filters.search.trim().toLowerCase();

  const filteredEntities = entities.filter((entity) => {
    const typePass = filters.type === "all" || entity.type === filters.type;
    const confidencePass = entity.confidence >= filters.minConfidence;
    const searchPass =
      searchText.length === 0 ||
      entity.displayName.toLowerCase().includes(searchText) ||
      entity.aliases.some((a) => a.toLowerCase().includes(searchText));

    return typePass && confidencePass && searchPass;
  });

  const allowedEntityIds = new Set(filteredEntities.map((e) => e.id));
  const filteredRelationships = relationships.filter((rel) => {
    const strengthPass = filters.strength === "all" || rel.strength === filters.strength;
    return (
      strengthPass &&
      rel.confidence >= filters.minConfidence &&
      allowedEntityIds.has(rel.fromEntityId) &&
      allowedEntityIds.has(rel.toEntityId)
    );
  });

  return {
    entities: filteredEntities,
    relationships: filteredRelationships,
  };
}

/**
 * Circular layout for deterministic positions.
 */
export function createCircularLayout(entities: Entity[], width = 860, height = 520): GraphNode[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  return entities.map((entity, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(entities.length, 1);
    return {
      id: entity.id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      entity,
    };
  });
}

function hashToUnitInterval(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash % 1000) / 1000;
}

/**
 * Corkboard layout places nodes in semantic lanes (people, places, comms, orgs).
 *
 * Why this layout:
 * - Feels closer to investigative "board and strings" mental model.
 * - Reduces circular label collisions and creates more readable clusters.
 */
export function createCorkboardLayout(
  entities: Entity[],
  relationships: Relationship[],
  width = 860,
  height = 520,
): GraphNode[] {
  const degreeByEntity = new Map<string, number>();
  for (const rel of relationships) {
    degreeByEntity.set(rel.fromEntityId, (degreeByEntity.get(rel.fromEntityId) ?? 0) + 1);
    degreeByEntity.set(rel.toEntityId, (degreeByEntity.get(rel.toEntityId) ?? 0) + 1);
  }

  const buckets: Record<"left" | "top" | "right" | "bottom" | "center", Entity[]> = {
    left: [],
    top: [],
    right: [],
    bottom: [],
    center: [],
  };

  for (const entity of entities) {
    if (
      entity.type === "person" ||
      entity.type === "suspect" ||
      entity.type === "victim" ||
      entity.type === "associate" ||
      entity.type === "unknown_person"
    ) {
      buckets.left.push(entity);
    } else if (entity.type === "location" || entity.type === "document") {
      buckets.top.push(entity);
    } else if (entity.type === "organization") {
      buckets.right.push(entity);
    } else if (entity.type === "phone" || entity.type === "email" || entity.type === "vehicle" || entity.type === "license_plate" || entity.type === "account") {
      buckets.bottom.push(entity);
    } else {
      buckets.center.push(entity);
    }
  }

  const sortByDegree = (a: Entity, b: Entity) => {
    const degreeDiff = (degreeByEntity.get(b.id) ?? 0) - (degreeByEntity.get(a.id) ?? 0);
    return degreeDiff !== 0 ? degreeDiff : a.displayName.localeCompare(b.displayName);
  };

  (Object.keys(buckets) as Array<keyof typeof buckets>).forEach((key) => {
    buckets[key].sort(sortByDegree);
  });

  const nodes: GraphNode[] = [];

  function placeLane(
    lane: Entity[],
    bounds: { x1: number; x2: number; y1: number; y2: number },
    orientation: "horizontal" | "vertical",
  ) {
    lane.forEach((entity, index) => {
      const progress = (index + 1) / (lane.length + 1);
      const jitterX = (hashToUnitInterval(`${entity.id}-x`) - 0.5) * 26;
      const jitterY = (hashToUnitInterval(`${entity.id}-y`) - 0.5) * 26;
      const x =
        orientation === "horizontal"
          ? bounds.x1 + (bounds.x2 - bounds.x1) * progress + jitterX
          : (bounds.x1 + bounds.x2) / 2 + jitterX;
      const y =
        orientation === "vertical"
          ? bounds.y1 + (bounds.y2 - bounds.y1) * progress + jitterY
          : (bounds.y1 + bounds.y2) / 2 + jitterY;

      nodes.push({
        id: entity.id,
        x: Math.max(40, Math.min(width - 40, x)),
        y: Math.max(40, Math.min(height - 40, y)),
        entity,
      });
    });
  }

  placeLane(buckets.left, { x1: 95, x2: 255, y1: 70, y2: height - 70 }, "vertical");
  placeLane(buckets.top, { x1: 275, x2: width - 275, y1: 70, y2: 165 }, "horizontal");
  placeLane(buckets.right, { x1: width - 255, x2: width - 95, y1: 70, y2: height - 70 }, "vertical");
  placeLane(buckets.bottom, { x1: 275, x2: width - 275, y1: height - 165, y2: height - 70 }, "horizontal");
  placeLane(
    buckets.center,
    { x1: width / 2 - 90, x2: width / 2 + 90, y1: height / 2 - 70, y2: height / 2 + 70 },
    "vertical",
  );

  return nodes;
}

export function createEdges(relationships: Relationship[]): GraphEdge[] {
  return relationships.map((r) => ({
    id: r.id,
    from: r.fromEntityId,
    to: r.toEntityId,
    relationship: r,
  }));
}
