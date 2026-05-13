/**
 * Demo/Test script showing what the Sankey flow extracts from a practice
 * Run this to see the data structure: npx tsx src/lib/__demo__/sankeyFlowDemo.ts
 */

import { extractSankeyFlowData, calculateFlowStats } from "../sankeyFlowData";

// Simplified Team Topologies practice excerpt
const samplePractice = {
  name: "Team Cognitive Topology Practice",
  workProducts: [
    {
      name: "Team API Specification",
      levelsOfDetail: [
        {
          name: "Drafted",
          description: "Initial team responsibilities outlined",
          contributesTo: [
            { alphaName: "Topology-Aligned Team", stateName: "Seeded" },
          ],
        },
        {
          name: "Published",
          description: "API accessible within enterprise",
          contributesTo: [
            { alphaName: "Topology-Aligned Team", stateName: "Formed" },
          ],
        },
        {
          name: "Integrated",
          description: "API models live dependencies",
          contributesTo: [
            { alphaName: "Topology-Aligned Team", stateName: "Collaborating" },
          ],
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
            { alphaName: "Cognitive-Optimized Way of Working", stateName: "Principles Established" },
          ],
        },
        {
          name: "Quantified (AI-Proxies)",
          description: "Objective measurable telemetry",
          contributesTo: [
            { alphaName: "Cognitive-Optimized Way of Working", stateName: "Foundation Established" },
          ],
        },
        {
          name: "Continuous",
          description: "Actively informs topology evolution",
          contributesTo: [
            { alphaName: "Cognitive-Optimized Way of Working", stateName: "Working Well" },
          ],
        },
      ],
    },
  ],
  activities: [
    {
      name: "Define Service Boundaries (ISH)",
      description: "Apply Independent Service Heuristics",
      activitySpaceName: "Explore Possibilities",
      contributesTo: [
        { alphaName: "Topology-Aligned Team", stateName: "Seeded" },
      ],
      worksOn: [
        { workProductName: "Team API Specification", levelOfDetailName: "Drafted" },
      ],
    },
    {
      name: "Establish Team Interactions",
      description: "Define temporal and functional communication mechanics",
      activitySpaceName: "Explore Possibilities",
      contributesTo: [
        { alphaName: "Topology-Aligned Team", stateName: "Formed" },
      ],
      worksOn: [
        { workProductName: "Team API Specification", levelOfDetailName: "Published" },
      ],
    },
    {
      name: "Assess Cognitive Load",
      description: "Periodic telemetry evaluations",
      activitySpaceName: "Explore Possibilities",
      contributesTo: [
        { alphaName: "Cognitive-Optimized Way of Working", stateName: "Principles Established" },
      ],
      worksOn: [
        { workProductName: "Cognitive Load Assessment", levelOfDetailName: "Qualitative" },
      ],
    },
  ],
};

console.log("=".repeat(80));
console.log("SANKEY FLOW EXTRACTION DEMO");
console.log("=".repeat(80));
console.log();

const flowData = extractSankeyFlowData(samplePractice);
const stats = calculateFlowStats(flowData);

console.log("📊 Flow Statistics:");
console.log(`   Activities:     ${stats.activityCount}`);
console.log(`   Work Products:  ${stats.workProductCount}`);
console.log(`   Alpha States:   ${stats.alphaStateCount}`);
console.log(`   Total Flows:    ${stats.linkCount}`);
console.log(`   Flow Value:     ${stats.totalFlow}`);
console.log();

console.log("🔵 ACTIVITIES (Left Column):");
flowData.nodes
  .filter((n) => n.category === "activity")
  .forEach((n, i) => {
    console.log(`   ${i + 1}. ${n.name}`);
    if (n.description) console.log(`      └─ ${n.description}`);
  });
console.log();

console.log("🟠 WORK PRODUCTS (Middle Column):");
flowData.nodes
  .filter((n) => n.category === "workProduct")
  .forEach((n, i) => {
    console.log(`   ${i + 1}. ${n.name}`);
  });
console.log();

console.log("🟢 ALPHA STATES (Right Column):");
flowData.nodes
  .filter((n) => n.category === "alphaState")
  .forEach((n, i) => {
    console.log(`   ${i + 1}. ${n.name}`);
  });
console.log();

console.log("➡️  FLOWS:");
flowData.links.forEach((link, i) => {
  const source = flowData.nodes.find((n) => n.id === link.source);
  const target = flowData.nodes.find((n) => n.id === link.target);
  console.log(`   ${i + 1}. ${source?.name} ──(${link.value})──> ${target?.name}`);
});
console.log();

console.log("=".repeat(80));
console.log("This data powers the interactive Sankey diagram visualization!");
console.log("Visit http://localhost:3000/flow-visualizer to see it live.");
console.log("=".repeat(80));
