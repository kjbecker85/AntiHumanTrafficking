"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { CaseRecord, Entity, ReportRecord } from "@/lib/types";
import { HelpOverlay } from "@/components/HelpOverlay";

export default function ReportsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeCaseId, setActiveCaseId] = useState("case-atl-001");
  const [reports, setReports] = useState<ReportRecord[]>([]);

  const [location, setLocation] = useState("Elm Street Motel");
  const [narrative, setNarrative] = useState("Synthetic observation for training demo.");
  const [sourceType, setSourceType] = useState<ReportRecord["sourceType"]>("field_observation");
  const [relatedEntityId, setRelatedEntityId] = useState("e1");

  useEffect(() => {
    api.getCases().then(setCases);
  }, []);

  useEffect(() => {
    api.getEntities(activeCaseId).then(setEntities);
    api.getReports(activeCaseId).then((items) => {
      setReports([...items].sort((a, b) => (a.timeObserved < b.timeObserved ? 1 : -1)));
    });
  }, [activeCaseId]);

  const activeEntityOptions = useMemo(() => entities.filter((e) => e.caseId === activeCaseId), [entities, activeCaseId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: Omit<ReportRecord, "id"> = {
      caseId: activeCaseId,
      timeObserved: new Date().toISOString(),
      location,
      narrative,
      sourceType,
      relatedEntityIds: [relatedEntityId],
    };

    const created = await api.createReport(payload);
    setReports((prev) => [created, ...prev]);
    setNarrative("Synthetic observation for training demo.");
  }

  return (
    <div>
      <h1>Report Entry</h1>
      <p className="hint">Use this form for quick, structured report capture.</p>

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

      <form className="card" onSubmit={onSubmit}>
        <label>
          Location
          <input value={location} onChange={(event) => setLocation(event.target.value)} title="Where the observed activity occurred" />
        </label>
        <label>
          Narrative
          <textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} rows={4} title="Factual observation summary" />
        </label>
        <label>
          Source Type
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value as ReportRecord["sourceType"])}>
            <option value="open_source">open_source</option>
            <option value="partner_submission">partner_submission</option>
            <option value="field_observation">field_observation</option>
            <option value="internal_note">internal_note</option>
          </select>
        </label>
        <label>
          Related Entity
          <select value={relatedEntityId} onChange={(event) => setRelatedEntityId(event.target.value)}>
            {activeEntityOptions.map((e) => (
              <option key={e.id} value={e.id}>{e.displayName}</option>
            ))}
          </select>
        </label>
        <button type="submit">Save Report</button>
      </form>

      <section className="card">
        <h3>Recent Reports</h3>
        <ul>
          {reports.slice(0, 12).map((report) => (
            <li key={report.id}>
              <strong>{report.timeObserved.slice(0, 16).replace("T", " ")}</strong> - {report.location} - {report.narrative}
            </li>
          ))}
        </ul>
      </section>

      <HelpOverlay pageKey="reports" />
    </div>
  );
}
