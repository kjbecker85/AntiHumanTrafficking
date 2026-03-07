# Peer Review Deployment

This app is set up to deploy as a single-instance Docker web service.

## Recommended target

Use Render with the included `render.yaml`.

Why this target:

- The app currently uses a mock API data store.
- For peer review, a single long-lived container is more reliable than a serverless deployment.
- The included persistent disk path keeps demo edits after restarts and redeploys.

## Included deployment support

- Docker build: `Dockerfile`
- Health endpoint: `app/api/health/route.ts`
- Persistent demo data: `lib/mockDb.ts`

## Launch steps

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from that repository.
3. Approve the `render.yaml` settings.
4. Wait for the first deploy to finish.
5. Open `/api/health` on the generated URL and confirm `"status":"ok"`.
6. Share the generated Render URL with reviewers.

## Important limitation

Keep this deployment at one instance.

The current mock database is file-backed for demos, not a shared transactional database. Scaling beyond one instance can split state between containers.
