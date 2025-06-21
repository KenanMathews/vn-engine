#!/usr/bin/env node

import { performance } from 'perf_hooks';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const TEST_CONFIG = {
  skipBuild: process.argv.includes('--skip-build'),
  verbose: process.argv.includes('--verbose'),
  onlyCore: process.argv.includes('--only-core'),
  onlyPerformance: process.argv.includes('--only-performance'),
  onlyEdgeCases: process.argv.includes('--only-edge-cases'),
  showPackageStats: process.argv.includes('--package-stats'),
  cleanupOnExit: !process.argv.includes('--no-cleanup'),
  maxRetries: 2
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function logSection(title) {
  console.log('\n' + colorize('═'.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('═'.repeat(60), 'cyan'));
}

function logSubsection(title) {
  console.log('\n' + colorize('─'.repeat(50), 'blue'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('─'.repeat(50), 'blue'));
}

function createDefaultResult(suiteName, error = null) {
  return {
    success: false,
    passed: 0,
    failed: 1,
    duration: 0,
    suite: suiteName,
    retries: 0,
    error: error ? error.message : 'Unknown error',
    errors: error ? [{ message: error.message, stack: error.stack }] : [],
    packageInfo: null
  };
}

function normalizeResult(result, suiteName, duration = 0, retries = 0) {
  if (!result || typeof result !== 'object') {
    return createDefaultResult(suiteName, new Error('Invalid or missing result object'));
  }

  const normalizedResult = {
    success: result.success !== false,
    passed: result.passed || 0,
    failed: result.failed || 0,
    duration: result.duration || duration,
    suite: result.suite || suiteName,
    retries: result.retries || retries,
    packageInfo: result.packageInfo || null,
    errors: result.errors || null,
    error: result.error || null
  };

  if (result.breakdown) {
    normalizedResult.breakdown = result.breakdown;
  }
  if (result.summary) {
    normalizedResult.summary = result.summary;
  }
  if (result.detailed) {
    normalizedResult.detailed = result.detailed;
  }

  return normalizedResult;
}

async function main() {
  const startTime = performance.now();
  
  try {
    logSection('VN Engine Package-based Test Runner');
    
    log(`🚀 Starting comprehensive package-based testing`, 'green');
    log(`📦 Project root: ${projectRoot}`, 'blue');
    log(`⚙️  Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`, 'blue');
    
    await preFlightChecks();
    
    if (!TEST_CONFIG.skipBuild) {
      await buildProject();
    }
    
    await validateProjectStructure();
    
    const testResults = await runTests();
    
    await generateFinalReport(testResults, startTime);
    
    const success = testResults && testResults.length > 0 && testResults.every(result => result && result.success !== false);
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`❌ Test runner failed: ${error.message}`, 'red');
    if (TEST_CONFIG.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function preFlightChecks() {
  logSubsection('Pre-flight Checks');
  
  const nodeVersion = process.version;
  log(`📋 Node.js version: ${nodeVersion}`, 'blue');
  
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
  }
  
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`📋 npm version: ${npmVersion}`, 'blue');
  } catch (error) {
    throw new Error('npm not found');
  }
  
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  log(`📋 Package: ${packageJson.name}@${packageJson.version}`, 'blue');
  
  log('📋 Checking dependencies...', 'blue');
  try {
    execSync('npm ls tar', { cwd: projectRoot, stdio: 'pipe' });
    log('  ✅ tar dependency available', 'green');
  } catch (error) {
    log('  ⚠️ tar dependency missing - installing...', 'yellow');
    execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
  }
  
  log('✅ Pre-flight checks completed', 'green');
}

async function buildProject() {
  logSubsection('Building Project');
  
  try {
    log('🔨 Running build...', 'blue');
    execSync('npm run build', { 
      cwd: projectRoot, 
      stdio: TEST_CONFIG.verbose ? 'inherit' : 'pipe' 
    });
    
    const distPath = join(projectRoot, 'dist');
    if (!existsSync(distPath)) {
      throw new Error('Build output directory not found');
    }
    
    const mainFile = join(distPath, 'vn-engine.js');
    if (!existsSync(mainFile)) {
      throw new Error('Main build file not found');
    }
    
    log('✅ Build completed successfully', 'green');
    
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

async function validateProjectStructure() {
  logSubsection('Validating Project Structure');
  
  const requiredFiles = [
    'package.json',
    'dist/vn-engine.js',
    'test/utils/packager.js',
    'test/utils/errorReporter.js',
    'test/core.test.js',
    'test/performance.test.js',
    'test/edge-cases.test.js',
    'test/suite.test.js'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = join(projectRoot, file);
    if (!existsSync(filePath)) {
      missingFiles.push(file);
    } else {
      log(`  ✅ ${file}`, 'green');
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
  }
  
  log('✅ Project structure validation completed', 'green');
}

async function runTests() {
  logSubsection('Running Package-based Tests');
  
  const testSuites = [];
  
  if (TEST_CONFIG.onlyCore) {
    testSuites.push({ name: 'Core', module: '../test/core.test.js', function: 'runCoreTests' });
  } else if (TEST_CONFIG.onlyPerformance) {
    testSuites.push({ name: 'Performance', module: '../test/performance.test.js', function: 'runPerformanceTests' });
  } else if (TEST_CONFIG.onlyEdgeCases) {
    testSuites.push({ name: 'Edge Cases', module: '../test/edge-cases.test.js', function: 'runEdgeCaseTests' });
  } else {
    testSuites.push({ name: 'Complete Suite', module: '../test/suite.test.js', function: 'runTestSuite' });
  }
  
  const results = [];
  
  for (const suite of testSuites) {
    log(`\n🧪 Running ${suite.name} Tests...`, 'magenta');
    log('─'.repeat(40), 'blue');
    
    let retries = 0;
    let success = false;
    let result = null;
    
    while (retries <= TEST_CONFIG.maxRetries && !success) {
      try {
        if (retries > 0) {
          log(`  🔄 Retry ${retries}/${TEST_CONFIG.maxRetries}...`, 'yellow');
        }
        
        const testModule = await import(suite.module);
        const testFunction = testModule[suite.function];
        
        if (!testFunction) {
          throw new Error(`Test function ${suite.function} not found in ${suite.module}`);
        }
        
        const testStart = performance.now();
        const rawResult = await testFunction();
        const testEnd = performance.now();
        
        const duration = testEnd - testStart;
        
        result = normalizeResult(rawResult, suite.name, duration, retries);
        
        success = true;
        
        log(`✅ ${suite.name} tests completed in ${(duration / 1000).toFixed(2)}s`, 'green');
        
        if (result.success === false) {
          log(`⚠️ Some ${suite.name.toLowerCase()} tests failed`, 'yellow');
        }
        
      } catch (error) {
        retries++;
        
        if (retries > TEST_CONFIG.maxRetries) {
          log(`❌ ${suite.name} tests failed after ${TEST_CONFIG.maxRetries} retries: ${error.message}`, 'red');
          result = createDefaultResult(suite.name, error);
          result.retries = retries - 1;
          break;
        } else {
          log(`⚠️ ${suite.name} test attempt ${retries} failed: ${error.message}`, 'yellow');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!result) {
      result = createDefaultResult(suite.name, new Error('No result returned from test suite'));
    }
    
    results.push(result);
  }
  
  return results;
}

async function generateFinalReport(testResults, startTime) {
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  logSection('Final Test Report');
  
  log(`📊 Total execution time: ${(totalDuration / 1000).toFixed(2)}s`, 'blue');
  log(`🧪 Test suites run: ${testResults ? testResults.length : 0}`, 'blue');
  
  if (!testResults || !Array.isArray(testResults)) {
    log('❌ No valid test results to report', 'red');
    return;
  }
  
  const validResults = testResults.filter(result => result && typeof result === 'object');
  
  if (validResults.length === 0) {
    log('❌ No valid test results found', 'red');
    return;
  }
  
  console.log('\n📋 Test Suite Results:');
  console.log('─'.repeat(50));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let allSuccessful = true;
  
  for (const result of validResults) {
    const status = result.success !== false ? '✅' : '❌';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    const retryInfo = result.retries > 0 ? ` (${result.retries} retries)` : '';
    
    console.log(`  ${status} ${result.suite}: ${duration}${retryInfo}`);
    
    const passed = result.passed || 0;
    const failed = result.failed || 0;
    
    if (passed > 0 || failed > 0) {
      console.log(`     Passed: ${passed}, Failed: ${failed}`);
      totalPassed += passed;
      totalFailed += failed;
    }
    
    if (result.success === false) {
      allSuccessful = false;
    }
    
    if (result.packageInfo) {
      console.log(`     Package: ${result.packageInfo.name}@${result.packageInfo.version}`);
    }
    
    if (result.summary) {
      console.log(`     Success Rate: ${result.summary.successRate}%`);
      if (result.summary.errorCount > 0) {
        console.log(`     Errors: ${result.summary.errorCount}`);
      }
    }
  }
  
  console.log('\n📊 Overall Statistics:');
  console.log('─'.repeat(30));
  console.log(`  Total Tests: ${totalPassed + totalFailed}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${totalPassed + totalFailed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0}%`);
  
  if (TEST_CONFIG.showPackageStats) {
    await showPackageStatistics(validResults);
  }
  
  const hasErrors = validResults.some(result => result.errors && result.errors.length > 0);
  if (hasErrors) {
    console.log('\n⚠️ Error Summary:');
    console.log('─'.repeat(20));
    
    validResults.forEach(result => {
      if (result.errors && result.errors.length > 0) {
        console.log(`  ${result.suite}: ${result.errors.length} errors`);
      }
    });
    
    log('  See detailed error reports above for debugging information', 'yellow');
  }
  
  console.log('\n' + '═'.repeat(50));
  if (allSuccessful && totalFailed === 0) {
    log('🎉 ALL TESTS PASSED! Package is ready for distribution.', 'green');
  } else if (totalPassed > totalFailed) {
    log('⚠️ TESTS COMPLETED WITH SOME FAILURES. Review errors above.', 'yellow');
  } else {
    log('❌ TESTS FAILED. Package needs fixes before distribution.', 'red');
  }
  console.log('═'.repeat(50));
  
  if (TEST_CONFIG.cleanupOnExit) {
    log('\n🧹 Cleaning up temporary files...', 'blue');
    try {
      const { cleanupTestPackage } = await import('../test/utils/packager.js');
      await cleanupTestPackage();
      log('✅ Cleanup completed', 'green');
    } catch (error) {
      log(`⚠️ Cleanup failed: ${error.message}`, 'yellow');
    }
  }
}

async function showPackageStatistics(validResults) {
  console.log('\n📦 Package Statistics:');
  console.log('─'.repeat(25));
  
  const packageResult = validResults.find(r => r && r.packageInfo);
  
  if (packageResult && packageResult.packageInfo) {
    const pkg = packageResult.packageInfo;
    console.log(`  Name: ${pkg.name}`);
    console.log(`  Version: ${pkg.version}`);
    console.log(`  Main: ${pkg.main}`);
    
    if (pkg.tarballPath) {
      try {
        const { statSync } = await import('fs');
        const tarballStats = statSync(pkg.tarballPath);
        console.log(`  Tarball Size: ${(tarballStats.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.log(`  Tarball Size: Unknown`);
      }
    }
  }
  
  try {
    log('  Running npm pack (dry run)...', 'blue');
    const packOutput = execSync('npm pack --dry-run', { 
      cwd: projectRoot, 
      encoding: 'utf8' 
    });
    
    const lines = packOutput.split('\n');
    const sizeMatch = lines.find(line => line.includes('total files:'));
    if (sizeMatch) {
      console.log(`  ${sizeMatch.trim()}`);
    }
    
    const tarballMatch = lines.find(line => line.includes('Tarball Contents:'));
    if (tarballMatch) {
      console.log(`  Files in package: ${lines.length - lines.indexOf(tarballMatch) - 2}`);
    }
    
  } catch (error) {
    log(`  ⚠️ Could not get npm pack statistics: ${error.message}`, 'yellow');
  }
}

process.on('SIGINT', async () => {
  log('\n🛑 Test runner interrupted', 'yellow');
  
  if (TEST_CONFIG.cleanupOnExit) {
    try {
      const { cleanupTestPackage } = await import('../test/utils/packager.js');
      await cleanupTestPackage();
      log('✅ Emergency cleanup completed', 'green');
    } catch (error) {
      log(`⚠️ Emergency cleanup failed: ${error.message}`, 'yellow');
    }
  }
  
  process.exit(130);
});

process.on('uncaughtException', (error) => {
  log(`💥 Uncaught exception: ${error.message}`, 'red');
  if (TEST_CONFIG.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`💥 Unhandled rejection: ${reason}`, 'red');
  if (TEST_CONFIG.verbose) {
    console.error(reason);
  }
  process.exit(1);
});

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
VN Engine Package-based Test Runner

Usage: node scripts/test-runner.js [options]

Options:
  --skip-build       Skip the build step
  --verbose          Show verbose output
  --only-core        Run only core tests
  --only-performance Run only performance tests
  --only-edge-cases  Run only edge case tests
  --package-stats    Show detailed package statistics
  --no-cleanup       Don't cleanup temporary files
  --help, -h         Show this help message

Examples:
  node scripts/test-runner.js                    # Run all tests
  node scripts/test-runner.js --only-core        # Run only core tests
  node scripts/test-runner.js --verbose          # Run with verbose output
  node scripts/test-runner.js --package-stats    # Include package statistics
`);
  process.exit(0);
}

main();
