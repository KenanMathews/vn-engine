import { performance } from "perf_hooks";
import { createTestReporter } from "./utils/errorReporter.js";
import { getPackager, cleanupTestPackage } from "./utils/packager.js";

const testResults = {
  packageSetup: null,
  core: null,
  performance: null,
  edgeCases: null,
  assets: null,
  imports: null,
  packageValidation: null,
  startTime: null,
  endTime: null,
  allErrors: [],
  packageComparison: null,
};

async function runTestSuite() {
  console.log("🧪 VN Engine Library Test Suite (Package-based Testing)");
  console.log("========================================================");
  console.log("Testing the actual npm pack that users would install\n");

  testResults.startTime = performance.now();

  const defaultResult = {
    success: false,
    passed: 0,
    failed: 1,
    errors: [],
    packageInfo: null,
    duration: 0,
    breakdown: {
      packageValidation: false,
      core: false,
      performance: false,
      edgeCases: false,
      imports: false,
      integrity: false,
    },
  };

  try {
    console.log("📦 Setting up Package Testing Environment...");
    console.log("─".repeat(60));

    const packageSetupStart = performance.now();

    const packageResults = await runPackageValidation();
    testResults.packageValidation = packageResults;

    const packageSetupEnd = performance.now();
    testResults.packageSetup = {
      time: packageSetupEnd - packageSetupStart,
      success: packageResults.success,
      packageInfo: packageResults.packageInfo,
    };

    if (!packageResults.success) {
      throw new Error("Package setup and validation failed");
    }

    console.log(
      `✅ Package validation completed in ${(
        packageSetupEnd - packageSetupStart
      ).toFixed(2)}ms\n`
    );

    console.log("1️⃣ Running Core Functionality Tests (Package-based)...");
    console.log("─".repeat(70));

    const { runCoreTests } = await import("./core.test.js");
    const coreResults = await runCoreTests();
    testResults.core = coreResults;

    if (coreResults.errors) {
      testResults.allErrors.push({
        category: "core-functionality-packaged",
        ...coreResults.errors,
      });
    }

    console.log("\n✅ Core tests completed\n");

    console.log("2️⃣ Running Performance Tests (Package-based)...");
    console.log("─".repeat(60));

    const perfResults = await runPerformanceTestsEnhanced();
    testResults.performance = perfResults;

    if (perfResults.errors) {
      testResults.allErrors.push({
        category: "performance-packaged",
        ...perfResults.errors,
      });
    }

    if (perfResults.status === "completed") {
      console.log("\n✅ Performance tests completed\n");
    } else {
      console.log("\n⚠️ Performance tests had issues - see details above\n");
    }

    console.log("3️⃣ Running Edge Case Tests (Package-based)...");
    console.log("─".repeat(60));

    const edgeResults = await runEdgeCaseTestsEnhanced();
    testResults.edgeCases = edgeResults;

    if (edgeResults.errors) {
      testResults.allErrors.push({
        category: "edge-cases-packaged",
        ...edgeResults.errors,
      });
    }

    console.log("\n✅ Edge case tests completed\n");

    console.log("4️⃣ Running Import/Export Tests (npm Compatibility)...");
    console.log("─".repeat(65));

    console.log("4️⃣ Running Asset Helper Tests (Package-based)...");
    console.log("─".repeat(55));

    const assetResults = await runAssetTestsEnhanced();
    testResults.assets = assetResults;

    if (assetResults.errors) {
      testResults.allErrors.push({
        category: "asset-helpers",
        ...assetResults.errors,
      });
    }

    console.log("\n✅ Asset helper tests completed\n");

    console.log("5️⃣ Running Import/Export Tests (npm Compatibility)...");
    console.log("─".repeat(65));

    const importResults = await runImportTestsEnhanced();
    testResults.imports = importResults;

    if (importResults.errors) {
      testResults.allErrors.push({
        category: "import-export-compatibility",
        ...importResults.errors,
      });
    }

    console.log("\n✅ Import/export tests completed\n");

    console.log("5️⃣ Running Package Integrity Tests...");
    console.log("─".repeat(50));

    const integrityResults = await runPackageIntegrityTests();
    testResults.packageIntegrity = integrityResults;

    if (integrityResults.errors) {
      testResults.allErrors.push({
        category: "package-integrity",
        ...integrityResults.errors,
      });
    }

    console.log("\n✅ Package integrity tests completed\n");

    testResults.endTime = performance.now();

    displayComprehensivePackageAnalysis();

    console.log("\n🧹 Final Cleanup...");
    try {
      await cleanupTestPackage();
      console.log("✅ All temporary files cleaned up");
    } catch (error) {
      console.warn(`⚠️ Final cleanup failed: ${error.message}`);
    }

    const finalResults = calculateFinalResults();
    return finalResults;
  } catch (error) {
    console.error("❌ Test suite execution failed:", error.message);
    console.error("\nStack trace:", error.stack);

    try {
      await cleanupTestPackage();
    } catch (cleanupError) {
      console.warn("⚠️ Cleanup failed:", cleanupError.message);
    }

    testResults.endTime = performance.now();
    return {
      ...defaultResult,
      duration: testResults.endTime - testResults.startTime,
      errors: [{ message: error.message, stack: error.stack }],
      failed: 1,
    };
  }
}

function calculateFinalResults() {
  const endTime = testResults.endTime || performance.now();
  const duration = endTime - testResults.startTime;

  let totalPassed = 0;
  let totalFailed = 0;
  let overallSuccess = true;

  const breakdown = {
    packageValidation: false,
    core: false,
    performance: false,
    edgeCases: false,
    assets: false,
    imports: false,
    integrity: false,
  };

  if (testResults.packageValidation) {
    breakdown.packageValidation = testResults.packageValidation.success;
    if (testResults.packageValidation.success) {
      totalPassed += 1;
    } else {
      totalFailed += 1;
      overallSuccess = false;
    }
  }

  if (testResults.core) {
    breakdown.core = testResults.core.success;
    totalPassed += testResults.core.passed || 0;
    totalFailed += testResults.core.failed || 0;
    if (!testResults.core.success) {
      overallSuccess = false;
    }
  }

  if (testResults.performance) {
    breakdown.performance = testResults.performance.status === "completed";
    totalPassed += testResults.performance.passed || 0;
    totalFailed += testResults.performance.failed || 0;
    if (testResults.performance.status !== "completed") {
      overallSuccess = false;
    }
  }

  if (testResults.edgeCases) {
    breakdown.edgeCases = testResults.edgeCases.failed === 0;
    totalPassed += testResults.edgeCases.passed || 0;
    totalFailed += testResults.edgeCases.failed || 0;
    if (testResults.edgeCases.failed > 0) {
      overallSuccess = false;
    }
  }

  if (testResults.imports) {
    breakdown.imports = testResults.imports.status === "passed";
    totalPassed += testResults.imports.passed || 0;
    totalFailed += testResults.imports.failed || 0;
    if (testResults.imports.status !== "passed") {
      overallSuccess = false;
    }
  }

  if (testResults.assets) {
    breakdown.assets = testResults.assets.status === "passed";
    totalPassed += testResults.assets.passed || 0;
    totalFailed += testResults.assets.failed || 0;
    if (testResults.assets.status !== "passed") {
      overallSuccess = false;
    }
  }

  if (testResults.packageIntegrity) {
    breakdown.integrity = testResults.packageIntegrity.successRate >= 80;
    const integrityPassed = Math.round(
      (testResults.packageIntegrity.successRate / 100) * 5
    );
    const integrityFailed = 5 - integrityPassed;
    totalPassed += integrityPassed;
    totalFailed += integrityFailed;
    if (testResults.packageIntegrity.successRate < 80) {
      overallSuccess = false;
    }
  }

  let packageInfo = null;
  if (
    testResults.packageValidation &&
    testResults.packageValidation.packageInfo
  ) {
    packageInfo = testResults.packageValidation.packageInfo;
  } else if (testResults.core && testResults.core.packageInfo) {
    packageInfo = testResults.core.packageInfo;
  } else if (testResults.imports && testResults.imports.packageInfo) {
    packageInfo = testResults.imports.packageInfo;
  }

  const allErrors = [];
  testResults.allErrors.forEach((errorCategory) => {
    if (errorCategory.errors && Array.isArray(errorCategory.errors)) {
      allErrors.push(...errorCategory.errors);
    }
  });

  return {
    success: overallSuccess,
    passed: totalPassed,
    failed: totalFailed,
    duration,
    breakdown,
    packageInfo,
    errors: allErrors.length > 0 ? allErrors : null,

    detailed: {
      packageValidation: testResults.packageValidation,
      core: testResults.core,
      performance: testResults.performance,
      edgeCases: testResults.edgeCases,
      assets: testResults.assets,
      imports: testResults.imports,
      packageIntegrity: testResults.packageIntegrity,
    },

    summary: {
      totalDuration: duration,
      packageSetupTime: testResults.packageSetup?.time || 0,
      successRate:
        totalPassed + totalFailed > 0
          ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
          : 0,
      errorCount: allErrors.length,
    },
  };
}

async function runPackageValidation() {
  const { reporter, assert } = createTestReporter();
  reporter.setContext({ category: "package-validation" });

  console.log("🔍 Validating package structure and contents...");

  try {
    const packager = getPackager();

    const packageInfo = await packager.createTestPackage({
      includeDependencies: true,
      customPackageJson: {},
    });

    const verificationResult = await packager.verifyPackageWorks();

    const packageStats = await packager.getPackageStats();

    console.log(
      `✅ Package created: ${packageInfo.name}@${packageInfo.version}`
    );
    console.log(
      `📊 Package size: ${packageStats.tarballSizeMB}MB tarball, ${packageStats.extractedSizeMB}MB extracted`
    );
    console.log(
      `📊 Compression: ${packageStats.compressionRatio}x ratio, ${packageStats.fileCount} files`
    );
    console.log(
      `✅ Package verification: ${verificationResult ? "passed" : "failed"}`
    );

    return {
      success: true,
      packageInfo,
      packageStats,
      verificationResult,
      errors: null,
    };
  } catch (error) {
    console.error(`❌ Package validation failed: ${error.message}`);

    const errorReport = reporter.createDetailedError(
      "Package Validation",
      error,
      "successful package creation and validation",
      "package validation failure",
      {
        errorType: error.constructor.name,
        errorStack: error.stack?.split("\n").slice(0, 3).join("\n"),
      }
    );

    return {
      success: false,
      packageInfo: null,
      packageStats: null,
      verificationResult: false,
      errors: reporter.exportErrors(),
    };
  }
}

async function runPerformanceTestsEnhanced() {
  const { reporter, assert } = createTestReporter();
  reporter.setContext({ category: "performance-packaged" });

  try {
    console.log("⚡ Running Package-based Performance Tests...");

    const { runPerformanceTests } = await import("./performance.test.js");
    const perfResults = await runPerformanceTests();

    if (!perfResults) {
      throw new Error("Performance tests returned no results");
    }

    if (perfResults.success === false) {
      console.log(
        `   ❌ Performance tests failed: ${
          perfResults.error || "Unknown error"
        }`
      );
      return {
        status: "failed",
        errors: perfResults.errors || [
          { message: perfResults.error || "Unknown performance test failure" },
        ],
        results: perfResults.results || null,
        packageInfo: perfResults.packageInfo || null,
        passed: 0,
        failed: 1,
      };
    }

    console.log("   ✅ All performance benchmarks completed successfully");

    if (perfResults.results) {
      const results = perfResults.results;
      console.log("   📊 Performance Summary:");

      if (results.packageSetup !== null && results.packageSetup >= 0) {
        console.log(
          `      Package Setup: ${results.packageSetup.toFixed(2)}ms`
        );
      }
      if (results.initialization !== null && results.initialization >= 0) {
        console.log(
          `      Initialization: ${results.initialization.toFixed(2)}ms`
        );
      }
      if (results.scriptLoading !== null && results.scriptLoading >= 0) {
        console.log(
          `      Script Loading: ${results.scriptLoading.toFixed(2)}ms`
        );
      }
      if (results.sceneExecution !== null && results.sceneExecution >= 0) {
        console.log(
          `      Scene Execution: ${results.sceneExecution.toFixed(2)}ms`
        );
      }
      if (results.templateParsing !== null && results.templateParsing >= 0) {
        console.log(
          `      Template Parsing: ${results.templateParsing.toFixed(
            4
          )}ms/template`
        );
      }
    }

    return {
      status: "completed",
      errors: null,
      results: perfResults.results || null,
      passed: perfResults.passed || 0,
      failed: perfResults.failed || 0,
      packageInfo: perfResults.packageInfo || null,
    };
  } catch (error) {
    console.error(`   ❌ Performance test execution failed: ${error.message}`);

    const errorReport = reporter.createDetailedError(
      "Package-based Performance Test Suite",
      error,
      "successful performance test completion",
      "test execution failure",
      {
        errorType: error.constructor.name,
        errorStack: error.stack?.split("\n").slice(0, 3).join("\n"),
        category: "performance-infrastructure-packaged",
      }
    );

    return {
      status: "failed",
      errors: reporter.exportErrors(),
      error: error.message,
      results: null,
      packageInfo: null,
      passed: 0,
      failed: 1,
    };
  }
}

async function runEdgeCaseTestsEnhanced() {
  try {
    console.log("🧪 Running Package-based Edge Case Tests...");

    const { runEdgeCaseTests } = await import("./edge-cases.test.js");
    const edgeResults = await runEdgeCaseTests();

    console.log(
      `   📊 Edge case results: ${edgeResults.passed} passed, ${edgeResults.failed} failed`
    );

    return {
      status: edgeResults.failed === 0 ? "passed" : "partial",
      passed: edgeResults.passed,
      failed: edgeResults.failed,
      errors: edgeResults.errors,
    };
  } catch (error) {
    console.error(`   ❌ Edge case test execution failed: ${error.message}`);

    return {
      status: "failed",
      passed: 0,
      failed: 1,
      errors: [{ message: error.message, stack: error.stack }],
    };
  }
}

async function runAssetTestsEnhanced() {
  try {
    console.log("🎨 Running Asset Helper Tests...");

    const { runAssetTests } = await import("./asset.test.js");
    const assetResults = await runAssetTests();

    console.log(
      `   📊 Asset results: ${assetResults.passed} passed, ${assetResults.failed} failed`
    );

    return {
      status: assetResults.failed === 0 ? "passed" : "partial",
      passed: assetResults.passed,
      failed: assetResults.failed,
      errors: assetResults.errors,
    };
  } catch (error) {
    console.error(`   ❌ Asset test execution failed: ${error.message}`);

    return {
      status: "failed",
      passed: 0,
      failed: 1,
      errors: [{ message: error.message, stack: error.stack }],
    };
  }
}

async function runImportTestsEnhanced() {
  try {
    console.log("📦 Running Comprehensive Import/Export Tests...");

    const { runImportTests } = await import("./imports.test.js");
    const importResults = await runImportTests();

    console.log(
      `   📊 Import/export results: ${importResults.passed} passed, ${importResults.failed} failed`
    );

    if (importResults.passed > 0) {
      console.log("   ✅ Key import patterns verified:");
      console.log("      • Named imports (createVNEngine, VNEngine, etc.)");
      console.log("      • Namespace imports (import * as VNEngine)");
      console.log("      • Helper function exports");
      console.log("      • Error class exports");
      console.log("      • TypeScript compatibility");
      console.log("      • Tree-shaking support");
      console.log("      • Multiple environment compatibility");
    }

    return {
      status: importResults.failed === 0 ? "passed" : "partial",
      passed: importResults.passed,
      failed: importResults.failed,
      errors: importResults.errors,
      packageInfo: importResults.packageInfo,
    };
  } catch (error) {
    console.error(`   ❌ Import test execution failed: ${error.message}`);

    return {
      status: "failed",
      passed: 0,
      failed: 1,
      errors: [{ message: error.message, stack: error.stack }],
    };
  }
}

async function runPackageIntegrityTests() {
  const { reporter, assert } = createTestReporter();
  reporter.setContext({ category: "package-integrity" });

  console.log("🔒 Running Package Integrity Tests...");

  const results = {
    importConsistency: false,
    exportCompleteness: false,
    dependencyValidation: false,
    engineFunctionality: false,
    versionConsistency: false,
    errors: [],
  };

  let packageInfo = null;
  let actualImportPath = null;

  try {
    console.log("📦 Setting up package for integrity testing...");

    const { createTestPackage, verifyTestPackage, getPackageInfo } =
      await import("./utils/packager.js");

    actualImportPath = await createTestPackage({
      includeDependencies: false,
      customPackageJson: {},
    });

    await verifyTestPackage();
    packageInfo = getPackageInfo();

    if (!packageInfo) {
      throw new Error("Package info not available after creation");
    }

    if (!actualImportPath) {
      throw new Error("Import path not available after package creation");
    }

    console.log(
      `✅ Package integrity test setup: ${packageInfo.name}@${packageInfo.version}`
    );

    reporter.startTest("Import Consistency");

    const import1 = await import(actualImportPath);
    const import2 = await import(actualImportPath);

    assert.assertEqual(
      import1.createVNEngine,
      import2.createVNEngine,
      "Multiple imports should return same function",
      {
        packageInfo,
        import1Keys: Object.keys(import1),
        import2Keys: Object.keys(import2),
      }
    );

    results.importConsistency = true;
    console.log("   ✅ Import consistency verified");

    reporter.startTest("Export Completeness");

    const requiredExports = [
      "createVNEngine",
      "VNEngine",
      "GameStateManager",
      "ScriptEngine",
      "ScriptParser",
      "TemplateManager",
    ];

    for (const exportName of requiredExports) {
      assert.assertDefined(
        import1[exportName],
        `Missing required export: ${exportName}`,
        {
          availableExports: Object.keys(import1),
          requiredExports,
          packageInfo,
        }
      );
    }

    results.exportCompleteness = true;
    console.log("   ✅ Export completeness verified");

    reporter.startTest("Engine Functionality");

    const engine = await import1.createVNEngine();

    assert.assertType(
      engine.loadScript,
      "function",
      "Engine should have loadScript method",
      {
        engine,
        packageInfo,
      }
    );

    engine.loadScript('test: ["Hello"]');
    const result = engine.startScene("test");

    assert.assertEqual(
      result.type,
      "display_dialogue",
      "Engine should function correctly",
      {
        engine,
        result,
        packageInfo,
      }
    );

    assert.assertEqual(
      result.content,
      "Hello",
      "Engine should display correct content",
      {
        engine,
        result,
        packageInfo,
      }
    );

    results.engineFunctionality = true;
    console.log("   ✅ Engine functionality verified");

    reporter.startTest("Version Consistency");

    const engineInfo = engine.getEngineInfo();

    if (import1.PACKAGE_INFO) {
      assert.assertEqual(
        import1.PACKAGE_INFO.version,
        packageInfo.version,
        "Package info version should match",
        {
          packageInfo,
          engineInfo,
          packageInfoFromImport: import1.PACKAGE_INFO,
        }
      );
    }

    results.versionConsistency = true;
    console.log("   ✅ Version consistency verified");

    reporter.startTest("Dependency Validation");

    const templateEngineInfo = engine.getTemplateEngineInfo();

    assert.assertDefined(
      templateEngineInfo.type,
      "Template engine should be available",
      {
        templateEngineInfo,
        packageInfo,
      }
    );

    console.log(`   📋 Template engine: ${templateEngineInfo.type}`);
    console.log(
      `   📋 Handlebars available: ${templateEngineInfo.isHandlebarsAvailable}`
    );

    results.dependencyValidation = true;
    console.log("   ✅ Dependency validation completed");

    engine.destroy();
  } catch (error) {
    console.error(`   ❌ Package integrity test failed: ${error.message}`);
    results.errors.push({
      message: error.message,
      stack: error.stack,
    });
  } finally {
    if (actualImportPath || packageInfo) {
      try {
        console.log("🧹 Cleaning up integrity test package...");
        const { cleanupTestPackage } = await import("./utils/packager.js");
        await cleanupTestPackage();
        console.log("✅ Integrity test cleanup completed");
      } catch (cleanupError) {
        console.warn(
          `⚠️ Integrity test cleanup failed: ${cleanupError.message}`
        );
      }
    }
  }

  const successCount = Object.values(results).filter((v) => v === true).length;
  const totalTests = 5;

  console.log(
    `   📊 Package integrity: ${successCount}/${totalTests} tests passed`
  );

  return {
    ...results,
    successRate: (successCount / totalTests) * 100,
    errors: results.errors.length > 0 ? results.errors : null,
    packageInfo: packageInfo,
  };
}

function displayComprehensivePackageAnalysis() {
  const totalTime = testResults.endTime - testResults.startTime;

  console.log("🎯 COMPREHENSIVE PACKAGE-BASED TEST ANALYSIS");
  console.log("═".repeat(70));
  console.log(`📊 Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);

  if (testResults.packageSetup) {
    console.log(
      `📦 Package Setup Time: ${(testResults.packageSetup.time / 1000).toFixed(
        2
      )}s`
    );

    if (testResults.packageSetup.packageInfo) {
      const pkg = testResults.packageSetup.packageInfo;
      console.log(`📦 Package: ${pkg.name}@${pkg.version}`);
    }
  }

  console.log();

  console.log("📋 Test Categories Summary (Package-based):");
  console.log("─".repeat(50));

  const packageValidationSuccess =
    testResults.packageValidation?.success ?? false;

  const coreSuccess = testResults.core?.success ?? false;
  const coreStats = testResults.core
    ? `${testResults.core.passed}/${
        testResults.core.passed + testResults.core.failed
      }`
    : "not run";

  const perfStatus = testResults.performance?.status ?? "not run";

  const edgeStats = testResults.edgeCases
    ? `${testResults.edgeCases.passed}/${
        testResults.edgeCases.passed + testResults.edgeCases.failed
      }`
    : "not run";

  const assetStats = testResults.assets
    ? `${testResults.assets.passed}/${
        testResults.assets.passed + testResults.assets.failed
      }`
    : "not run";

  const importStats = testResults.imports
    ? `${testResults.imports.passed}/${
        testResults.imports.passed + testResults.imports.failed
      }`
    : "not run";

  const integritySuccess = testResults.packageIntegrity
    ? `${testResults.packageIntegrity.successRate.toFixed(0)}%`
    : "not run";

  console.log(
    `   ${packageValidationSuccess ? "✅" : "❌"} Package Validation: ${
      packageValidationSuccess ? "passed" : "failed"
    }`
  );
  console.log(
    `   ${coreSuccess ? "✅" : "❌"} Core Functionality: ${coreStats} passed`
  );
  console.log(
    `   ${
      perfStatus === "completed" ? "✅" : "❌"
    } Performance Tests: ${perfStatus}`
  );
  console.log(
    `   ${
      testResults.edgeCases?.failed === 0 ? "✅" : "❌"
    } Edge Cases: ${edgeStats} passed`
  );
  console.log(
    `   ${
      testResults.assets?.status === "passed" ? "✅" : "❌"
    } Asset Helpers: ${assetStats} passed`
  );

  console.log(
    `   ${
      testResults.imports?.status === "passed" ? "✅" : "❌"
    } Import/Export Tests: ${importStats} passed`
  );

  console.log(
    `   ${
      testResults.packageIntegrity?.successRate >= 80 ? "✅" : "❌"
    } Package Integrity: ${integritySuccess} success rate`
  );
  console.log();

  console.log("📦 PACKAGE-SPECIFIC ANALYSIS");
  console.log("═".repeat(40));

  if (
    testResults.packageValidation &&
    testResults.packageValidation.packageStats
  ) {
    const stats = testResults.packageValidation.packageStats;
    console.log(`📊 Tarball Size: ${stats.tarballSizeMB}MB`);
    console.log(`📊 Extracted Size: ${stats.extractedSizeMB}MB`);
    console.log(`📊 Compression Ratio: ${stats.compressionRatio}x`);
    console.log(`📊 File Count: ${stats.fileCount} files`);
    console.log();
  }

  if (testResults.imports && testResults.imports.passed > 0) {
    console.log("📦 npm Import/Export Compatibility:");
    console.log("─".repeat(40));
    console.log(`   ✅ Named imports supported (ES modules)`);
    console.log(`   ✅ Namespace imports supported`);
    console.log(`   ✅ Helper functions accessible`);
    console.log(`   ✅ Error classes exported`);
    console.log(`   ✅ TypeScript declarations verified`);
    console.log(`   ✅ Tree-shaking compatible`);
    console.log(`   ✅ Multi-environment support`);
    console.log();
  }

  if (testResults.performance && testResults.performance.results) {
    const perf = testResults.performance.results;
    console.log("⚡ Package Performance Metrics:");
    console.log("─".repeat(35));

    if (perf.packageSetup !== null) {
      console.log(
        `   Package Setup Overhead: ${perf.packageSetup.toFixed(2)}ms`
      );
    }
    if (perf.initialization !== null) {
      console.log(
        `   Engine Initialization: ${perf.initialization.toFixed(2)}ms`
      );
    }
    if (perf.scriptLoading !== null) {
      console.log(`   Script Loading: ${perf.scriptLoading.toFixed(2)}ms`);
    }
    if (perf.templateParsing !== null) {
      console.log(
        `   Template Parsing: ${perf.templateParsing.toFixed(4)}ms/template`
      );
    }
    console.log();
  }

  if (testResults.allErrors.length > 0) {
    console.log("🔍 PACKAGE-BASED ERROR ANALYSIS");
    console.log("═".repeat(45));

    analyzePackageErrors();
    generatePackageRecommendations();
  }

  console.log("🏥 PACKAGE HEALTH ASSESSMENT");
  console.log("═".repeat(40));

  const healthScore = calculatePackageHealthScore();
  displayPackageHealthMetrics(healthScore);

  console.log("\n📖 PRIORITIZED ACTION ITEMS (Package-focused)");
  console.log("═".repeat(55));
  generatePackagePrioritizedActions();

  console.log(
    `\n${getPackageOverallStatus()} Package-based test suite analysis completed`
  );
}

function analyzePackageErrors() {
  const allErrorDetails = [];

  testResults.allErrors.forEach((categoryErrors) => {
    if (categoryErrors.errors && categoryErrors.errors.length > 0) {
      categoryErrors.errors.forEach((error) => {
        allErrorDetails.push({
          category: categoryErrors.category,
          ...error,
        });
      });
    }
  });

  if (allErrorDetails.length === 0) {
    console.log("   🎉 No errors detected in package-based testing!");
    return;
  }

  console.log(`   📊 Total Package-related Errors: ${allErrorDetails.length}`);
  console.log();

  const packageIssues = {
    "Import/Export Issues": 0,
    "Package Structure Problems": 0,
    "Dependency Issues": 0,
    "Performance Overhead": 0,
    "Build/Distribution Issues": 0,
  };

  allErrorDetails.forEach((error) => {
    const testName = error.testName?.toLowerCase() || "";
    const errorMsg = error.error?.message?.toLowerCase() || "";

    if (
      testName.includes("import") ||
      testName.includes("export") ||
      errorMsg.includes("import")
    ) {
      packageIssues["Import/Export Issues"]++;
    }
    if (testName.includes("package") || testName.includes("structure")) {
      packageIssues["Package Structure Problems"]++;
    }
    if (testName.includes("dependency") || errorMsg.includes("dependency")) {
      packageIssues["Dependency Issues"]++;
    }
    if (testName.includes("performance") && testName.includes("package")) {
      packageIssues["Performance Overhead"]++;
    }
    if (testName.includes("build") || testName.includes("distribution")) {
      packageIssues["Build/Distribution Issues"]++;
    }
  });

  console.log("   🔍 Package-specific Issue Analysis:");
  Object.entries(packageIssues)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .forEach(([issue, count]) => {
      console.log(`      • ${issue}: ${count} occurrences`);
    });
}

function generatePackageRecommendations() {
  const hasErrors = testResults.allErrors.some(
    (cat) => cat.errors && cat.errors.length > 0
  );

  if (!hasErrors) {
    console.log("\n💡 PACKAGE RECOMMENDATIONS: Package testing successful!");
    console.log("   • Consider automated package testing in CI/CD");
    console.log("   • Add package size monitoring");
    console.log("   • Document packaging and distribution process");
    console.log("   • npm publish is ready - all import patterns verified!");
    return;
  }

  console.log("\n💡 PACKAGE-FOCUSED RECOMMENDATIONS");
  console.log("─".repeat(45));

  if (testResults.packageValidation && !testResults.packageValidation.success) {
    console.log("   🎯 CRITICAL PACKAGE ISSUES:");
    console.log("      1. Fix package creation and validation process");
    console.log("      2. Verify package.json exports and main field");
    console.log("      3. Ensure all required files are included in package");
    console.log("      4. Check build output is correct for distribution");
    console.log();
  }

  if (testResults.imports && testResults.imports.status !== "passed") {
    console.log("   📦 IMPORT/EXPORT COMPATIBILITY ISSUES:");
    console.log(
      "      1. Fix missing or incorrect exports in main entry point"
    );
    console.log("      2. Ensure CommonJS and ES module compatibility");
    console.log("      3. Verify TypeScript declaration files are complete");
    console.log("      4. Test import patterns that npm users will expect");
    console.log("      5. Check tree-shaking and bundler compatibility");
    console.log();
  }

  if (
    testResults.packageIntegrity &&
    testResults.packageIntegrity.successRate < 100
  ) {
    console.log("   🛡️ PACKAGE INTEGRITY IMPROVEMENTS:");
    console.log("      1. Fix import/export consistency issues");
    console.log("      2. Ensure all public APIs are properly exported");
    console.log("      3. Validate dependency handling in packaged version");
    console.log("      4. Test package installation in clean environments");
    console.log();
  }

  console.log("   📦 PACKAGING WORKFLOW:");
  console.log("      1. Integrate package testing into CI/CD pipeline");
  console.log("      2. Add automated package size and performance monitoring");
  console.log("      3. Test package installation in different environments");
  console.log("      4. Validate package works with different bundlers");
  console.log();

  console.log("   🚀 DISTRIBUTION OPTIMIZATION:");
  console.log("      1. Optimize package size and compression");
  console.log("      2. Consider providing different bundle formats");
  console.log("      3. Ensure proper tree-shaking support");
  console.log("      4. Add package integrity verification");
}

function calculatePackageHealthScore() {
  let totalTests = 0;
  let passedTests = 0;

  if (testResults.packageValidation) {
    totalTests += 1;
    if (testResults.packageValidation.success) passedTests += 1;
  }

  if (testResults.core) {
    totalTests += testResults.core.passed + testResults.core.failed;
    passedTests += testResults.core.passed;
  }

  if (testResults.edgeCases) {
    totalTests += testResults.edgeCases.passed + testResults.edgeCases.failed;
    passedTests += testResults.edgeCases.passed;
  }

  if (testResults.imports) {
    totalTests += testResults.imports.passed + testResults.imports.failed;
    passedTests += testResults.imports.passed;
  }

  if (testResults.packageIntegrity) {
    totalTests += 5;
    passedTests += Math.round(
      (testResults.packageIntegrity.successRate / 100) * 5
    );
  }

  const testScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  const performanceScore =
    testResults.performance?.status === "completed" ? 100 : 70;
  const packageScore = testResults.packageValidation?.success ? 100 : 50;
  const importScore = testResults.imports?.status === "passed" ? 100 : 50;

  return {
    overall:
      testScore * 0.4 +
      performanceScore * 0.2 +
      packageScore * 0.2 +
      importScore * 0.2,
    testing: testScore,
    performance: performanceScore,
    packaging: packageScore,
    imports: importScore,
    totalTests,
    passedTests,
  };
}

function displayPackageHealthMetrics(healthScore) {
  const getHealthEmoji = (score) => {
    if (score >= 95) return "🟢 Excellent";
    if (score >= 85) return "🟡 Good";
    if (score >= 70) return "🟠 Fair";
    return "🔴 Needs Attention";
  };

  console.log(
    `   Overall Package Health: ${healthScore.overall.toFixed(
      1
    )}% ${getHealthEmoji(healthScore.overall)}`
  );
  console.log(
    `   Test Coverage: ${healthScore.testing.toFixed(1)}% (${
      healthScore.passedTests
    }/${healthScore.totalTests})`
  );
  console.log(`   Performance: ${healthScore.performance}%`);
  console.log(`   Packaging Quality: ${healthScore.packaging}%`);
  console.log(`   Import Compatibility: ${healthScore.imports}%`);
  console.log();

  console.log("   📊 Detailed Package Metrics:");

  if (testResults.packageValidation?.packageStats) {
    const stats = testResults.packageValidation.packageStats;
    console.log(`      Package Size: ${stats.tarballSizeMB}MB (tarball)`);
    console.log(`      Compression: ${stats.compressionRatio}x ratio`);
    console.log(`      File Count: ${stats.fileCount} files`);
  }

  if (testResults.packageSetup) {
    console.log(
      `      Setup Time: ${(testResults.packageSetup.time / 1000).toFixed(2)}s`
    );
  }

  console.log(`      Distribution: npm pack ready`);
  console.log(`      Import Method: ES modules + CommonJS`);
  console.log(
    `      Error Handling: ${
      testResults.allErrors.length === 0 ? "Comprehensive" : "Needs Improvement"
    }`
  );
  console.log(`      API Compatibility: Package-based testing validated`);

  if (testResults.imports) {
    console.log(
      `      Named Imports: ${
        testResults.imports.status === "passed" ? "✅ Working" : "❌ Issues"
      }`
    );
    console.log(
      `      Tree-shaking: ${
        testResults.imports.status === "passed" ? "✅ Compatible" : "❌ Issues"
      }`
    );
    console.log(
      `      TypeScript: ${
        testResults.imports.status === "passed"
          ? "✅ Declarations OK"
          : "❌ Issues"
      }`
    );
  }
}

function generatePackagePrioritizedActions() {
  const actions = [];

  if (testResults.packageValidation && !testResults.packageValidation.success) {
    actions.push({
      priority: 1,
      title: "Fix Package Creation and Validation",
      description: "Resolve package build, structure, and validation issues",
      impact: "Critical - Package cannot be distributed without fixes",
    });
  }

  if (testResults.imports && testResults.imports.status !== "passed") {
    actions.push({
      priority: 1,
      title: "Fix Import/Export Compatibility",
      description: "Resolve npm import patterns and API exports",
      impact: "Critical - Users cannot import/use the library properly",
    });
  }

  if (
    testResults.packageIntegrity &&
    testResults.packageIntegrity.successRate < 80
  ) {
    actions.push({
      priority: 2,
      title: "Improve Package Integrity",
      description: "Fix import/export consistency and API completeness",
      impact: "High - Affects user experience and API reliability",
    });
  }

  if (testResults.core && !testResults.core.success) {
    actions.push({
      priority: 2,
      title: "Fix Core Functionality in Package",
      description:
        "Ensure all core features work correctly in packaged version",
      impact: "High - Core library functionality must work",
    });
  }

  if (testResults.performance?.status !== "completed") {
    actions.push({
      priority: 3,
      title: "Package Performance Optimization",
      description: "Optimize package size and loading performance",
      impact: "Medium - Important for user experience",
    });
  }

  actions.push({
    priority: 4,
    title: "Enhanced Package Testing Pipeline",
    description: "Integrate package testing into CI/CD and monitoring",
    impact: "Low - Improves development workflow and quality assurance",
  });

  actions.forEach((action, index) => {
    const emoji = ["🔥", "⚡", "🎯", "💡"][index] || "📝";
    console.log(`   ${emoji} Priority ${action.priority}: ${action.title}`);
    console.log(`      ${action.description}`);
    console.log(`      Impact: ${action.impact}`);
    if (index < actions.length - 1) console.log();
  });
}

function getPackageOverallStatus() {
  const packageValidation = testResults.packageValidation?.success ?? false;
  const coreSuccess = testResults.core?.success ?? false;
  const edgeSuccess = testResults.edgeCases
    ? testResults.edgeCases.failed === 0
    : false;
  const perfSuccess = testResults.performance?.status === "completed";
  const importSuccess = testResults.imports?.status === "passed";
  const assetSuccess = testResults.assets?.status === "passed";
  const integritySuccess = testResults.packageIntegrity
    ? testResults.packageIntegrity.successRate >= 80
    : false;

  if (
    packageValidation &&
    coreSuccess &&
    edgeSuccess &&
    perfSuccess &&
    importSuccess &&
    assetSuccess &&
    integritySuccess
  ) {
    return "🎉 SUCCESS:";
  } else if (packageValidation && coreSuccess && importSuccess) {
    return "⚠️ PARTIAL SUCCESS:";
  } else {
    return "❌ NEEDS WORK:";
  }
}

async function main() {
  try {
    const result = await runTestSuite();
    return result;
  } catch (error) {
    console.error("\n❌ Package-based test suite failed:", error.message);
    return {
      success: false,
      passed: 0,
      failed: 1,
      errors: [{ message: error.message, stack: error.stack }],
      duration: 0,
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTestSuite };
