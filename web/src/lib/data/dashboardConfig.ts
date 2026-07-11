/**
 * Dashboard configuration management
 * Handles loading, saving, filtering, and sorting dashboard sections
 */

import type { JsonDocument } from "../storage/types";
import { classifyLibraryRoot } from "../library/classify";

export const DASHBOARD_CONFIG_TITLE = "Default Dashboard Configuration";

export interface DashboardConfig {
  version: 1;
  sections: DashboardSection[];
  starredDocumentIds: string[];
}

export interface DashboardConfigDocument {
  id: string;
  config: DashboardConfig;
}

export type SortField = "starred" | "completeness" | "title" | "updatedAt";
export type SortOrder = "asc" | "desc";

export interface SortCriterion {
  field: SortField;
  order: SortOrder;
}

export interface DashboardSection {
  id: string;
  name: string;
  seq: number;
  filters: SectionFilters;
  sortBy: SortCriterion[];
  maxItems?: number;
}

export interface SectionFilters {
  kind?: "practice" | "method";
  domainTags?: string[];
  lifecycleTags?: string[];
  organizationalTags?: string[];
  namePattern?: string;
  onlyStarred?: boolean;
}

export interface EnrichedMeta {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  // Library-specific fields (not present on dashboard-config documents)
  libraryRootKind?: string;
  displayName?: string;
  description?: string;
  virtualFileCount?: number;
  baselineNameForPracticeLink?: string | null;
  practiceNameForDependencyLink?: string | null;
  libraryTags?: {
    domainTags: string[];
    lifecycleTags: string[];
    organizationalTags: string[];
  };
  body?: unknown;
}

// Singleton cache - never create more than one config
let cachedConfig: DashboardConfigDocument | null = null;
let loadPromise: Promise<DashboardConfigDocument> | null = null;

/**
 * Load dashboard configuration from API
 * TRUE SINGLETON - will only ever create one config document
 */
export async function loadDashboardConfig(): Promise<DashboardConfigDocument> {
  // Return cached if available
  if (cachedConfig) {
    console.log("[Dashboard] Using cached config:", cachedConfig.id);
    return cachedConfig;
  }

  // If already loading, wait for that promise
  if (loadPromise) {
    console.log("[Dashboard] Waiting for existing load...");
    return loadPromise;
  }

  console.log("[Dashboard] Starting fresh load...");

  loadPromise = (async () => {
    try {
      // Query for ALL dashboard-config documents
      const response = await fetch("/api/documents?kind=dashboard-config", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const docs = data.documents || [];

        console.log(`[Dashboard] Found ${docs.length} dashboard-config documents`);

        // If we have configs, use the FIRST one
        if (docs.length > 0) {
          const configDoc = docs[0];
          const fullDoc = await fetch(`/api/documents/${configDoc.id}`, {
            cache: "no-store",
          });

          if (fullDoc.ok) {
            const doc: JsonDocument = await fullDoc.json();
            if (doc.body && typeof doc.body === "object") {
              const result = {
                id: doc.id,
                config: doc.body as DashboardConfig,
              };
              console.log("[Dashboard] Loaded existing config:", result.id);
              cachedConfig = result;
              return result;
            }
          }
        }
      }

      // NO config exists - create one
      console.log("[Dashboard] No config found, creating default...");
      const defaultConfig = getDefaultConfig();
      const created = await createDashboardConfig(defaultConfig);
      cachedConfig = created;
      return created;
    } catch (error) {
      console.error("[Dashboard] Failed to load config:", error);
      // Return in-memory default without caching on error
      return {
        id: "",
        config: getDefaultConfig(),
      };
    } finally {
      // Keep the promise around for 1 second to handle rapid re-renders
      setTimeout(() => {
        loadPromise = null;
      }, 1000);
    }
  })();

  return loadPromise;
}

/**
 * Create a new dashboard configuration
 */
async function createDashboardConfig(config: DashboardConfig): Promise<DashboardConfigDocument> {
  console.log("[Dashboard] Creating new dashboard config...");

  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: DASHBOARD_CONFIG_TITLE,
      kind: "dashboard-config",
      body: config,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create dashboard config");
  }

  const doc: JsonDocument = await response.json();
  console.log("[Dashboard] Created config with ID:", doc.id);

  return {
    id: doc.id,
    config: config,
  };
}

/**
 * Save dashboard configuration to API
 */
export async function saveDashboardConfig(
  id: string,
  config: DashboardConfig
): Promise<void> {
  if (!id) {
    throw new Error("Cannot save dashboard config without ID");
  }

  console.log("[Dashboard] Saving config:", id);

  const response = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: config }),
  });

  if (!response.ok) {
    throw new Error("Failed to save dashboard config");
  }

  // Update cache
  cachedConfig = { id, config };
}

/**
 * Clear the cached config (for testing/debugging)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  loadPromise = null;
  console.log("[Dashboard] Cache cleared");
}

/**
 * Get default dashboard configuration with starter sections
 */
export function getDefaultConfig(): DashboardConfig {
  return {
    version: 1,
    sections: [
      {
        id: crypto.randomUUID(),
        name: "Starred Items",
        seq: 0,
        filters: { onlyStarred: true },
        sortBy: [
          { field: "completeness", order: "desc" },
          { field: "updatedAt", order: "desc" },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Recent Methods",
        seq: 1,
        filters: { kind: "method" },
        sortBy: [
          { field: "starred", order: "desc" },
          { field: "updatedAt", order: "desc" },
        ],
        maxItems: 10,
      },
      {
        id: crypto.randomUUID(),
        name: "High Completeness",
        seq: 2,
        filters: {},
        sortBy: [
          { field: "starred", order: "desc" },
          { field: "completeness", order: "desc" },
          { field: "title", order: "asc" },
        ],
        maxItems: 15,
      },
    ],
    starredDocumentIds: [],
  };
}

/**
 * Filter documents based on section filters
 * ALWAYS excludes dashboard-config documents
 */
export function filterDocuments(
  documents: EnrichedMeta[],
  filters: SectionFilters,
  starredIds: string[] = []
): EnrichedMeta[] {
  // CRITICAL: Always exclude dashboard-config documents
  let result = documents.filter((doc) => {
    if (doc.kind === "dashboard-config") {
      console.warn("[Dashboard] Filtering out dashboard-config:", doc.id, doc.title);
      return false;
    }
    return true;
  });

  // Only starred filter
  if (filters.onlyStarred) {
    result = result.filter((doc) => starredIds.includes(doc.id));
  }

  // Kind filter
  if (filters.kind) {
    result = result.filter((doc) => {
      // Use libraryRootKind if available (from API with details=1)
      // Otherwise fall back to classifyLibraryRoot (when body is loaded)
      const rootKind = doc.libraryRootKind || classifyLibraryRoot(doc.body);
      return rootKind === filters.kind;
    });
  }

  // Domain tags filter (OR logic)
  if (filters.domainTags && filters.domainTags.length > 0) {
    result = result.filter((doc) =>
      doc.libraryTags &&
      filters.domainTags!.some((tag) =>
        doc.libraryTags!.domainTags.includes(tag)
      )
    );
  }

  // Lifecycle tags filter (OR logic)
  if (filters.lifecycleTags && filters.lifecycleTags.length > 0) {
    result = result.filter((doc) =>
      doc.libraryTags &&
      filters.lifecycleTags!.some((tag) =>
        doc.libraryTags!.lifecycleTags.includes(tag)
      )
    );
  }

  // Organizational tags filter (OR logic)
  if (filters.organizationalTags && filters.organizationalTags.length > 0) {
    result = result.filter((doc) =>
      doc.libraryTags &&
      filters.organizationalTags!.some((tag) =>
        doc.libraryTags!.organizationalTags.includes(tag)
      )
    );
  }

  // Name pattern filter (case-insensitive substring match with wildcard support)
  if (filters.namePattern) {
    const pattern = filters.namePattern.toLowerCase();

    // Convert wildcard pattern to regex if it contains *
    if (pattern.includes('*')) {
      // Escape regex special characters except *
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(regexPattern, 'i');

      result = result.filter((doc) =>
        regex.test(doc.title) || regex.test(doc.displayName || "")
      );
    } else {
      // Simple substring match
      result = result.filter((doc) =>
        doc.title.toLowerCase().includes(pattern) ||
        (doc.displayName || "").toLowerCase().includes(pattern)
      );
    }
  }

  return result;
}

/**
 * Sort documents by multiple criteria with specified order
 */
export function sortDocuments(
  documents: EnrichedMeta[],
  sortBy: SortCriterion[],
  starredIds: string[],
  scores: Map<string, number>
): EnrichedMeta[] {
  const result = [...documents];

  result.sort((a, b) => {
    // Apply each sort criterion in order until we find a difference
    for (const criterion of sortBy) {
      let comparison = 0;

      switch (criterion.field) {
        case "starred": {
          const aStarred = starredIds.includes(a.id);
          const bStarred = starredIds.includes(b.id);
          if (aStarred !== bStarred) {
            comparison = aStarred ? -1 : 1; // Starred items first by default
          }
          break;
        }
        case "completeness": {
          const aScore = scores.get(a.id) || 0;
          const bScore = scores.get(b.id) || 0;
          comparison = aScore - bScore;
          break;
        }
        case "title": {
          comparison = a.title.localeCompare(b.title);
          break;
        }
        case "updatedAt": {
          comparison = a.updatedAt.localeCompare(b.updatedAt);
          break;
        }
      }

      // Apply order (asc/desc)
      if (comparison !== 0) {
        return criterion.order === "asc" ? comparison : -comparison;
      }
    }

    return 0; // All criteria equal
  });

  return result;
}

/**
 * Collect unique tags from documents for a specific tag category
 */
export function collectUniqueTags(
  documents: EnrichedMeta[],
  category: "domainTags" | "lifecycleTags" | "organizationalTags"
): string[] {
  const tagSet = new Set<string>();
  for (const doc of documents) {
    if (doc.libraryTags) {
      const tags = doc.libraryTags[category];
      if (Array.isArray(tags)) {
        tags.forEach((tag) => tagSet.add(tag));
      }
    }
  }
  return Array.from(tagSet).sort();
}
