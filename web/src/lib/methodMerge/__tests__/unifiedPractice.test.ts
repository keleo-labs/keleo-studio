// @ts-nocheck
import { compositePracticeFromMethod } from "../compositePracticeFromMethod";

describe("baseline Practice composition", () => {
  const baseline = {
    kind: "practiceBaseline", name: "Sparse", description: "Sparse baseline",
    outcomes: [{ name: "Value", description: "Measured value" }],
    projectCreationTemplates: [{ name: "Delegate", version: "1.0.0", selectors: [] }],
  };

  it("retains newly available baseline collections", () => {
    const result = compositePracticeFromMethod({
      name: "Method", description: "Method", baselinePractice: baseline, practices: [],
    } as any);
    expect((result.outcomes as any[]).map(row => row.name)).toEqual(["Value"]);
    expect((result.projectCreationTemplates as any[]).map(row => row.version)).toEqual(["1.0.0"]);
  });

  it("keeps distinct template versions and rejects conflicting executable definitions", () => {
    const method = { name: "Method", description: "Method", baselinePractice: baseline,
      practices: [{ name: "Extension", description: "Extension", baselinePracticeName: "Sparse",
        projectCreationTemplates: [{ name: "Delegate", version: "2.0.0", selectors: [] }] }] } as any;
    expect((compositePracticeFromMethod(method).projectCreationTemplates as any[]).length).toBe(2);
    method.practices[0].projectCreationTemplates[0].version = "1.0.0";
    method.practices[0].projectCreationTemplates[0].selectors = [{ name: "Other" }];
    expect(() => compositePracticeFromMethod(method)).toThrow("Conflicting project creation template");
  });
});
