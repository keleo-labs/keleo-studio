import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load example data
const libraryPath = join(__dirname, '../practices/adoption-library.json');
const library = JSON.parse(readFileSync(libraryPath, 'utf8'));

// Find a practice with activities that contribute to multiple states
const practice = library.find(p =>
  p.name === 'Continuous Delivery Foundation' &&
  p.activities && p.activities.length > 0 &&
  p.personaGroups && p.personaGroups.length > 0
);

if (!practice) {
  console.error('No suitable practice found in library');
  process.exit(1);
}

console.log(`Using practice: ${practice.name}\n`);

// Simple implementation to test the logic
function extractProgressiveFlowData(practice) {
  const alphas = Array.isArray(practice.alphas) ? practice.alphas : [];

  // Index alpha state sequences
  const alphaStateSeq = new Map();
  for (const alpha of alphas) {
    const alphaName = String(alpha.name ?? "").trim();
    if (!alphaName) continue;

    const stateMap = new Map();
    const states = Array.isArray(alpha.states) ? alpha.states : [];

    for (const state of states) {
      const stateName = String(state.name ?? "").trim();
      const seq = typeof state.seq === "number" ? state.seq : 0;
      if (stateName) {
        stateMap.set(stateName, seq);
      }
    }

    alphaStateSeq.set(alphaName, stateMap);
  }

  // Collect activities
  const activities = [];
  const activitySpaces = Array.isArray(practice.activitySpaces) ? practice.activitySpaces : [];
  for (const space of activitySpaces) {
    const spaceActivities = Array.isArray(space.activities) ? space.activities : [];
    activities.push(...spaceActivities);
  }

  const flatActivities = Array.isArray(practice.activities) ? practice.activities : [];
  activities.push(...flatActivities);

  // Get unique PersonaGroups
  const personaGroupsSet = new Set();
  for (const activity of activities) {
    const involves = Array.isArray(activity.involves) ? activity.involves : [];
    for (const pg of involves) {
      const pgName = String(pg ?? "").trim();
      if (pgName) personaGroupsSet.add(pgName);
    }
  }

  console.log(`Found ${personaGroupsSet.size} PersonaGroups`);
  console.log(`Found ${activities.length} total activities`);

  // Test with first PersonaGroup
  const firstPG = Array.from(personaGroupsSet)[0];
  console.log(`\nTesting with PersonaGroup: ${firstPG}`);

  const pgActivities = activities.filter((activity) => {
    const involves = Array.isArray(activity.involves) ? activity.involves : [];
    return involves.some((pg) => String(pg ?? "").trim() === firstPG);
  });

  console.log(`  Found ${pgActivities.length} activities for this PersonaGroup`);

  // Show activity contributions
  for (const activity of pgActivities) {
    const activityName = String(activity.name ?? "").trim();
    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

    console.log(`\n  Activity: ${activityName}`);
    console.log(`    Contributes to ${contributesTo.length} alpha states:`);

    for (const contrib of contributesTo) {
      const alphaName = String(contrib.alphaName ?? "").trim();
      const stateName = String(contrib.stateName ?? "").trim();
      const stateSeq = alphaStateSeq.get(alphaName)?.get(stateName) ?? '?';

      console.log(`      - ${alphaName} → [${stateName}] (seq: ${stateSeq})`);
    }
  }

  // Show expected flow structure
  console.log(`\n\n=== Expected Flow Structure ===`);

  // Build alpha threads
  const alphaThreads = new Map();

  for (const activity of pgActivities) {
    const activityName = String(activity.name ?? "").trim();
    if (!activityName) continue;

    const contributesTo = Array.isArray(activity.contributesTo) ? activity.contributesTo : [];

    for (const contrib of contributesTo) {
      const alphaName = String(contrib.alphaName ?? "").trim();
      const stateName = String(contrib.stateName ?? "").trim();

      if (alphaName && stateName) {
        const stateSeq = alphaStateSeq.get(alphaName)?.get(stateName) ?? 0;

        if (!alphaThreads.has(alphaName)) {
          alphaThreads.set(alphaName, { alphaName, pairs: [] });
        }

        alphaThreads.get(alphaName).pairs.push({
          activityName,
          stateName,
          stateSeq,
        });
      }
    }
  }

  // Sort pairs within each alpha thread by stateSeq
  for (const thread of alphaThreads.values()) {
    thread.pairs.sort((a, b) => {
      if (a.stateSeq !== b.stateSeq) return a.stateSeq - b.stateSeq;
      return a.stateName.localeCompare(b.stateName);
    });
  }

  // Display threads
  for (const [alphaName, thread] of alphaThreads) {
    console.log(`\nAlpha: ${alphaName}`);
    let flow = `[${firstPG}]`;

    for (const pair of thread.pairs) {
      flow += ` → [${pair.activityName}] → [${alphaName}:${pair.stateName}]`;
    }

    console.log(`  ${flow}`);
  }
}

try {
  extractProgressiveFlowData(practice);
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
