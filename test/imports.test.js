
import { createTestReporter } from "./utils/errorReporter.js";
import { getPackager, cleanupTestPackage } from "./utils/packager.js";

async function runImportTests() {
  const { reporter, assert } = createTestReporter();
  reporter.setContext({ category: "import-export-compatibility" });

  console.log("📦 VN Engine Import/Export Tests (npm Package)");
  console.log("==============================================");
  console.log();

  let passed = 0;
  let failed = 0;
  let packageInfo = null;
  let importPath = null;

  try {
    console.log("📦 Setting up package for import testing...");
    
    const packager = getPackager();
    
    packageInfo = await packager.createTestPackage({
      includeDependencies: true,
      customPackageJson: {},
    });

    const verificationResult = await packager.verifyPackageWorks();
    if (!verificationResult) {
      throw new Error("Package verification failed during import test setup");
    }

    importPath = packager.getImportPath();
    if (!importPath) {
      throw new Error("Import path not available after package creation");
    }

    console.log(`✅ Package ready: ${packageInfo.name}@${packageInfo.version}`);
    console.log();

    console.log("🔍 Running comprehensive import/export tests...");
    console.log();

    const test = async (name, testFn) => {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
        
        reporter.createDetailedError(
          name,
          error,
          "successful import/export test",
          "import/export test failure",
          {
            packageInfo,
            importPath,
            errorType: error.constructor.name,
            errorStack: error.stack?.split("\n").slice(0, 3).join("\n"),
          }
        );
      }
    };

    await test('All Exports Available', async () => {
      reporter.startTest('All Exports Available');
      
      const lib = await import(importPath);
      
      const requiredExports = [
        'createVNEngine', 'VNEngine', 'GameStateManager', 'ScriptEngine',
        'ScriptParser', 'TemplateManager', 'ActionValidationError',
        'ScriptParseError', 'TemplateRenderError', 'VNEngineError',
        'SimpleTemplateEngine', 'helpers', 'getAvailableHelpers',
        'registerAllHelpers', 'safeRegisterHelpers', 'getNestedValue',
        'setNestedValue', 'PACKAGE_INFO'
      ];
      
      const availableExports = Object.keys(lib);
      
      for (const exportName of requiredExports) {
        assert.assertDefined(lib[exportName], 
          `Missing required export: ${exportName}`, {
            availableExports,
            requiredExports,
            packageInfo
          });
      }
      
      console.log(`   ✅ All ${requiredExports.length} required exports available`);
    });

    await test('Named Import Patterns', async () => {
      reporter.startTest('Named Import Patterns');
      
      const { createVNEngine, VNEngine, GameStateManager } = await import(importPath);
      
      assert.assertType(createVNEngine, 'function', 
        'createVNEngine should be a function', { packageInfo });
      assert.assertType(VNEngine, 'function', 
        'VNEngine should be a constructor', { packageInfo });
      assert.assertType(GameStateManager, 'function', 
        'GameStateManager should be a constructor', { packageInfo });
      
      const engine = await createVNEngine();
      assert.assertType(engine.loadScript, 'function', 
        'Engine from named import should work', { packageInfo });
      
      engine.destroy();
      console.log(`   ✅ Named imports work correctly`);
    });

    await test('Namespace Import Pattern', async () => {
      reporter.startTest('Namespace Import Pattern');
      
      const VNEngineLib = await import(importPath);
      
      assert.assertDefined(VNEngineLib.createVNEngine, 
        'Namespace import should have createVNEngine', { packageInfo });
      assert.assertDefined(VNEngineLib.VNEngine, 
        'Namespace import should have VNEngine', { packageInfo });
      
      const engine = await VNEngineLib.createVNEngine();
      assert.assertType(engine.loadScript, 'function', 
        'Engine from namespace import should work', { packageInfo });
      
      engine.destroy();
      console.log(`   ✅ Namespace import works correctly`);
    });

    await test('Helper Functions Export', async () => {
      reporter.startTest('Helper Functions Export');
      
      const lib = await import(importPath);
      
      assert.assertDefined(lib.helpers, 'helpers should be exported', { packageInfo });
      assert.assertType(lib.getAvailableHelpers, 'function', 
        'getAvailableHelpers should be a function', { packageInfo });
      assert.assertType(lib.registerAllHelpers, 'function', 
        'registerAllHelpers should be a function', { packageInfo });
      assert.assertType(lib.getNestedValue, 'function', 
        'getNestedValue should be a function', { packageInfo });
      assert.assertType(lib.setNestedValue, 'function', 
        'setNestedValue should be a function', { packageInfo });
      
      const availableHelpers = lib.getAvailableHelpers();
      
      if (Array.isArray(availableHelpers)) {
        assert.assert(availableHelpers.length > 0, 
          'getAvailableHelpers should return non-empty array', { packageInfo, availableHelpers });
      } else if (typeof availableHelpers === 'object' && availableHelpers !== null) {
        const helperKeys = Object.keys(availableHelpers);
        assert.assert(helperKeys.length > 0, 
          'getAvailableHelpers should return non-empty object', { packageInfo, availableHelpers, helperKeys });
      } else {
        assert.assertDefined(availableHelpers, 
          'getAvailableHelpers should return valid helper data', { packageInfo, availableHelpers });
      }
      
      console.log(`   ✅ Helper functions work correctly`);
    });

    await test('Type Exports (TypeScript)', async () => {
      reporter.startTest('Type Exports (TypeScript)');
      
      const lib = await import(importPath);
      
      assert.assertType(lib.VNEngine, 'function', 
        'VNEngine constructor should be exported', { packageInfo });
      assert.assertType(lib.GameStateManager, 'function', 
        'GameStateManager constructor should be exported', { packageInfo });
      assert.assertType(lib.ScriptEngine, 'function', 
        'ScriptEngine constructor should be exported', { packageInfo });
      assert.assertType(lib.ScriptParser, 'function', 
        'ScriptParser constructor should be exported', { packageInfo });
      assert.assertType(lib.TemplateManager, 'function', 
        'TemplateManager constructor should be exported', { packageInfo });
      
      console.log(`   ✅ Type-compatible structures verified`);
    });

    await test('Error Classes Export', async () => {
      reporter.startTest('Error Classes Export');
      
      const lib = await import(importPath);
      
      assert.assertType(lib.VNEngineError, 'function', 
        'VNEngineError should be exported', { packageInfo });
      assert.assertType(lib.ScriptParseError, 'function', 
        'ScriptParseError should be exported', { packageInfo });
      assert.assertType(lib.TemplateRenderError, 'function', 
        'TemplateRenderError should be exported', { packageInfo });
      assert.assertType(lib.ActionValidationError, 'function', 
        'ActionValidationError should be exported', { packageInfo });
      
      const customError = new lib.VNEngineError('Test error');
      assert.assert(customError instanceof Error, 
        'VNEngineError should extend Error', { packageInfo, customError });
      assert.assertEqual(customError.message, 'Test error', 
        'Error message should be set correctly', { packageInfo, customError });
      
      console.log(`   ✅ Error classes work correctly`);
    });

    await test('Node.js Environment Compatibility', async () => {
      reporter.startTest('Node.js Environment Compatibility');
      
      const lib = await import(importPath);
      const engine = await lib.createVNEngine();
      
      engine.loadScript(`
        test_scene:
          - "Hello from Node.js"
          - choices:
            - text: "Choice 1"
              scene: "test_scene"
      `);
      
      const result = engine.startScene('test_scene');
      assert.assertEqual(result.type, 'display_dialogue', 
        'Should work in Node.js environment', { packageInfo, result });
      assert.assertEqual(result.content, 'Hello from Node.js', 
        'Content should match in Node.js', { packageInfo, result });
      
      engine.destroy();
      console.log(`   ✅ Node.js compatibility verified`);
    });

    await test('Optional Dependency Handling', async () => {
      reporter.startTest('Optional Dependency Handling');
      
      const lib = await import(importPath);
      const engine = await lib.createVNEngine();
      
      const templateInfo = engine.getTemplateEngineInfo();
      assert.assert(['handlebars', 'simple'].includes(templateInfo.type), 
        'Should have valid template engine', { packageInfo, templateInfo });
      
      engine.loadScript(`
        template_test:
          - "Hello World - Template Engine Working"
          - choices:
            - text: "Test Choice"
              scene: "template_test"
      `);
      
      const result = engine.startScene('template_test');
      
      assert.assertDefined(result, 'Should get dialogue result', { 
        packageInfo, 
        templateInfo,
        result,
        gameState: engine.getGameState()
      });
      
      assert.assertEqual(result.type, 'display_dialogue', 
        'Should display dialogue', { 
          packageInfo, 
          templateInfo, 
          result,
          gameState: engine.getGameState()
        });
      
      assert.assertDefined(result.content, 'Result should have content', { 
        packageInfo, 
        templateInfo, 
        result 
      });
      
      assert.assertEqual(result.content, 'Hello World - Template Engine Working',
        'Template engine should process content correctly', { 
          packageInfo, 
          templateInfo, 
          result,
          gameState: engine.getGameState(),
          templateEngineType: templateInfo.type
        });
      
      const choicesResult = engine.continue();
      assert.assertEqual(choicesResult.type, 'show_choices',
        'Should show choices after dialogue', {
          packageInfo,
          templateInfo,
          choicesResult,
          gameState: engine.getGameState()
        });
      
      engine.destroy();
      console.log(`   ✅ Optional dependency handling (${templateInfo.type}) works`);
    });

    await test('Tree-shaking Compatibility', async () => {
      reporter.startTest('Tree-shaking Compatibility');
      
      const lib = await import(importPath);
      
      const { createVNEngine } = lib;
      assert.assertType(createVNEngine, 'function', 
        'Individual export should work for tree-shaking', { packageInfo });
      
      const engine = await createVNEngine();
      assert.assertType(engine.loadScript, 'function', 
        'Tree-shaken import should still work', { packageInfo });
      
      engine.destroy();
      console.log(`   ✅ Tree-shaking compatibility verified`);
    });

    await test('Multiple Engine Instances', async () => {
      reporter.startTest('Multiple Engine Instances');
      
      const lib = await import(importPath);
      
      const engine1 = await lib.createVNEngine();
      const engine2 = await lib.createVNEngine();
      
      engine1.loadScript('scene1: ["Engine 1"]');
      engine2.loadScript('scene2: ["Engine 2"]');
      
      const result1 = engine1.startScene('scene1');
      const result2 = engine2.startScene('scene2');
      
      assert.assertEqual(result1.content, 'Engine 1', 
        'First engine should work independently', { packageInfo, result1 });
      assert.assertEqual(result2.content, 'Engine 2', 
        'Second engine should work independently', { packageInfo, result2 });
      
      engine1.destroy();
      engine2.destroy();
      
      console.log(`   ✅ Multiple engine instances work correctly`);
    });

  } catch (error) {
    console.error(`❌ Import test setup failed: ${error.message}`);
    failed++;
    
    reporter.createDetailedError(
      'Import Test Setup',
      error,
      "successful import test setup",
      "import test setup failure",
      {
        packageInfo,
        importPath,
        errorType: error.constructor.name,
        errorStack: error.stack?.split("\n").slice(0, 3).join("\n"),
      }
    );
  } finally {
    console.log();
    console.log("🧹 Cleaning up import test package...");
    try {
      await cleanupTestPackage();
      console.log("✅ Import test cleanup completed");
    } catch (cleanupError) {
      console.warn(`⚠️ Import test cleanup failed: ${cleanupError.message}`);
    }
  }

  console.log();
  console.log(`📊 Import/Export Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📦 Tested Package: ${packageInfo?.name}@${packageInfo?.version || 'unknown'}`);
  console.log();

  if (failed === 0) {
    console.log("✅ All import/export tests passed - ready for npm!");
  } else {
    console.log("⚠️ Some import/export tests failed - review for npm compatibility");
  }

  return {
    passed,
    failed,
    errors: reporter.exportErrors(),
    packageInfo,
    status: failed === 0 ? 'passed' : 'partial'
  };
}

export { runImportTests };
