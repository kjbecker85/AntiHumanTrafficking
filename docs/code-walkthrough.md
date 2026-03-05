# Code Walkthrough (Beginner Guide)

## Purpose
This app is a frontend-first prototype for anti-trafficking case support using synthetic data.

## Where to start
1. `app/link-analysis/page.tsx`
- Main priority feature with filters, graph, selection panel, and relationship patching.
2. `lib/types.ts`
- Shared data contracts used by pages and mock API routes.
3. `lib/seedData.ts`
- Demo data for cases, entities, relationships, reports, attachments, and audit events.
4. `app/api/v1/*`
- Mock backend endpoints matching phase-1 API contracts.

## How pages map to user workflow
1. `app/cases/page.tsx`
- Entry point to case workspaces.
2. `app/entities/page.tsx`
- Entity profile browsing with role-based masking.
3. `app/reports/page.tsx`
- Structured report entry and recent report list.
4. `app/link-analysis/page.tsx`
- Graph analysis workflow.
5. `app/briefing/page.tsx`
- Snapshot briefing preparation.

## Help and onboarding system
1. `components/HelpOverlay.tsx`
- Reusable guided tour and tooltip reference panel.
2. `lib/helpContent.ts`
- Copy source for per-page tooltips and guided steps.

## Key utility modules
1. `lib/graph.ts`
- Graph filter logic and deterministic layout helpers.
2. `lib/auth.ts`
- Role-based masking functions and access helpers.
3. `lib/api.ts`
- Typed API client wrappers for page usage.

## Next learning step
Read `app/link-analysis/page.tsx` top-to-bottom while cross-checking `components/GraphCanvas.tsx`.
