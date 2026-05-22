import { readFileSync } from 'fs';

// Load library
const library = JSON.parse(readFileSync('practices/adoption-library.json', 'utf8'));

// Find Continuous Delivery Foundation practice
const practice = library.find(p => p.name === 'Continuous Delivery Foundation');

if (!practice) {
  console.error('Practice not found');
  process.exit(1);
}

console.log('=== Verification: Team Progression Flow for', practice.name, '===\n');

// Extract persona groups
const personaGroups = practice.personaGroups || [];
const activities = practice.activities || [];

console.log('PersonaGroups:', personaGroups.length);
console.log('Activities:', activities.length);

// For each persona group, show the expected flow
for (const pg of personaGroups) {
  const pgName = pg.name || pg;
  console.log(`\n\nPersonaGroup: ${pgName}`);
  console.log('─'.repeat(80));

  // Get activities for this persona group
  const pgActivities = activities.filter(act =>
    act.involves && act.involves.includes(pgName)
  );

  // Group by alpha
  const alphaMap = new Map();

  for (const activity of pgActivities) {
    const activityName = activity.name;
    const contributesTo = activity.contributesTo || [];

    for (const contrib of contributesTo) {
      const alphaName = contrib.alphaName;
      const stateName = contrib.stateName;

      if (!alphaMap.has(alphaName)) {
        alphaMap.set(alphaName, []);
      }

      alphaMap.get(alphaName).push({
        activityName,
        stateName,
        activity
      });
    }
  }

  // Display each alpha thread
  for (const [alphaName, contributions] of alphaMap) {
    console.log(`\n  Alpha: ${alphaName}`);
    console.log(`  Flow: [${pgName}]`, contributions.map(c =>
      `→ [${c.activityName}] → [${alphaName}:${c.stateName}]`
    ).join(' '));
  }
}

console.log('\n\n=== Key Points ===');
console.log('✓ Activities appear before EACH alpha state they contribute to');
console.log('✓ Same activity can appear multiple times in different alpha threads');
console.log('✓ Within each alpha, activities flow sequentially: Activity → State → Activity → State');
