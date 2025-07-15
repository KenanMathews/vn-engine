// test/vn-core-variables.test.js - Updated for dual-state management
import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

// Test scripts designed to properly test both immediate template rendering and persistent state
const SIMPLE_VARIABLE_SCRIPT = `
variable_test:
  - "Setting variables..."
  - say: "{{setVar 'playerName' 'TestHero'}}"
  - say: "{{setVar 'health' 100}}"
  - say: "{{setVar 'score' 0}}"
  - "Testing variable retrieval..."
  - say: "Hello {{getVar 'playerName'}}!"
  - say: "Health: {{getVar 'health'}}"
  - say: "Score: {{getVar 'score'}}"
  - "Variables set complete."
`;

const COMPLEX_VARIABLE_SCRIPT = `
complex_test:
  - "Setting nested variables..."
  - say: "{{setVar 'player.name' 'Hero'}}"
  - say: "{{setVar 'player.stats.health' 100}}"
  - say: "{{setVar 'player.stats.mana' 50}}"
  - say: "{{setVar 'inventory.count' 3}}"
  - "Reading nested variables..."
  - say: "Name: {{getVar 'player.name'}}"
  - say: "Health: {{getVar 'player.stats.health'}}"
  - say: "Mana: {{getVar 'player.stats.mana'}}"
  - say: "Items: {{getVar 'inventory.count'}}"
  - "Nested variables complete."
`;

const FLAG_VARIABLE_SCRIPT = `
flag_test:
  - "Testing flag operations..."
  - say: "{{addFlag 'gameStarted'}}"
  - say: "{{setVar 'flagTest' 'value1'}}"
  - "Checking flag status..."
  - say: "Game started: {{#if (hasFlag 'gameStarted')}}Yes{{else}}No{{/if}}"
  - say: "Has flag: {{hasFlag 'gameStarted'}}"
  - say: "Flag value: {{getVar 'flagTest'}}"
  - "Removing flag..."
  - say: "{{removeFlag 'gameStarted'}}"
  - "Checking after removal..."
  - say: "After removal: {{hasFlag 'gameStarted'}}"
  - "Flag test complete."
`;

const INCREMENT_VARIABLE_SCRIPT = `
increment_test:
  - "Testing increment operations..."
  - say: "{{setVar 'counter' 10}}"
  - say: "Initial: {{getVar 'counter'}}"
  - say: "{{incrementVar 'counter' 5}}"
  - say: "After +5: {{getVar 'counter'}}"
  - say: "{{incrementVar 'counter' -3}}"
  - say: "After -3: {{getVar 'counter'}}"
  - "Increment test complete."
`;

const PERSISTENCE_SCRIPT = `
scene1:
  - "Setting persistent data..."
  - say: "{{setVar 'persistent' 'test123'}}"
  - say: "{{addFlag 'scene1Visited'}}"
  - "Data set, choose next action..."
  - choices:
    - text: "Go to scene 2"
      goto: scene2

scene2:
  - "Checking persistence..."
  - say: "Value from scene1: {{getVar 'persistent'}}"
  - say: "Flag from scene1: {{hasFlag 'scene1Visited'}}"
  - "Modifying data..."
  - say: "{{setVar 'persistent' 'modified'}}"
  - "Data modified, choose next action..."
  - choices:
    - text: "Back to scene 1"
      goto: scene1
`;

export async function runVNCoreVariableTests() {
  console.log('🧪 VN Core Variables GameState Integration Test (Updated)');
  console.log('=======================================================\n');

  const { reporter, assert } = createTestReporter();
  const tests = [];
  let passed = 0;
  let failed = 0;
  let createVNEngine = null;
  let packageInfo = null;

  reporter.setContext({ category: 'vn-core-variables' });

  // Helper to properly display GameState
  function displayGameState(engine) {
    const rawState = engine.getGameState();
    return {
      variables: rawState.variables instanceof Map ? 
        Object.fromEntries(rawState.variables) : 
        (Array.isArray(rawState.variables) ? 
          Object.fromEntries(rawState.variables) : 
          rawState.variables),
      storyFlags: rawState.storyFlags,
      choiceHistory: rawState.choiceHistory,
      currentScene: rawState.currentScene,
      currentInstruction: rawState.currentInstruction
    };
  }

  // Helper to execute instructions until a specific step
  function executeSteps(engine, steps) {
    let result = null;
    for (let i = 0; i < steps; i++) {
      if (result && result.canContinue) {
        result = engine.continue();
      } else if (result === null) {
        result = engine.startScene();
      }
    }
    return result;
  }

  // Setup package
  console.log('📦 Setting up package for VN core variable testing...');
  
  try {
    const importPath = await createTestPackage({
      includeDependencies: false,
      customPackageJson: {}
    });
    
    await verifyTestPackage();
    packageInfo = getPackageInfo();
    
    const packagedLibrary = await import(importPath);
    createVNEngine = packagedLibrary.createVNEngine;
    
    if (!createVNEngine) {
      throw new Error('createVNEngine not exported from packaged library');
    }
    
    console.log('✅ Package setup completed\n');
    
  } catch (error) {
    console.error('❌ Package setup failed:', error.message);
    await cleanupTestPackage();
    throw error;
  }

  function test(name, testFn) {
    tests.push({ name, testFn });
  }

  // Simple Variable Tests
  test('Simple Variable Setting and Getting', async () => {
    reporter.startTest('Simple Variable Setting and Getting');
    
    const engine = await createVNEngine();
    engine.loadScript(SIMPLE_VARIABLE_SCRIPT);
    
    let result = engine.startScene('variable_test');
    
    // Execute step by step to ensure proper timing
    result = engine.continue(); // setVar playerName (empty content)
    result = engine.continue(); // setVar health (empty content)
    result = engine.continue(); // setVar score (empty content)
    
    // Now check that variables are set in GameState
    const playerName = engine.getVariable('playerName');
    const health = engine.getVariable('health');
    const score = engine.getVariable('score');
    
    assert.assertEqual(playerName, 'TestHero', 'Player name should be set correctly', {
      playerName,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(health, 100, 'Health should be set correctly', {
      health,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(score, 0, 'Score should be set correctly', {
      score,
      gameState: displayGameState(engine)
    });
    
    // Continue to template rendering tests
    result = engine.continue(); // "Testing variable retrieval..."
    result = engine.continue(); // "Hello {{getVar 'playerName'}}!"
    const nameResult = result;
    result = engine.continue(); // "Health: {{getVar 'health'}}"
    const healthResult = result;
    result = engine.continue(); // "Score: {{getVar 'score'}}"
    const scoreResult = result;
    
    assert.assertEqual(nameResult.content, 'Hello TestHero!', 'Template should render player name', {
      nameResult,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(healthResult.content, 'Health: 100', 'Template should render health', {
      healthResult,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(scoreResult.content, 'Score: 0', 'Template should render score', {
      scoreResult,
      gameState: displayGameState(engine)
    });
    
    console.log(`   ✅ Variables working: ${playerName}, ${health}, ${score}`);
    console.log(`   ✅ Template rendering: "${nameResult.content}", "${healthResult.content}", "${scoreResult.content}"`);
  });

  test('Complex Nested Variables', async () => {
    reporter.startTest('Complex Nested Variables');
    
    const engine = await createVNEngine();
    engine.loadScript(COMPLEX_VARIABLE_SCRIPT);
    
    let result = engine.startScene('complex_test');
    
    // Execute nested variable setting
    result = engine.continue(); // setVar player.name
    result = engine.continue(); // setVar player.stats.health
    result = engine.continue(); // setVar player.stats.mana
    result = engine.continue(); // setVar inventory.count
    
    // Check nested variables in GameState
    const playerName = engine.getVariable('player.name');
    const playerHealth = engine.getVariable('player.stats.health');
    const playerMana = engine.getVariable('player.stats.mana');
    const inventoryCount = engine.getVariable('inventory.count');
    
    assert.assertEqual(playerName, 'Hero', 'Nested player name should be set', {
      playerName,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(playerHealth, 100, 'Nested health should be set', {
      playerHealth,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(playerMana, 50, 'Nested mana should be set', {
      playerMana,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(inventoryCount, 3, 'Nested inventory count should be set', {
      inventoryCount,
      gameState: displayGameState(engine)
    });
    
    // Test template rendering
    result = engine.continue(); // "Reading nested variables..."
    result = engine.continue(); // "Name: {{getVar 'player.name'}}"
    const nameResult = result;
    result = engine.continue(); // "Health: {{getVar 'player.stats.health'}}"
    const healthResult = result;
    result = engine.continue(); // "Mana: {{getVar 'player.stats.mana'}}"
    const manaResult = result;
    result = engine.continue(); // "Items: {{getVar 'inventory.count'}}"
    const itemsResult = result;
    
    assert.assertEqual(nameResult.content, 'Name: Hero', 'Nested name should render correctly', {
      nameResult
    });
    
    assert.assertEqual(healthResult.content, 'Health: 100', 'Nested health should render correctly', {
      healthResult
    });
    
    assert.assertEqual(manaResult.content, 'Mana: 50', 'Nested mana should render correctly', {
      manaResult
    });
    
    assert.assertEqual(itemsResult.content, 'Items: 3', 'Nested inventory should render correctly', {
      itemsResult
    });
    
    console.log(`   ✅ Nested variables working: ${playerName}, ${playerHealth}, ${playerMana}, ${inventoryCount}`);
  });

  test('Flag and Variable Interaction', async () => {
    reporter.startTest('Flag and Variable Interaction');
    
    const engine = await createVNEngine();
    engine.loadScript(FLAG_VARIABLE_SCRIPT);
    
    let result = engine.startScene('flag_test');
    
    result = engine.continue(); // addFlag gameStarted
    result = engine.continue(); // setVar flagTest
    
    // Check flag and variable are set in GameState
    const hasFlag = engine.hasFlag('gameStarted');
    const flagTestVar = engine.getVariable('flagTest');
    
    assert.assert(hasFlag, 'Flag should be set in GameState', true, hasFlag, {
      hasFlag,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(flagTestVar, 'value1', 'Flag test variable should be set', {
      flagTestVar,
      gameState: displayGameState(engine)
    });
    
    // Test template rendering
    result = engine.continue(); // "Checking flag status..."
    result = engine.continue(); // Conditional flag check
    const conditionalResult = result;
    result = engine.continue(); // Direct flag check
    const directResult = result;
    result = engine.continue(); // Variable value
    const variableResult = result;
    
    assert.assertEqual(conditionalResult.content, 'Game started: Yes', 'Conditional flag should render correctly', {
      conditionalResult
    });
    
    assert.assertEqual(directResult.content, 'Has flag: true', 'Direct flag check should render correctly', {
      directResult
    });
    
    assert.assertEqual(variableResult.content, 'Flag value: value1', 'Variable should render correctly', {
      variableResult
    });
    
    // Test flag removal
    result = engine.continue(); // "Removing flag..."
    result = engine.continue(); // removeFlag gameStarted
    result = engine.continue(); // "Checking after removal..."
    result = engine.continue(); // Check flag after removal
    const afterRemovalResult = result;
    
    const hasFlagAfterRemoval = engine.hasFlag('gameStarted');
    assert.assert(!hasFlagAfterRemoval, 'Flag should be removed from GameState', false, hasFlagAfterRemoval, {
      hasFlagAfterRemoval,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(afterRemovalResult.content, 'After removal: false', 'Flag removal should render correctly', {
      afterRemovalResult
    });
    
    console.log(`   ✅ Flag operations working: set=${hasFlag}, removed=${!hasFlagAfterRemoval}`);
  });

  test('Variable Increment Operations', async () => {
    reporter.startTest('Variable Increment Operations');
    
    const engine = await createVNEngine();
    engine.loadScript(INCREMENT_VARIABLE_SCRIPT);
    
    let result = engine.startScene('increment_test');
    
    result = engine.continue(); // setVar counter 10
    result = engine.continue(); // "Initial: {{getVar 'counter'}}"
    const initialResult = result;
    
    assert.assertEqual(initialResult.content, 'Initial: 10', 'Initial counter should be correct', {
      initialResult,
      gameState: displayGameState(engine)
    });
    
    result = engine.continue(); // incrementVar counter 5
    result = engine.continue(); // "After +5: {{getVar 'counter'}}"
    const afterIncrementResult = result;
    
    assert.assertEqual(afterIncrementResult.content, 'After +5: 15', 'Counter increment should work', {
      afterIncrementResult,
      gameState: displayGameState(engine)
    });
    
    result = engine.continue(); // incrementVar counter -3
    result = engine.continue(); // "After -3: {{getVar 'counter'}}"
    const afterDecrementResult = result;
    
    assert.assertEqual(afterDecrementResult.content, 'After -3: 12', 'Counter decrement should work', {
      afterDecrementResult,
      gameState: displayGameState(engine)
    });
    
    // Check final value in GameState
    const finalCounter = engine.getVariable('counter');
    assert.assertEqual(finalCounter, 12, 'Final counter should be in GameState', {
      finalCounter,
      gameState: displayGameState(engine)
    });
    
    console.log(`   ✅ Increment operations working: 10 → 15 → 12`);
  });

  test('Variable Persistence Across Scenes', async () => {
    reporter.startTest('Variable Persistence Across Scenes');
    
    const engine = await createVNEngine();
    engine.loadScript(PERSISTENCE_SCRIPT);
    
    let result = engine.startScene('scene1');
    
    result = engine.continue(); // setVar persistent
    result = engine.continue(); // addFlag scene1Visited
    
    // Check initial values
    const initialValue = engine.getVariable('persistent');
    const hasInitialFlag = engine.hasFlag('scene1Visited');
    
    assert.assertEqual(initialValue, 'test123', 'Initial value should be set', {
      initialValue,
      gameState: displayGameState(engine)
    });
    
    assert.assert(hasInitialFlag, 'Initial flag should be set', true, hasInitialFlag, {
      hasInitialFlag,
      gameState: displayGameState(engine)
    });
    
    // Navigate to scene2
    result = engine.continue(); // "Data set, choose next action..."
    result = engine.continue(); // Show choices
    assert.assertEqual(result.type, 'show_choices', 'Should show choices');
    
    result = engine.makeChoice(0); // Go to scene2
    
    // Check values persist in scene2
    result = engine.continue(); // "Value from scene1: {{getVar 'persistent'}}"
    const persistenceResult1 = result;
    result = engine.continue(); // "Flag from scene1: {{hasFlag 'scene1Visited'}}"
    const persistenceResult2 = result;
    
    assert.assertEqual(persistenceResult1.content, 'Value from scene1: test123', 'Variable should persist across scenes', {
      persistenceResult1,
      currentScene: engine.getCurrentScene(),
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(persistenceResult2.content, 'Flag from scene1: true', 'Flag should persist across scenes', {
      persistenceResult2,
      currentScene: engine.getCurrentScene(),
      gameState: displayGameState(engine)
    });
    
    // Modify value in scene2
    result = engine.continue(); // "Modifying data..."
    result = engine.continue(); // setVar persistent 'modified'
    
    const modifiedValue = engine.getVariable('persistent');
    assert.assertEqual(modifiedValue, 'modified', 'Value should be modified in GameState', {
      modifiedValue,
      gameState: displayGameState(engine)
    });
    
    console.log(`   ✅ Persistence working: scene1="${initialValue}" → scene2="${modifiedValue}"`);
  });

  test('Dual State Management Verification', async () => {
    reporter.startTest('Dual State Management Verification');
    
    const engine = await createVNEngine();
    
    engine.setVariable('directSet', 'direct');
    
    const templateResult = engine.parseTemplate('{{setVar "helperSet" "helper"}}{{getVar "directSet"}} + {{getVar "helperSet"}}');
    
    const directValue = engine.getVariable('directSet');
    const helperValue = engine.getVariable('helperSet');
    
    assert.assertEqual(directValue, 'direct', 'Direct GameState operation should work', {
      directValue,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(helperValue, 'helper', 'VN helper should update GameState', {
      helperValue,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(templateResult, 'direct + helper', 'Template should render both values', {
      templateResult,
      directValue,
      helperValue
    });
    
    engine.loadScript('test_scene:\n  - say: "{{addFlag \'templateFlag\'}}"');
    engine.startScene('test_scene');
    
    const hasTemplateFlag = engine.hasFlag('templateFlag');
    assert.assert(hasTemplateFlag, 'Template-set flag should be available via API', true, hasTemplateFlag, {
      hasTemplateFlag,
      gameState: displayGameState(engine)
    });
    
    console.log(`   ✅ Dual state management verified: direct="${directValue}", helper="${helperValue}", flag=${hasTemplateFlag}`);
  });

  test('Save/Load Preserves Helper Variables', async () => {
    reporter.startTest('Save/Load Preserves Helper Variables');
    
    const engine = await createVNEngine();
    engine.loadScript(SIMPLE_VARIABLE_SCRIPT);
    engine.startScene('variable_test');
    
    // Set variables through both direct API and helpers
    engine.setVariable('apiVar', 'api');
    engine.parseTemplate('{{setVar "helperVar" "helper"}}{{addFlag "testFlag"}}');
    
    // Create save
    const saveData = engine.createSave();
    
    const loadResult = engine.loadSave(saveData);
    console.log(loadResult);
    assert.assertNotEqual(loadResult.type, 'error', 'Load should succeed');
    
    // Verify restoration
    const restoredApiVar = engine.getVariable('apiVar');
    const restoredHelperVar = engine.getVariable('helperVar');
    const restoredFlag = engine.hasFlag('testFlag');
    
    assert.assertEqual(restoredApiVar, 'api', 'API variable should be restored', {
      restoredApiVar,
      gameState: displayGameState(engine)
    });
    
    assert.assertEqual(restoredHelperVar, 'helper', 'Helper variable should be restored', {
      restoredHelperVar,
      gameState: displayGameState(engine)
    });
    
    assert.assert(restoredFlag, 'Flag should be restored', true, restoredFlag, {
      restoredFlag,
      gameState: displayGameState(engine)
    });
    
    console.log(`   ✅ Save/load verified: api="${restoredApiVar}", helper="${restoredHelperVar}", flag=${restoredFlag}`);
  });

  // Run tests
  console.log('🔍 Running VN core variable tests...\n');

  for (const { name, testFn } of tests) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      console.log(`   Details: ${error.stack?.split('\n')[1]?.trim()}`);
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

  // Report results
  if (reporter.errors.length > 0) {
    console.log('\n🔍 Detailed Error Analysis:');
    console.log(reporter.generateSummary());
  }

  console.log(`\n📊 VN Core Variable Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (packageInfo) {
    console.log(`📦 Tested Package: ${packageInfo.name}@${packageInfo.version}`);
  }

  if (failed > 0) {
    console.log('\n🔧 Issues detected with dual-state management:');
    console.log('   • VN helpers may not be properly updating GameStateManager');
    console.log('   • Template context and persistent state may be out of sync');
    console.log('   • Check that setGameStateManager() is called during initialization');
    return { passed, failed, success: false, errors: reporter.exportErrors(), packageInfo };
  } else {
    console.log('\n🎉 All VN core variable tests passed!');
    console.log('   ✅ Dual-state management working correctly');
    console.log('   ✅ Both template context and GameStateManager stay in sync');
    console.log('   ✅ Variables persist across scenes and save/load cycles');
    console.log('   ✅ Flags work correctly in both templates and API calls');
    return { passed, failed, success: true, errors: null, packageInfo };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runVNCoreVariableTests().then(results => {
    if (!results.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ VN core variable test runner failed:', error);
    process.exit(1);
  });
}