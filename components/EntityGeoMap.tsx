"use client";

import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { Entity, UserRole } from "@/lib/types";
import { maskEntityName } from "@/lib/auth";
import { formatEntityType } from "@/lib/format";
import { HudPanel } from "@/components/hud/HudPanel";
import { cn } from "@/lib/utils";

interface EntityGeoMapProps {
  entities: Entity[];
  role: UserRole;
  selectedEntityId: string | null;
  onSelectEntity: (entity: Entity) => void;
  className?: string;
  mapClassName?: string;
}

export function EntityGeoMap({
  entities,
  role,
  selectedEntityId,
  onSelectEntity,
  className,
  mapClassName,
}: EntityGeoMapProps) {
  const geoEntities = entities.filter((entity) => entity.geo);

  if (geoEntities.length === 0) {
    return (
      <HudPanel title="Entity Geo Map" subtitle="No geo entities in this date range.">
        <p className="hint">Adjust date filters to see map markers.</p>
      </HudPanel>
    );
  }

  const bounds: LatLngBoundsExpression = geoEntities.map((entity) => [entity.geo!.lat, entity.geo!.lon]);
  const fallbackCenter: LatLngExpression = [39.7392, -104.9903];

  return (
    <HudPanel
      className={className}
      title="Entity Geo Map"
      subtitle="Dark tactical basemap. Click markers to sync selection with timeline and details."
    >
      <MapContainer
        className={cn("entity-map", mapClassName)}
        bounds={bounds}
        center={fallbackCenter}
        zoom={12}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {geoEntities.map((entity) => {
          const isSelected = selectedEntityId === entity.id;
          return (
            <CircleMarker
              key={entity.id}
              center={[entity.geo!.lat, entity.geo!.lon]}
              pathOptions={{
                color: isSelected ? "#22d3ee" : "rgba(148, 163, 184, 0.8)",
                fillColor: entity.protectedFlag ? "#fb4478" : "#06b6d4",
                fillOpacity: 0.82,
                weight: isSelected ? 3 : 2,
              }}
              radius={isSelected ? 10 : 7}
              eventHandlers={{
                click: () => onSelectEntity(entity),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {maskEntityName(entity, role)}
              </Tooltip>
              <Popup>
                <div>
                  <p><strong>{maskEntityName(entity, role)}</strong></p>
                  <p>Type: {formatEntityType(entity.type)}</p>
                  <p>Lat/Lon: {entity.geo!.lat.toFixed(5)}, {entity.geo!.lon.toFixed(5)}</p>
                  <p>Address: {entity.geo?.address ?? "No address metadata"}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </HudPanel>
  );
}
