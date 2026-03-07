"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Rectangle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "@pixi/filter-glow";
import type { Entity, Relationship, UserRole } from "@/lib/types";
import type { GraphEdge, GraphNode } from "@/lib/graph";
import { maskEntityName } from "@/lib/auth";
import { formatTokenLabel } from "@/lib/format";

const WORLD_WIDTH = 860;
const WORLD_HEIGHT = 520;

interface GraphGeometry {
  id: string;
  from: GraphNode;
  to: GraphNode;
  controlX: number;
  controlY: number;
}

interface HudLinkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  role: UserRole;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  labelMode: "focus" | "all";
  boardLocked: boolean;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onSelectNode: (entity: Entity) => void;
  onNodeContextMenu: (
    entity: Entity,
    position: { x: number; y: number },
  ) => void;
  onSelectEdge: (relationship: Relationship) => void;
}

function colorForEdge(edge: GraphEdge, isSelected: boolean): number {
  if (isSelected) return 0x22d3ee;
  if (edge.relationship.strength === "high") return 0x38bdf8;
  if (edge.relationship.strength === "medium") return 0x64748b;
  return 0x334155;
}

function drawDashedCircle(graphics: Graphics, radius: number, color: number) {
  const steps = 24;
  for (let index = 0; index < steps; index += 1) {
    if (index % 2 !== 0) continue;
    const start = (index / steps) * Math.PI * 2;
    const end = ((index + 1) / steps) * Math.PI * 2;
    const x1 = Math.cos(start) * radius;
    const y1 = Math.sin(start) * radius;
    const x2 = Math.cos(end) * radius;
    const y2 = Math.sin(end) * radius;
    graphics
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .stroke({ width: 1.5, color, alpha: 0.85 });
  }
}

function accentForEntity(entity: Entity): number {
  if (entity.protectedFlag) return 0xfb4478;
  if (entity.type === "victim") return 0xf59e0b;
  if (entity.type === "suspect") return 0xf97316;
  if (entity.type === "phone" || entity.type === "email" || entity.type === "account") return 0x38bdf8;
  if (entity.type === "vehicle" || entity.type === "license_plate") return 0x22d3ee;
  if (entity.type === "organization") return 0x60a5fa;
  if (entity.type === "location") return 0x2dd4bf;
  return 0x67e8f9;
}

function drawNodeGlyph(glyph: Graphics, type: Entity["type"], accent: number) {
  glyph.setStrokeStyle({ width: 1.45, color: 0xf8fafc, alpha: 0.96, cap: "round", join: "round" });
  glyph.setFillStyle({ color: accent, alpha: 0.85 });

  if (type === "person" || type === "suspect" || type === "victim" || type === "associate") {
    glyph.circle(0, -4.8, 3.2).fill().stroke();
    glyph.moveTo(-6, 6).bezierCurveTo(-5, 1.4, 5, 1.4, 6, 6).stroke();
    if (type === "suspect") {
      glyph.moveTo(0, -10).lineTo(2.8, -6).lineTo(-2.8, -6).closePath().fill({ color: 0xf97316, alpha: 0.95 });
    }
    if (type === "victim") {
      glyph.roundRect(-4.2, 2.5, 8.4, 5.5, 2).fill({ color: 0xf59e0b, alpha: 0.78 }).stroke();
    }
    if (type === "associate") {
      glyph.moveTo(6.8, -2).lineTo(9.5, -2).stroke();
      glyph.moveTo(8.1, -3.3).lineTo(8.1, -0.7).stroke();
    }
    return;
  }
  if (type === "unknown_person") {
    glyph.moveTo(-3.5, -5).bezierCurveTo(-3.5, -8.4, 3.5, -8.4, 3.5, -5.2).stroke();
    glyph.moveTo(0, -2.5).lineTo(0, 1.8).stroke();
    glyph.circle(0, 6.2, 1.1).fill({ color: accent, alpha: 1 });
    glyph.moveTo(-6.8, -9).lineTo(-4.5, -9).stroke();
    glyph.moveTo(4.5, -9).lineTo(6.8, -9).stroke();
    return;
  }
  if (type === "phone") {
    glyph.roundRect(-5.2, -8.4, 10.4, 16.8, 2.2).stroke();
    glyph.roundRect(-3.4, -6.1, 6.8, 9.5, 1.2).fill({ color: 0x1f2937, alpha: 0.8 }).stroke();
    glyph.circle(0, 5.8, 0.9).fill({ color: accent, alpha: 1 });
    return;
  }
  if (type === "email") {
    glyph.roundRect(-7, -5.6, 14, 11.2, 1.8).fill({ color: 0x0f172a, alpha: 0.72 }).stroke();
    glyph.moveTo(-7, -5.6).lineTo(0, 0.6).lineTo(7, -5.6).stroke();
    glyph.circle(5.8, -4.8, 1.2).fill({ color: 0xf97316, alpha: 1 });
    return;
  }
  if (type === "vehicle") {
    glyph.roundRect(-8, -2.3, 16, 6.8, 1.6).fill({ color: 0x0f172a, alpha: 0.8 }).stroke();
    glyph.moveTo(-5.8, -2.2).lineTo(-3.5, -5).lineTo(3.5, -5).lineTo(5.8, -2.2).stroke();
    glyph.circle(-4.8, 5.2, 1.35).fill({ color: accent, alpha: 1 }).stroke();
    glyph.circle(4.8, 5.2, 1.35).fill({ color: accent, alpha: 1 }).stroke();
    return;
  }
  if (type === "license_plate") {
    glyph.roundRect(-7.2, -4.6, 14.4, 9.2, 1.8).fill({ color: 0x0f172a, alpha: 0.75 }).stroke();
    glyph.moveTo(-4.5, 0).lineTo(4.5, 0).stroke();
    glyph.circle(-4.8, -2, 0.7).fill({ color: accent, alpha: 1 });
    glyph.circle(4.8, -2, 0.7).fill({ color: accent, alpha: 1 });
    return;
  }
  if (type === "location") {
    glyph
      .moveTo(0, 8)
      .bezierCurveTo(-6.3, 1.4, -7.2, -1.8, -7.2, -4.4)
      .bezierCurveTo(-7.2, -8.2, -3.9, -11, 0, -11)
      .bezierCurveTo(3.9, -11, 7.2, -8.2, 7.2, -4.4)
      .bezierCurveTo(7.2, -1.8, 6.3, 1.4, 0, 8)
      .fill({ color: 0x10293a, alpha: 0.75 })
      .stroke();
    glyph.circle(0, -4.7, 2.2).fill({ color: accent, alpha: 0.95 }).stroke();
    return;
  }
  if (type === "organization") {
    glyph.rect(-6.6, -8.5, 13.2, 17).fill({ color: 0x101f3a, alpha: 0.72 }).stroke();
    glyph.moveTo(-3.3, -8.5).lineTo(-3.3, 8.5).stroke();
    glyph.moveTo(0, -8.5).lineTo(0, 8.5).stroke();
    glyph.moveTo(3.3, -8.5).lineTo(3.3, 8.5).stroke();
    glyph.moveTo(-6.6, -2.8).lineTo(6.6, -2.8).stroke();
    glyph.moveTo(-6.6, 2.8).lineTo(6.6, 2.8).stroke();
    return;
  }
  if (type === "account") {
    glyph.roundRect(-7.2, -3.2, 14.4, 9.8, 2.1).fill({ color: 0x101f3a, alpha: 0.75 }).stroke();
    glyph.roundRect(-2.2, -1.1, 3.8, 2.7, 0.7).fill({ color: accent, alpha: 0.95 }).stroke();
    glyph.moveTo(-1.8, -3.2).lineTo(-1.8, -5.8).lineTo(4.8, -5.8).lineTo(4.8, -3.2).stroke();
    return;
  }
  if (type === "document") {
    glyph.moveTo(-6.5, -8.5).lineTo(2.5, -8.5).lineTo(6.5, -4.5).lineTo(6.5, 8.5).lineTo(-6.5, 8.5).closePath().fill({ color: 0x0f172a, alpha: 0.78 }).stroke();
    glyph.moveTo(2.5, -8.5).lineTo(2.5, -4.5).lineTo(6.5, -4.5).stroke();
    glyph.moveTo(-3.9, -1.6).lineTo(3.9, -1.6).stroke();
    glyph.moveTo(-3.9, 1.6).lineTo(3.9, 1.6).stroke();
    glyph.moveTo(-3.9, 4.8).lineTo(2.8, 4.8).stroke();
    return;
  }
  glyph.moveTo(0, -8).lineTo(8, 0).lineTo(0, 8).lineTo(-8, 0).closePath().fill({ color: accent, alpha: 0.78 }).stroke();
}

function quadraticPoint(
  fromX: number,
  fromY: number,
  controlX: number,
  controlY: number,
  toX: number,
  toY: number,
  t: number,
) {
  const oneMinus = 1 - t;
  const x =
    oneMinus * oneMinus * fromX +
    2 * oneMinus * t * controlX +
    t * t * toX;
  const y =
    oneMinus * oneMinus * fromY +
    2 * oneMinus * t * controlY +
    t * t * toY;
  return { x, y };
}

export function HudLinkGraph({
  nodes,
  edges,
  role,
  selectedNodeId,
  selectedEdgeId,
  labelMode,
  boardLocked,
  onMoveNode,
  onSelectNode,
  onNodeContextMenu,
  onSelectEdge,
}: HudLinkGraphProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const edgeLayerRef = useRef<Container | null>(null);
  const nodeLayerRef = useRef<Container | null>(null);
  const pulseLayerRef = useRef<Container | null>(null);
  const geometryRef = useRef<GraphGeometry[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let mounted = true;
    const hostElement = hostRef.current;
    if (!hostElement) return;
    const host = hostElement as HTMLDivElement;

    let app: Application | null = null;
    let viewport: Viewport | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function initialize() {
      app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
      });
      if (!mounted || !app) return;

      host.appendChild(app.canvas as HTMLCanvasElement);

      viewport = new Viewport({
        screenWidth: host.clientWidth,
        screenHeight: host.clientHeight,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        events: app.renderer.events,
      });
      app.renderer.resize(host.clientWidth, host.clientHeight);
      viewport.drag().wheel().pinch().decelerate();
      viewport.clampZoom({ minScale: 0.5, maxScale: 2.6 });
      viewport.fitWorld(true);
      viewport.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
      viewport.eventMode = "static";
      viewport.hitArea = new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      const edgeLayer = new Container();
      const pulseLayer = new Container();
      const nodeLayer = new Container();
      viewport.addChild(edgeLayer);
      viewport.addChild(pulseLayer);
      viewport.addChild(nodeLayer);
      app.stage.addChild(viewport);
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      appRef.current = app;
      viewportRef.current = viewport;
      edgeLayerRef.current = edgeLayer;
      nodeLayerRef.current = nodeLayer;
      pulseLayerRef.current = pulseLayer;

      const onTick = () => {
        const current = {
          x: viewport!.x,
          y: viewport!.y,
          scale: viewport!.scale.x,
        };
        setViewTransform((previous) => {
          if (
            Math.abs(previous.x - current.x) < 0.1 &&
            Math.abs(previous.y - current.y) < 0.1 &&
            Math.abs(previous.scale - current.scale) < 0.001
          ) {
            return previous;
          }
          return current;
        });
      };
      app.ticker.add(onTick);

      resizeObserver = new ResizeObserver(() => {
        if (!viewport || !app) return;
        app.renderer.resize(host.clientWidth, host.clientHeight);
        viewport.resize(host.clientWidth, host.clientHeight, WORLD_WIDTH, WORLD_HEIGHT);
      });
      resizeObserver.observe(host);
    }

    initialize();

    return () => {
      mounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (app) {
        app.destroy();
      }
      appRef.current = null;
      viewportRef.current = null;
      edgeLayerRef.current = null;
      nodeLayerRef.current = null;
      pulseLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const edgeLayer = edgeLayerRef.current;
    const nodeLayer = nodeLayerRef.current;
    const pulseLayer = pulseLayerRef.current;
    const viewport = viewportRef.current;
    const app = appRef.current;
    if (!edgeLayer || !nodeLayer || !pulseLayer || !viewport || !app) return;
    const viewportPlugins = (viewport as unknown as { plugins?: { pause?: (name: string) => void; resume?: (name: string) => void } }).plugins;
    if (boardLocked) {
      viewportPlugins?.resume?.("drag");
    } else {
      viewportPlugins?.pause?.("drag");
    }

    edgeLayer.removeChildren();
    nodeLayer.removeChildren();
    pulseLayer.removeChildren();

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const geometries: GraphGeometry[] = [];

    for (const edge of edges) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) continue;

      const isSelected = selectedEdgeId === edge.id;
      const isHovered = hoveredEdgeId === edge.id;
      const strokeWidth =
        edge.relationship.strength === "high"
          ? 3.2
          : edge.relationship.strength === "medium"
            ? 2.4
            : 1.8;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const perpendicularX = -dy / distance;
      const perpendicularY = dx / distance;
      const curvature = (Number(edge.id.replace(/\D/g, "")) % 5) - 2;
      const controlX = midX + perpendicularX * curvature * 10;
      const controlY = midY + perpendicularY * curvature * 10;
      geometries.push({
        id: edge.id,
        from,
        to,
        controlX,
        controlY,
      });

      const path = new Graphics()
        .moveTo(from.x, from.y)
        .quadraticCurveTo(controlX, controlY, to.x, to.y)
        .stroke({
          width: strokeWidth,
          color: colorForEdge(edge, isSelected),
          alpha: isSelected ? 1 : isHovered ? 0.95 : 0.82,
          cap: "round",
          join: "round",
        });
      if (isSelected || isHovered) {
        path.filters = [
          new GlowFilter({
            distance: isSelected ? 20 : 14,
            outerStrength: isSelected ? 1.3 : 0.9,
            color: isSelected ? 0x22d3ee : 0x38bdf8,
          }) as any,
        ];
      }
      edgeLayer.addChild(path);

      const hitPath = new Graphics()
        .moveTo(from.x, from.y)
        .quadraticCurveTo(controlX, controlY, to.x, to.y)
        .stroke({ width: 13, color: 0xffffff, alpha: 0.001 });
      hitPath.eventMode = "static";
      hitPath.cursor = "pointer";
      hitPath.on("pointertap", () => onSelectEdge(edge.relationship));
      hitPath.on("pointerover", () => setHoveredEdgeId(edge.id));
      hitPath.on("pointerout", () => setHoveredEdgeId((previous) => (previous === edge.id ? null : previous)));
      edgeLayer.addChild(hitPath);
    }

    geometryRef.current = geometries;

    for (const node of nodes) {
      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNodeId === node.id;
      const radius = isSelected ? 20 : 16;
      const color = accentForEntity(node.entity);

      const container = new Container();
      container.position.set(node.x, node.y);
      container.eventMode = "static";
      container.cursor = boardLocked ? "pointer" : "grab";

      const halo = new Graphics().circle(0, 0, radius + 7).fill({
        color,
        alpha: isSelected ? 0.22 : isHovered ? 0.16 : 0.1,
      });
      container.addChild(halo);

      const base = new Graphics()
        .circle(0, 0, radius)
        .fill({ color: 0x0b1220, alpha: 0.95 })
        .stroke({
          width: isSelected ? 3 : 2,
          color,
          alpha: isSelected ? 0.98 : 0.88,
        });
      if (isSelected) {
        base.filters = [
          new GlowFilter({
            distance: 24,
            outerStrength: 1.1,
            color,
          }) as any,
        ];
      }
      container.addChild(base);

      const frame = new Graphics()
        .circle(0, 0, radius - 4)
        .stroke({
          width: 1,
          color: 0xffffff,
          alpha: 0.28,
        });
      container.addChild(frame);

      const iconPlate = new Graphics()
        .roundRect(-11, -10, 22, 20, 5)
        .fill({ color: 0x020617, alpha: 0.78 })
        .stroke({
          width: 1.1,
          color,
          alpha: 0.72,
        });
      container.addChild(iconPlate);

      if (node.entity.protectedFlag) {
        const protectedRing = new Graphics();
        drawDashedCircle(protectedRing, radius + 5, 0xfb4478);
        container.addChild(protectedRing);
      }

      const glyph = new Graphics();
      drawNodeGlyph(glyph, node.entity.type, color);
      container.addChild(glyph);

      const statusPip = new Graphics()
        .circle(radius - 2, -radius + 2, 2.4)
        .fill({ color, alpha: 0.96 })
        .stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
      container.addChild(statusPip);

      let dragActive = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      const detachStageDragHandlers = () => {
        app?.stage.off("pointermove", handleStageDragMove);
        app?.stage.off("pointerup", endDrag);
        app?.stage.off("pointerupoutside", endDrag);
      };
      const endDrag = () => {
        dragActive = false;
        container.cursor = boardLocked ? "pointer" : "grab";
        detachStageDragHandlers();
      };
      const handleStageDragMove = (event: { global: { x: number; y: number } }) => {
        if (!dragActive || boardLocked) return;
        const world = viewport.toWorld(event.global);
        const nextX = Math.max(24, Math.min(WORLD_WIDTH - 24, world.x + dragOffsetX));
        const nextY = Math.max(24, Math.min(WORLD_HEIGHT - 24, world.y + dragOffsetY));
        onMoveNode(node.id, nextX, nextY);
      };

      container.on("pointerdown", (event) => {
        event.stopPropagation();
        const rightClick = event.button === 2;
        if (rightClick) {
          onNodeContextMenu(node.entity, {
            x: event.global.x,
            y: event.global.y,
          });
          return;
        }

        onSelectNode(node.entity);
        if (boardLocked) return;

        const world = viewport.toWorld(event.global);
        dragOffsetX = node.x - world.x;
        dragOffsetY = node.y - world.y;
        dragActive = true;
        container.cursor = "grabbing";
        detachStageDragHandlers();
        app?.stage.on("pointermove", handleStageDragMove);
        app?.stage.on("pointerup", endDrag);
        app?.stage.on("pointerupoutside", endDrag);
      });
      container.on("pointerup", endDrag);
      container.on("pointerupoutside", endDrag);
      container.on("pointerover", () => setHoveredNodeId(node.id));
      container.on("pointerout", () => setHoveredNodeId((previous) => (previous === node.id ? null : previous)));

      nodeLayer.addChild(container);
    }

    let pulseTime = 0;
    const pulseGraphics = new Graphics();
    pulseLayer.addChild(pulseGraphics);

    const pulseTicker = (ticker: { deltaTime: number }) => {
      if (prefersReducedMotion) return;
      pulseGraphics.clear();
      pulseTime += ticker.deltaTime * 0.014;
      const targetEdges = geometryRef.current.filter((edge) => edge.id === selectedEdgeId || edge.id === hoveredEdgeId);
      for (const edge of targetEdges) {
        const t = (Math.sin(pulseTime) + 1) / 2;
        const point = quadraticPoint(
          edge.from.x,
          edge.from.y,
          edge.controlX,
          edge.controlY,
          edge.to.x,
          edge.to.y,
          t,
        );
        pulseGraphics.circle(point.x, point.y, 3).fill({
          color: 0xf97316,
          alpha: 0.92,
        });
      }
    };
    app.ticker.add(pulseTicker);

    return () => {
      app.ticker.remove(pulseTicker);
    };
  }, [
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    hoveredNodeId,
    hoveredEdgeId,
    boardLocked,
    onMoveNode,
    onNodeContextMenu,
    onSelectEdge,
    onSelectNode,
    prefersReducedMotion,
  ]);

  const nodeLabels = useMemo(() => {
    return nodes
      .filter((node) => labelMode === "all" || selectedNodeId === node.id || hoveredNodeId === node.id)
      .map((node) => ({
        id: node.id,
        text: maskEntityName(node.entity, role),
        x: node.x,
        y: node.y + 28,
      }));
  }, [nodes, labelMode, selectedNodeId, hoveredNodeId, role]);

  const edgeLabels = useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .filter((edge) => selectedEdgeId === edge.id || hoveredEdgeId === edge.id)
      .map((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return {
          id: edge.id,
          text: edge.relationship.label || formatTokenLabel(edge.relationship.type),
          x: midX,
          y: midY - 10,
        };
      })
      .filter((item): item is { id: string; text: string; x: number; y: number } => Boolean(item));
  }, [edges, hoveredEdgeId, nodes, selectedEdgeId]);

  return (
    <div className="graph-shell" role="img" aria-label="Entity relationship graph">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0">
        {nodeLabels.map((label) => (
          <div
            key={label.id}
            className="absolute -translate-x-1/2 rounded-full border border-cyan-300/25 bg-slate-950/70 px-2 py-0.5 text-[11px] font-hud tracking-[0.04em] text-slate-100 shadow-[0_2px_8px_rgba(2,6,23,.7)]"
            style={{
              left: `${viewTransform.x + label.x * viewTransform.scale}px`,
              top: `${viewTransform.y + label.y * viewTransform.scale}px`,
            }}
          >
            {label.text}
          </div>
        ))}
        {edgeLabels.map((label) => (
          <div
            key={`edge-${label.id}`}
            className="absolute -translate-x-1/2 rounded-full border border-cyan-300/30 bg-slate-950/75 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-cyan-100"
            style={{
              left: `${viewTransform.x + label.x * viewTransform.scale}px`,
              top: `${viewTransform.y + label.y * viewTransform.scale}px`,
            }}
          >
            {label.text.length > 20 ? `${label.text.slice(0, 20)}...` : label.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { HudLinkGraphProps };
