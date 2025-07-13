
import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

const MINIMAL_SCRIPT = `
scene_a:
  - "Text A"
  - choices:
    - text: "Choice 1"
      goto: scene_b
    - text: "Choice 2"  
      goto: scene_c

scene_b:
  - "Text B"

scene_c:
  - "Text C"
`;

const STATE_SCRIPT = `
state_test:
  - actions:
    - type: setVar
      key: testVar
      value: 42
    - type: setFlag
      flag: testFlag
  - "Variable: {{testVar}}"
`;

function generateLargeVariableScript(count) {
  let script = 'large_var_test:\n  - actions:\n';
  for (let i = 0; i < count; i++) {
    script += `    - type: setVar\n      key: var${i}\n      value: ${i}\n`;
  }
  script += '  - "Variables set: {{var999}}"';
  return script;
}

const LARGE_VARIABLE_SCRIPT = generateLargeVariableScript(1000);

export async function runCoreTests() {
  console.log('🧪 VN Engine Core Library Tests (Package-based)');
  console.log('================================================\n');

  const { reporter, assert } = createTestReporter();
  const tests = [];
  let passed = 0;
  let failed = 0;
  let createVNEngine = null;
  let packageInfo = null;

  reporter.setContext({ category: 'core-functionality-packaged' });

  
  console.log('📦 Setting up packaged library for testing...');
  
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
    console.log(`📂 Package location: ${packageInfo.packageDir}`);
    console.log(`📄 Main file: ${packageInfo.main}`);
    
    const packagedLibrary = await import(importPath);
    createVNEngine = packagedLibrary.createVNEngine;
    
    if (!createVNEngine) {
      throw new Error('createVNEngine not exported from packaged library');
    }
    
    console.log('✅ Successfully imported from packaged library\n');
    
    const exports = Object.keys(packagedLibrary);
    console.log(`📋 Available exports: ${exports.join(', ')}\n`);
    
  } catch (error) {
    console.error('❌ Package setup failed:', error.message);
    console.error('Stack:', error.stack);
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

  
  test('Package Structure Validation', async () => {
    reporter.startTest('Package Structure Validation');
    reporter.setContext({ subcategory: 'package-validation' });
    
    assert.assertDefined(packageInfo, 'Package info should be available', { 
      packageInfo
    });
    
    assert.assertDefined(packageInfo.packageDir, 'Package directory should exist', { 
      packageInfo
    });
    
    assert.assertDefined(packageInfo.main, 'Main file should be defined', { 
      packageInfo
    });
    
    assert.assertType(createVNEngine, 'function', 'createVNEngine should be a function', { 
      packageInfo,
      exportType: typeof createVNEngine
    });
    
    console.log(`   ✅ Package structure valid: ${packageInfo.name}@${packageInfo.version}`);
  });

  test('Package Import Consistency', async () => {
    reporter.startTest('Package Import Consistency');
    reporter.setContext({ subcategory: 'package-validation' });
    
    const importPath = packageInfo.importPath;
    
    const import1 = await import(importPath);
    const import2 = await import(importPath);
    
    assert.assertEqual(import1.createVNEngine, import2.createVNEngine, 
      'Multiple imports should return same function', {
        packageInfo,
        import1Keys: Object.keys(import1),
        import2Keys: Object.keys(import2)
      });
    
    assert.assertEqual(import1.PACKAGE_INFO?.name, packageInfo.name, 
      'Package info should be consistent', {
        packageInfo,
        import1PackageInfo: import1.PACKAGE_INFO
      });
  });

  
  test('Engine Creation (Packaged)', async () => {
    reporter.startTest('Engine Creation (Packaged)');
    reporter.setContext({ subcategory: 'initialization' });
    
    const engine = await createVNEngine();
    
    assert.assertNotNull(engine, 'Engine should be created from packaged library', { 
      engine,
      packageInfo,
      relatedTests: ['Package Structure Validation']
    });
    
    assert.assertType(engine.loadScript, 'function', 'Engine should have loadScript method', { 
      engine,
      packageInfo,
      actualMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(engine))
    });
    
    assert.assertType(engine.startScene, 'function', 'Engine should have startScene method', { 
      engine,
      packageInfo
    });
    
    const engineInfo = engine.getEngineInfo();
    console.log(`   📊 Engine Info: ${JSON.stringify(engineInfo, null, 2)}`);
  });

  test('Engine Info from Package', async () => {
    reporter.startTest('Engine Info from Package');
    reporter.setContext({ subcategory: 'initialization' });
    
    const engine = await createVNEngine();
    const info = engine.getEngineInfo();
    
    assert.assertDefined(info.version, 'Should have version from package', { 
      engine, 
      info,
      packageInfo,
      relatedTests: ['Engine Creation (Packaged)']
    });
    
    assert.assertDefined(info.templateEngine, 'Should have template engine info', { 
      engine, 
      info,
      packageInfo
    });
    
    assert.assertType(info.isLoaded, 'boolean', 'Should have isLoaded status', { 
      engine, 
      info,
      packageInfo
    });
    
    assert.assertType(info.templateEngine.type, 'string', 'Template engine should have type', { 
      engine, 
      info,
      packageInfo,
      templateEngine: info.templateEngine
    });
    
    console.log(`   📋 Template Engine: ${info.templateEngine.type}`);
    console.log(`   📋 Features: ${JSON.stringify(info.templateEngine.supportedFeatures)}`);
  });


  test('Script Loading from Package', async () => {
    reporter.startTest('Script Loading from Package');
    reporter.setContext({ subcategory: 'script-loading' });
    
    const engine = await createVNEngine();
    
    engine.loadScript(MINIMAL_SCRIPT);
    
    const error = engine.getError();
    assert.assert(!error, `Script loading should not error: ${error}`, null, error, { 
      engine,
      packageInfo,
      script: MINIMAL_SCRIPT.substring(0, 100) + '...'
    });
    
    assert.assert(engine.getIsLoaded(), 'Script should be loaded', true, engine.getIsLoaded(), { 
      engine,
      packageInfo
    });
    
    const sceneCount = engine.getSceneCount();
    assert.assertEqual(sceneCount, 3, 'Should have 3 scenes', { 
      engine,
      packageInfo,
      sceneNames: engine.getSceneNames()
    });
    
    console.log(`   📋 Loaded ${sceneCount} scenes: ${engine.getSceneNames().join(', ')}`);
  });

  test('Scene Detection in Package', async () => {
    reporter.startTest('Scene Detection in Package');
    reporter.setContext({ subcategory: 'script-loading' });
    
    const engine = await createVNEngine();
    engine.loadScript(MINIMAL_SCRIPT);
    
    assert.assert(engine.hasScene('scene_a'), 'Should detect scene_a', true, engine.hasScene('scene_a'), { 
      engine,
      packageInfo,
      allScenes: engine.getSceneNames()
    });
    
    assert.assert(engine.hasScene('scene_b'), 'Should detect scene_b', true, engine.hasScene('scene_b'), { 
      engine,
      packageInfo
    });
    
    assert.assert(!engine.hasScene('nonexistent'), 'Should not detect nonexistent scene', false, engine.hasScene('nonexistent'), { 
      engine,
      packageInfo
    });
    
    const sceneNames = engine.getSceneNames();
    assert.assert(sceneNames.includes('scene_a'), 'Scene names should include scene_a', true, sceneNames.includes('scene_a'), { 
      engine,
      packageInfo,
      sceneNames
    });
    
    assert.assertEqual(sceneNames.length, 3, 'Should have 3 scene names', { 
      engine,
      packageInfo,
      sceneNames
    });
  });


  test('Scene Execution in Package', async () => {
    reporter.startTest('Scene Execution in Package');
    reporter.setContext({ subcategory: 'execution' });
    
    const engine = await createVNEngine();
    engine.loadScript(MINIMAL_SCRIPT);
    
    const result = engine.startScene('scene_a');
    
    assert.assertEqual(result.type, 'display_dialogue', 'Should start with dialogue', { 
      engine,
      packageInfo,
      result,
      currentScene: engine.getCurrentScene()
    });
    
    assert.assertEqual(result.content, 'Text A', 'Should display correct content', { 
      engine,
      packageInfo,
      result
    });
    
    assert.assertEqual(result.canContinue, true, 'Should be continuable', { 
      engine,
      packageInfo,
      result
    });
    
    console.log(`   📋 Scene execution result: ${result.type} - "${result.content}"`);
  });

  test('Choice Handling in Package', async () => {
    reporter.startTest('Choice Handling in Package');
    reporter.setContext({ subcategory: 'execution' });
    
    const engine = await createVNEngine();
    engine.loadScript(MINIMAL_SCRIPT);
    
    engine.startScene('scene_a');
    const result = engine.continue();
    
    assert.assertEqual(result.type, 'show_choices', 'Should show choices', { 
      engine,
      packageInfo,
      result,
      currentScene: engine.getCurrentScene()
    });
    
    assert.assertEqual(result.choices?.length, 2, 'Should have 2 choices', { 
      engine,
      packageInfo,
      result,
      choices: result.choices
    });
    
    assert.assertEqual(result.choices[0].text, 'Choice 1', 'First choice should be correct', { 
      engine,
      packageInfo,
      result,
      firstChoice: result.choices[0]
    });
    
    console.log(`   📋 Choices: ${result.choices.map(c => c.text).join(', ')}`);
  });

  test('Choice Navigation in Package', async () => {
    reporter.startTest('Choice Navigation in Package');
    reporter.setContext({ subcategory: 'execution' });
    
    const engine = await createVNEngine();
    engine.loadScript(MINIMAL_SCRIPT);
    
    engine.startScene('scene_a');
    engine.continue();
    const result = engine.makeChoice(0);
    
    assert.assertEqual(result.type, 'display_dialogue', 'Should navigate to dialogue', { 
      engine,
      packageInfo,
      result,
      currentScene: engine.getCurrentScene(),
      choiceHistory: engine.getChoiceHistory()
    });
    
    assert.assertEqual(result.content, 'Text B', 'Should show scene_b content', { 
      engine,
      packageInfo,
      result,
      expectedScene: 'scene_b'
    });
    
    console.log(`   📋 Navigation successful: ${engine.getCurrentScene()} - "${result.content}"`);
  });


  test('Variable Setting in Package', async () => {
    reporter.startTest('Variable Setting in Package');
    reporter.setContext({ subcategory: 'state-management' });
    
    const engine = await createVNEngine();
    engine.loadScript(STATE_SCRIPT);
    
    engine.startScene('state_test');
    const executeResult = engine.continue();
    
    const gameState = engine.getGameState();
    const testVar = engine.getVariable('testVar');
    const hasFlag = engine.hasFlag('testFlag');
    
    assert.assertEqual(testVar, 42, 'Variable should be set to 42', { 
      engine,
      packageInfo,
      executeResult,
      gameState,
      allVariables: gameState.variables,
      variableKeys: gameState.variables instanceof Map ? Array.from(gameState.variables.keys()) : Object.keys(gameState.variables || {}),
      relatedTests: ['Game State Serialization in Package']
    });
    
    assert.assert(hasFlag, 'Flag should be set', true, hasFlag, { 
      engine,
      packageInfo,
      gameState,
      allFlags: gameState.storyFlags
    });
    
    console.log(`   📋 Variable 'testVar': ${testVar}`);
    console.log(`   📋 Flag 'testFlag': ${hasFlag}`);
  });

  test('Game State Serialization in Package', async () => {
    reporter.startTest('Game State Serialization in Package');
    reporter.setContext({ subcategory: 'state-management' });
    
    const engine = await createVNEngine();
    engine.loadScript(STATE_SCRIPT);
    
    engine.startScene('state_test');
    engine.continue();
    
    const gameState = engine.getGameState();
    
    assert.assertDefined(gameState.variables, 'Should have variables in state', { 
      engine,
      packageInfo,
      gameState,
      stateKeys: Object.keys(gameState)
    });
    
    assert.assertDefined(gameState.storyFlags, 'Should have flags in state', { 
      engine,
      packageInfo,
      gameState
    });
    
    const currentScene = engine.getCurrentScene();
    assert.assertEqual(currentScene, 'state_test', 'Should track current scene correctly', { 
      engine,
      packageInfo,
      gameState,
      expectedScene: 'state_test',
      actualScene: currentScene
    });
    
    console.log(`   📋 Game state schema version: ${gameState.schemaVersion}`);
    console.log(`   📋 Current scene: ${currentScene}`);
  });

  test('Save/Load Functionality in Package', async () => {
    reporter.startTest('Save/Load Functionality in Package');
    reporter.setContext({ subcategory: 'state-management' });
    
    const engine = await createVNEngine();
    engine.loadScript(STATE_SCRIPT);
    
    engine.startScene('state_test');
    engine.continue();
    
    const beforeSaveVar = engine.getVariable('testVar');
    const beforeSaveFlag = engine.hasFlag('testFlag');
    
    const saveData = engine.createSave();
    
    assert.assertDefined(saveData.gameState, 'Save should contain game state', { 
      engine,
      packageInfo,
      saveData,
      beforeSaveVar,
      beforeSaveFlag
    });
    
    assert.assertDefined(saveData.timestamp, 'Save should contain timestamp', { 
      engine,
      packageInfo,
      saveData
    });
    
    engine.reset();
    const afterResetVar = engine.getVariable('testVar');
    
    const loadResult = engine.loadSave(saveData);
    const loadSuccess = loadResult.type !== 'error';
    assert.assertEqual(loadSuccess, true, 'Load should succeed', {
      engine,
      packageInfo,
      saveData,
      loadResult,
      loadSuccess,
      resultType: loadResult.type
    });
    
    const afterLoadVar = engine.getVariable('testVar');
    assert.assertEqual(afterLoadVar, 42, 'Variable should be restored', { 
      engine,
      packageInfo,
      saveData,
      beforeSaveVar,
      afterResetVar,
      afterLoadVar,
      gameStateAfterLoad: engine.getGameState()
    });
    
    console.log(`   📋 Save/Load cycle: ${beforeSaveVar} → ${afterResetVar} → ${afterLoadVar}`);
  });


  test('Template Engine in Package', async () => {
    reporter.startTest('Template Engine in Package');
    reporter.setContext({ subcategory: 'template-engine' });
    
    const engine = await createVNEngine();
    const info = engine.getTemplateEngineInfo();
    
    assert.assert(['handlebars', 'simple'].includes(info.type), 'Should have valid engine type', 
      ['handlebars', 'simple'], info.type, { 
        engine,
        packageInfo,
        info,
        supportedFeatures: info.supportedFeatures
      });
    
    assert.assertType(info.isHandlebarsAvailable, 'boolean', 'Should report Handlebars availability', { 
      engine,
      packageInfo,
      info
    });
    
    assert.assertType(info.supportedFeatures, 'object', 'Should have supported features', { 
      engine,
      packageInfo,
      info
    });
    
    console.log(`   📋 Template engine: ${info.type}`);
    console.log(`   📋 Handlebars available: ${info.isHandlebarsAvailable}`);
    console.log(`   📋 Features: ${JSON.stringify(info.supportedFeatures)}`);
  });

  test('Template Parsing in Package', async () => {
    reporter.startTest('Template Parsing in Package');
    reporter.setContext({ subcategory: 'template-engine' });
    
    const engine = await createVNEngine();
    engine.loadScript(STATE_SCRIPT);
    
    engine.startScene('state_test');
    engine.continue();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const testVar = engine.getVariable('testVar');
    const gameState = engine.getGameState();
    const templateResult = engine.parseTemplate('Value: {{testVar}}');
    
    assert.assertEqual(templateResult, 'Value: 42', 'Template should parse correctly', { 
      engine,
      packageInfo,
      testVar,
      gameState,
      template: 'Value: {{testVar}}',
      templateResult,
      engineInfo: engine.getEngineInfo(),
      isReady: engine.isReady ? engine.isReady() : 'unknown'
    });
    
    console.log(`   📋 Template parsing: "{{testVar}}" → "${templateResult}"`);
  });


  test('Large Dataset Performance in Package', async () => {
    reporter.startTest('Large Dataset Performance in Package');
    reporter.setContext({ subcategory: 'performance' });
    
    const engine = await createVNEngine();
    
    const startTime = performance.now();
    engine.loadScript(LARGE_VARIABLE_SCRIPT);
    engine.startScene('large_var_test');
    engine.continue();
    const endTime = performance.now();
    
    const testVar = engine.getVariable('var999');
    const gameState = engine.getGameState();
    const executionTime = endTime - startTime;
    
    assert.assertEqual(testVar, 999, 'Should handle large number of variables', { 
      engine,
      packageInfo,
      executionTime: `${executionTime.toFixed(2)}ms`,
      variableCount: gameState.variables instanceof Map ? gameState.variables.size : Object.keys(gameState.variables || {}).length,
      gameState,
      sampleVariables: {
        var0: engine.getVariable('var0'),
        var500: engine.getVariable('var500'),
        var999: testVar
      }
    });
    
    console.log(`   📊 Large dataset (1000 vars) execution: ${executionTime.toFixed(2)}ms`);
    console.log(`   📊 Variables created: ${gameState.variables instanceof Map ? gameState.variables.size : Object.keys(gameState.variables || {}).length}`);
  });


  console.log('🔍 Running enhanced package-based tests...\n');

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
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.warn(`⚠️ Cleanup failed: ${error.message}`);
  }


  if (reporter.errors.length > 0) {
    console.log(reporter.generateSummary());
  }

  console.log(`\n📊 Package-based Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (packageInfo) {
    console.log(`📦 Tested Package: ${packageInfo.name}@${packageInfo.version}`);
    console.log(`📂 Package Size: Tarball at ${packageInfo.tarballPath}`);
  }

  if (failed > 0) {
    console.log('\n🔧 Review the detailed error analysis above for debugging information');
    return { passed, failed, success: false, errors: reporter.exportErrors(), packageInfo };
  } else {
    console.log('\n🎉 All package-based core library tests passed!');
    return { passed, failed, success: true, errors: null, packageInfo };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCoreTests().then(results => {
    if (!results.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Package-based core test runner failed:', error);
    process.exit(1);
  });
}
