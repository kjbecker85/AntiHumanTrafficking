# Peer Review Deployment

This app now supports two persistence modes:

- `mock`: file-backed demo persistence for local or lightweight review
- `azure-sql`: Azure SQL operational persistence with Fabric warehouse assets in-repo

## Recommended target

For quick UI review, use Render with the included `render.yaml`.

For the intended production path, use Azure App Service or Azure Container Apps with the Azure SQL and Fabric assets in `infra/bicep`, `database/azure-sql`, and `database/fabric/warehouse`.

Why this target:

- The app can still run in mock mode without cloud resources.
- For peer review, a single long-lived container is more reliable than a serverless deployment.
- The included persistent disk path keeps demo edits after restarts and redeploys.

## Included deployment support

- Docker build: `Dockerfile`
- Health endpoint: `app/api/health/route.ts`
- Persistence selector: `lib/data-store/index.ts`
- Azure SQL runtime store: `lib/data-store/sqlStore.ts`
- Azure SQL + Fabric deployment assets: `docs/data-platform.md`

## Launch steps

1. Push this repository to GitHub.
2. In Render, create a new Blueprint from that repository.
3. Approve the `render.yaml` settings.
4. Wait for the first deploy to finish.
5. Open `/api/health` on the generated URL and confirm `"status":"ok"`.
6. Share the generated Render URL with reviewers.

## Important limitation

Keep this deployment at one instance.

If `DATA_BACKEND=mock`, the fallback store is still file-backed for demos. Scaling that mode beyond one instance can split state between containers. Use Azure SQL mode for shared transactional persistence.
