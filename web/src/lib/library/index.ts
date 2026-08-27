/**
 * Library management and practice dependency resolution.
 * Barrel export for clean imports.
 */

export { classifyLibraryRoot, displayNameForBody, baselineNameForPracticeLink, practiceNameForDependencyLink, associatedBaselineName, isStandaloneBaselinePracticeArtifact, type LibraryRootKind } from "./classify";
export { libraryDocumentTags } from "./libraryDocumentTags";
export { loadAllLibraryDocumentBodies } from "./loadLibraryBodies";
export { buildLibraryLookupIndex, collectBrowseDependencyArtifacts, resolvePracticeWithLibraryIndex, resolveMethodWithLibraryIndex, practiceNeedsLibraryResolution, methodNeedsLibraryResolution } from "./practiceDependencyResolution";
export { usePracticeLibraryResolveForRender } from "./usePracticeLibraryResolveForRender";
export { listVirtualElementFiles } from "./virtualElementFiles";
export { extractEmbeddedPractices, extractAndPersistEmbeddedPractices, type ExtractEmbeddedPracticesResult } from "./extractEmbeddedPractices";
export { buildBundleLibraryIndex, buildBundleLibraryIndexFromMeta, buildLibraryLookupIndexWithBodies, computeDocumentMeta, serializeBundleLibraryIndex, type BundleLibraryIndex, type LibraryEntry, type SerializedBundleLibraryIndex, type SerializedLibraryEntry } from "./bundleIndex";
