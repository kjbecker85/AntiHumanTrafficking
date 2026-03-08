# Data Platform Implementation

## Purpose
This repository now contains the baseline application, Azure SQL operational schema, Fabric warehouse schema, and Bicep infrastructure assets for the Microsoft Fabric + Azure data platform.

## Runtime behavior
- The application uses `DATA_BACKEND=azure-sql` when Azure SQL configuration is present.
- If SQL configuration is absent, the API falls back to the existing mock/file-backed store so local UI work can continue without cloud resources.
- Azure SQL runtime configuration is driven by `.env.example`.

## Azure SQL assets
- `database/azure-sql/migrations/001_initial_schema.sql`
  - Creates the `ref`, `auth`, `core`, `ops`, `audit`, and `control` schemas.
  - Defines the normalized OLTP tables for users, sessions, cases, entities, reports, relationships, attachments, and audit events.
- `database/azure-sql/migrations/002_seed_reference_data.sql`
  - Seeds reference domains used by both the app and the downstream warehouse.

## Fabric warehouse assets
- `database/fabric/warehouse/001_star_schema.sql`
  - Creates conformed Kimball dimensions, facts, and bridge tables in the Fabric Warehouse.
- `database/fabric/warehouse/002_security.sql`
  - Applies baseline Fabric row-level security policies for case and protected-entity access.

## Infrastructure as code
- `infra/bicep/main.bicep`
  - Subscription-scope entrypoint that creates the resource group and orchestrates all modules.
- `infra/bicep/modules/*`
  - Network, security, observability, Azure SQL, and Fabric capacity resources.
  - Includes an optional lightweight Linux runner VM module for private migration tasks.
- `infra/bicep/parameters/*.bicepparam`
  - Environment-specific parameter files for `dev`, `test`, and `prod`.
- `infra/fabric/workspaces.json`
  - Captures the current tenant, subscription, Fabric capacity, workspace IDs, and security group IDs for this environment.

## Deployment order
1. Populate the Bicep parameter file with real names, object IDs, and credentials.
2. Deploy Azure resources with `az deployment sub create --location <region> --template-file infra/bicep/main.bicep --parameters infra/bicep/parameters/dev.bicepparam`.
   - The current environment parameter files set `deployFabricCapacity = false` so Azure deploys the data platform foundation without creating a second Fabric capacity. This repo is currently bound to an existing Fabric trial capacity and pre-created workspaces.
3. Execute the Azure SQL migration scripts against the provisioned database.
   - If Azure SQL is private-only, run the migrations from a VM inside the VNet. The repo includes `scripts/run-azure-sql-migrations-vm.ps1` for that workflow.
4. Run `scripts/deploy-fabric-items.ps1` to create the Fabric warehouse in the target workspaces.
5. If Azure SQL is private-only and you want Fabric mirroring, create the gateway path first.
   - `scripts/ensure-azure-sql-mirror-principal.ps1` creates a least-privilege SQL login and database user for Fabric mirroring from inside the private runner VM.
   - `scripts/configure-fabric-mirroring.ps1` registers the Power Platform resource provider, ensures the delegated Fabric gateway subnet, creates the Fabric virtual network gateway, creates the SQL connection, creates the mirrored database item, and starts mirroring.
6. Apply the Fabric warehouse SQL scripts in order.
   - The repo includes `scripts/publish-fabric-warehouse.ps1` to discover each warehouse SQL endpoint from the Fabric REST API, then publish `database/fabric/warehouse/001_star_schema.sql` and `database/fabric/warehouse/002_security.sql` using Microsoft Entra access tokens.
   - If an operational mirror exists in the same workspace, the same publish script can also deploy `003_load_framework.sql` and `004_load_procedures.sql`, then optionally run `etl.usp_refresh_warehouse`.
   - The current warehouse scripts are intentionally written to match Fabric Warehouse SQL support, which is narrower than Azure SQL Database. In practice that means analytics tables are modeled with natural-key and surrogate-key columns, but this script does not attempt to enforce relational constraints that Fabric rejects during `CREATE TABLE`.
7. Set application environment variables so the Next.js API routes use `DATA_BACKEND=azure-sql`.

## Notes
- The app-side SQL repository preserves the current API contracts so the frontend does not need to change when moving from mock persistence to Azure SQL.
- The operational model keeps natural keys and surrogate keys separate, which aligns with the downstream Fabric dimensional model.
- Fabric mirrored-database setup is intentionally kept outside Bicep because the current repo implements Fabric item provisioning through REST-based ALM rather than full ARM-native deployment.
- Current project binding:
  - Azure region: `eastus2`
  - Azure SQL region override: `centralus`
  - Fabric capacity: `FTL64` in `Central US`
  - SQL Entra admin group: `aht-fabric-admins`
