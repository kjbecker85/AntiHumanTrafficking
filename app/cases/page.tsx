"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CaseRecord } from "@/lib/types";
import { HelpOverlay } from "@/components/HelpOverlay";

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("New Corridor Case");
  const [jurisdiction, setJurisdiction] = useState("Denver Metro");
  const [priority, setPriority] = useState<CaseRecord["priority"]>("medium");
  const [status, setStatus] = useState<CaseRecord["status"]>("open");
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState("pilot, intake");

  useEffect(() => {
    api.getCases().then(setCases).catch((e) => setError((e as Error).message));
  }, []);

  async function onCreateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const created = await api.createCase({
        name,
        jurisdiction,
        priority,
        status,
        ownerId: "analyst-1",
        reviewDate,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setCases((prev) => [created, ...prev]);
      setName("New Corridor Case");
      setTags("pilot, intake");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Case Workspace</h1>
      <p className="hint">Role-based home for selecting and tracking active investigation workspaces.</p>

      {error ? <p>{error}</p> : null}
      <form className="card" onSubmit={onCreateCase}>
        <h3>Create New Case</h3>
        <p className="hint">Add a case workspace with jurisdiction, status, and review date.</p>
        <div className="toolbar-grid">
          <label>
            Case name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Jurisdiction
            <input value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} required />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as CaseRecord["status"])}>
              <option value="open">open</option>
              <option value="monitoring">monitoring</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as CaseRecord["priority"])}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Review date
            <input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} required />
          </label>
          <label>
            Tags (comma separated)
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
        </div>
        <div className="toolbar-actions">
          <button type="submit">Create Case</button>
        </div>
      </form>

      {cases.map((item) => (
        <article key={item.id} className="card">
          <h3>{item.name}</h3>
          <p><strong>Status:</strong> {item.status}</p>
          <p><strong>Jurisdiction:</strong> {item.jurisdiction}</p>
          <p><strong>Priority:</strong> {item.priority}</p>
          <p><strong>Review Date:</strong> {item.reviewDate}</p>
          <p><strong>Tags:</strong> {item.tags.join(", ")}</p>
        </article>
      ))}

      <HelpOverlay pageKey="cases" />
    </div>
  );
}