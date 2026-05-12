const fs = require('fs');

// Read the files
const schemaPath = './web/public/language.schema.json';
const jsonPath = './practices/team-topologies-method.json';

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('✓ Both files are valid JSON');
  console.log(`✓ Schema file: ${schemaPath}`);
  console.log(`✓ Data file: ${jsonPath}`);

  // Basic structure validation
  console.log('\nValidating structure:');

  // Check if it's a Method or Practice
  if (data.practices) {
    console.log('✓ Root element is a Method (contains practices array)');
    console.log(`  - Method name: ${data.name || 'MISSING'}`);
    console.log(`  - Method description: ${data.description ? 'present' : 'MISSING'}`);
    console.log(`  - Number of practices: ${data.practices.length}`);
    console.log(`  - Baseline practice name: ${data.baselinePracticeName || 'MISSING'}`);

    if (!data.name) console.error('✗ ERROR: Method.name is required');
    if (!data.description) console.error('✗ ERROR: Method.description is required');
    if (!data.baselinePracticeName) console.error('✗ ERROR: Method.baselinePracticeName is required');

    // Validate each practice
    data.practices.forEach((practice, idx) => {
      console.log(`\n  Practice ${idx + 1}:`);
      console.log(`    - Name: ${practice.name || 'MISSING'}`);
      console.log(`    - Alphas: ${practice.alphas?.length || 0}`);
      console.log(`    - Activities: ${practice.activities?.length || 0}`);
      console.log(`    - WorkProducts: ${practice.workProducts?.length || 0}`);
      console.log(`    - Patterns: ${practice.patterns?.length || 0}`);
      console.log(`    - Personas: ${practice.personas?.length || 0}`);

      if (!practice.name) console.error('    ✗ ERROR: Practice.name is required');
      if (!practice.description) console.error('    ✗ ERROR: Practice.description is required');
    });
  } else {
    console.log('✓ Root element is a single Practice');
    console.log(`  - Practice name: ${data.name || 'MISSING'}`);
    if (!data.name) console.error('✗ ERROR: Practice.name is required');
  }

  console.log('\n✓ Basic validation complete');
  console.log('\nNote: For full JSON Schema validation, install ajv with draft-07 support');

} catch (error) {
  console.error('✗ Validation failed:', error.message);
  process.exit(1);
}
