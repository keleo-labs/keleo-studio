/**
 * Demo/Test script showing what the Kanban board extracts from a pattern
 * Run: npx tsx src/lib/__demo__/kanbanPatternDemo.ts
 */

import { extractKanbanPatternData, calculateKanbanStats, buildAlphaSwimLanes, buildWorkProductSwimLanes } from "../kanbanPatternData";

// Simplified pattern and baseline excerpt
const samplePattern = {
  name: "Team Topology Lifecycle",
  description: "Progressive maturation of organizational design",
  patternViews: [
    {
      name: "Foundation",
      description: "Establish baseline team structures",
      seq: 1,
      alphaStates: [
        { alphaName: "Topology-Aligned Team", stateName: "Seeded" },
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Principles Established" },
      ],
      activities: ["Define Service Boundaries (ISH)"], // Only one explicit, other should be inferred
      narrativeContexts: [
        {
          seq: 1,
          narrativeElementName: "Lifecycle Phase",
          context: "Laying the groundwork for team-first architecture.",
        },
      ],
    },
    {
      name: "Operationalization",
      description: "Put teams into production",
      seq: 2,
      alphaStates: [
        { alphaName: "Topology-Aligned Team", stateName: "Formed" },
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Foundation Established" },
      ],
      activities: ["Establish Team Interactions"],
      narrativeContexts: [
        {
          seq: 1,
          narrativeElementName: "Lifecycle Phase",
          context: "Teams begin delivering value with clear interaction modes.",
        },
      ],
    },
    {
      name: "Continuous Improvement",
      description: "Monitor and adapt",
      seq: 3,
      alphaStates: [
        { alphaName: "Topology-Aligned Team", stateName: "Performing" },
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Working Well" },
      ],
      // No activities explicitly listed - both should be inferred!
    },
  ],
};

const sampleBaseline = {
  alphas: [
    {
      name: "Topology-Aligned Team",
      states: [
        { name: "Seeded", description: "Initial boundaries identified" },
        { name: "Formed", description: "Topology type established" },
        { name: "Performing", description: "Consistently delivering value" },
      ],
    },
    {
      name: "Cognitive-Optimized Way of Working",
      states: [
        { name: "Principles Established", description: "Baseline interaction modes recognized" },
        { name: "Foundation Established", description: "Measurable telemetry integrated" },
        { name: "Working Well", description: "Sustainable flow achieved" },
      ],
    },
  ],
  activities: [
    {
      name: "Define Service Boundaries (ISH)",
      description: "Apply Independent Service Heuristics",
      contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Seeded" }],
      worksOn: [{ workProductName: "Team API Specification", levelOfDetailName: "Drafted" }],
    },
    {
      name: "Assess Cognitive Load",
      description: "Periodic telemetry evaluations",
      contributesTo: [
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Principles Established" },
      ],
      worksOn: [{ workProductName: "Cognitive Load Assessment", levelOfDetailName: "Qualitative" }],
    },
    {
      name: "Establish Team Interactions",
      description: "Define communication mechanics",
      contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Formed" }],
      worksOn: [{ workProductName: "Team API Specification", levelOfDetailName: "Published" }],
    },
    {
      name: "Monitor Flow Metrics",
      description: "Track delivery performance",
      contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Performing" }],
      worksOn: [
        { workProductName: "Flow Metrics Dashboard", levelOfDetailName: "Operational" },
      ],
    },
    {
      name: "Conduct Team Retrospectives",
      description: "Reflect and improve team processes",
      contributesTo: [
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Working Well" },
      ],
      worksOn: [
        { workProductName: "Improvement Backlog", levelOfDetailName: "Prioritized" },
      ],
    },
  ],
  workProducts: [
    {
      name: "Team API Specification",
      levelsOfDetail: [
        {
          name: "Drafted",
          description: "Initial responsibilities outlined",
          contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Seeded" }],
        },
        {
          name: "Published",
          description: "API accessible within enterprise",
          contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Formed" }],
        },
      ],
    },
    {
      name: "Cognitive Load Assessment",
      levelsOfDetail: [
        {
          name: "Qualitative",
          description: "Survey-based sentiment",
          contributesTo: [
            {
              alphaName: "Cognitive-Optimized Way of Working",
              stateName: "Principles Established",
            },
          ],
        },
      ],
    },
    {
      name: "Flow Metrics Dashboard",
      levelsOfDetail: [
        {
          name: "Operational",
          description: "Real-time telemetry",
          contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Performing" }],
        },
      ],
    },
    {
      name: "Improvement Backlog",
      levelsOfDetail: [
        {
          name: "Prioritized",
          description: "Ordered list of improvements",
          contributesTo: [
            { alphaName: "Cognitive-Optimized Way of Working", stateName: "Working Well" },
          ],
        },
      ],
    },
    {
      name: "Team Charter",
      description: "Defines team purpose, boundaries, and working agreements",
      levelsOfDetail: [
        {
          name: "Initial",
          description: "Basic team identity established",
          contributesTo: [{ alphaName: "Topology-Aligned Team", stateName: "Seeded" }],
        },
      ],
    },
  ],
};

console.log("=".repeat(80));
console.log("KANBAN PATTERN BOARD DEMO");
console.log("=".repeat(80));
console.log();

const columns = extractKanbanPatternData(samplePattern, sampleBaseline);
const stats = calculateKanbanStats(columns);
const swimLanes = buildAlphaSwimLanes(columns);
const workProductSwimLanes = buildWorkProductSwimLanes(columns);

console.log("📊 Board Statistics:");
console.log(`   Pattern Views (Columns):    ${stats.columnCount}`);
console.log(`   Alpha Swim Lanes (Rows):    ${swimLanes.length}`);
console.log(`   Work Product Swim Lanes:    ${workProductSwimLanes.length}`);
console.log(`   Alpha States:               ${stats.totalAlphaStates}`);
console.log(`   Alpha Instances:            ${stats.totalAlphaInstances}`);
console.log(`   Activities:                 ${stats.totalActivities}`);
console.log(`   Work Products (all levels): ${stats.totalWorkProducts}`);
console.log(`   Total Cards:                ${stats.totalCards}`);
console.log();

console.log("═".repeat(80));
console.log("KANBAN BOARD LAYOUT - SWIM LANE VIEW");
console.log("═".repeat(80));
console.log();

// Column headers
const colWidth = 25;
process.stdout.write("│ Alpha                  │");
columns.forEach((col) => {
  const header = `${col.name} (#${col.seq})`.substring(0, colWidth - 2);
  process.stdout.write(` ${header.padEnd(colWidth - 2)} │`);
});
console.log();
console.log("├" + "─".repeat(24) + "┼" + columns.map(() => "─".repeat(colWidth)).join("┼") + "┤");

// Swim lanes
swimLanes.forEach((lane) => {
  process.stdout.write(`│ ${lane.alphaName.substring(0, 22).padEnd(22)} │`);
  lane.stateByColumn.forEach((card) => {
    if (card) {
      const state = (card.subtitle || "").substring(0, colWidth - 2);
      process.stdout.write(` ${state.padEnd(colWidth - 2)} │`);
    } else {
      process.stdout.write(" ".repeat(colWidth - 2) + "   │");
    }
  });
  console.log();
});

console.log("└" + "─".repeat(24) + "┴" + columns.map(() => "─".repeat(colWidth)).join("┴") + "┘");
console.log();
console.log("💡 Each row shows how an alpha progresses across pattern views (left → right)");
console.log();

// Work Product Swim Lanes
if (workProductSwimLanes.length > 0) {
  console.log("─".repeat(80));
  console.log("WORK PRODUCT SWIM LANES");
  console.log("─".repeat(80));
  console.log();

  console.log("┌" + "─".repeat(24) + "┬" + columns.map(() => "─".repeat(colWidth)).join("┬") + "┐");
  process.stdout.write("│ Work Product           │");
  columns.forEach((col) => {
    const header = `${col.name} (#${col.seq})`.substring(0, colWidth - 2);
    process.stdout.write(` ${header.padEnd(colWidth - 2)} │`);
  });
  console.log();
  console.log("├" + "─".repeat(24) + "┼" + columns.map(() => "─".repeat(colWidth)).join("┼") + "┤");

  workProductSwimLanes.forEach((lane) => {
    process.stdout.write(`│ ${lane.workProductName.substring(0, 22).padEnd(22)} │`);
    lane.levelByColumn.forEach((card) => {
      if (card) {
        const level = (card.subtitle || "").substring(0, colWidth - 2);
        const display = card.metadata?.inferred ? `${level} [auto]` : level;
        process.stdout.write(` ${display.substring(0, colWidth - 2).padEnd(colWidth - 2)} │`);
      } else {
        process.stdout.write(" ".repeat(colWidth - 2) + "   │");
      }
    });
    console.log();
  });

  console.log("└" + "─".repeat(24) + "┴" + columns.map(() => "─".repeat(colWidth)).join("┴") + "┘");
  console.log();
  console.log("💡 Each row shows how a work product evolves through levels (left → right)");
  console.log();
}

console.log("═".repeat(80));
console.log("KANBAN BOARD LAYOUT - DETAILED COLUMN VIEW");
console.log("═".repeat(80));
console.log();

columns.forEach((column) => {
  console.log(`┌─ COLUMN #${column.seq}: ${column.name} ${"─".repeat(60 - column.name.length)}`);
  console.log(`│  ${column.description || ""}`);
  if (column.narrative) {
    console.log(`│  💡 ${column.narrative}`);
  }
  console.log("│");

  // Alpha States
  console.log("│  🎯 ALPHA STATES:");
  if (column.alphaStateCards.length === 0) {
    console.log("│     (none)");
  } else {
    column.alphaStateCards.forEach((card) => {
      console.log(`│     ┌─ ${card.name} → ${card.subtitle}`);
      if (card.description) {
        console.log(`│     │  ${card.description}`);
      }
      console.log(`│     └─`);
    });
  }
  console.log("│");

  // Alpha Instances
  if (column.alphaInstanceCards.length > 0) {
    console.log("│  📌 ALPHA INSTANCES:");
    column.alphaInstanceCards.forEach((card) => {
      console.log(`│     ┌─ ${card.name}`);
      if (card.subtitle) {
        console.log(`│     │  ${card.subtitle}`);
      }
      console.log(`│     └─`);
    });
    console.log("│");
  }

  // Activities
  console.log("│  ⚡ ACTIVITIES:");
  if (column.activityCards.length === 0) {
    console.log("│     (none)");
  } else {
    column.activityCards.forEach((card) => {
      const inferredLabel = card.metadata?.inferred ? " [INFERRED]" : "";
      console.log(`│     ┌─ ${card.name}${inferredLabel}`);
      if (card.description) {
        console.log(`│     │  ${card.description}`);
      }
      console.log(`│     └─`);
    });
  }
  console.log("│");

  // Work Products
  console.log("│  📄 WORK PRODUCTS:");
  if (column.workProductCards.length === 0) {
    console.log("│     (none)");
  } else {
    column.workProductCards.forEach((card) => {
      const inferredLabel = card.metadata?.inferred ? " [INFERRED]" : "";
      console.log(`│     ┌─ ${card.name} (${card.subtitle})${inferredLabel}`);
      if (card.description) {
        console.log(`│     │  ${card.description}`);
      }
      console.log(`│     └─`);
    });
  }

  console.log("└" + "─".repeat(78));
  console.log();
});

console.log("=".repeat(80));
console.log("💡 AUTOMATIC INFERENCE");
console.log("=".repeat(80));
console.log();
console.log("ACTIVITY INFERENCE:");
console.log("──────────────────");
console.log("Activities marked [INFERRED] were NOT explicitly listed in the pattern view,");
console.log("but were automatically included because they contribute to alpha states");
console.log("shown in that column.");
console.log();
console.log("Example:");
console.log("  • Column #1 explicitly lists 'Define Service Boundaries'");
console.log("  • But 'Assess Cognitive Load' is inferred because it contributes to");
console.log("    'Cognitive-Optimized Way of Working → Principles Established'");
console.log();
console.log("WORK PRODUCT INFERENCE:");
console.log("───────────────────────");
console.log("Work products marked [INFERRED] appear for one of two reasons:");
console.log("  1. Produced by an activity shown in the column (via activity.worksOn[])");
console.log("  2. Contribute to an alpha state shown in the column (via level.contributesTo[])");
console.log();
console.log("Example:");
console.log("  • Column #1: 'Team Charter (Initial)' is inferred because it contributes to");
console.log("    'Topology-Aligned Team → Seeded' even though no activity explicitly");
console.log("    produces it in this view");
console.log();
console.log("This ensures ALL relevant work products appear in each phase!");
console.log();
console.log("=".repeat(80));
console.log("This data powers the interactive Kanban board visualization!");
console.log("Visit http://localhost:3000/flow-visualizer to see it live.");
console.log("=".repeat(80));
