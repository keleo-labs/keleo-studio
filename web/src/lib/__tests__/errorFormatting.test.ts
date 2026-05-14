import { formatValidationIssue, formatRefIssue } from "../errorFormatting";
import type { ValidationIssue, RefIssue } from "../types";

describe("formatValidationIssue", () => {
  it("should format activity name errors with human-readable context", () => {
    const issue: ValidationIssue = {
      path: "/activities/0/name",
      message: "must be string",
    };

    const doc = {
      activities: [{ name: "My Activity", description: "Test" }],
    };

    const formatted = formatValidationIssue(issue, doc);

    expect(formatted.summary).toContain("Activity #1");
    expect(formatted.summary).toContain('"My Activity"');
    expect(formatted.summary).toContain("is required and must be a text value");
  });

  it("should format activity errors without name when name is missing", () => {
    const issue: ValidationIssue = {
      path: "/activities/2/description",
      message: "must be string",
    };

    const formatted = formatValidationIssue(issue);

    expect(formatted.summary).toContain("Activity #3");
    expect(formatted.summary).toContain("description");
  });

  it("should format alpha state errors with nested context", () => {
    const issue: ValidationIssue = {
      path: "/alphas/1/states/0/name",
      message: "must have required property 'name'",
    };

    const formatted = formatValidationIssue(issue);

    expect(formatted.summary).toContain("Alpha #2");
    expect(formatted.summary).toContain("State #1");
    expect(formatted.summary).toContain("is missing required field 'name'");
  });

  it("should format minItems errors readably", () => {
    const issue: ValidationIssue = {
      path: "/activities",
      message: "must NOT have fewer than 1 items",
    };

    const formatted = formatValidationIssue(issue);

    expect(formatted.summary).toContain("must have at least 1 item");
  });
});

describe("formatRefIssue", () => {
  it("should format activity reference errors with context", () => {
    const issue: RefIssue = {
      kind: "missing",
      type: "Competency",
      ref: "Software Development",
      context: "Activity:Deploy to Production",
    };

    const formatted = formatRefIssue(issue);

    expect(formatted.summary).toContain('Activity "Deploy to Production"');
    expect(formatted.summary).toContain("missing Competency");
    expect(formatted.summary).toContain('"Software Development"');
  });

  it("should format alpha reference errors with field context", () => {
    const issue: RefIssue = {
      kind: "missing",
      type: "Alpha",
      ref: "Stakeholders",
      context: "Alpha:Requirements(contributesTo)",
    };

    const formatted = formatRefIssue(issue);

    expect(formatted.summary).toContain('Alpha "Requirements"');
    expect(formatted.summary).toContain("(contributesTo)");
    expect(formatted.summary).toContain('"Stakeholders"');
  });

  it("should format focus reference errors", () => {
    const issue: RefIssue = {
      kind: "missing",
      type: "Focus",
      ref: "Customer",
      context: "ActivitySpace:Requirements Engineering",
    };

    const formatted = formatRefIssue(issue);

    expect(formatted.summary).toContain('Activity Space "Requirements Engineering"');
    expect(formatted.summary).toContain("missing Focus");
    expect(formatted.summary).toContain('"Customer"');
  });

  it("should handle missing context gracefully", () => {
    const issue: RefIssue = {
      kind: "missing",
      type: "Alpha",
      ref: "Unknown Alpha",
    };

    const formatted = formatRefIssue(issue);

    expect(formatted.summary).toContain("Missing Alpha");
    expect(formatted.summary).toContain('"Unknown Alpha"');
  });
});
