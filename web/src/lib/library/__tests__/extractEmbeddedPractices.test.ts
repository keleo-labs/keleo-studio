import { extractEmbeddedPractices, extractAndPersistEmbeddedPractices } from "../extractEmbeddedPractices";
import type { Method, Practice, PracticeBaseline } from "@/lib/types";
import type { JsonDocumentStore } from "@/lib/storage/types";

describe("extractEmbeddedPractices", () => {
  const mockBaseline: PracticeBaseline = {
    name: "Test Baseline",
    description: "A test baseline practice",
    focuses: [],
    alphas: [],
    activitySpaces: [],
    competencies: [],
    authors: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    version: "1.0",
    keywords: [],
  };

  it("should extract embedded practices and baseline, return transformed method", () => {
    const practice1: Practice = {
      name: "Practice 1",
      description: "First practice",
      baselinePracticeName: "Test Baseline",
    };

    const practice2: Practice = {
      name: "Practice 2",
      description: "Second practice",
      baselinePracticeName: "Test Baseline",
    };

    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [practice1, practice2],
    };

    const result = extractEmbeddedPractices(method);

    // Should extract both practices
    expect(result.extractedPractices).toHaveLength(2);
    expect(result.extractedPractices[0].name).toBe("Practice 1");
    expect(result.extractedPractices[1].name).toBe("Practice 2");

    // Should extract the baseline
    expect(result.extractedBaseline).toBeDefined();
    expect(result.extractedBaseline?.name).toBe("Test Baseline");

    // Transformed method should have practiceNames instead of practices
    expect(result.transformedMethod.practiceNames).toEqual(["Practice 1", "Practice 2"]);
    expect(result.transformedMethod.practices).toBeUndefined();

    // Transformed method should have baselinePracticeName instead of baselinePractice
    expect(result.transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(result.transformedMethod.baselinePractice).toBeUndefined();

    // Other method properties should be preserved
    expect(result.transformedMethod.name).toBe("Test Method");
    expect(result.transformedMethod.description).toBe("A test method");
  });

  it("should extract baseline even if no practices", () => {
    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
    };

    const result = extractEmbeddedPractices(method);

    expect(result.extractedPractices).toHaveLength(0);
    expect(result.extractedBaseline).toBeDefined();
    expect(result.extractedBaseline?.name).toBe("Test Baseline");
    expect(result.transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(result.transformedMethod.baselinePractice).toBeUndefined();
  });

  it("should handle empty practices array but extract baseline", () => {
    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [],
    };

    const result = extractEmbeddedPractices(method);

    expect(result.extractedPractices).toHaveLength(0);
    expect(result.extractedBaseline).toBeDefined();
    expect(result.transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(result.transformedMethod.baselinePractice).toBeUndefined();
  });

  it("should skip practices without names", () => {
    const validPractice: Practice = {
      name: "Valid Practice",
      description: "Has a name",
      baselinePracticeName: "Test Baseline",
    };

    const invalidPractice = {
      description: "No name",
      baselinePracticeName: "Test Baseline",
    } as Practice;

    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [validPractice, invalidPractice],
    };

    const result = extractEmbeddedPractices(method);

    // Should only extract the valid practice
    expect(result.extractedPractices).toHaveLength(1);
    expect(result.extractedPractices[0].name).toBe("Valid Practice");
    expect(result.transformedMethod.practiceNames).toEqual(["Valid Practice"]);
  });
});

describe("extractAndPersistEmbeddedPractices", () => {
  const mockBaseline: PracticeBaseline = {
    name: "Test Baseline",
    description: "A test baseline practice",
    focuses: [],
    alphas: [],
    activitySpaces: [],
    competencies: [],
    authors: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    version: "1.0",
    keywords: [],
  };

  it("should create new practices when they don't exist", async () => {
    const practice: Practice = {
      name: "New Practice",
      description: "A new practice",
      baselinePracticeName: "Test Baseline",
    };

    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [practice],
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "practice-1", kind: "practice", title: "New Practice", body: practice }),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    expect(mockStore.list).toHaveBeenCalledWith({ kind: "practice" });
    expect(mockStore.create).toHaveBeenCalledWith({
      title: "New Practice",
      kind: "practice",
      body: practice,
    });
    expect(mockStore.update).not.toHaveBeenCalled();

    const transformedMethod = result as Method;
    expect(transformedMethod.practiceNames).toEqual(["New Practice"]);
    expect(transformedMethod.practices).toBeUndefined();
  });

  it("should overwrite existing practices with the same name", async () => {
    const practice: Practice = {
      name: "Existing Practice",
      description: "Updated version",
      baselinePracticeName: "Test Baseline",
    };

    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [practice],
    };

    const existingDoc = {
      id: "existing-practice-1",
      kind: "practice" as const,
      title: "Existing Practice",
      body: {
        name: "Existing Practice",
        description: "Old version",
        baselinePracticeName: "Test Baseline",
      },
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn().mockResolvedValue([existingDoc]),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ ...existingDoc, body: practice }),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    expect(mockStore.list).toHaveBeenCalledWith({ kind: "practice" });
    expect(mockStore.update).toHaveBeenCalledWith("existing-practice-1", {
      body: practice,
    });
    expect(mockStore.create).not.toHaveBeenCalled();

    const transformedMethod = result as Method;
    expect(transformedMethod.practiceNames).toEqual(["Existing Practice"]);
    expect(transformedMethod.practices).toBeUndefined();
  });

  it("should return original body if not a method", async () => {
    const notAMethod = {
      name: "Just a practice",
      description: "Not a method",
      baselinePracticeName: "Some Baseline",
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(notAMethod, mockStore);

    expect(mockStore.list).not.toHaveBeenCalled();
    expect(mockStore.create).not.toHaveBeenCalled();
    expect(mockStore.update).not.toHaveBeenCalled();
    expect(result).toBe(notAMethod);
  });

  it("should extract and persist embedded baseline", async () => {
    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [],
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "baseline-1", kind: "practice", title: "Test Baseline", body: mockBaseline }),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    // Should create the baseline
    expect(mockStore.create).toHaveBeenCalledWith({
      title: "Test Baseline",
      kind: "practice",
      body: mockBaseline,
    });

    const transformedMethod = result as Method;
    expect(transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(transformedMethod.baselinePractice).toBeUndefined();
  });

  it("should overwrite existing baseline with same name", async () => {
    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
    };

    const existingBaseline = {
      id: "existing-baseline-1",
      kind: "practice" as const,
      title: "Test Baseline",
      body: {
        ...mockBaseline,
        description: "Old version",
      },
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn().mockResolvedValue([existingBaseline]),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ ...existingBaseline, body: mockBaseline }),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    expect(mockStore.update).toHaveBeenCalledWith("existing-baseline-1", {
      body: mockBaseline,
    });
    expect(mockStore.create).not.toHaveBeenCalled();

    const transformedMethod = result as Method;
    expect(transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(transformedMethod.baselinePractice).toBeUndefined();
  });

  it("should extract and persist both baseline and practices", async () => {
    const practice: Practice = {
      name: "Test Practice",
      description: "A practice",
      baselinePracticeName: "Test Baseline",
    };

    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePractice: mockBaseline,
      practices: [practice],
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn()
        .mockResolvedValueOnce({ id: "baseline-1", kind: "practice", title: "Test Baseline", body: mockBaseline })
        .mockResolvedValueOnce({ id: "practice-1", kind: "practice", title: "Test Practice", body: practice }),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    // Should create both baseline and practice
    expect(mockStore.create).toHaveBeenCalledTimes(2);
    expect(mockStore.create).toHaveBeenCalledWith({
      title: "Test Baseline",
      kind: "practice",
      body: mockBaseline,
    });
    expect(mockStore.create).toHaveBeenCalledWith({
      title: "Test Practice",
      kind: "practice",
      body: practice,
    });

    const transformedMethod = result as Method;
    expect(transformedMethod.baselinePracticeName).toBe("Test Baseline");
    expect(transformedMethod.baselinePractice).toBeUndefined();
    expect(transformedMethod.practiceNames).toEqual(["Test Practice"]);
    expect(transformedMethod.practices).toBeUndefined();
  });

  it("should return original body if already using name references", async () => {
    const method: Method = {
      name: "Test Method",
      description: "A test method",
      baselinePracticeName: "Test Baseline",
      practiceNames: ["Test Practice"],
    };

    const mockStore: JsonDocumentStore = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const result = await extractAndPersistEmbeddedPractices(method, mockStore);

    expect(mockStore.list).not.toHaveBeenCalled();
    expect(mockStore.create).not.toHaveBeenCalled();
    expect(mockStore.update).not.toHaveBeenCalled();
    expect(result).toBe(method);
  });
});
