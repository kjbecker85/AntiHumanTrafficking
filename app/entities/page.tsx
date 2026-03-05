"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { maskEntityName } from "@/lib/auth";
import type { CaseRecord, Entity, EntityType } from "@/lib/types";
import { HelpOverlay } from "@/components/HelpOverlay";
import { useRole } from "@/components/RoleProvider";
import { formatEntityType } from "@/lib/format";

const entityTypes: EntityType[] = [
  "person",
  "suspect",
  "unknown_person",
  "victim",
  "associate",
  "organization",
  "phone",
  "email",
  "vehicle",
  "license_plate",
  "location",
  "account",
  "document",
];

export default function EntitiesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>("case-atl-001");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { role } = useRole();

  const [displayName, setDisplayName] = useState("New Subject");
  const [type, setType] = useState<EntityType>("person");
  const [cardsTypeFilter, setCardsTypeFilter] = useState<EntityType | "all">("person");
  const [aliases, setAliases] = useState("Alias A, Alias B");
  const [confidence, setConfidence] = useState(0.75);
  const [protectedFlag, setProtectedFlag] = useState(false);
  const [descriptors, setDescriptors] = useState("new intake");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [uniqueIdentifierType, setUniqueIdentifierType] = useState("SSN");
  const [address, setAddress] = useState("123 Example St, Denver, CO");
  const [lat, setLat] = useState("39.7392");
  const [lon, setLon] = useState("-104.9903");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.getCases().then(setCases);
  }, []);

  useEffect(() => {
    api.getEntities(activeCaseId).then(setEntities);
  }, [activeCaseId]);

  const sorted = useMemo(() => {
    return [...entities].sort((a, b) => b.confidence - a.confidence);
  }, [entities]);

  const groupedByType = useMemo(() => {
    const groups = new Map<EntityType, Entity[]>();
    entityTypes.forEach((item) => groups.set(item, []));
    sorted.forEach((entity) => {
      const bucket = groups.get(entity.type);
      if (bucket) {
        bucket.push(entity);
      }
    });
    return groups;
  }, [sorted]);

  function getDefaultIdentifierType(entityType: EntityType): string {
    switch (entityType) {
      case "person":
      case "suspect":
      case "victim":
      case "associate":
      case "unknown_person":
        return "SSN";
      case "vehicle":
        return "License Plate";
      case "license_plate":
        return "Plate Number";
      case "phone":
        return "Phone Number";
      case "email":
        return "Email Address";
      case "organization":
        return "EIN";
      case "location":
        return "Address ID";
      case "account":
        return "Account Number";
      case "document":
        return "Document ID";
      default:
        return "Identifier";
    }
  }

  function getCardToneClass(entityType: EntityType): string {
    if (entityType === "victim") return "tone-victim";
    if (entityType === "suspect") return "tone-suspect";
    if (entityType === "person" || entityType === "associate") return "tone-person";
    if (entityType === "phone" || entityType === "email" || entityType === "account") return "tone-digital";
    if (entityType === "vehicle" || entityType === "license_plate") return "tone-vehicle";
    if (entityType === "organization" || entityType === "location") return "tone-org";
    return "tone-document";
  }

  useEffect(() => {
    setUniqueIdentifierType(getDefaultIdentifierType(type));
  }, [type]);

  async function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setImageUrl(undefined);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

    setImageUrl(dataUrl);
  }

  async function onCreateEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const parsedLat = Number(lat);
      const parsedLon = Number(lon);
      const includeGeo = Number.isFinite(parsedLat) && Number.isFinite(parsedLon);

      const created = await api.createEntity(activeCaseId, {
        type,
        displayName,
        aliases: aliases
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        confidence,
        protectedFlag,
        descriptors: descriptors
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        uniqueIdentity: uniqueIdentifier.trim() || undefined,
        uniqueIdentifierType: uniqueIdentifierType.trim() || undefined,
        geo: includeGeo
          ? {
              lat: parsedLat,
              lon: parsedLon,
              address: address.trim() || undefined,
            }
          : undefined,
        imageUrl,
      });

      setEntities((prev) => [created, ...prev]);
      setDisplayName("New Subject");
      setAliases("Alias A, Alias B");
      setDescriptors("new intake");
      setUniqueIdentifier("");
      setUniqueIdentifierType(getDefaultIdentifierType(type));
      setImageUrl(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Entity Profiles</h1>
      <p className="hint">Entity records preserve aliases, confidence, and protected-data status.</p>
      <p className="hint"><strong>Live demo mode:</strong> current role is <strong>{role}</strong>. Toggle in top-right to compare masking behavior.</p>

      {error ? <p>{error}</p> : null}

      <section className="card">
        <label>
          Active case
          <select value={activeCaseId} onChange={(event) => setActiveCaseId(event.target.value)}>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </section>

      <form className="card" onSubmit={onCreateEntity}>
        <h3>Create New Entity</h3>
        <p className="hint">Add an entity profile to the active case, optionally with map coordinates.</p>
        <div className="toolbar-grid">
          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
          <label>
            Entity type
            <select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as EntityType;
                setType(nextType);
                // Keep card display aligned with current form context.
                setCardsTypeFilter(nextType);
              }}
            >
              {entityTypes.map((item) => (
                <option key={item} value={item}>{formatEntityType(item)}</option>
              ))}
            </select>
          </label>
          <label>
            Entity image (optional)
            <input type="file" accept="image/*" onChange={onImageChange} />
          </label>
          <label>
            Confidence
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
          </label>
          <label>
            Protected entity
            <select value={String(protectedFlag)} onChange={(event) => setProtectedFlag(event.target.value === "true")}>
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </label>
          <label>
            Aliases (comma separated)
            <input value={aliases} onChange={(event) => setAliases(event.target.value)} />
          </label>
          <label>
            Descriptors (comma separated)
            <input value={descriptors} onChange={(event) => setDescriptors(event.target.value)} />
          </label>
          <label>
            Unique Identifier Type
            <input
              value={uniqueIdentifierType}
              onChange={(event) => setUniqueIdentifierType(event.target.value)}
              placeholder={getDefaultIdentifierType(type)}
            />
          </label>
          <label>
            Unique Identifier
            <input
              value={uniqueIdentifier}
              onChange={(event) => setUniqueIdentifier(event.target.value)}
              placeholder={`Enter ${getDefaultIdentifierType(type)}`}
            />
          </label>
          <label>
            Address
            <input value={address} onChange={(event) => setAddress(event.target.value)} title="Used in map popup" />
          </label>
          <label>
            Latitude
            <input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="39.7392" />
          </label>
          <label>
            Longitude
            <input value={lon} onChange={(event) => setLon(event.target.value)} placeholder="-104.9903" />
          </label>
        </div>
        {imageUrl ? (
          <div className="entity-upload-preview">
            <img src={imageUrl} alt="Entity upload preview" />
          </div>
        ) : null}
        <div className="toolbar-actions">
          <button type="submit">Create Entity</button>
        </div>
      </form>

      <section className="card">
        <div className="row between center">
          <h3>Entity Cards</h3>
          <label className="cards-filter-label">
            View type
            <select
              value={cardsTypeFilter}
              onChange={(event) => setCardsTypeFilter(event.target.value as EntityType | "all")}
            >
              <option value="all">All</option>
              {entityTypes.map((item) => (
                <option key={`filter-${item}`} value={item}>
                  {formatEntityType(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {entityTypes.map((typeGroup) => {
        if (cardsTypeFilter !== "all" && cardsTypeFilter !== typeGroup) {
          return null;
        }
        const items = groupedByType.get(typeGroup) ?? [];
        if (items.length === 0) {
          return (
            <section key={typeGroup} className="entity-type-group">
              <div className="entity-type-group-header">
                <h3>{formatEntityType(typeGroup)}</h3>
                <span className="badge">0</span>
              </div>
              <article className="card">
                <p className="hint">No entities currently in this category.</p>
              </article>
            </section>
          );
        }

        return (
          <section key={typeGroup} className="entity-type-group">
            <div className="entity-type-group-header">
              <h3>{formatEntityType(typeGroup)}</h3>
              <span className="badge">{items.length}</span>
            </div>
            <div className="entity-profile-grid">
              {items.map((entity) => (
                <article key={entity.id} className={`card entity-profile-card ${getCardToneClass(entity.type)}`}>
                  <h3>{maskEntityName(entity, role)}</h3>
                  <div className="entity-profile-image-wrap">
                    {entity.imageUrl ? (
                      <img src={entity.imageUrl} alt={`${maskEntityName(entity, role)} profile`} className="entity-profile-image" />
                    ) : (
                      <div className="entity-profile-image placeholder">No photo</div>
                    )}
                  </div>
                  <p><strong>Type:</strong> {formatEntityType(entity.type)}</p>
                  <p><strong>Confidence:</strong> {entity.confidence.toFixed(2)}</p>
                  <p><strong>Aliases:</strong> {entity.aliases.length ? entity.aliases.join(", ") : "none"}</p>
                  <p><strong>Protected:</strong> {entity.protectedFlag ? "yes" : "no"}</p>
                  <p><strong>Unique Identifier Type:</strong> {entity.uniqueIdentifierType ?? getDefaultIdentifierType(entity.type)}</p>
                  <p><strong>Unique Identifier:</strong> {entity.uniqueIdentity ?? "not provided"}</p>
                  <p><strong>Descriptors:</strong> {entity.descriptors.join(", ")}</p>
                  <p><strong>Address:</strong> {entity.geo?.address ?? "none"}</p>
                  <p><strong>Coordinates:</strong> {entity.geo ? `${entity.geo.lat.toFixed(5)}, ${entity.geo.lon.toFixed(5)}` : "none"}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <HelpOverlay pageKey="global" />
    </div>
  );
}
