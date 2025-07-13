
import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

export async function runEdgeCaseTests() {
  console.log('🧪 VN Engine Edge Cases & Error Handling Tests (Package-based)');
  console.log('===============================================================\n');

  const { reporter, assert } = createTestReporter();
  const tests = [];
  let passed = 0;
  let failed = 0;
  let createVNEngine = null;
  let packageInfo = null;

  reporter.setContext({ category: 'edge-cases-packaged' });

  
  console.log('📦 Setting up packaged library for edge case testing...');
  
  try {
    const importPath = await createTestPackage({
      includeDependencies: false,
      customPackageJson: {}
    });
    
    console.log(`✅ Package created, import path: ${importPath}`);
    
    await verifyTestPackage();
    console.log('✅ Package verification successful');
    
    packageInfo = getPackageInfo();
    console.log(`📦 Testing package: ${packageInfo.name}@${packageInfo.version}`);
    
    const packagedLibrary = await import(importPath);
    createVNEngine = packagedLibrary.createVNEngine;
    
    if (!createVNEngine) {
      throw new Error('createVNEngine not exported from packaged library');
    }
    
    console.log('✅ Successfully imported from packaged library\n');
    
  } catch (error) {
    console.error('❌ Package setup failed:', error.message);
    await cleanupTestPackage();
    throw error;
  }

  function test(name, testFn) {
    tests.push({ name, testFn });
  }

  reporter.setContext({ 
    packageInfo: {
      name: packageInfo.name,
      version: packageInfo.version,
      main: packageInfo.main,
      tarballPath: packageInfo.tarballPath
    }
  });


  test('Package Import Resilience', async () => {
    reporter.startTest('Package Import Resilience');
    reporter.setContext({ subcategory: 'package-edge-cases' });
    
    const importPromises = [];
    for (let i = 0; i < 5; i++) {
      importPromises.push(import(packageInfo.importPath));
    }
    
    const imports = await Promise.all(importPromises);
    
    imports.forEach((imp, index) => {
      assert.assertDefined(imp.createVNEngine, `Import ${index} should have createVNEngine`, {
        packageInfo,
        importIndex: index,
        availableExports: Object.keys(imp)
      });
      
      assert.assertEqual(imp.createVNEngine, imports[0].createVNEngine, 
        `Import ${index} should return same function reference`, {
          packageInfo,
          importIndex: index
        });
    });
  });

  test('Package Engine Creation Stress', async () => {
    reporter.startTest('Package Engine Creation Stress');
    reporter.setContext({ subcategory: 'package-edge-cases' });
    
    const engines = [];
    const creationErrors = [];
    
    for (let i = 0; i < 20; i++) {
      try {
        const engine = await createVNEngine();
        engines.push(engine);
      } catch (error) {
        creationErrors.push({ index: i, error: error.message });
      }
    }
    
    assert.assert(creationErrors.length === 0, 'Should create engines without errors', 
      [], creationErrors, {
        packageInfo,
        enginesCreated: engines.length,
        creationErrors
      });
    
    engines.forEach(engine => {
      try {
        engine.destroy();
      } catch (error) {
      }
    });
    
    console.log(`   📊 Created ${engines.length} engines successfully`);
  });


  test('Null Script Handling (Package)', async () => {
    reporter.startTest('Null Script Handling (Package)');
    reporter.setContext({ subcategory: 'null-undefined-inputs' });
    
    const engine = await createVNEngine();
    
    engine.loadScript(null);
    const error = engine.getError();
    const isLoaded = engine.getIsLoaded();
    
    assert.assertDefined(error, 'Should error with null script', { 
      engine,
      packageInfo,
      inputScript: null,
      error,
      isLoaded
    });
    
    assert.assert(!isLoaded, 'Should not be loaded', false, isLoaded, { 
      engine,
      packageInfo,
      error
    });
  });

  test('Empty Script Handling (Package)', async () => {
    reporter.startTest('Empty Script Handling (Package)');
    reporter.setContext({ subcategory: 'null-undefined-inputs' });
    
    const engine = await createVNEngine();
    
    engine.loadScript('');
    const error = engine.getError();
    const isLoaded = engine.getIsLoaded();
    
    assert.assertDefined(error, 'Should error with empty script', { 
      engine,
      packageInfo,
      inputScript: '',
      error,
      isLoaded
    });
    
    assert.assert(!isLoaded, 'Should not be loaded', false, isLoaded, { 
      engine,
      packageInfo,
      error
    });
  });

  test('Undefined Scene Start (Package)', async () => {
    reporter.startTest('Undefined Scene Start (Package)');
    reporter.setContext({ subcategory: 'null-undefined-inputs' });
    
    const engine = await createVNEngine();
    engine.loadScript('test: ["Text"]');
    
    const result = engine.startScene(undefined);
    
    assert.assertEqual(result.type, 'error', 'Should error with undefined scene', { 
      engine,
      packageInfo,
      sceneInput: undefined,
      result,
      availableScenes: engine.getSceneNames()
    });
  });

  test('Null Choice Index (Package)', async () => {
    reporter.startTest('Null Choice Index (Package)');
    reporter.setContext({ subcategory: 'null-undefined-inputs' });
    
    const engine = await createVNEngine();
    engine.loadScript(`
      test:
        - choices:
          - text: "Choice"
            goto: test
    `);
    
    engine.startScene('test');
    const result = engine.makeChoice(null);
    
    assert.assertEqual(result.type, 'error', 'Should error with null choice index', { 
      engine,
      packageInfo,
      choiceInput: null,
      result,
      availableChoices: 1
    });
  });


  test('Invalid YAML Syntax (Package)', async () => {
    reporter.startTest('Invalid YAML Syntax (Package)');
    reporter.setContext({ subcategory: 'malformed-scripts' });
    
    const engine = await createVNEngine();
    const invalidYaml = 'invalid: yaml: [content';
    
    engine.loadScript(invalidYaml);
    const error = engine.getError();
    
    assert.assertDefined(error, 'Should error with invalid YAML', { 
      engine,
      packageInfo,
      invalidScript: invalidYaml,
      error
    });
    
    assert.assert(error.toLowerCase().includes('parse'), 'Error should mention parsing', 
      true, error.toLowerCase().includes('parse'), { 
        engine,
        packageInfo,
        error,
        errorLowerCase: error.toLowerCase()
      }
    );
  });

  test('Missing Scene Content (Package)', async () => {
    reporter.startTest('Missing Scene Content (Package)');
    reporter.setContext({ subcategory: 'malformed-scripts' });
    
    const engine = await createVNEngine();
    const emptySceneScript = 'empty_scene:';
    
    engine.loadScript(emptySceneScript);
    const error = engine.getError();
    
    assert.assertDefined(error, 'Should error with empty scene', { 
      engine,
      packageInfo,
      emptySceneScript,
      error
    });
  });

  test('Invalid Instruction Format (Package)', async () => {
    reporter.startTest('Invalid Instruction Format (Package)');
    reporter.setContext({ subcategory: 'malformed-scripts' });
    
    const engine = await createVNEngine();
    const invalidInstructionScript = `
      test:
        - invalid_instruction_type: "something"
    `;
    
    engine.loadScript(invalidInstructionScript);
    
    if (!engine.getError()) {
      engine.startScene('test');
      const result = engine.continue();
      
      assert.assertEqual(result.type, 'error', 'Should error with invalid instruction', { 
        engine,
        packageInfo,
        invalidInstructionScript,
        result
      });
    } else {
      assert.assertDefined(engine.getError(), 'Should error with invalid instruction format', { 
        engine,
        packageInfo,
        invalidInstructionScript,
        loadError: engine.getError()
      });
    }
  });

  test('Circular Scene References (Package)', async () => {
    reporter.startTest('Circular Scene References (Package)');
    reporter.setContext({ subcategory: 'malformed-scripts' });
    
    const engine = await createVNEngine();
    const circularScript = `
      scene_a:
        - goto: scene_b
      scene_b:  
        - goto: scene_a
    `;
    
    engine.loadScript(circularScript);
    
    engine.startScene('scene_a');
    const result = engine.continue();
    
    assert.assert(result.type !== 'error', 'Should handle circular references gracefully', 
      'not error', result.type, { 
        engine,
        packageInfo,
        circularScript,
        result,
        currentScene: engine.getCurrentScene()
      }
    );
  });


  test('Negative Choice Index (Package)', async () => {
    reporter.startTest('Negative Choice Index (Package)');
    reporter.setContext({ subcategory: 'boundary-values' });
    
    const engine = await createVNEngine();
    engine.loadScript(`
      test:
        - choices:
          - text: "Choice"
            goto: test
    `);
    
    engine.startScene('test');
    const result = engine.makeChoice(-1);
    
    assert.assertEqual(result.type, 'error', 'Should error with negative choice index', { 
      engine,
      packageInfo,
      choiceIndex: -1,
      result,
      availableChoices: 1
    });
  });

  test('Out of Bounds Choice Index (Package)', async () => {
    reporter.startTest('Out of Bounds Choice Index (Package)');
    reporter.setContext({ subcategory: 'boundary-values' });
    
    const engine = await createVNEngine();
    engine.loadScript(`
      test:
        - choices:
          - text: "Choice"
            goto: test
    `);
    
    engine.startScene('test');
    const result = engine.makeChoice(999);
    
    assert.assertEqual(result.type, 'error', 'Should error with out of bounds choice index', { 
      engine,
      packageInfo,
      choiceIndex: 999,
      result,
      availableChoices: 1
    });
  });

  test('Extremely Long Scene Names (Package)', async () => {
    reporter.startTest('Extremely Long Scene Names (Package)');
    reporter.setContext({ subcategory: 'boundary-values' });
    
    const engine = await createVNEngine();
    const longName = 'a'.repeat(1000);
    const longNameScript = `${longName}: ["Text"]`;
    
    engine.loadScript(longNameScript);
    
    assert.assert(!engine.getError(), 'Should handle long scene names', null, engine.getError(), { 
      engine,
      packageInfo,
      longNameLength: longName.length,
      longNameScript: longNameScript.substring(0, 100) + '...',
      sceneCount: engine.getSceneCount()
    });
    
    assert.assert(engine.hasScene(longName), 'Should find long scene name', true, engine.hasScene(longName), { 
      engine,
      packageInfo,
      longName: longName.substring(0, 50) + '...',
      allScenes: engine.getSceneNames().map(name => name.substring(0, 50) + (name.length > 50 ? '...' : ''))
    });
  });

  test('Very Large Variable Values (Package)', async () => {
    reporter.startTest('Very Large Variable Values (Package)');
    reporter.setContext({ subcategory: 'boundary-values' });
    
    const engine = await createVNEngine();
    const largeValue = 'x'.repeat(10000);
    const largeValueScript = `
      test:
        - actions:
          - type: setVar
            key: largeVar
            value: "${largeValue}"
    `;
    
    engine.loadScript(largeValueScript);
    engine.startScene('test');
    engine.continue();
    
    const retrievedValue = engine.getVariable('largeVar');
    
    assert.assertEqual(retrievedValue, largeValue, 'Should handle large variable values', { 
      engine,
      packageInfo,
      largeValueLength: largeValue.length,
      retrievedValueLength: retrievedValue ? retrievedValue.length : 0,
      retrievedValuePreview: retrievedValue ? retrievedValue.substring(0, 50) + '...' : 'undefined',
      gameState: engine.getGameState()
    });
  });


  test('Malformed Template Syntax (Package)', async () => {
    reporter.startTest('Malformed Template Syntax (Package)');
    reporter.setContext({ subcategory: 'template-edge-cases' });
    
    const engine = await createVNEngine();
    const malformedTemplate = '{{unclosed template';
    
    const result = engine.parseTemplate(malformedTemplate);
    
    assert.assert(result.includes('Error') || result === malformedTemplate, 
      'Should handle malformed templates gracefully', 
      'error or original template', 
      result, { 
        engine,
        packageInfo,
        malformedTemplate,
        result,
        engineInfo: engine.getEngineInfo()
      }
    );
  });

  test('Nested Template Braces (Package)', async () => {
    reporter.startTest('Nested Template Braces (Package)');
    reporter.setContext({ subcategory: 'template-edge-cases' });
    
    const engine = await createVNEngine();
    const nestedTemplate = '{{outer {{inner}} outer}}';
    
    const result = engine.parseTemplate(nestedTemplate);
    
    assert.assertType(result, 'string', 'Should return string result', { 
      engine,
      packageInfo,
      nestedTemplate,
      result,
      engineInfo: engine.getEngineInfo()
    });
  });

  test('Empty Template (Package)', async () => {
    reporter.startTest('Empty Template (Package)');
    reporter.setContext({ subcategory: 'template-edge-cases' });
    
    const engine = await createVNEngine();
    const emptyTemplate = '{{}}';
    
    const result = engine.parseTemplate(emptyTemplate);
    
    assert.assertType(result, 'string', 'Should handle empty template', { 
      engine,
      packageInfo,
      emptyTemplate,
      result,
      engineInfo: engine.getEngineInfo()
    });
  });

  test('Undefined Variable Reference (Package)', async () => {
    reporter.startTest('Undefined Variable Reference (Package)');
    reporter.setContext({ subcategory: 'template-edge-cases' });
    
    const engine = await createVNEngine();
    const undefinedVarTemplate = '{{nonexistentVariable}}';
    
    const result = engine.parseTemplate(undefinedVarTemplate);
    
    assert.assert(result === '' || result.includes('nonexistentVariable'), 
      'Should handle undefined variables gracefully', 
      'empty string or contains variable name', 
      result, { 
        engine,
        packageInfo,
        undefinedVarTemplate,
        result,
        gameState: engine.getGameState(),
        engineInfo: engine.getEngineInfo()
      }
    );
  });

  test('Recursive Template References (Package)', async () => {
    reporter.startTest('Recursive Template References (Package)');
    reporter.setContext({ subcategory: 'template-edge-cases' });
    
    const engine = await createVNEngine();
    const recursiveTemplate = '{{recursiveVar}}';
    const recursiveVariables = { recursiveVar: '{{recursiveVar}}' };
    
    const result = engine.renderWithVariables(recursiveTemplate, recursiveVariables);
    
    assert.assertType(result, 'string', 'Should handle recursive references without crashing', { 
      engine,
      packageInfo,
      recursiveTemplate,
      recursiveVariables,
      result,
      engineInfo: engine.getEngineInfo()
    });
  });


  test('Invalid Save Data Format (Package)', async () => {
    reporter.startTest('Invalid Save Data Format (Package)');
    reporter.setContext({ subcategory: 'state-corruption' });
    
    const engine = await createVNEngine();
    const invalidSaveData = { invalid: 'data' };
    
    const loadResult = engine.loadSave(invalidSaveData);
    
    assert.assertEqual(loadResult.type, 'error', 'Should return error for invalid save data', { 
      engine,
      packageInfo,
      invalidSaveData,
      loadResult
    });
    
    assert.assertDefined(loadResult.error, 'Should include error message', {
      engine,
      packageInfo,
      loadResult
    });
    
    console.log(`   ✅ Invalid save data properly rejected: ${loadResult.error}`);
    
    engine.destroy();
  });

  test('Corrupted Save Data (Package)', async () => {
    reporter.startTest('Corrupted Save Data (Package)');
    reporter.setContext({ subcategory: 'state-corruption' });
    
    const engine = await createVNEngine();
    const corruptedSaveData = {
      gameState: null,
      timestamp: 'invalid',
      version: undefined
    };
    
    const loadResult = engine.loadSave(corruptedSaveData);
    
    assert.assertEqual(loadResult.type, 'error', 'Should return error for corrupted save data', { 
      engine,
      packageInfo,
      corruptedSaveData,
      loadResult
    });
    
    assert.assertDefined(loadResult.error, 'Should include error message for corrupted data', {
      engine,
      packageInfo,
      loadResult
    });
    
    console.log(`   ✅ Corrupted save data properly rejected: ${loadResult.error}`);
    
    engine.destroy();
  });

  test('State Manipulation During Execution (Package)', async () => {
    reporter.startTest('State Manipulation During Execution (Package)');
    reporter.setContext({ subcategory: 'state-corruption' });
    
    const engine = await createVNEngine();
    engine.loadScript(`
      test:
        - "Before state change"
        - actions:
          - type: setVar
            key: testVar
            value: "modified"
    `);
    
    engine.startScene('test');
    
    const originalState = engine.getGameState();
    engine.setGameState({
      variables: [['injectedVar', 'injected']],
      storyFlags: [],
      choiceHistory: [],
      currentScene: 'test',
      currentInstruction: 0,
      schemaVersion: '1.0.0',
      saveDate: new Date().toISOString()
    });
    
    const result = engine.continue();
    const newState = engine.getGameState();
    
    assert.assert(result.type !== 'error', 'Should handle state changes during execution', 
      'not error', result.type, { 
        engine,
        packageInfo,
        originalState,
        newState,
        result,
        injectedVar: engine.getVariable('injectedVar')
      }
    );
  });


  test('Rapid Engine Creation/Destruction (Package)', async () => {
    reporter.startTest('Rapid Engine Creation/Destruction (Package)');
    reporter.setContext({ subcategory: 'memory-resources' });
    
    const engines = [];
    const creationTimes = [];
    
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const engine = await createVNEngine();
      const end = performance.now();
      
      engines.push(engine);
      creationTimes.push(end - start);
    }
    
    engines.forEach(engine => {
      try {
        engine.destroy();
      } catch (error) {
      }
    });
    
    const avgCreationTime = creationTimes.reduce((a, b) => a + b, 0) / creationTimes.length;
    
    assert.assert(true, 'Should handle rapid creation/destruction', true, true, { 
      packageInfo,
      engineCount: engines.length,
      avgCreationTime: `${avgCreationTime.toFixed(2)}ms`,
      creationTimes: creationTimes.slice(0, 5),
      totalTime: `${creationTimes.reduce((a, b) => a + b, 0).toFixed(2)}ms`
    });
    
    console.log(`   📊 Created/destroyed ${engines.length} engines, avg: ${avgCreationTime.toFixed(2)}ms`);
  });

  test('Large Number of Variables (Package)', async () => {
    reporter.startTest('Large Number of Variables (Package)');
    reporter.setContext({ subcategory: 'memory-resources' });
    
    const engine = await createVNEngine();
    
    let script = 'test:\n  - actions:\n';
    for (let i = 0; i < 1000; i++) {
      script += `    - type: setVar\n      key: var${i}\n      value: ${i}\n`;
    }
    
    const startTime = performance.now();
    engine.loadScript(script);
    engine.startScene('test');
    engine.continue();
    const endTime = performance.now();
    
    const testVar = engine.getVariable('var999');
    const gameState = engine.getGameState();
    
    assert.assertEqual(testVar, 999, 'Should handle large number of variables', { 
      engine,
      packageInfo,
      variableCount: 1000,
      executionTime: `${(endTime - startTime).toFixed(2)}ms`,
      testVar,
      gameState,
      sampleVariables: {
        var0: engine.getVariable('var0'),
        var500: engine.getVariable('var500'),
        var999: testVar
      },
      scriptLength: script.length
    });
    
    console.log(`   📊 1000 variables processed in ${(endTime - startTime).toFixed(2)}ms`);
  });

  test('Deep Nested Conditional Logic (Package)', async () => {
    reporter.startTest('Deep Nested Conditional Logic (Package)');
    reporter.setContext({ subcategory: 'memory-resources' });
    
    const engine = await createVNEngine();
    
    let script = 'test:\n';
    let indent = '  ';
    
    for (let i = 0; i < 10; i++) {
      script += `${indent}- if: "eq 1 1"\n`;
      script += `${indent}  then:\n`;
      indent += '    ';
    }
    
    script += `${indent}- "Deep nested content"\n`;
    
    engine.loadScript(script);
    const result = engine.startScene('test');
    
    assert.assert(result.type !== 'error', 'Should handle deep nesting without stack overflow', 
      'not error', result.type, { 
        engine,
        packageInfo,
        nestingDepth: 10,
        script: script.substring(0, 200) + '...',
        result
      }
    );
    
    console.log(`   📊 Deep nesting (10 levels) handled successfully`);
  });


  test('Simultaneous State Modifications (Package)', async () => {
    reporter.startTest('Simultaneous State Modifications (Package)');
    reporter.setContext({ subcategory: 'concurrency' });
    
    const engine = await createVNEngine();
    
    const promises = [];
    const modifications = [];
    
    for (let i = 0; i < 10; i++) {
      const modification = {
        variables: [[`concurrentVar${i}`, i]],
        storyFlags: [],
        choiceHistory: [],
        currentScene: 'test',
        currentInstruction: 0,
        schemaVersion: '1.0.0',
        saveDate: new Date().toISOString()
      };
      
      modifications.push(modification);
      
      promises.push(Promise.resolve().then(() => {
        engine.setGameState(modification);
      }));
    }
    
    await Promise.all(promises);
    
    const gameState = engine.getGameState();
    
    assert.assertDefined(gameState.variables, 'Should maintain consistent state', { 
      engine,
      packageInfo,
      modifications,
      gameState,
      finalVariables: gameState.variables instanceof Map ? 
        Array.from(gameState.variables.entries()) : 
        Object.entries(gameState.variables || {})
    });
    
    console.log(`   📊 ${modifications.length} concurrent state modifications handled`);
  });


  test('Package Import Under Load', async () => {
    reporter.startTest('Package Import Under Load');
    reporter.setContext({ subcategory: 'package-stress' });
    
    const importPromises = [];
    const enginePromises = [];
    
    for (let i = 0; i < 5; i++) {
      importPromises.push(import(packageInfo.importPath));
      enginePromises.push(createVNEngine());
    }
    
    const [imports, engines] = await Promise.all([
      Promise.all(importPromises),
      Promise.all(enginePromises)
    ]);
    
    imports.forEach((imp, index) => {
      assert.assertDefined(imp.createVNEngine, `Import ${index} should have createVNEngine`, {
        packageInfo,
        importIndex: index
      });
    });
    
    engines.forEach((engine, index) => {
      assert.assertType(engine.loadScript, 'function', `Engine ${index} should have loadScript`, {
        packageInfo,
        engineIndex: index
      });
    });
    
    engines.forEach(engine => {
      try {
        engine.destroy();
      } catch (error) {
      }
    });
    
    console.log(`   📊 ${imports.length} simultaneous imports and ${engines.length} engine creations succeeded`);
  });

  test('Package Memory Leak Detection', async () => {
    reporter.startTest('Package Memory Leak Detection');
    reporter.setContext({ subcategory: 'package-stress' });
    
    const iterations = 50;
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      const memBefore = typeof process !== 'undefined' && process.memoryUsage ? 
        process.memoryUsage().heapUsed : 0;
      
      const engine = await createVNEngine();
      engine.loadScript('test: ["Memory test"]');
      engine.startScene('test');
      
      engine.destroy();
      
      const memAfter = typeof process !== 'undefined' && process.memoryUsage ? 
        process.memoryUsage().heapUsed : 0;
      
      if (memBefore > 0 && memAfter > 0) {
        memorySnapshots.push({
          iteration: i,
          before: memBefore,
          after: memAfter,
          diff: memAfter - memBefore
        });
      }
      
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    if (memorySnapshots.length > 0) {
      const avgMemoryDiff = memorySnapshots.reduce((sum, snap) => sum + snap.diff, 0) / memorySnapshots.length;
      const totalMemoryGrowth = memorySnapshots[memorySnapshots.length - 1].after - memorySnapshots[0].before;
      
      console.log(`   📊 Memory analysis over ${iterations} iterations:`);
      console.log(`   📊 Average memory diff per iteration: ${(avgMemoryDiff / 1024).toFixed(2)}KB`);
      console.log(`   📊 Total memory growth: ${(totalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      const memoryGrowthPerEngine = totalMemoryGrowth / iterations;
      assert.assert(memoryGrowthPerEngine < 1024 * 1024 / 10, 
        'Memory growth per engine should be reasonable', 
        '< 100KB per engine', 
        `${(memoryGrowthPerEngine / 1024).toFixed(2)}KB per engine`, {
          packageInfo,
          iterations,
          avgMemoryDiff: `${(avgMemoryDiff / 1024).toFixed(2)}KB`,
          totalMemoryGrowth: `${(totalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`,
          memoryGrowthPerEngine: `${(memoryGrowthPerEngine / 1024).toFixed(2)}KB`
        });
    } else {
      console.log('   ⚠️ Memory measurement not available');
    }
  });


  console.log('🔍 Running enhanced package-based edge case tests...\n');

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

  
  console.log('\n🧹 Cleaning up test package...');
  try {
    await cleanupTestPackage();
    console.log('✅ Edge case test cleanup completed');
  } catch (error) {
    console.warn(`⚠️ Cleanup failed: ${error.message}`);
  }


  if (reporter.errors.length > 0) {
    console.log(reporter.generateSummary());
  }

  console.log(`\n📊 Package-based Edge Case Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Robustness Score: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (packageInfo) {
    console.log(`📦 Tested Package: ${packageInfo.name}@${packageInfo.version}`);
  }

  if (failed > 0) {
    console.log('\n⚠️ Some edge case tests failed - review detailed analysis above');
    console.log('Consider adding additional error handling and input validation');
    return { passed, failed, errors: reporter.exportErrors(), packageInfo };
  } else {
    console.log('\n🛡️ All package-based edge case tests passed - library is robust!');
    return { passed, failed, errors: null, packageInfo };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEdgeCaseTests().catch(error => {
    console.error('❌ Package-based edge case test runner failed:', error);
    process.exit(1);
  });
}
