const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  verbose: true
});
addFormats(ajv);

// Read the files
const schemaPath = './web/public/language.schema.json';
const jsonPath = './practices/team-topologies-method.json';

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('Validating against schema...\n');

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    console.log('✓ JSON is VALID according to the schema!');
    console.log('\nSummary:');
    console.log(`  Method: ${data.name}`);
    console.log(`  Practices: ${data.practices?.length || 0}`);
    data.practices?.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name}`);
      console.log(`       - Alphas: ${p.alphas?.length || 0}`);
      console.log(`       - Activities: ${p.activities?.length || 0}`);
      console.log(`       - WorkProducts: ${p.workProducts?.length || 0}`);
      console.log(`       - Personas: ${p.personas?.length || 0}`);
      console.log(`       - Patterns: ${p.patterns?.length || 0}`);
    });
  } else {
    console.log('✗ JSON is INVALID\n');
    console.log('Validation errors:');
    validate.errors.forEach((error, idx) => {
      console.log(`\n${idx + 1}. ${error.instancePath || '(root)'}`);
      console.log(`   ${error.message}`);
      if (error.params) {
        console.log(`   Params:`, JSON.stringify(error.params, null, 2));
      }
    });
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
