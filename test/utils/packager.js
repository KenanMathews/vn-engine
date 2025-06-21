
import { execSync, spawn } from 'child_process';
import { createReadStream, createWriteStream, existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readdir, stat, mkdir, rm, cp } from 'fs/promises';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { createGunzip } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PackageManager {
  constructor() {
    this.projectRoot = resolve(__dirname, '../..');
    this.tempDir = join(this.projectRoot, '.test-packages');
    this.packagedDir = null;
    this.tarballPath = null;
    this.isPackaged = false;
    this.cleanupCallbacks = [];
  }

  /**
   * Create npm pack build and extract for testing
   */
  async createPackage() {
    console.log('📦 Creating npm pack build for testing...');
    
    try {
      await this.cleanup();
      
      await this.ensureTempDir();
      
      console.log('🔨 Building project...');
      await this.buildProject();
      
      console.log('📦 Running npm pack...');
      this.tarballPath = await this.runNpmPack();
      
      console.log('📂 Extracting package...');
      this.packagedDir = await this.extractTarball(this.tarballPath);
      
      await this.verifyPackageStructure();
      
      await this.setupPackageForImport();
      
      this.isPackaged = true;
      console.log(`✅ Package ready at: ${this.packagedDir}`);
      
      return {
        packageDir: this.packagedDir,
        importPath: this.getImportPath(),
        tarballPath: this.tarballPath
      };
      
    } catch (error) {
      console.error('❌ Package creation failed:', error.message);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Build the project using npm scripts
   */
  async buildProject() {
    try {
      const packageJson = JSON.parse(readFileSync(join(this.projectRoot, 'package.json'), 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.build) {
        execSync('npm run build', { 
          cwd: this.projectRoot, 
          stdio: 'pipe' 
        });
      } else {
        console.log('⚠️ No build script found, assuming pre-built');
      }
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * Run npm pack and return tarball path
   */
  async runNpmPack() {
    try {
      const output = execSync('npm pack', { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const tarballName = output.trim().split('\n').pop();
      const tarballPath = join(this.projectRoot, tarballName);
      
      if (!existsSync(tarballPath)) {
        throw new Error(`Tarball not found: ${tarballPath}`);
      }
      
      const tempTarballPath = join(this.tempDir, tarballName);
      execSync(`mv "${tarballPath}" "${tempTarballPath}"`, { cwd: this.projectRoot });
      
      return tempTarballPath;
    } catch (error) {
      throw new Error(`npm pack failed: ${error.message}`);
    }
  }

  /**
   * Extract tarball to temporary directory
   */
  async extractTarball(tarballPath) {
    const extractDir = join(this.tempDir, 'extracted');
    await mkdir(extractDir, { recursive: true });
    
    try {
      return await this.extractWithTarModule(tarballPath, extractDir);
    } catch (error) {
      console.warn('⚠️ tar module extraction failed, trying command line fallback...');
      return await this.extractWithCommandLine(tarballPath, extractDir);
    }
  }

  /**
   * Extract using tar module
   */
  async extractWithTarModule(tarballPath, extractDir) {
    return new Promise(async (resolve, reject) => {
      try {
        let tarModule;
        try {
          const tarPkg = await import('tar');
          tarModule = tarPkg.default || tarPkg;
        } catch (importError) {
          throw new Error(`tar module not available: ${importError.message}`);
        }

        const { Extract } = tarModule;
        
        const extractStream = new Extract({ 
          path: extractDir,
          strip: 1
        });
        
        createReadStream(tarballPath)
          .pipe(createGunzip())
          .pipe(extractStream)
          .on('error', reject)
          .on('finish', () => {
            resolve(extractDir);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extract using command line tar as fallback
   */
  async extractWithCommandLine(tarballPath, extractDir) {
    try {
      console.log('   Using command line tar extraction...');
      
      execSync(`tar -xzf "${tarballPath}" -C "${extractDir}" --strip-components=1`, {
        stdio: 'pipe'
      });
      
      console.log('   ✅ Command line extraction successful');
      return extractDir;
    } catch (error) {
      throw new Error(`Both tar module and command line extraction failed: ${error.message}`);
    }
  }

  /**
   * Verify the extracted package has required structure
   */
  async verifyPackageStructure() {
    const requiredFiles = [
      'package.json',
      'dist/vn-engine.js'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = join(this.packagedDir, file);
      if (!existsSync(filePath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      throw new Error(`Package missing required files: ${missingFiles.join(', ')}`);
    }
    
    const packageJson = JSON.parse(readFileSync(join(this.packagedDir, 'package.json'), 'utf8'));
    
    if (!packageJson.main) {
      throw new Error('package.json missing main field');
    }
    
    if (!existsSync(join(this.packagedDir, packageJson.main))) {
      throw new Error(`Main file not found: ${packageJson.main}`);
    }
    
    console.log(`✅ Package structure verified - main: ${packageJson.main}`);
  }

  /**
   * Set up package for easy importing in tests
   */
  async setupPackageForImport() {
    const importHelperPath = join(this.tempDir, 'import-helper.js');
    const packageJson = JSON.parse(readFileSync(join(this.packagedDir, 'package.json'), 'utf8'));
    const mainFile = join(this.packagedDir, packageJson.main);
    
    const importHelperContent = `

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = '${mainFile.replace(/\\/g, '/')}';

export * from '${mainFile.replace(/\\/g, '/')}';

export const PACKAGE_INFO = {
  packageDir: '${this.packagedDir.replace(/\\/g, '/')}',
  version: '${packageJson.version}',
  name: '${packageJson.name}',
  main: '${packageJson.main}',
  tarballPath: '${this.tarballPath?.replace(/\\/g, '/') || 'unknown'}'
};
`;
    
    writeFileSync(importHelperPath, importHelperContent, 'utf8');
    console.log(`✅ Import helper created at: ${importHelperPath}`);
  }

  /**
   * Get the import path for tests to use
   */
  getImportPath() {
    if (!this.isPackaged) {
      throw new Error('Package not created yet. Call createPackage() first.');
    }
    
    return join(this.tempDir, 'import-helper.js');
  }

  /**
   * Get package information
   */
  getPackageInfo() {
    if (!this.isPackaged) {
      return null;
    }
    
    const packageJson = JSON.parse(readFileSync(join(this.packagedDir, 'package.json'), 'utf8'));
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      main: packageJson.main,
      packageDir: this.packagedDir,
      tarballPath: this.tarballPath,
      importPath: this.getImportPath()
    };
  }

  /**
   * Install dependencies in the packaged version (if needed)
   */
  async installDependencies() {
    if (!this.isPackaged) {
      throw new Error('Package not created yet.');
    }
    
    console.log('📦 Installing dependencies in packaged version...');
    
    try {
      execSync('npm install --production', {
        cwd: this.packagedDir,
        stdio: 'pipe'
      });
      
      console.log('✅ Dependencies installed');
    } catch (error) {
      console.warn(`⚠️ Dependency installation failed: ${error.message}`);
    }
  }

  /**
   * Create a test-specific package with custom dependencies
   */
  async createTestPackage(options = {}) {
    const {
      includeDependencies = false,
      includeDevDependencies = false,
      customPackageJson = {}
    } = options;
    
    await this.createPackage();
    
    if (includeDependencies) {
      await this.installDependencies();
    }
    
    if (Object.keys(customPackageJson).length > 0) {
      const packageJsonPath = join(this.packagedDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      Object.assign(packageJson, customPackageJson);
      
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log('✅ Package.json customized');
    }
    
    return this.getPackageInfo();
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    await mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Add cleanup callback
   */
  onCleanup(callback) {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');
    
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.warn('⚠️ Cleanup callback failed:', error.message);
      }
    }
    
    if (existsSync(this.tempDir)) {
      try {
        await rm(this.tempDir, { recursive: true, force: true });
        console.log('✅ Temporary files cleaned up');
      } catch (error) {
        console.warn(`⚠️ Failed to clean up ${this.tempDir}:`, error.message);
      }
    }
    
    this.isPackaged = false;
    this.packagedDir = null;
    this.tarballPath = null;
    this.cleanupCallbacks = [];
  }

  /**
   * Verify package can be imported and basic functionality works
   */
  async verifyPackageWorks() {
    if (!this.isPackaged) {
      throw new Error('Package not created yet.');
    }
    
    console.log('🔍 Verifying package functionality...');
    
    try {
      const importPath = this.getImportPath();
      const packageModule = await import(importPath);
      
      if (!packageModule.createVNEngine) {
        throw new Error('createVNEngine export not found');
      }
      
      if (typeof packageModule.createVNEngine !== 'function') {
        throw new Error('createVNEngine is not a function');
      }
      
      const engine = await packageModule.createVNEngine();
      
      if (!engine || typeof engine.loadScript !== 'function') {
        throw new Error('Engine creation failed or missing methods');
      }
      
      engine.loadScript('test: ["Hello World"]');
      
      if (engine.getError()) {
        throw new Error(`Engine error: ${engine.getError()}`);
      }
      
      const result = engine.startScene('test');
      
      if (result.type !== 'display_dialogue' || result.content !== 'Hello World') {
        throw new Error(`Basic functionality test failed. Expected dialogue "Hello World", got: ${JSON.stringify(result)}`);
      }
      
      if (typeof engine.destroy === 'function') {
        engine.destroy();
      }
      
      console.log('✅ Package verification successful');
      return true;
      
    } catch (error) {
      console.error('❌ Package verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Get package stats
   */
  async getPackageStats() {
    if (!this.isPackaged) {
      return null;
    }
    
    const stats = {
      tarballSize: 0,
      extractedSize: 0,
      fileCount: 0,
      files: []
    };
    
    if (this.tarballPath && existsSync(this.tarballPath)) {
      const tarballStats = await stat(this.tarballPath);
      stats.tarballSize = tarballStats.size;
    }
    
    const calculateDirSize = async (dir) => {
      let size = 0;
      let count = 0;
      const files = [];
      
      const items = await readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = join(dir, item.name);
        
        if (item.isDirectory()) {
          const subStats = await calculateDirSize(fullPath);
          size += subStats.size;
          count += subStats.count;
          files.push(...subStats.files.map(f => join(item.name, f)));
        } else {
          const fileStats = await stat(fullPath);
          size += fileStats.size;
          count++;
          files.push(item.name);
        }
      }
      
      return { size, count, files };
    };
    
    const dirStats = await calculateDirSize(this.packagedDir);
    stats.extractedSize = dirStats.size;
    stats.fileCount = dirStats.count;
    stats.files = dirStats.files;
    
    return {
      ...stats,
      tarballSizeMB: (stats.tarballSize / 1024 / 1024).toFixed(2),
      extractedSizeMB: (stats.extractedSize / 1024 / 1024).toFixed(2),
      compressionRatio: stats.tarballSize > 0 ? (stats.extractedSize / stats.tarballSize).toFixed(2) : 0
    };
  }
}

let globalPackager = null;

/**
 * Get or create global package manager instance
 */
export function getPackager() {
  if (!globalPackager) {
    globalPackager = new PackageManager();
    
    process.on('exit', () => {
      if (globalPackager) {
        globalPackager.cleanup().catch(() => {});
      }
    });
    
    process.on('SIGINT', async () => {
      if (globalPackager) {
        await globalPackager.cleanup();
      }
      process.exit(0);
    });
  }
  
  return globalPackager;
}

/**
 * Convenience function to create package and get import path
 */
export async function createTestPackage(options = {}) {
  const packager = getPackager();
  await packager.createTestPackage(options);
  return packager.getImportPath();
}

/**
 * Convenience function to verify package works
 */
export async function verifyTestPackage() {
  const packager = getPackager();
  return await packager.verifyPackageWorks();
}

/**
 * Convenience function to get package info
 */
export function getPackageInfo() {
  const packager = getPackager();
  return packager.getPackageInfo();
}

/**
 * Convenience function to cleanup
 */
export async function cleanupTestPackage() {
  const packager = getPackager();
  await packager.cleanup();
  globalPackager = null;
}
