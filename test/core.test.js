
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

const TEMPLATE_ACTION_SCRIPT = `
template_action_test:
  - actions:
    - type: setVar
      key: playerName
      value: "Alice"
    - type: setVar
      key: currentLevel
      value: "forest"
    - type: setVar
      key: score
      value: 100
    - type: setVar
      key: bonus
      value: 50
  - actions:
    # Test dynamic variable names and values
    - type: setVar
      key: "{{playerName}}_health"
      value: "{{add score bonus}}"
    - type: setVar
      key: "level_{{currentLevel}}_complete"
      value: true
    - type: setFlag
      flag: "{{playerName}}_played"
    - type: setFlag
      flag: "{{currentLevel}}_visited"
  - "Template actions completed"
`;

const TEMPLATE_GOTO_SCRIPT = `
goto_test:
  - "Hello"
  - actions:
    - type: setVar
      key: nextScene
      value: "target_scene"
    - type: setVar
      key: timeOfDay
      value: "morning"
  - text: "Choose destination"
    choices:
    - text: "Go to target"
      goto: "{{nextScene}}"
    - text: "Go to morning scene"
      goto: "{{timeOfDay}}_scene"

target_scene:
  - "You reached the target scene!"

morning_scene:
  - "Good morning! Template goto worked!"
`;

const HELPER_ACTION_SCRIPT = `
helper_test:
  - actions:
    - type: setVar
      key: playerName
      value: "Bob"
    - type: setVar
      key: baseScore
      value: 75
    - type: setVar
      key: multiplier
      value: 3
  - actions:
    # Test helper actions with template rendering
    - type: helper
      helper: math.add
      args: ["{{baseScore}}", 25]
      result: "{{playerName}}_total"
    - type: helper
      helper: string.uppercase
      args: ["{{playerName}}"]
      result: "display_name"
    - type: helper
      helper: math.multiply
      args: ["{{baseScore}}", "{{multiplier}}"]
      result: "final_score"
  - "Helper actions completed"
`;

const FULL_TEMPLATE_DEMO_SCRIPT = `
demo_start:
  - "🎮 Template Rendering Demo"
  - actions:
    - type: setVar
      key: player
      value: { name: "Alex", class: "mage", level: 3 }
    - type: setVar
      key: location
      value: "castle"
    - type: setVar
      key: quest
      value: "crystalQuest"
  - text: "Player {{player.name}} the {{player.class}} (Level {{player.level}}) stands in the {{location}}."
  - text: "Choose your action:"
    choices:
    - text: "Set completion flag"
      actions:
      - type: setFlag
        flag: "{{quest}}_{{player.class}}_complete"
      goto: show_results
    - text: "Calculate experience"
      actions:
      - type: helper
        helper: math.multiply
        args: ["{{player.level}}", 100]
        result: "{{player.name}}_experience"
      goto: show_results

show_results:
  - "🎯 Results from template actions:"
  - "Quest flag: {{#hasFlag 'crystalQuest_mage_complete'}}✅ Set{{else}}❌ Not set{{/hasFlag}}"
  - "Experience: {{Alex_experience}} points"
  - "Current location: {{location}}"
  - text: "Go to dynamic location?"
    choices:
    - text: "Visit {{location}} library"
      goto: "{{location}}_library"

castle_library:
  - "📚 Welcome to the castle library!"
  - "Template navigation successful: {{location}}_library → castle_library"
  - "Demo completed successfully!"
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

  test('Template Rendering in Action Parameters', async () => {
    reporter.startTest('Template Rendering in Action Parameters');
    reporter.setContext({ subcategory: 'template-actions' });
    
    const engine = await createVNEngine();
    engine.loadScript(TEMPLATE_ACTION_SCRIPT);
    
    engine.startScene('template_action_test');
    engine.continue(); // Execute first set of actions
    engine.continue(); // Execute template actions
    
    // Test dynamic variable names with template rendering
    const aliceHealth = engine.getVariable('Alice_health');
    assert.assertEqual(aliceHealth, 150, 'Dynamic variable name should work: Alice_health = 150', {
      engine,
      packageInfo,
      gameState: engine.getGameState(),
      aliceHealth,
      originalScore: engine.getVariable('score'),
      originalBonus: engine.getVariable('bonus')
    });
    
    const levelComplete = engine.getVariable('level_forest_complete');
    assert.assertEqual(levelComplete, true, 'Dynamic nested variable should work: level_forest_complete = true', {
      engine,
      packageInfo,
      levelComplete,
      currentLevel: engine.getVariable('currentLevel')
    });
    
    // Test dynamic flag names with template rendering
    const playerFlag = engine.hasFlag('Alice_played');
    assert.assert(playerFlag, 'Dynamic flag name should work: Alice_played flag set', true, playerFlag, {
      engine,
      packageInfo,
      playerName: engine.getVariable('playerName'),
      allFlags: engine.getGameState().storyFlags
    });
    
    const levelFlag = engine.hasFlag('forest_visited');
    assert.assert(levelFlag, 'Dynamic flag name should work: forest_visited flag set', true, levelFlag, {
      engine,
      packageInfo,
      currentLevel: engine.getVariable('currentLevel'),
      allFlags: engine.getGameState().storyFlags
    });
    
    console.log(`   📋 Dynamic variables: Alice_health=${aliceHealth}, level_forest_complete=${levelComplete}`);
    console.log(`   📋 Dynamic flags: Alice_played=${playerFlag}, forest_visited=${levelFlag}`);
  });

  test('Template Rendering in Goto Targets', async () => {
    reporter.startTest('Template Rendering in Goto Targets');
    reporter.setContext({ subcategory: 'template-navigation' });
    
    const engine = await createVNEngine();
    engine.loadScript(TEMPLATE_GOTO_SCRIPT);
    
    engine.startScene('goto_test');
    const choiceResult = engine.continue();
    
    assert.assertEqual(choiceResult.type, 'show_choices', 'Should show choices for goto test', {
      engine,
      packageInfo,
      choiceResult,
      currentScene: engine.getCurrentScene()
  });
    
    // Test first choice with template goto
    const targetResult = engine.makeChoice(0);
    
    assert.assertEqual(targetResult.type, 'display_dialogue', 'Should navigate to target scene', {
      engine,
      packageInfo,
      targetResult,
      currentScene: engine.getCurrentScene(),
      nextScene: engine.getVariable('nextScene')
    });
    
    assert.assertEqual(targetResult.content, 'You reached the target scene!', 'Should reach correct target scene', {
      engine,
      packageInfo,
      targetResult,
      expectedScene: 'target_scene'
    });
    
    console.log(`   📋 Template goto successful: {{nextScene}} → target_scene`);
    
    // Reset and test second choice
    engine.startScene('goto_test');
    engine.continue();
    const morningResult = engine.makeChoice(1);
    
    assert.assertEqual(morningResult.content, 'Good morning! Template goto worked!', 'Should reach morning scene via template', {
      engine,
      packageInfo,
      morningResult,
      timeOfDay: engine.getVariable('timeOfDay'),
      expectedScene: 'morning_scene'
    });
    
    console.log(`   📋 Template goto successful: {{timeOfDay}}_scene → morning_scene`);
  });

  test('Helper Actions with Template Rendering', async () => {
    reporter.startTest('Helper Actions with Template Rendering');
    reporter.setContext({ subcategory: 'template-helpers' });
    
    const engine = await createVNEngine();
    engine.loadScript(HELPER_ACTION_SCRIPT);
    
    engine.startScene('helper_test');
    engine.continue(); // Execute setup actions
    engine.continue(); // Execute helper actions
    
    // Test math helper with template args and result
    const bobTotal = engine.getVariable('Bob_total');
    assert.assertEqual(bobTotal, 100, 'Math helper should work with template args and result: 75 + 25 = 100', {
      engine,
      packageInfo,
      bobTotal,
      baseScore: engine.getVariable('baseScore'),
      playerName: engine.getVariable('playerName')
    });
    
    // Test string helper with template args
    const displayName = engine.getVariable('display_name');
    assert.assertEqual(displayName, 'BOB', 'String helper should work with template args: uppercase(Bob) = BOB', {
      engine,
      packageInfo,
      displayName,
      originalName: engine.getVariable('playerName')
    });
    
    // Test math helper with multiple template args
    const finalScore = engine.getVariable('final_score');
    assert.assertEqual(finalScore, 225, 'Math helper should work with multiple template args: 75 * 3 = 225', {
      engine,
      packageInfo,
      finalScore,
      baseScore: engine.getVariable('baseScore'),
      multiplier: engine.getVariable('multiplier')
    });
    
    console.log(`   📋 Helper results: Bob_total=${bobTotal}, display_name=${displayName}, final_score=${finalScore}`);
  });

  test('Complex Template Action Combinations', async () => {
    reporter.startTest('Complex Template Action Combinations');
    reporter.setContext({ subcategory: 'template-complex' });
    
    const complexScript = `
  complex_test:
    - actions:
      - type: setVar
        key: player
        value: { name: "Charlie", class: "warrior", level: 5 }
      - type: setVar
        key: quest
        value: "dragonSlayer"
    - actions:
      # Complex nested template usage
      - type: setVar
        key: "{{player.name}}_{{player.class}}_stats"
        value: "{{multiply player.level 20}}"
      - type: setFlag
        flag: "{{quest}}_{{player.class}}_started"
      - type: helper
        helper: math.add
        args: ["{{player.level}}", 10]
        result: "{{player.name}}_new_level"
    - "Complex templates completed"
    `;
    
    const engine = await createVNEngine();
    engine.loadScript(complexScript);
    
    engine.startScene('complex_test');
    engine.continue(); // Setup
    engine.continue(); // Complex actions
    
    // Test nested object property access in templates
    const charlieStats = engine.getVariable('Charlie_warrior_stats');
    assert.assertEqual(charlieStats, 100, 'Complex nested template should work: level 5 * 20 = 100', {
      engine,
      packageInfo,
      charlieStats,
      player: engine.getVariable('player')
    });
    
    // Test complex flag name generation
    const questFlag = engine.hasFlag('dragonSlayer_warrior_started');
    assert.assert(questFlag, 'Complex flag template should work: dragonSlayer_warrior_started', true, questFlag, {
      engine,
      packageInfo,
      quest: engine.getVariable('quest'),
      player: engine.getVariable('player'),
      allFlags: engine.getGameState().storyFlags
    });
    
    // Test helper with nested template result
    const newLevel = engine.getVariable('Charlie_new_level');
    assert.assertEqual(newLevel, 15, 'Helper with nested template result should work: 5 + 10 = 15', {
      engine,
      packageInfo,
      newLevel,
      player: engine.getVariable('player')
    });
    
    console.log(`   📋 Complex templates: Charlie_warrior_stats=${charlieStats}, Charlie_new_level=${newLevel}`);
  });

  test('Template Error Handling', async () => {
    reporter.startTest('Template Error Handling');
    reporter.setContext({ subcategory: 'template-errors' });
    
    const errorScript = `
  error_test:
    - actions:
      - type: setVar
        key: validVar
        value: "test"
    - actions:
      # These should handle errors gracefully
      - type: setVar
        key: "{{nonexistentVar}}_result"
        value: "{{add validVar 5}}"
      - type: setFlag
        flag: "{{undefinedValue}}_flag"
    - "Error handling test completed"
    `;
    
    const engine = await createVNEngine();
    engine.loadScript(errorScript);
    
    // Should not throw errors, but handle gracefully
    engine.startScene('error_test');
    engine.continue();
    
    try {
      engine.continue(); // Execute error-prone actions
      
      // Verify engine is still functional after template errors
      const validVar = engine.getVariable('validVar');
      assert.assertEqual(validVar, 'test', 'Engine should remain functional after template errors', {
        engine,
        packageInfo,
        validVar,
        gameState: engine.getGameState()
      });
      
      const currentScene = engine.getCurrentScene();
      assert.assertEqual(currentScene, 'error_test', 'Engine should maintain correct state after template errors', {
        engine,
        packageInfo,
        currentScene
      });
      
      console.log(`   📋 Template error handling: Engine remains stable`);
      
    } catch (error) {
      assert.assert(false, `Template errors should be handled gracefully, not thrown: ${error.message}`, true, false, {
        engine,
        packageInfo,
        error: error.message
      });
    }
  });

  test('Performance with Template Rendering', async () => {
    reporter.startTest('Performance with Template Rendering');
    reporter.setContext({ subcategory: 'template-performance' });
    
    // Generate script with many template actions
    let performanceScript = 'performance_test:\n  - actions:\n';
    for (let i = 0; i < 50; i++) {
      performanceScript += `    - type: setVar\n      key: base${i}\n      value: ${i}\n`;
    }
    performanceScript += '  - actions:\n';
    for (let i = 0; i < 50; i++) {
      performanceScript += `    - type: setVar\n      key: "template_{{base${i}}}"\n      value: "{{multiply base${i} 2}}"\n`;
    }
    performanceScript += '  - "Performance test completed"\n';
    
    const engine = await createVNEngine();
    engine.loadScript(performanceScript);
    
    const startTime = performance.now();
    engine.startScene('performance_test');
    engine.continue(); // Setup variables
    engine.continue(); // Execute template actions
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    // Verify some template results
    const template25 = engine.getVariable('template_25');
    assert.assertEqual(template25, 50, 'Template performance test should produce correct results: 25 * 2 = 50', {
      engine,
      packageInfo,
      template25,
      executionTime: `${executionTime.toFixed(2)}ms`,
      totalVariables: Object.keys(engine.getGameState().variables || {}).length
    });
    
    // Performance should be reasonable (under 100ms for 50 template actions)
    assert.assert(executionTime < 100, 'Template rendering should be performant', true, executionTime < 100, {
      engine,
      packageInfo,
      executionTime: `${executionTime.toFixed(2)}ms`,
      threshold: '100ms',
      templateCount: 50
    });
    
    console.log(`   📊 Template performance: 50 template actions in ${executionTime.toFixed(2)}ms`);
  });

  test('Full Template Rendering Integration Demo', async () => {
    reporter.startTest('Full Template Rendering Integration Demo');
    reporter.setContext({ subcategory: 'template-integration' });
    
    const engine = await createVNEngine();
    engine.loadScript(FULL_TEMPLATE_DEMO_SCRIPT);
    
    // Start the demo
    const startResult = engine.startScene('demo_start');
    assert.assertEqual(startResult.type, 'display_dialogue', 'Demo should start with dialogue', {
      engine,
      packageInfo,
      startResult
    });
    
    // Continue through setup
    const playerIntro = engine.continue(); // Player intro with templates
    assert.assert(playerIntro.content.includes('Alex the mage'), 'Should render player info correctly', true, playerIntro.content.includes('Alex the mage'), {
      engine,
      packageInfo,
      playerIntro,
      player: engine.getVariable('player')
    });
    
    // Test choice with template action
    const choiceResult = engine.continue();
    const flagResult = engine.makeChoice(0); // Set completion flag
    
    // Verify we're in results scene
    assert.assertEqual(engine.getCurrentScene(), 'show_results', 'Should navigate to show_results scene', {
      engine,
      packageInfo,
      currentScene: engine.getCurrentScene()
    });
    
    // Verify flag was set with template
    const questComplete = engine.hasFlag('crystalQuest_mage_complete');
    assert.assert(questComplete, 'Template flag should be set: crystalQuest_mage_complete', true, questComplete, {
      engine,
      packageInfo,
      allFlags: engine.getGameState().storyFlags,
      quest: engine.getVariable('quest'),
      player: engine.getVariable('player')
    });
    
    // Continue to library navigation
    engine.continue(); // Results display
    engine.continue(); // Navigation choice
    engine.continue();
    engine.continue();
    const libraryResult = engine.makeChoice(0); // Go to castle_library
    
    // Verify template navigation worked
    assert.assertEqual(engine.getCurrentScene(), 'castle_library', 'Template navigation should work: {{location}}_library → castle_library', {
      engine,
      packageInfo,
      currentScene: engine.getCurrentScene(),
      location: engine.getVariable('location')
    });
    
    assert.assertEqual(libraryResult.content, '📚 Welcome to the castle library!', 'Should reach correct library scene', {
      engine,
      packageInfo,
      libraryResult
    });
    
    console.log(`   📋 Integration demo: All template features working together`);
    console.log(`   📋 Flag set: crystalQuest_mage_complete = ${questComplete}`);
    console.log(`   📋 Navigation: ${engine.getVariable('location')}_library → castle_library`);
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
