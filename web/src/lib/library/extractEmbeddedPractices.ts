import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import type { JsonDocumentStore } from "@/lib/storage/types";

/**
 * Result of extracting embedded practices and baseline from a Method.
 */
export type ExtractEmbeddedPracticesResult = {
  /** The method with `practiceNames` and `baselinePracticeName` instead of embedded objects */
  transformedMethod: Method;
  /** Practice objects that were extracted from the method */
  extractedPractices: Practice[];
  /** Baseline practice that was extracted from the method (if embedded) */
  extractedBaseline?: PracticeBaseline;
};

/**
 * Extracts embedded practices and baseline from a Method and returns:
 * 1. A transformed Method that uses `practiceNames` and `baselinePracticeName` instead of embedded objects
 * 2. An array of the extracted Practice objects to be saved separately
 * 3. The extracted baseline practice (if embedded) to be saved separately
 *
 * This allows methods to be stored in a normalized form where practices and baselines are referenced
 * by name rather than embedded, making them reusable across methods.
 *
 * @param method - The method with potentially embedded practices and baseline
 * @returns Object with transformedMethod, extractedPractices, and extractedBaseline
 */
export function extractEmbeddedPractices(method: Method): ExtractEmbeddedPracticesResult {
  let extractedBaseline: PracticeBaseline | undefined;
  let baselinePracticeName: string | undefined;

  // Extract embedded baseline if present
  if (method.baselinePractice && typeof method.baselinePractice === "object") {
    const baselineName = String(method.baselinePractice.name ?? "").trim();
    if (baselineName) {
      extractedBaseline = method.baselinePractice;
      baselinePracticeName = baselineName;
    }
  } else if (typeof method.baselinePracticeName === "string" && method.baselinePracticeName.trim()) {
    // Already using baselinePracticeName reference
    baselinePracticeName = method.baselinePracticeName.trim();
  }

  // Extract embedded practices if present
  const practiceNames: string[] = [];
  const extractedPractices: Practice[] = [];

  if (Array.isArray(method.practices) && method.practices.length > 0) {
    for (const practice of method.practices) {
      const name = String(practice?.name ?? "").trim();
      if (name) {
        practiceNames.push(name);
        extractedPractices.push(practice);
      }
    }
  } else if (Array.isArray(method.practiceNames) && method.practiceNames.length > 0) {
    // Already using practiceNames references
    practiceNames.push(...method.practiceNames.filter((n) => String(n ?? "").trim() !== ""));
  }

  // Create transformed method with name references instead of embedded objects
  const transformedMethod: Method = {
    ...method,
  };

  // Set baselinePracticeName and remove embedded baselinePractice
  if (baselinePracticeName) {
    transformedMethod.baselinePracticeName = baselinePracticeName;
    delete (transformedMethod as any).baselinePractice;
  }

  // Set practiceNames and remove embedded practices
  if (practiceNames.length > 0) {
    transformedMethod.practiceNames = practiceNames;
    delete (transformedMethod as any).practices;
  }

  return {
    transformedMethod,
    extractedPractices,
    extractedBaseline,
  };
}

/**
 * Extracts embedded practices and baseline from a Method and persists them as separate documents.
 * The method is then updated to reference these by name via `practiceNames` and `baselinePracticeName`.
 *
 * This function:
 * 1. Extracts embedded baseline (if present) and saves it as a separate baseline practice document
 * 2. Extracts all embedded practices from the method
 * 3. Saves each practice as a separate document in the library
 * 4. Returns the transformed method body with name references instead of embedded objects
 *
 * @param methodBody - The method body (unknown for safety)
 * @param store - The document store for persisting extracted baseline and practices
 * @returns Transformed method body with name references, or original if not a method
 */
export async function extractAndPersistEmbeddedPractices(
  methodBody: unknown,
  store: JsonDocumentStore
): Promise<unknown> {
  // Type guard: check if this is a method
  if (!methodBody || typeof methodBody !== "object") {
    return methodBody;
  }

  const obj = methodBody as Record<string, unknown>;

  // Not a method if it doesn't have baselinePractice or baselinePracticeName
  const hasBaseline =
    (obj.baselinePractice && typeof obj.baselinePractice === "object") ||
    (typeof obj.baselinePracticeName === "string" && obj.baselinePracticeName.trim() !== "");

  if (!hasBaseline) {
    return methodBody;
  }

  // Check if there's anything to extract
  const hasEmbeddedBaseline = obj.baselinePractice && typeof obj.baselinePractice === "object";
  const hasEmbeddedPractices = Array.isArray(obj.practices) && obj.practices.length > 0;

  // If nothing embedded, return as-is
  if (!hasEmbeddedBaseline && !hasEmbeddedPractices) {
    return methodBody;
  }

  // Type assertion is safe here because we've validated the shape
  const method = methodBody as Method;

  // Extract baseline and practices
  const { transformedMethod, extractedPractices, extractedBaseline } = extractEmbeddedPractices(method);

  // Persist extracted baseline if present
  if (extractedBaseline) {
    const baselineName = String(extractedBaseline.name ?? "").trim();
    if (baselineName) {
      // Check if a baseline with this name already exists
      const existingDocs = await store.list();
      const existingBaseline = existingDocs.find((doc) => {
        if (!doc.body || typeof doc.body !== "object") return false;
        const bodyObj = doc.body as Record<string, unknown>;
        // Check if it's a baseline practice with matching name
        const hasAlphas = Array.isArray(bodyObj.alphas) && bodyObj.alphas.length > 0;
        const hasFocuses = Array.isArray(bodyObj.focuses) && bodyObj.focuses.length > 0;
        const isBaseline = hasAlphas && hasFocuses;
        return isBaseline && String(bodyObj.name ?? "").trim() === baselineName;
      });

      if (existingBaseline) {
        // Baseline already exists - overwrite it
        await store.update(existingBaseline.id, {
          body: extractedBaseline,
        });
      } else {
        // Create new baseline document
        await store.create({
          title: baselineName,
          kind: "practice",
          body: extractedBaseline,
        });
      }
    }
  }

  // Persist each extracted practice as a separate document
  for (const practice of extractedPractices) {
    const practiceName = String(practice?.name ?? "").trim();
    if (!practiceName) continue;

    // Check if a practice with this name already exists
    const existingDocs = await store.list({ kind: "practice" });
    const existingPractice = existingDocs.find((doc) => {
      if (!doc.body || typeof doc.body !== "object") return false;
      const bodyObj = doc.body as Record<string, unknown>;
      return String(bodyObj.name ?? "").trim() === practiceName;
    });

    if (existingPractice) {
      // Practice already exists - overwrite it
      await store.update(existingPractice.id, {
        body: practice,
      });
    } else {
      // Create new practice document
      await store.create({
        title: practiceName,
        kind: "practice",
        body: practice,
      });
    }
  }

  return transformedMethod;
}
