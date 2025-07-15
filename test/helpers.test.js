import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

export async function runHelperTests() {
  console.log('🧪 VN Engine Helper Functions Tests (Package-based)');
  console.log('==================================================\n');

  const { reporter, assert } = createTestReporter();
  const tests = [];
  let passed = 0;
  let failed = 0;
  let helpers = null;
  let createVNEngine = null;
  let packageInfo = null;

  reporter.setContext({ category: 'helper-functions-packaged' });

  // Package setup
  console.log('📦 Setting up packaged library for helper testing...');
  
  try {
    const importPath = await createTestPackage({
      includeDependencies: false,
      customPackageJson: {}
    });
    
    console.log(`✅ Package created, import path: ${importPath}`);
    
    await verifyTestPackage();
    console.log('✅ Package verification successful');
    
    packageInfo = getPackageInfo();
    console.log(`📦 Testing package: ${packageInfo.name}@${packageInfo.version}\n`);
    
    const packagedLibrary = await import(importPath);
    createVNEngine = packagedLibrary.createVNEngine;
    helpers = packagedLibrary.helpers;
    
    if (!createVNEngine) {
      throw new Error('createVNEngine not exported from packaged library');
    }
    
    if (!helpers) {
      throw new Error('helpers not exported from packaged library');
    }
    
    console.log('✅ Successfully imported helpers from packaged library\n');
    
  } catch (error) {
    console.error('❌ Package setup failed:', error.message);
    await cleanupTestPackage();
    throw error;
  }

  function test(name, testFn) {
    tests.push({ name, testFn });
  }

  // Array Helper Tests
  test('Array Helpers - Basic Operations', async () => {
    reporter.startTest('Array Helpers - Basic Operations');
    reporter.setContext({ subcategory: 'array-helpers' });
    
    const testArray = [1, 2, 3, 4, 5];
    const emptyArray = [];
    
    // first/last
    assert.assertEqual(helpers.array.first(testArray), 1, 'first() should return first element', {
      input: testArray,
      result: helpers.array.first(testArray)
    });
    
    assert.assertEqual(helpers.array.last(testArray), 5, 'last() should return last element', {
      input: testArray,
      result: helpers.array.last(testArray)
    });
    
    const firstTwo = helpers.array.first(testArray, 2);
    assert.assert(Array.isArray(firstTwo), 'first(n) should return array', true, Array.isArray(firstTwo), {
      input: testArray,
      result: firstTwo
    });
    
    // length
    assert.assertEqual(helpers.array.length(testArray), 5, 'length() should return correct length', {
      input: testArray,
      result: helpers.array.length(testArray)
    });
    
    assert.assertEqual(helpers.array.length(emptyArray), 0, 'length() should handle empty arrays', {
      input: emptyArray,
      result: helpers.array.length(emptyArray)
    });
    
    // includes
    assert.assert(helpers.array.includes(testArray, 3), 'includes() should find existing element', true, helpers.array.includes(testArray, 3), {
      input: testArray,
      searchFor: 3
    });
    
    assert.assert(!helpers.array.includes(testArray, 10), 'includes() should not find non-existing element', false, helpers.array.includes(testArray, 10), {
      input: testArray,
      searchFor: 10
    });
    
    // isEmpty
    assert.assert(helpers.array.isEmpty(emptyArray), 'isEmpty() should detect empty array', true, helpers.array.isEmpty(emptyArray), {
      input: emptyArray
    });
    
    assert.assert(!helpers.array.isEmpty(testArray), 'isEmpty() should detect non-empty array', false, helpers.array.isEmpty(testArray), {
      input: testArray
    });
    
    console.log('   ✅ Basic array operations working');
  });

  test('Array Helpers - Manipulation Operations', async () => {
    reporter.startTest('Array Helpers - Manipulation Operations');
    reporter.setContext({ subcategory: 'array-helpers' });
    
    const testArray = [1, 2, 3, 4, 5];
    const objectArray = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 25 }
    ];
    
    // filter
    const evens = helpers.array.filter(testArray, (x) => x % 2 === 0);
    assert.assertEqual(evens.length, 2, 'filter() should return correct number of elements', {
      input: testArray,
      result: evens
    });
    
    // find
    const found = helpers.array.find(testArray, (x) => x > 3);
    assert.assertEqual(found, 4, 'find() should return first matching element', {
      input: testArray,
      result: found
    });
    
    // map
    const doubled = helpers.array.map(testArray, (x) => x * 2);
    assert.assertEqual(doubled[0], 2, 'map() should transform elements correctly', {
      input: testArray,
      result: doubled
    });
    
    // pluck
    const names = helpers.array.pluck(objectArray, 'name');
    assert.assertEqual(names.length, 3, 'pluck() should extract property values', {
      input: objectArray,
      result: names
    });
    assert.assertEqual(names[0], 'Alice', 'pluck() should extract correct values', {
      input: objectArray,
      result: names
    });
    
    // join
    const joined = helpers.array.join(testArray, '-');
    assert.assertEqual(joined, '1-2-3-4-5', 'join() should concatenate with separator', {
      input: testArray,
      separator: '-',
      result: joined
    });
    
    // groupBy
    const grouped = helpers.array.groupBy(objectArray, 'age');
    assert.assertDefined(grouped['25'], 'groupBy() should create groups', {
      input: objectArray,
      result: grouped
    });
    assert.assertEqual(grouped['25'].length, 2, 'groupBy() should group correctly', {
      input: objectArray,
      result: grouped
    });
    
    console.log('   ✅ Array manipulation operations working');
  });

  test('Array Helpers - Advanced Operations', async () => {
    reporter.startTest('Array Helpers - Advanced Operations');
    reporter.setContext({ subcategory: 'array-helpers' });
    
    const testArray = [1, 2, 3, 4, 5, 1, 2];
    const nestedArray = [[1, 2], [3, 4], [5]];
    
    // unique
    const unique = helpers.array.unique(testArray);
    assert.assertEqual(unique.length, 5, 'unique() should remove duplicates', {
      input: testArray,
      result: unique
    });
    
    // shuffle (test that it returns same length)
    const shuffled = helpers.array.shuffle(testArray);
    assert.assertEqual(shuffled.length, testArray.length, 'shuffle() should preserve length', {
      input: testArray,
      result: shuffled
    });
    
    // chunk
    const chunked = helpers.array.chunk(testArray, 3);
    assert.assert(Array.isArray(chunked), 'chunk() should return array of arrays', true, Array.isArray(chunked), {
      input: testArray,
      chunkSize: 3,
      result: chunked
    });
    
    // slice
    const sliced = helpers.array.slice(testArray, 1, 4);
    assert.assertEqual(sliced.length, 3, 'slice() should return correct portion', {
      input: testArray,
      start: 1,
      end: 4,
      result: sliced
    });
    
    // take
    const taken = helpers.array.take(testArray, 3);
    assert.assertEqual(taken.length, 3, 'take() should return correct number of elements', {
      input: testArray,
      count: 3,
      result: taken
    });
    
    // flatten
    const flattened = helpers.array.flatten(nestedArray);
    assert.assertEqual(flattened.length, 5, 'flatten() should flatten nested arrays', {
      input: nestedArray,
      result: flattened
    });
    
    // reverse
    const reversed = helpers.array.reverse(testArray);
    assert.assertEqual(reversed[0], testArray[testArray.length - 1], 'reverse() should reverse array', {
      input: testArray,
      result: reversed
    });
    
    // compact
    const withNulls = [1, null, 2, undefined, 3, false, 0, ''];
    const compacted = helpers.array.compact(withNulls);
    assert.assertEqual(compacted.length, 3, 'compact() should remove falsy values', {
      input: withNulls,
      result: compacted
    });
    
    console.log('   ✅ Advanced array operations working');
  });

  // Comparison Helper Tests
  test('Comparison Helpers - Basic Comparisons', async () => {
    reporter.startTest('Comparison Helpers - Basic Comparisons');
    reporter.setContext({ subcategory: 'comparison-helpers' });
    
    // Equality
    assert.assert(helpers.comparison.eq(5, 5), 'eq() should compare equal values', true, helpers.comparison.eq(5, 5), {
      a: 5, b: 5
    });
    
    assert.assert(!helpers.comparison.eq(5, 3), 'eq() should compare unequal values', false, helpers.comparison.eq(5, 3), {
      a: 5, b: 3
    });
    
    assert.assert(helpers.comparison.ne(5, 3), 'ne() should detect inequality', true, helpers.comparison.ne(5, 3), {
      a: 5, b: 3
    });
    
    // Numeric comparisons
    assert.assert(helpers.comparison.gt(5, 3), 'gt() should compare greater than', true, helpers.comparison.gt(5, 3), {
      a: 5, b: 3
    });
    
    assert.assert(helpers.comparison.gte(5, 5), 'gte() should handle equal values', true, helpers.comparison.gte(5, 5), {
      a: 5, b: 5
    });
    
    assert.assert(helpers.comparison.lt(3, 5), 'lt() should compare less than', true, helpers.comparison.lt(3, 5), {
      a: 3, b: 5
    });
    
    assert.assert(helpers.comparison.lte(3, 3), 'lte() should handle equal values', true, helpers.comparison.lte(3, 3), {
      a: 3, b: 3
    });
    
    console.log('   ✅ Basic comparison operations working');
  });

  test('Comparison Helpers - Logical Operations', async () => {
    reporter.startTest('Comparison Helpers - Logical Operations');
    reporter.setContext({ subcategory: 'comparison-helpers' });
    
    // Logical operations
    assert.assert(helpers.comparison.and(true, true, 1, 'text'), 'and() should work with all truthy values', true, helpers.comparison.and(true, true, 1, 'text'), {
      inputs: [true, true, 1, 'text']
    });
    
    assert.assert(!helpers.comparison.and(true, false, 1), 'and() should fail with one falsy value', false, helpers.comparison.and(true, false, 1), {
      inputs: [true, false, 1]
    });
    
    assert.assert(helpers.comparison.or(false, false, 1), 'or() should succeed with one truthy value', true, helpers.comparison.or(false, false, 1), {
      inputs: [false, false, 1]
    });
    
    assert.assert(!helpers.comparison.or(false, 0, ''), 'or() should fail with all falsy values', false, helpers.comparison.or(false, 0, ''), {
      inputs: [false, 0, '']
    });
    
    assert.assert(helpers.comparison.not(false), 'not() should invert falsy value', true, helpers.comparison.not(false), {
      input: false
    });
    
    assert.assert(!helpers.comparison.not(true), 'not() should invert truthy value', false, helpers.comparison.not(true), {
      input: true
    });
    
    console.log('   ✅ Logical operations working');
  });

  test('Comparison Helpers - Type Checking', async () => {
    reporter.startTest('Comparison Helpers - Type Checking');
    reporter.setContext({ subcategory: 'comparison-helpers' });
    
    // Type checking
    assert.assert(helpers.comparison.isString('hello'), 'isString() should detect strings', true, helpers.comparison.isString('hello'), {
      input: 'hello'
    });
    
    assert.assert(!helpers.comparison.isString(123), 'isString() should reject non-strings', false, helpers.comparison.isString(123), {
      input: 123
    });
    
    assert.assert(helpers.comparison.isNumber(123), 'isNumber() should detect numbers', true, helpers.comparison.isNumber(123), {
      input: 123
    });
    
    assert.assert(!helpers.comparison.isNumber('123'), 'isNumber() should reject string numbers', false, helpers.comparison.isNumber('123'), {
      input: '123'
    });
    
    assert.assert(helpers.comparison.isArray([1, 2, 3]), 'isArray() should detect arrays', true, helpers.comparison.isArray([1, 2, 3]), {
      input: [1, 2, 3]
    });
    
    assert.assert(helpers.comparison.isObject({a: 1}), 'isObject() should detect objects', true, helpers.comparison.isObject({a: 1}), {
      input: {a: 1}
    });
    
    assert.assert(!helpers.comparison.isObject([1, 2, 3]), 'isObject() should reject arrays', false, helpers.comparison.isObject([1, 2, 3]), {
      input: [1, 2, 3]
    });
    
    assert.assert(helpers.comparison.isBoolean(true), 'isBoolean() should detect booleans', true, helpers.comparison.isBoolean(true), {
      input: true
    });
    
    console.log('   ✅ Type checking operations working');
  });

  // Math Helper Tests
  test('Math Helpers - Basic Arithmetic', async () => {
    reporter.startTest('Math Helpers - Basic Arithmetic');
    reporter.setContext({ subcategory: 'math-helpers' });
    
    // Basic arithmetic
    assert.assertEqual(helpers.math.add(5, 3), 8, 'add() should perform addition', {
      a: 5, b: 3, result: helpers.math.add(5, 3)
    });
    
    assert.assertEqual(helpers.math.subtract(5, 3), 2, 'subtract() should perform subtraction', {
      a: 5, b: 3, result: helpers.math.subtract(5, 3)
    });
    
    assert.assertEqual(helpers.math.multiply(5, 3), 15, 'multiply() should perform multiplication', {
      a: 5, b: 3, result: helpers.math.multiply(5, 3)
    });
    
    assert.assertEqual(helpers.math.divide(15, 3), 5, 'divide() should perform division', {
      a: 15, b: 3, result: helpers.math.divide(15, 3)
    });
    
    assert.assertEqual(helpers.math.divide(5, 0), 0, 'divide() should handle division by zero', {
      a: 5, b: 0, result: helpers.math.divide(5, 0)
    });
    
    assert.assertEqual(helpers.math.remainder(7, 3), 1, 'remainder() should calculate modulo', {
      a: 7, b: 3, result: helpers.math.remainder(7, 3)
    });
    
    console.log('   ✅ Basic arithmetic operations working');
  });

  test('Math Helpers - Mathematical Functions', async () => {
    reporter.startTest('Math Helpers - Mathematical Functions');
    reporter.setContext({ subcategory: 'math-helpers' });
    
    // Mathematical functions
    assert.assertEqual(helpers.math.abs(-5), 5, 'abs() should return absolute value', {
      input: -5, result: helpers.math.abs(-5)
    });
    
    assert.assertEqual(helpers.math.min(5, 3, 8, 1), 1, 'min() should return minimum value', {
      inputs: [5, 3, 8, 1], result: helpers.math.min(5, 3, 8, 1)
    });
    
    assert.assertEqual(helpers.math.max(5, 3, 8, 1), 8, 'max() should return maximum value', {
      inputs: [5, 3, 8, 1], result: helpers.math.max(5, 3, 8, 1)
    });
    
    assert.assertEqual(helpers.math.round(3.7), 4, 'round() should round to nearest integer', {
      input: 3.7, result: helpers.math.round(3.7)
    });
    
    assert.assertEqual(helpers.math.round(3.14159, 2), 3.14, 'round() should round to specified precision', {
      input: 3.14159, precision: 2, result: helpers.math.round(3.14159, 2)
    });
    
    assert.assertEqual(helpers.math.ceil(3.2), 4, 'ceil() should round up', {
      input: 3.2, result: helpers.math.ceil(3.2)
    });
    
    assert.assertEqual(helpers.math.floor(3.8), 3, 'floor() should round down', {
      input: 3.8, result: helpers.math.floor(3.8)
    });
    
    console.log('   ✅ Mathematical functions working');
  });

  test('Math Helpers - Statistical Functions', async () => {
    reporter.startTest('Math Helpers - Statistical Functions');
    reporter.setContext({ subcategory: 'math-helpers' });
    
    const testArray = [1, 2, 3, 4, 5];
    
    // Statistical functions
    assert.assertEqual(helpers.math.sum(testArray), 15, 'sum() should calculate total', {
      input: testArray, result: helpers.math.sum(testArray)
    });
    
    assert.assertEqual(helpers.math.average(testArray), 3, 'average() should calculate mean', {
      input: testArray, result: helpers.math.average(testArray)
    });
    
    assert.assertEqual(helpers.math.percentage(25, 100), 25, 'percentage() should calculate percentage', {
      value: 25, total: 100, result: helpers.math.percentage(25, 100)
    });
    
    // Clamp function
    assert.assertEqual(helpers.math.clamp(5, 0, 10), 5, 'clamp() should preserve value within range', {
      value: 5, min: 0, max: 10, result: helpers.math.clamp(5, 0, 10)
    });
    
    assert.assertEqual(helpers.math.clamp(-5, 0, 10), 0, 'clamp() should clamp to minimum', {
      value: -5, min: 0, max: 10, result: helpers.math.clamp(-5, 0, 10)
    });
    
    assert.assertEqual(helpers.math.clamp(15, 0, 10), 10, 'clamp() should clamp to maximum', {
      value: 15, min: 0, max: 10, result: helpers.math.clamp(15, 0, 10)
    });
    
    // Random functions (test they return values in expected range)
    const randomValue = helpers.math.random(1, 10);
    assert.assert(randomValue >= 1 && randomValue <= 10, 'random() should return value in range', true, randomValue >= 1 && randomValue <= 10, {
      min: 1, max: 10, result: randomValue
    });
    
    const randomInt = helpers.math.randomInt(1, 5);
    assert.assert(Number.isInteger(randomInt) && randomInt >= 1 && randomInt <= 5, 'randomInt() should return integer in range', true, Number.isInteger(randomInt) && randomInt >= 1 && randomInt <= 5, {
      min: 1, max: 5, result: randomInt
    });
    
    console.log('   ✅ Statistical functions working');
  });

  // String Helper Tests
  test('String Helpers - Case Conversion', async () => {
    reporter.startTest('String Helpers - Case Conversion');
    reporter.setContext({ subcategory: 'string-helpers' });
    
    const testString = 'hello world';
    
    // Case conversion
    assert.assertEqual(helpers.string.uppercase(testString), 'HELLO WORLD', 'uppercase() should convert to uppercase', {
      input: testString, result: helpers.string.uppercase(testString)
    });
    
    assert.assertEqual(helpers.string.lowercase('HELLO WORLD'), 'hello world', 'lowercase() should convert to lowercase', {
      input: 'HELLO WORLD', result: helpers.string.lowercase('HELLO WORLD')
    });
    
    assert.assertEqual(helpers.string.capitalize(testString), 'Hello world', 'capitalize() should capitalize first letter', {
      input: testString, result: helpers.string.capitalize(testString)
    });
    
    assert.assertEqual(helpers.string.capitalizeFirst('hello WORLD'), 'Hello WORLD', 'capitalizeFirst() should only capitalize first letter', {
      input: 'hello WORLD', result: helpers.string.capitalizeFirst('hello WORLD')
    });
    
    assert.assertEqual(helpers.string.titleCase('hello world test'), 'Hello World Test', 'titleCase() should capitalize each word', {
      input: 'hello world test', result: helpers.string.titleCase('hello world test')
    });
    
    console.log('   ✅ String case conversion working');
  });

  test('String Helpers - String Manipulation', async () => {
    reporter.startTest('String Helpers - String Manipulation');
    reporter.setContext({ subcategory: 'string-helpers' });
    
    // String manipulation
    assert.assertEqual(helpers.string.trim('  hello world  '), 'hello world', 'trim() should remove whitespace', {
      input: '  hello world  ', result: helpers.string.trim('  hello world  ')
    });
    
    assert.assertEqual(helpers.string.truncate('hello world', 5), 'he...', 'truncate() should truncate with ellipsis', {
      input: 'hello world', length: 5, result: helpers.string.truncate('hello world', 5)
    });
    
    assert.assertEqual(helpers.string.truncate('hello world', 5, '!'), 'hell!', 'truncate() should use custom suffix', {
      input: 'hello world', length: 5, suffix: '!', result: helpers.string.truncate('hello world', 5, '!')
    });
    
    assert.assertEqual(helpers.string.replace('hello world', 'world', 'universe'), 'hello universe', 'replace() should replace text', {
      input: 'hello world', search: 'world', replacement: 'universe', result: helpers.string.replace('hello world', 'world', 'universe')
    });
    
    assert.assertEqual(helpers.string.remove('hello world', ' world'), 'hello', 'remove() should remove text', {
      input: 'hello world', target: ' world', result: helpers.string.remove('hello world', ' world')
    });
    
    assert.assertEqual(helpers.string.reverse('hello'), 'olleh', 'reverse() should reverse string', {
      input: 'hello', result: helpers.string.reverse('hello')
    });
    
    assert.assertEqual(helpers.string.repeat('ha', 3), 'hahaha', 'repeat() should repeat string', {
      input: 'ha', count: 3, result: helpers.string.repeat('ha', 3)
    });
    
    console.log('   ✅ String manipulation working');
  });

  test('String Helpers - String Analysis', async () => {
    reporter.startTest('String Helpers - String Analysis');
    reporter.setContext({ subcategory: 'string-helpers' });
    
    const testString = 'hello world';
    
    // String analysis
    assert.assert(helpers.string.startsWith(testString, 'hello'), 'startsWith() should detect start', true, helpers.string.startsWith(testString, 'hello'), {
      input: testString, searchString: 'hello'
    });
    
    assert.assert(!helpers.string.startsWith(testString, 'world'), 'startsWith() should reject wrong start', false, helpers.string.startsWith(testString, 'world'), {
      input: testString, searchString: 'world'
    });
    
    assert.assert(helpers.string.endsWith(testString, 'world'), 'endsWith() should detect end', true, helpers.string.endsWith(testString, 'world'), {
      input: testString, searchString: 'world'
    });
    
    assert.assert(helpers.string.includes(testString, 'llo wo'), 'includes() should find substring', true, helpers.string.includes(testString, 'llo wo'), {
      input: testString, searchString: 'llo wo'
    });
    
    const words = helpers.string.words('hello world test');
    assert.assertEqual(words.length, 3, 'words() should split into words', {
      input: 'hello world test', result: words
    });
    
    assert.assertEqual(helpers.string.wordCount('hello world test'), 3, 'wordCount() should count words', {
      input: 'hello world test', result: helpers.string.wordCount('hello world test')
    });
    
    assert.assertEqual(helpers.string.substring('hello world', 6), 'world', 'substring() should extract substring', {
      input: 'hello world', start: 6, result: helpers.string.substring('hello world', 6)
    });
    
    console.log('   ✅ String analysis working');
  });

  test('VN Helpers - Utility Functions', async () => {
    reporter.startTest('VN Helpers - Utility Functions');
    reporter.setContext({ subcategory: 'vn-helpers' });
    
    // Utility functions
    assert.assertEqual(helpers.vn.formatTime(65), '1h 5m', 'formatTime() should format hours and minutes', {
      input: 65, result: helpers.vn.formatTime(65)
    });
    
    assert.assertEqual(helpers.vn.formatTime(45), '45m', 'formatTime() should format minutes only', {
      input: 45, result: helpers.vn.formatTime(45)
    });
    
    // randomBool (test it returns boolean)
    const randomResult = helpers.vn.randomBool(0.5);
    assert.assertType(randomResult, 'boolean', 'randomBool() should return boolean', {
      probability: 0.5, result: randomResult
    });
    
    // Always true and always false
    assert.assert(helpers.vn.randomBool(1), 'randomBool(1) should always return true', true, helpers.vn.randomBool(1), {
      probability: 1
    });
    
    assert.assert(!helpers.vn.randomBool(0), 'randomBool(0) should always return false', false, helpers.vn.randomBool(0), {
      probability: 0
    });
    
    console.log('   ✅ VN utility functions working');
  });

  // Test Handlebars Integration (if available)
  test('Handlebars Integration Test', async () => {
    reporter.startTest('Handlebars Integration Test');
    reporter.setContext({ subcategory: 'handlebars-integration' });
    
    const engine = await createVNEngine();
    const engineInfo = engine.getTemplateEngineInfo();
    
    if (engineInfo.type === 'handlebars' && engineInfo.helpersRegistered) {
      console.log('   🎯 Testing Handlebars helper integration...');
      
      // Set up some test data
      engine.setVariable('testNumber', 10);
      engine.setVariable('testArray', [1, 2, 3, 4, 5]);
      engine.setVariable('testString', 'hello world');
      
      // Test some template rendering with helpers
      const mathTemplate = '{{add testNumber 5}}';
      const mathResult = engine.parseTemplate(mathTemplate);
      assert.assertEqual(mathResult, '15', 'Math helpers should work in templates', {
        template: mathTemplate, result: mathResult
      });
      
      const stringTemplate = '{{uppercase testString}}';
      const stringResult = engine.parseTemplate(stringTemplate);
      assert.assertEqual(stringResult, 'HELLO WORLD', 'String helpers should work in templates', {
        template: stringTemplate, result: stringResult
      });
      
      const arrayTemplate = '{{length testArray}}';
      const arrayResult = engine.parseTemplate(arrayTemplate);
      assert.assertEqual(arrayResult, '5', 'Array helpers should work in templates', {
        template: arrayTemplate, result: arrayResult
      });
      
      console.log('   ✅ Handlebars integration working');
    } else {
      console.log('   ℹ️ Handlebars not available, using simple template engine');
      
      // Test simple template engine with basic functionality
      engine.setVariable('testVar', 42);
      const simpleResult = engine.parseTemplate('Value: {{testVar}}');
      assert.assertEqual(simpleResult, 'Value: 42', 'Simple template engine should work', {
        result: simpleResult
      });
      
      console.log('   ✅ Simple template engine working');
    }
  });

  // Run all tests
  console.log('🔍 Running helper function tests...\n');

  for (const { name, testFn } of tests) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test package...');
  try {
    await cleanupTestPackage();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.warn(`⚠️ Cleanup failed: ${error.message}`);
  }

  // Summary
  if (reporter.errors.length > 0) {
    console.log(reporter.generateSummary());
  }

  console.log(`\n📊 Helper Function Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (packageInfo) {
    console.log(`📦 Tested Package: ${packageInfo.name}@${packageInfo.version}`);
  }

  if (failed > 0) {
    console.log('\n🔧 Review the detailed error analysis above for debugging information');
    return { passed, failed, success: false, errors: reporter.exportErrors(), packageInfo };
  } else {
    console.log('\n🎉 All helper function tests passed!');
    return { passed, failed, success: true, errors: null, packageInfo };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHelperTests().then(results => {
    if (!results.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Helper function test runner failed:', error);
    process.exit(1);
  });
}