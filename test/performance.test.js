
import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

const PERFORMANCE_TARGETS = {
  initialization: 100,
  scriptLoading: 50,
  sceneExecution: 1,
  templateParsing: 0.1,
  stateOperations: 20,
  memoryPerEngine: 5,
  concurrentEngines: 1000,
  packageOverhead: 50
};

function generateLargeScript(sceneCount = 100) {
  let script = '';
  
  for (let i = 0; i < sceneCount; i++) {
    script += `scene_${i}:\n`;
    script += `  - "Text for scene ${i}"\n`;
    script += `  - actions:\n`;
    script += `    - type: setVar\n`;
    script += `      key: scene${i}Visited\n`;
    script += `      value: true\n`;
    
    if (i < sceneCount - 1) {
      script += `  - choices:\n`;
      script += `    - text: "Next"\n`;
      script += `      goto: scene_${i + 1}\n`;
      script += `    - text: "Skip"\n`;
      script += `      goto: scene_${Math.min(i + 5, sceneCount - 1)}\n`;
    }
    script += '\n';
  }
  
  return script;
}

function generateTemplateStressTest() {
  return `
template_test:
  - actions:
    - type: setVar
      key: items
      value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    - type: setVar  
      key: playerName
      value: "TestPlayer"
    - type: setVar
      key: score
      value: 1000
  - "Player: {{playerName}}"
  - "Score: {{score}}"
  - "Items: {{length items}}"
`;
}

function generateStressTestScript(variableCount = 1000) {
  let script = 'stress_test:\n  - actions:\n';
  for (let i = 0; i < variableCount; i++) {
    script += `    - type: setVar\n      key: var${i}\n      value: ${i}\n`;
  }
  script += '  - "Variables set: {{var999}}"';
  return script;
}

export async function runPerformanceTests() {
  console.log('⚡ VN Engine Performance Tests (Package-based)');
  console.log('===============================================\n');

  const { reporter, assert } = createTestReporter();
  reporter.setContext({ category: 'performance-packaged' });

  const results = {
    packageSetup: null,
    initialization: null,
    scriptLoading: null,
    sceneExecution: null,
    templateParsing: null,
    stateOperations: null,
    memoryUsage: null,
    concurrentOperations: null,
    packageStats: null
  };

  let createVNEngine = null;
  let packageInfo = null;

  
  console.log('📦 Setting up packaged library for performance testing...');
  
  try {
    const packageStart = performance.now();
    
    const importPath = await createTestPackage({
      includeDependencies: true,
      customPackageJson: {}
    });
    
    const packageEnd = performance.now();
    const packageSetupTime = packageEnd - packageStart;
    results.packageSetup = packageSetupTime;
    
    console.log(`✅ Package setup completed in ${packageSetupTime.toFixed(2)}ms`);
    
    await verifyTestPackage();
    console.log('✅ Package verification successful');
    
    packageInfo = getPackageInfo();
    const packageStats = await packageInfo?.getPackageStats?.() || null;
    results.packageStats = packageStats;
    
    console.log(`📦 Testing package: ${packageInfo.name}@${packageInfo.version}`);
    if (packageStats) {
      console.log(`📊 Package size: ${packageStats.tarballSizeMB}MB (tarball), ${packageStats.extractedSizeMB}MB (extracted)`);
      console.log(`📊 Compression ratio: ${packageStats.compressionRatio}x`);
      console.log(`📊 File count: ${packageStats.fileCount} files`);
    }
    
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

  reporter.setContext({ 
    packageInfo: {
      name: packageInfo.name,
      version: packageInfo.version,
      main: packageInfo.main,
      setupTime: results.packageSetup
    }
  });

  
  console.log('🚀 Testing Initialization Performance (Package-based)...');
  reporter.setContext({ subcategory: 'initialization' });
  
  try {
    reporter.startTest('Engine Initialization Performance (Package)');
    
    const initTimes = [];
    const engines = [];
    
    for (let i = 0; i < 5; i++) {
      const initStart = performance.now();
      const engine = await createVNEngine();
      const initEnd = performance.now();
      
      const initTime = initEnd - initStart;
      initTimes.push(initTime);
      engines.push(engine);
    }
    
    engines.forEach(engine => {
      try {
        engine.destroy();
      } catch (error) {
      }
    });
    
    const avgInitTime = initTimes.reduce((a, b) => a + b, 0) / initTimes.length;
    const minInitTime = Math.min(...initTimes);
    const maxInitTime = Math.max(...initTimes);
    
    results.initialization = avgInitTime;
    
    console.log(`   Average Initialization: ${avgInitTime.toFixed(2)}ms (Package-based)`);
    console.log(`   Range: ${minInitTime.toFixed(2)}ms - ${maxInitTime.toFixed(2)}ms`);
    
    const testEngine = await createVNEngine();
    const info = testEngine.getTemplateEngineInfo();
    
    console.log(`   Engine Type: ${info.type}`);
    console.log(`   Helpers Available: ${info.supportedFeatures.helpers}`);
    
    const targetWithOverhead = PERFORMANCE_TARGETS.initialization + PERFORMANCE_TARGETS.packageOverhead;
    assert.assert(avgInitTime <= targetWithOverhead, 
      `Initialization should be under ${targetWithOverhead}ms (including package overhead)`, 
      `≤${targetWithOverhead}ms`, 
      `${avgInitTime.toFixed(2)}ms`, {
        engine: testEngine,
        packageInfo,
        initTimes,
        avgInitTime,
        target: PERFORMANCE_TARGETS.initialization,
        targetWithOverhead,
        engineInfo: info,
        relatedTests: ['Script Loading Performance (Package)']
      }
    );
    
    testEngine.destroy();
    
  } catch (error) {
    console.error(`❌ Initialization performance test failed: ${error.message}`);
    results.initialization = -1;
  }

  
  console.log('\n📝 Testing Script Loading Performance (Package-based)...');
  reporter.setContext({ subcategory: 'script-loading' });
  
  try {
    const engine = await createVNEngine();
    
    const testCases = [
      { name: 'Small Script (10 scenes)', sceneCount: 10 },
      { name: 'Medium Script (50 scenes)', sceneCount: 50 },
      { name: 'Large Script (200 scenes)', sceneCount: 200 }
    ];
    
    const loadingTimes = [];
    
    for (const testCase of testCases) {
      reporter.startTest(`Script Loading (Package) - ${testCase.name}`);
      
      const script = generateLargeScript(testCase.sceneCount);
      
      const start = performance.now();
      engine.loadScript(script);
      const end = performance.now();
      
      const loadTime = end - start;
      loadingTimes.push({ ...testCase, loadTime, scriptSize: script.length });
      
      console.log(`   ${testCase.name}: ${loadTime.toFixed(2)}ms`);
      
      assert.assert(!engine.getError(), 
        `${testCase.name} should load without error`, 
        'no error', 
        engine.getError(), {
          engine,
          packageInfo,
          testCase,
          loadTime,
          scriptSize: script.length,
          sceneCount: engine.getSceneCount()
        }
      );
    }
    
    const largestLoadTime = Math.max(...loadingTimes.map(t => t.loadTime));
    results.scriptLoading = largestLoadTime;
    
    console.log(`   Scenes Loaded: ${engine.getSceneCount()}`);
    
    assert.assert(largestLoadTime <= PERFORMANCE_TARGETS.scriptLoading, 
      `Large script loading should be under ${PERFORMANCE_TARGETS.scriptLoading}ms`, 
      `≤${PERFORMANCE_TARGETS.scriptLoading}ms`, 
      `${largestLoadTime.toFixed(2)}ms`, {
        engine,
        packageInfo,
        loadingTimes,
        largestLoadTime,
        target: PERFORMANCE_TARGETS.scriptLoading,
        relatedTests: ['Scene Execution Performance (Package)']
      }
    );
    
    engine.destroy();
    
  } catch (error) {
    console.error(`❌ Script loading performance test failed: ${error.message}`);
    results.scriptLoading = -1;
  }

  
  console.log('\n🎬 Testing Scene Execution Performance (Package-based)...');
  reporter.setContext({ subcategory: 'scene-execution' });
  
  try {
    const engine = await createVNEngine();
    const script = generateLargeScript(100);
    engine.loadScript(script);
    
    const executionTimes = [];
    
    for (let i = 0; i < 10; i++) {
      reporter.startTest(`Scene Execution (Package) - scene_${i}`);
      
      const start = performance.now();
      engine.startScene(`scene_${i}`);
      engine.continue();
      const end = performance.now();
      
      const execTime = end - start;
      executionTimes.push(execTime);
    }
    
    const avgExecution = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const minExecution = Math.min(...executionTimes);
    const maxExecution = Math.max(...executionTimes);
    
    results.sceneExecution = avgExecution;
    
    console.log(`   Average Scene Execution: ${avgExecution.toFixed(2)}ms`);
    console.log(`   Min: ${minExecution.toFixed(2)}ms`);
    console.log(`   Max: ${maxExecution.toFixed(2)}ms`);
    
    assert.assert(avgExecution <= PERFORMANCE_TARGETS.sceneExecution, 
      `Scene execution should be under ${PERFORMANCE_TARGETS.sceneExecution}ms`, 
      `≤${PERFORMANCE_TARGETS.sceneExecution}ms`, 
      `${avgExecution.toFixed(2)}ms`, {
        engine,
        packageInfo,
        executionTimes,
        avgExecution,
        minExecution,
        maxExecution,
        target: PERFORMANCE_TARGETS.sceneExecution,
        gameState: engine.getGameState(),
        relatedTests: ['Template Parsing Performance (Package)']
      }
    );
    
    engine.destroy();
    
  } catch (error) {
    console.error(`❌ Scene execution performance test failed: ${error.message}`);
    results.sceneExecution = -1;
  }

  
  console.log('\n🎭 Testing Template Parsing Performance (Package-based)...');
  reporter.setContext({ subcategory: 'template-parsing' });
  
  try {
    const engine = await createVNEngine();
    engine.loadScript(generateTemplateStressTest());
    engine.startScene('template_test');
    engine.continue();
    
    const templates = [
      '{{playerName}}',
      '{{score}}',
      'Player {{playerName}} has {{score}} points',
      '{{#if (gt score 500)}}High score!{{else}}Low score{{/if}}'
    ];
    
    if (engine.supportsTemplateFeature('helpers')) {
      templates.push('{{add score 100}}');
      templates.push('{{capitalize playerName}}');
      templates.push('{{length items}}');
    }
    
    const templateTimes = [];
    const iterations = 1000;
    
    for (const template of templates) {
      reporter.startTest(`Template Parsing (Package) - ${template}`);
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        engine.parseTemplate(template);
      }
      const end = performance.now();
      
      const timePerTemplate = (end - start) / iterations;
      templateTimes.push({ template, timePerTemplate, totalTime: end - start });
      console.log(`   "${template}": ${timePerTemplate.toFixed(4)}ms per parse`);
      
      const result = engine.parseTemplate(template);
      assert.assertType(result, 'string', 
        `Template should render to string: ${template}`, {
          engine,
          packageInfo,
          template,
          result,
          timePerTemplate,
          iterations
        }
      );
    }
    
    const avgTemplateTime = templateTimes.reduce((sum, t) => sum + t.timePerTemplate, 0) / templateTimes.length;
    results.templateParsing = avgTemplateTime;
    
    assert.assert(avgTemplateTime <= PERFORMANCE_TARGETS.templateParsing, 
      `Template parsing should be under ${PERFORMANCE_TARGETS.templateParsing}ms per template`, 
      `≤${PERFORMANCE_TARGETS.templateParsing}ms`, 
      `${avgTemplateTime.toFixed(4)}ms`, {
        engine,
        packageInfo,
        templateTimes,
        avgTemplateTime,
        target: PERFORMANCE_TARGETS.templateParsing,
        engineInfo: engine.getEngineInfo(),
        iterations,
        relatedTests: ['State Operations Performance (Package)']
      }
    );
    
    engine.destroy();
    
  } catch (error) {
    console.error(`❌ Template parsing performance test failed: ${error.message}`);
    results.templateParsing = -1;
  }

  
  console.log('\n💾 Testing State Operations Performance (Package-based)...');
  reporter.setContext({ subcategory: 'state-operations' });
  
  try {
    const engine = await createVNEngine();
    
    const stateSetCount = 1000;
    
    reporter.startTest('Bulk State Operations (Package)');
    
    const start = performance.now();
    for (let i = 0; i < stateSetCount; i++) {
      try {
        engine.setGameState({
          variables: new Map([['testVar', i]]),
          storyFlags: [`flag${i}`],
          choiceHistory: [],
          currentScene: 'test',
          currentInstruction: 0,
          schemaVersion: '1.0.0',
          saveDate: new Date().toISOString()
        });
      } catch (error) {
        console.log(`   ⚠️ State operation ${i} failed: ${error.message}`);
        break;
      }
    }
    const end = performance.now();
    
    const bulkStateTime = end - start;
    console.log(`   ${stateSetCount} State Sets: ${bulkStateTime.toFixed(2)}ms`);
    
    const saveLoadCount = 100;
    
    reporter.startTest('Save/Load Cycles (Package)');
    
    const saveStart = performance.now();
    for (let i = 0; i < saveLoadCount; i++) {
      try {
        const saveData = engine.createSave();
        const loadResult = engine.loadSave(saveData);
        if (!loadResult) {
          console.log(`   ⚠️ Save/load cycle ${i} failed`);
          break;
        }
      } catch (error) {
        console.log(`   ⚠️ Save/load cycle ${i} failed: ${error.message}`);
        break;
      }
    }
    const saveEnd = performance.now();
    
    const saveLoadTime = saveEnd - saveStart;
    results.stateOperations = saveLoadTime;
    
    console.log(`   ${saveLoadCount} Save/Load Cycles: ${saveLoadTime.toFixed(2)}ms`);
    
    assert.assert(saveLoadTime <= PERFORMANCE_TARGETS.stateOperations, 
      `State operations should be under ${PERFORMANCE_TARGETS.stateOperations}ms per 100 cycles`, 
      `≤${PERFORMANCE_TARGETS.stateOperations}ms`, 
      `${saveLoadTime.toFixed(2)}ms`, {
        engine,
        packageInfo,
        saveLoadTime,
        bulkStateTime,
        stateSetCount,
        saveLoadCount,
        target: PERFORMANCE_TARGETS.stateOperations,
        gameState: engine.getGameState(),
        relatedTests: ['Memory Usage (Package)']
      }
    );
    
    engine.destroy();
    
  } catch (error) {
    console.error(`❌ State operations performance test failed: ${error.message}`);
    results.stateOperations = -1;
  }

  
  console.log('\n🧠 Testing Memory Usage (Package-based)...');
  reporter.setContext({ subcategory: 'memory-usage' });
  
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      reporter.startTest('Memory Usage Analysis (Package)');
      
      const memBefore = process.memoryUsage();
      
      const engines = [];
      const engineCount = 5;
      
      for (let i = 0; i < engineCount; i++) {
        const testEngine = await createVNEngine();
        testEngine.loadScript(generateLargeScript(50));
        engines.push(testEngine);
      }
      
      const memAfter = process.memoryUsage();
      const memDiff = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      const memPerEngine = memDiff / engineCount;
      
      results.memoryUsage = memPerEngine;
      
      console.log(`   Memory per Engine: ~${memPerEngine.toFixed(2)}MB`);
      console.log(`   Total Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      assert.assert(memPerEngine <= PERFORMANCE_TARGETS.memoryPerEngine, 
        `Memory per engine should be under ${PERFORMANCE_TARGETS.memoryPerEngine}MB`, 
        `≤${PERFORMANCE_TARGETS.memoryPerEngine}MB`, 
        `${memPerEngine.toFixed(2)}MB`, {
          packageInfo,
          engineCount,
          memBefore: {
            heapUsed: `${(memBefore.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memBefore.heapTotal / 1024 / 1024).toFixed(2)}MB`
          },
          memAfter: {
            heapUsed: `${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memAfter.heapTotal / 1024 / 1024).toFixed(2)}MB`
          },
          memDiff: `${memDiff.toFixed(2)}MB`,
          memPerEngine: `${memPerEngine.toFixed(2)}MB`,
          target: PERFORMANCE_TARGETS.memoryPerEngine
        }
      );
      
      engines.forEach(e => {
        try {
          e.destroy();
        } catch (error) {
        }
      });
      
    } else {
      console.log('   Memory measurement not available in this environment');
      results.memoryUsage = 0;
    }
    
  } catch (error) {
    console.error(`❌ Memory usage test failed: ${error.message}`);
    results.memoryUsage = -1;
  }

  
  console.log('\n🔄 Testing Concurrent Operations (Package-based)...');
  reporter.setContext({ subcategory: 'concurrency' });
  
  try {
    reporter.startTest('Concurrent Engine Operations (Package)');
    
    const concurrentCount = 10;
    const start = performance.now();
    const concurrentPromises = [];
    
    for (let i = 0; i < concurrentCount; i++) {
      concurrentPromises.push((async () => {
        try {
          const testEngine = await createVNEngine();
          testEngine.loadScript(generateLargeScript(20));
          testEngine.startScene('scene_0');
          return testEngine;
        } catch (error) {
          console.log(`   ⚠️ Concurrent engine ${i} failed: ${error.message}`);
          return null;
        }
      })());
    }
    
    const concurrentEngines = await Promise.all(concurrentPromises);
    const successfulEngines = concurrentEngines.filter(e => e !== null);
    const end = performance.now();
    
    const concurrentTime = end - start;
    results.concurrentOperations = concurrentTime;
    
    console.log(`   ${successfulEngines.length}/${concurrentCount} Concurrent Engines: ${concurrentTime.toFixed(2)}ms`);
    
    assert.assert(concurrentTime <= PERFORMANCE_TARGETS.concurrentEngines, 
      `Concurrent operations should be under ${PERFORMANCE_TARGETS.concurrentEngines}ms`, 
      `≤${PERFORMANCE_TARGETS.concurrentEngines}ms`, 
      `${concurrentTime.toFixed(2)}ms`, {
        packageInfo,
        concurrentCount,
        successfulEngines: successfulEngines.length,
        concurrentTime,
        target: PERFORMANCE_TARGETS.concurrentEngines,
        failedEngines: concurrentCount - successfulEngines.length
      }
    );
    
    successfulEngines.forEach(e => {
      try {
        e.destroy();
      } catch (error) {
      }
    });
    
  } catch (error) {
    console.error(`❌ Concurrent operations test failed: ${error.message}`);
    results.concurrentOperations = -1;
  }

  
  console.log('\n💪 Running Stress Tests (Package-based)...');
  reporter.setContext({ subcategory: 'stress-tests' });
  
  try {
    reporter.startTest('Large Dataset Stress Test (Package)');
    
    const engine = await createVNEngine();
    const stressScript = generateStressTestScript(2000);
    
    const stressStart = performance.now();
    engine.loadScript(stressScript);
    engine.startScene('stress_test');
    engine.continue();
    const stressEnd = performance.now();
    
    const stressTime = stressEnd - stressStart;
    const testVar = engine.getVariable('var999');
    
    console.log(`   Stress Test (2000 variables): ${stressTime.toFixed(2)}ms`);
    console.log(`   Variable verification: var999 = ${testVar}`);
    
    assert.assertEqual(testVar, 999, 'Stress test should handle large datasets correctly', {
      engine,
      packageInfo,
      stressTime,
      variableCount: 2000,
      gameState: engine.getGameState()
    });
    
    engine.destroy();
    
  } catch (error) {
    console.error(`❌ Stress test failed: ${error.message}`);
  }

  
  console.log('\n🧹 Cleaning up test package...');
  try {
    await cleanupTestPackage();
    console.log('✅ Performance test cleanup completed');
  } catch (error) {
    console.warn(`⚠️ Cleanup failed: ${error.message}`);
  }

  
  console.log('\n📊 Performance Summary (Package-based)');
  console.log('=======================================');
  
  const summaryItems = [
    { name: 'Package Setup', value: results.packageSetup, unit: 'ms', target: null },
    { name: 'Initialization', value: results.initialization, unit: 'ms', target: PERFORMANCE_TARGETS.initialization + PERFORMANCE_TARGETS.packageOverhead },
    { name: 'Script Loading (200 scenes)', value: results.scriptLoading, unit: 'ms', target: PERFORMANCE_TARGETS.scriptLoading },
    { name: 'Scene Execution', value: results.sceneExecution, unit: 'ms', target: PERFORMANCE_TARGETS.sceneExecution },
    { name: 'Template Parsing', value: results.templateParsing, unit: 'ms per template', target: PERFORMANCE_TARGETS.templateParsing },
    { name: 'State Operations', value: results.stateOperations, unit: 'ms per 100 cycles', target: PERFORMANCE_TARGETS.stateOperations }
  ];
  
  if (results.memoryUsage > 0) {
    summaryItems.push({ 
      name: 'Memory per Engine', 
      value: results.memoryUsage, 
      unit: 'MB', 
      target: PERFORMANCE_TARGETS.memoryPerEngine 
    });
  }
  
  summaryItems.forEach(item => {
    if (item.value !== null && item.value >= 0) {
      const decimals = item.unit.includes('template') ? 4 : 2;
      const targetText = item.target ? ` (target: ≤${item.target}${item.unit})` : '';
      console.log(`🚀 ${item.name}: ${item.value.toFixed(decimals)}${item.unit}${targetText}`);
    }
  });

  if (results.packageStats) {
    console.log(`\n📦 Package Metrics:`);
    console.log(`🚀 Tarball Size: ${results.packageStats.tarballSizeMB}MB`);
    console.log(`🚀 Extracted Size: ${results.packageStats.extractedSizeMB}MB`);
    console.log(`🚀 Compression Ratio: ${results.packageStats.compressionRatio}x`);
    console.log(`🚀 File Count: ${results.packageStats.fileCount} files`);
  }

  
  console.log('\n🎯 Performance Benchmarks (Package-based)');
  console.log('==========================================');
  
  const benchmarks = [
    { name: 'packageSetup', target: null, current: results.packageSetup, unit: 'ms' },
    { name: 'initialization', target: PERFORMANCE_TARGETS.initialization + PERFORMANCE_TARGETS.packageOverhead, current: results.initialization, unit: 'ms' },
    { name: 'scriptLoading', target: PERFORMANCE_TARGETS.scriptLoading, current: results.scriptLoading, unit: 'ms' },
    { name: 'sceneExecution', target: PERFORMANCE_TARGETS.sceneExecution, current: results.sceneExecution, unit: 'ms' },
    { name: 'templateParsing', target: PERFORMANCE_TARGETS.templateParsing, current: results.templateParsing, unit: 'ms/template' },
    { name: 'stateOperations', target: PERFORMANCE_TARGETS.stateOperations, current: results.stateOperations, unit: 'ms' }
  ];
  
  let benchmarksPassed = 0;
  let totalBenchmarks = 0;
  
  for (const benchmark of benchmarks) {
    if (benchmark.current !== null && benchmark.current >= 0 && benchmark.target !== null) {
      totalBenchmarks++;
      const passed = benchmark.current <= benchmark.target;
      const status = passed ? '✅' : '⚠️';
      
      console.log(`${status} ${benchmark.name}: ${benchmark.current.toFixed(benchmark.unit.includes('template') ? 4 : 2)}${benchmark.unit} (target: ≤${benchmark.target}${benchmark.unit})`);
      
      if (passed) benchmarksPassed++;
    } else if (benchmark.current !== null && benchmark.current >= 0) {
      console.log(`ℹ️ ${benchmark.name}: ${benchmark.current.toFixed(benchmark.unit.includes('template') ? 4 : 2)}${benchmark.unit} (no target)`);
    }
  }
  
  console.log(`\n📈 Benchmark Results: ${benchmarksPassed}/${totalBenchmarks} passed`);
  
  if (packageInfo) {
    console.log(`📦 Package: ${packageInfo.name}@${packageInfo.version}`);
  }
  
  if (reporter.errors.length > 0) {
    console.log(reporter.generateSummary());
  }
  
  const allPassed = benchmarksPassed === totalBenchmarks && reporter.errors.length === 0;
  
  if (allPassed) {
    console.log('🎉 All performance benchmarks passed for packaged version!');
    return { passed: totalBenchmarks, failed: 0, success: true, results, errors: null, packageInfo };
  } else {
    const failedCount = totalBenchmarks - benchmarksPassed + reporter.errors.length;
    console.log('⚠️ Some performance benchmarks failed for packaged version - consider optimization');
    return { 
      passed: benchmarksPassed, 
      failed: failedCount, 
      success: false, 
      results, 
      errors: reporter.exportErrors(),
      packageInfo
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests().catch(error => {
    console.error('❌ Package-based performance test failed:', error);
    process.exit(1);
  });
}
