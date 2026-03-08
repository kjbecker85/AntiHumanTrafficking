import { mockStore } from "@/lib/data-store/mockStore";
import { sqlStore } from "@/lib/data-store/sqlStore";
import type { InvestigationDataStore } from "@/lib/data-store/types";

let cachedStore: InvestigationDataStore | null = null;

function resolveBackend(): "mock" | "azure-sql" {
  const explicitBackend = process.env.DATA_BACKEND?.trim();
  if (explicitBackend === "mock" || explicitBackend === "azure-sql") {
    return explicitBackend;
  }

  if (process.env.AZURE_SQL_CONNECTION_STRING?.trim() || process.env.AZURE_SQL_SERVER?.trim()) {
    return "azure-sql";
  }

  return "mock";
}

export function getDataStore(): InvestigationDataStore {
  if (!cachedStore) {
    cachedStore = resolveBackend() === "azure-sql" ? sqlStore : mockStore;
  }

  return cachedStore;
}
