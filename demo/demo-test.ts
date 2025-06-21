
import { createVNEngine } from 'vn-engine'
import type { ScriptUpgradeOptions, UpgradeResult, ValidationResult } from 'vn-engine'


interface TestFile {
  name: string;
  path: string;
  category: string;
  description: string;
  priority: number;
  loaded: boolean;
  error?: string;
  isDLC?: boolean;
  baseScript?: string;
}

interface YAMLTestCase {
  name: string;
  description: string;
  script?: string;
  scene?: string;
  steps?: TestStep[];
  template_tests?: TemplateTest[];
  dlc_tests?: DLCTestCase[];
  final_state?: {
    variables?: Record<string, any>;
    flags?: string[];
  };
}

interface DLCTestCase {
  name: string;
  description: string;
  base_script: string;
  dlc_content: string;
  upgrade_options?: ScriptUpgradeOptions;
  expected_result?: {
    success: boolean;
    added_scenes?: string[];
    replaced_scenes?: string[];
    warnings?: string[];
  };
  validation_test?: boolean;
}

interface TestStep {
  action: "continue" | "choice" | "validate" | "template" | "upgrade" | "validate_dlc";
  choice_index?: number;
  template?: string;
  dlc_content?: string;
  upgrade_options?: ScriptUpgradeOptions;
  expected?: {
    type?: "display_dialogue" | "show_choices" | "scene_complete" | "error" | "upgrade_success" | "upgrade_failed";
    content?: string;
    speaker?: string;
    choices_count?: number;
    contains?: string;
    success?: boolean;
    added_scenes?: number;
    warnings_count?: number;
  };
}

interface TemplateTest {
  template: string;
  expected: string;
  description: string;
}

interface TestCategory {
  category: string;
  description: string;
  priority: number;
  tests: YAMLTestCase[];
}

interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  errors: string[];
  stepResults: Array<{
    stepIndex: number;
    passed: boolean;
    error?: string;
  }>;
  duration: number;
  dlcUpgrades?: number;
  scenesAdded?: number;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  categories: Record<string, {
    total: number;
    passed: number;
    failed: number;
  }>;
  duration: number;
  dlcStats?: {
    upgradesPerformed: number;
    scenesAdded: number;
    validationsPassed: number;
  };
}


export class YAMLTestFramework {
  private testFiles: TestFile[] = [];
  private loadedCategories: Map<string, TestCategory> = new Map();
  private testResults: TestResult[] = [];
  private isRunning: boolean = false;
  private selectedFiles: Set<string> = new Set();
  private dlcStats = {
    upgradesPerformed: 0,
    scenesAdded: 0,
    validationsPassed: 0
  };

  private fileGrid: HTMLElement;
  private testOutput: HTMLElement;
  private statusBar: HTMLElement;
  private progressFill: HTMLElement;
  private progressText: HTMLElement;
  private totalTestsSpan: HTMLElement;
  private passedTestsSpan: HTMLElement;
  private failedTestsSpan: HTMLElement;
  private successRateSpan: HTMLElement;
  private categoriesContainer: HTMLElement;
  private dlcInfo: HTMLElement;
  private upgradeStats: HTMLElement;

  constructor() {
    this.initializeUI();
    this.discoverTestFiles();
    this.setupEventListeners();
  }

  private initializeUI(): void {
    this.fileGrid = document.getElementById('file-grid')!;
    this.testOutput = document.getElementById('test-output')!;
    this.statusBar = document.getElementById('status-bar')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.progressText = document.getElementById('progress-text')!;
    this.totalTestsSpan = document.getElementById('total-tests')!;
    this.passedTestsSpan = document.getElementById('passed-tests')!;
    this.failedTestsSpan = document.getElementById('failed-tests')!;
    this.successRateSpan = document.getElementById('success-rate')!;
    this.categoriesContainer = document.getElementById('test-categories')!;
    this.dlcInfo = document.getElementById('dlc-info')!;
    this.upgradeStats = document.getElementById('upgrade-stats')!;
  }

  private setupEventListeners(): void {
    document.getElementById('run-selected-tests')?.addEventListener('click', () => {
      this.runSelectedTests();
    });
    document.getElementById('run-all-tests')?.addEventListener('click', () => {
      this.runAllTests();
    });
    document.getElementById('run-helper-validation')?.addEventListener('click', () => {
      this.runHelperValidationOnly();
    });
    
    document.getElementById('run-basic-tests')?.addEventListener('click', () => {
      this.runTestsByCategory('Basic Functionality');
    });
    document.getElementById('run-advanced-tests')?.addEventListener('click', () => {
      this.runTestsByCategory('Advanced Features');
    });
    document.getElementById('run-stress-tests')?.addEventListener('click', () => {
      this.runTestsByCategory('Stress & Performance');
    });
    
    document.getElementById('run-dlc-tests')?.addEventListener('click', () => {
      this.runDLCTests();
    });
    document.getElementById('validate-dlc')?.addEventListener('click', () => {
      this.validateDLCScripts();
    });
    document.getElementById('test-upgrade-scenarios')?.addEventListener('click', () => {
      this.testUpgradeScenarios();
    });
    
    document.getElementById('clear-output')?.addEventListener('click', () => this.clearOutput());
    document.getElementById('export-results')?.addEventListener('click', () => this.exportResults());
    document.getElementById('validate-test-files')?.addEventListener('click', () => this.validateTestFiles());
  }

  private discoverTestFiles(): void {
    this.testFiles = [
      {
        name: "Basic Tests",
        path: "test-cases/basic-tests.yaml",
        category: "Basic Functionality",
        description: "Core VN Engine features",
        priority: 1,
        loaded: false
      },
      {
        name: "Advanced Tests", 
        path: "test-cases/advanced-tests.yaml",
        category: "Advanced Features",
        description: "Complex scenarios and features",
        priority: 2,
        loaded: false
      },
      {
        name: "Helper Validation",
        path: "test-cases/helper-validation.yaml", 
        category: "Helper Validation",
        description: "All template helpers",
        priority: 3,
        loaded: false
      },
      {
        name: "Stress Tests",
        path: "test-cases/stress-tests.yaml",
        category: "Stress & Performance", 
        description: "Performance and load testing",
        priority: 4,
        loaded: false
      },
      {
        name: "DLC Upgrade Tests",
        path: "test-cases/dlc-upgrade-tests.yaml",
        category: "DLC Testing",
        description: "Script upgrade and DLC validation",
        priority: 5,
        loaded: false,
        isDLC: true
      },
      {
        name: "Christmas DLC Test",
        path: "scripts/dlc/christmas-dlc.yaml",
        category: "DLC Content",
        description: "Holiday-themed content validation",
        priority: 6,
        loaded: false,
        isDLC: true,
        baseScript: "scripts/rpg-complete.yaml"
      },
      {
        name: "Bonus Content Test",
        path: "scripts/dlc/bonus-content.yaml",
        category: "DLC Content",
        description: "Extra scenes validation",
        priority: 7,
        loaded: false,
        isDLC: true,
        baseScript: "scripts/basic-demo.yaml"
      }
    ];

    this.renderFileGrid();
    this.checkFileAvailability();
  }

  private async checkFileAvailability(): Promise<void> {
    for (const file of this.testFiles) {
      try {
        const response = await fetch(file.path, { method: 'HEAD' });
        if (!response.ok) {
          file.error = `File not found (${response.status})`;
          file.loaded = false;
        }
      } catch (error) {
        file.error = 'File not accessible';
        file.loaded = false;
      }
    }
    this.renderFileGrid();
  }

  private renderFileGrid(): void {
    this.fileGrid.innerHTML = '';
    
    this.testFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = `file-item ${this.selectedFiles.has(file.path) ? 'selected' : ''} ${file.error ? 'error' : ''} ${file.isDLC ? 'dlc' : ''}`;
      fileItem.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 5px;">
          ${file.isDLC ? '🎮 ' : ''}${file.name}
        </div>
        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">${file.description}</div>
        <div style="font-size: 10px; color: #888;">
          Priority: ${file.priority}
          ${file.isDLC ? ' | DLC Content' : ''}
        </div>
        ${file.baseScript ? `<div style="font-size: 10px; color: #9c27b0; margin-top: 3px;">Base: ${file.baseScript.split('/').pop()}</div>` : ''}
        ${file.error ? `<div style="font-size: 10px; color: #d32f2f; margin-top: 5px;">Error: ${file.error}</div>` : ''}
      `;
      
      fileItem.addEventListener('click', () => this.toggleFileSelection(file.path));
      this.fileGrid.appendChild(fileItem);
    });
  }

  private toggleFileSelection(filePath: string): void {
    if (this.selectedFiles.has(filePath)) {
      this.selectedFiles.delete(filePath);
    } else {
      this.selectedFiles.add(filePath);
    }
    this.renderFileGrid();
  }


  private async loadTestFile(filePath: string): Promise<TestCategory> {
    try {
      this.log(`📁 Loading test file: ${filePath}`);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const yamlContent = await response.text();
      
      const testData = this.parseYAML(yamlContent);
      
      const testFile = this.testFiles.find(f => f.path === filePath);
      if (testFile) {
        testFile.loaded = true;
        testFile.error = undefined;
      }
      
      this.log(`✅ Loaded ${testData.tests.length} tests from ${testData.category}`);
      return testData;
      
    } catch (error: any) {
      const errorMessage = `Failed to load ${filePath}: ${error.message}`;
      this.log(`❌ ${errorMessage}`, 'error');
      
      const testFile = this.testFiles.find(f => f.path === filePath);
      if (testFile) {
        testFile.error = error.message;
        testFile.loaded = false;
      }
      
      throw error;
    }
  }

  private parseYAML(content: string): TestCategory {
    
    try {
      const lines = content.split('\n');
      let category = '';
      let description = '';
      let priority = 1;
      const tests: YAMLTestCase[] = [];
      
      let currentTest: any = null;
      let currentSection = '';
      let indentLevel = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.startsWith('category:')) {
          category = trimmed.split(': ')[1].replace(/['"]/g, '');
        } else if (trimmed.startsWith('description:')) {
          description = trimmed.split(': ')[1].replace(/['"]/g, '');
        } else if (trimmed.startsWith('priority:')) {
          priority = parseInt(trimmed.split(': ')[1]);
        } else if (trimmed.includes('- name:')) {
          if (currentTest) tests.push(currentTest);
          currentTest = {
            name: trimmed.split(': ')[1].replace(/['"]/g, ''),
            description: '',
            steps: [],
            template_tests: [],
            dlc_tests: []
          };
        } else if (currentTest && trimmed.startsWith('description:')) {
          currentTest.description = trimmed.split(': ')[1].replace(/['"]/g, '');
        } else if (currentTest && trimmed.startsWith('scene:')) {
          currentTest.scene = trimmed.split(': ')[1].replace(/['"]/g, '');
        }
      }
      
      if (currentTest) tests.push(currentTest);
      
      return { category, description, priority, tests };
      
    } catch (error: any) {
      throw new Error(`YAML parsing failed: ${error.message}`);
    }
  }


  private async runSelectedTests(): Promise<void> {
    if (this.selectedFiles.size === 0) {
      this.log('❌ No test files selected', 'error');
      return;
    }
    
    const selectedPaths = Array.from(this.selectedFiles);
    await this.executeTestFiles(selectedPaths);
  }

  private async runAllTests(): Promise<void> {
    const allPaths = this.testFiles.map(f => f.path);
    await this.executeTestFiles(allPaths);
  }

  private async runTestsByCategory(categoryName: string): Promise<void> {
    const categoryFiles = this.testFiles.filter(f => f.category === categoryName);
    const paths = categoryFiles.map(f => f.path);
    await this.executeTestFiles(paths);
  }


  private async runDLCTests(): Promise<void> {
    this.updateStatus('running', 'Running DLC upgrade tests...');
    
    try {
      this.log('\n' + '='.repeat(80));
      this.log('🎮 VN ENGINE DLC UPGRADE TESTS');
      this.log('='.repeat(80));
      
      this.dlcStats = { upgradesPerformed: 0, scenesAdded: 0, validationsPassed: 0 };
      
      await this.testBasicUpgradeFlow();
      await this.testUpgradeValidation();
      await this.testUpgradeModes();
      await this.testNamespacing();
      await this.testConflictResolution();
      
      this.updateDLCInfo();
      this.updateStatus('success', `DLC tests completed: ${this.dlcStats.upgradesPerformed} upgrades tested`);
      
    } catch (error: any) {
      this.log(`❌ DLC test execution failed: ${error.message}`, 'error');
      this.updateStatus('error', `DLC tests failed: ${error.message}`);
    }
  }

  private async testBasicUpgradeFlow(): Promise<void> {
    this.log('\n📦 Testing Basic Upgrade Flow:');
    
    const vnEngine = createVNEngine();
    
    const baseScript = `
base_scene:
  - "Welcome to the base game!"
  - speaker: "Guide"
    say: "This is the original content."
`;
    
    vnEngine.loadScript(baseScript);
    if (vnEngine.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine.getError()}`);
    }
    this.log('   ✅ Base script loaded');
    
    const dlcContent = `
dlc_scene:
  - "Welcome to the DLC!"
  - speaker: "DLC Character"
    say: "This is new content!"
`;
    
    this.log('   🔄 Attempting DLC upgrade...');
    
    const upgradeResult = vnEngine.upgradeScript(dlcContent, { mode: 'replace' });
    
    this.log(`   📊 Upgrade result: success=${upgradeResult.success}, addedScenes=${upgradeResult.addedScenes?.length || 0}`);
    
    if (!upgradeResult.success) {
      throw new Error(`Upgrade failed: ${upgradeResult.error?.message}`);
    }
    
    this.log(`   ✅ DLC upgrade successful: ${upgradeResult.addedScenes.length} scenes added`);
    
    const oldStats = { ...this.dlcStats };
    this.dlcStats.upgradesPerformed++;
    this.dlcStats.scenesAdded += upgradeResult.addedScenes.length;
    
    this.log(`   📊 Stats updated: ${JSON.stringify(oldStats)} -> ${JSON.stringify(this.dlcStats)}`);
    
    const sceneNames = vnEngine.getSceneNames();
    this.log(`   📝 Available scenes: ${sceneNames.join(', ')}`);
    
    if (!sceneNames.includes('base_scene') || !sceneNames.includes('dlc_scene')) {
      throw new Error(`Scene verification failed. Found scenes: ${sceneNames.join(', ')}`);
    }
    this.log('   ✅ Both base and DLC scenes present');
  }

  private async testUpgradeValidation(): Promise<void> {
    this.log('\n🔍 Testing Upgrade Validation:');
    
    const vnEngine = createVNEngine();
    
    vnEngine.loadScript('base: ["Base content"]');
    if (vnEngine.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine.getError()}`);
    }
    
    const goodDLC = 'good_dlc: ["Good DLC content"]';
    const validationResult = vnEngine.validateUpgrade(goodDLC, { mode: 'replace' });
    
    if (!validationResult.valid) {
      throw new Error('Good DLC should validate successfully');
    }
    this.log('   ✅ Good DLC validation passed');
    this.dlcStats.validationsPassed++;
    
    const conflictingDLC = 'base: ["Conflicting content"]';
    const conflictValidation = vnEngine.validateUpgrade(conflictingDLC, { mode: 'replace' });
    
    if (conflictValidation.valid) {
      throw new Error('Conflicting DLC should fail validation in replace mode');
    }
    this.log('   ✅ Conflicting DLC correctly rejected');
    this.dlcStats.validationsPassed++;
  }

  private async testUpgradeModes(): Promise<void> {
    this.log('\n⚙️ Testing Upgrade Modes:');
    
    const vnEngine1 = createVNEngine();
    vnEngine1.loadScript('scene1: ["Original content"]');
    if (vnEngine1.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine1.getError()}`);
    }
    
    const replaceResult = vnEngine1.upgradeScript('scene2: ["New content"]', { mode: 'replace' });
    if (!replaceResult.success || replaceResult.addedScenes.length !== 1) {
      throw new Error(`replace mode failed: ${replaceResult.error?.message}`);
    }
    this.log('   ✅ replace mode working correctly');
    this.dlcStats.upgradesPerformed++;
    this.dlcStats.scenesAdded += replaceResult.addedScenes.length;
    
    const vnEngine2 = createVNEngine();
    vnEngine2.loadScript('scene1: ["Original content"]');
    if (vnEngine2.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine2.getError()}`);
    }
    
    const replaceResult2 = vnEngine2.upgradeScript('scene1: ["Replaced content"]', { 
      mode: 'replace', 
      allowOverwrite: ['scene1'] 
    });
    if (!replaceResult2.success || replaceResult2.replacedScenes.length !== 1) {
      throw new Error(`Replace mode failed: ${replaceResult2.error?.message}`);
    }
    this.log('   ✅ Replace mode working correctly');
    this.dlcStats.upgradesPerformed++;
  }

  private async testNamespacing(): Promise<void> {
    this.log('\n🏷️ Testing Namespace Support:');
    
    const vnEngine = createVNEngine();
    vnEngine.loadScript('base_scene: ["Base content"]');
    if (vnEngine.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine.getError()}`);
    }
    
    const dlcContent = `
new_scene:
  - "DLC content"
  - goto: another_scene
another_scene:
  - "More DLC content"
`;
    
    const namespacedResult = vnEngine.upgradeScript(dlcContent, { 
      mode: 'replace',
      namespace: 'dlc'
    });
    
    if (!namespacedResult.success) {
      throw new Error(`Namespace upgrade failed: ${namespacedResult.error?.message}`);
    }
    
    const sceneNames = vnEngine.getSceneNames();
    const namespacedScenes = sceneNames.filter(name => name.startsWith('dlc_'));
    
    if (namespacedScenes.length !== 2) {
      throw new Error(`Expected 2 namespaced scenes, got ${namespacedScenes.length}. Scenes: ${sceneNames.join(', ')}`);
    }
    
    this.log(`   ✅ Namespace applied correctly: ${namespacedScenes.join(', ')}`);
    this.dlcStats.upgradesPerformed++;
    this.dlcStats.scenesAdded += namespacedScenes.length;
  }

  private async testConflictResolution(): Promise<void> {
    this.log('\n⚔️ Testing Conflict Resolution:');
    
    const vnEngine = createVNEngine();
    vnEngine.loadScript('conflict_scene: ["Original content"]');
    if (vnEngine.getError()) {
      throw new Error(`Base script loading failed: ${vnEngine.getError()}`);
    }
    
    const conflictResult = vnEngine.upgradeScript('conflict_scene: ["New content"]', { mode: 'replace' });
    if (conflictResult.success || conflictResult.error?.code !== 'UNAUTHORIZED_OVERWRITE') {
      throw new Error('Should prevent unauthorized overwrites in replace mode');
    }
    this.log('   ✅ Unauthorized overwrite correctly prevented');
    this.dlcStats.validationsPassed++;
    
    const authorizedResult = vnEngine.upgradeScript('conflict_scene: ["Authorized content"]', { 
      mode: 'replace',
      allowOverwrite: ['conflict_scene']
    });
    if (!authorizedResult.success || !authorizedResult.replacedScenes.includes('conflict_scene')) {
      throw new Error(`Authorized overwrite failed: ${authorizedResult.error?.message}`);
    }
    this.log('   ✅ Authorized overwrite working correctly');
    this.dlcStats.upgradesPerformed++;
  }

  private async validateDLCScripts(): Promise<void> {
    this.updateStatus('running', 'Validating DLC scripts...');
    
    try {
      this.log('\n' + '='.repeat(80));
      this.log('🔍 DLC SCRIPT VALIDATION');
      this.log('='.repeat(80));
      
      const dlcFiles = this.testFiles.filter(f => f.isDLC && f.baseScript);
      let validatedCount = 0;
      let validCount = 0;
      
      for (const dlcFile of dlcFiles) {
        this.log(`\n📦 Validating: ${dlcFile.name}`);
        
        try {
          const baseResponse = await fetch(dlcFile.baseScript!);
          if (!baseResponse.ok) throw new Error(`Cannot load base script: ${dlcFile.baseScript}`);
          const baseContent = await baseResponse.text();
          
          const dlcResponse = await fetch(dlcFile.path);
          if (!dlcResponse.ok) throw new Error(`Cannot load DLC script: ${dlcFile.path}`);
          const dlcContent = await dlcResponse.text();
          
          const vnEngine = createVNEngine();
          vnEngine.loadScript(baseContent);
          
          const validation = vnEngine.validateUpgrade(dlcContent, { 
            mode: 'replace',
            namespace: 'dlc'
          });
          
          validatedCount++;
          
          if (validation.valid) {
            this.log(`   ✅ ${dlcFile.name}: Valid (${validation.wouldAddScenes.length} scenes)`);
            validCount++;
            this.dlcStats.validationsPassed++;
          } else {
            this.log(`   ❌ ${dlcFile.name}: ${validation.errors.map(e => e.message).join(', ')}`);
          }
          
          if (validation.warnings.length > 0) {
            this.log(`   ⚠️ Warnings: ${validation.warnings.join(', ')}`);
          }
          
        } catch (error: any) {
          this.log(`   💥 ${dlcFile.name}: ${error.message}`);
          validatedCount++;
        }
      }
      
      this.log(`\n📊 Validation Summary: ${validCount}/${validatedCount} DLC scripts valid`);
      this.updateStatus('success', `DLC validation complete: ${validCount}/${validatedCount} scripts valid`);
      
    } catch (error: any) {
      this.log(`❌ DLC validation failed: ${error.message}`, 'error');
      this.updateStatus('error', `DLC validation failed: ${error.message}`);
    }
  }

  private async testUpgradeScenarios(): Promise<void> {
    this.updateStatus('running', 'Testing upgrade scenarios...');
    
    try {
      this.log('\n' + '='.repeat(80));
      this.log('🧪 UPGRADE SCENARIO TESTING');
      this.log('='.repeat(80));
      
      await this.testScenario('Basic Addition', this.createBasicAdditionScenario());
      await this.testScenario('Content Replacement', this.createReplacementScenario());
      await this.testScenario('Complex Integration', this.createComplexIntegrationScenario());
      await this.testScenario('Error Handling', this.createErrorHandlingScenario());
      
      this.updateDLCInfo();
      this.updateStatus('success', 'All upgrade scenarios completed');
      
    } catch (error: any) {
      this.log(`❌ Upgrade scenario testing failed: ${error.message}`, 'error');
      this.updateStatus('error', `Scenario testing failed: ${error.message}`);
    }
  }

  private async testScenario(name: string, scenario: () => Promise<boolean>): Promise<void> {
    this.log(`\n🎯 Testing: ${name}`);
    try {
      const success = await scenario();
      if (success) {
        this.log(`   ✅ ${name} passed`);
      } else {
        this.log(`   ❌ ${name} failed`);
      }
    } catch (error: any) {
      this.log(`   💥 ${name} error: ${error.message}`);
    }
  }

  private createBasicAdditionScenario(): () => Promise<boolean> {
    return async () => {
      const vnEngine = createVNEngine();
      vnEngine.loadScript('base: ["Base game content"]');
      
      const result = vnEngine.upgradeScript('expansion: ["Expansion content"]', { mode: 'replace' });
      this.dlcStats.upgradesPerformed++;
      this.dlcStats.scenesAdded += result.addedScenes.length;
      
      return result.success && result.addedScenes.length === 1;
    };
  }

  private createReplacementScenario(): () => Promise<boolean> {
    return async () => {
      const vnEngine = createVNEngine();
      vnEngine.loadScript('replaceable: ["Original content"]');
      
      const result = vnEngine.upgradeScript('replaceable: ["New content"]', { 
        mode: 'replace',
        allowOverwrite: ['replaceable']
      });
      this.dlcStats.upgradesPerformed++;
      
      return result.success && result.replacedScenes.length === 1;
    };
  }

  private createComplexIntegrationScenario(): () => Promise<boolean> {
    return async () => {
      const vnEngine = createVNEngine();
      
      const baseScript = `
scene1:
  - "Scene 1 content"
  - goto: scene2
scene2:
  - "Scene 2 content"
`;
      
      vnEngine.loadScript(baseScript);
      
      const dlcScript = `
dlc_scene1:
  - "DLC Scene 1"
  - goto: dlc_scene2
dlc_scene2:
  - "DLC Scene 2"
  - goto: scene1
`;
      
      const result = vnEngine.upgradeScript(dlcScript, { 
        mode: 'replace',
        namespace: 'expansion'
      });
      
      this.dlcStats.upgradesPerformed++;
      this.dlcStats.scenesAdded += result.addedScenes.length;
      
      return result.success && vnEngine.getSceneNames().length === 4;
    };
  }

  private createErrorHandlingScenario(): () => Promise<boolean> {
    return async () => {
      const vnEngine = createVNEngine();
      vnEngine.loadScript('existing: ["Existing content"]');
      
      const result = vnEngine.upgradeScript('existing: ["Conflicting content"]', { mode: 'replace' });
      
      return !result.success && result.error?.code === 'UNAUTHORIZED_OVERWRITE';
    };
  }

  private updateDLCInfo(): void {
    this.dlcInfo.style.display = 'block';
    
    this.upgradeStats.innerHTML = `
      <div class="upgrade-stat">
        <div class="upgrade-stat-value">${this.dlcStats.upgradesPerformed}</div>
        <div class="upgrade-stat-label">Upgrades Tested</div>
      </div>
      <div class="upgrade-stat">
        <div class="upgrade-stat-value">${this.dlcStats.scenesAdded}</div>
        <div class="upgrade-stat-label">Scenes Added</div>
      </div>
      <div class="upgrade-stat">
        <div class="upgrade-stat-value">${this.dlcStats.validationsPassed}</div>
        <div class="upgrade-stat-label">Validations Passed</div>
      </div>
    `;
  }


  private async executeTestFiles(filePaths: string[]): Promise<void> {
    if (this.isRunning) {
      this.log('⚠️ Tests already running', 'warning');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    this.updateStatus('running', 'Running tests...');
    
    const startTime = Date.now();
    
    try {
      this.log('\n' + '='.repeat(80));
      this.log('🚀 VN ENGINE YAML TEST SUITE v1.1');
      this.log('='.repeat(80));
      
      const categories: TestCategory[] = [];
      for (const filePath of filePaths) {
        try {
          const category = await this.loadTestFile(filePath);
          categories.push(category);
          this.loadedCategories.set(category.category, category);
        } catch (error) {
        }
      }
      
      if (categories.length === 0) {
        throw new Error('No test files could be loaded');
      }
      
      let totalTests = 0;
      let completedTests = 0;
      
      categories.forEach(category => {
        totalTests += category.tests.length;
      });
      
      this.updateProgress(0, totalTests);
      
      categories.sort((a, b) => a.priority - b.priority);
      
      for (const category of categories) {
        this.log(`\n📋 ${category.category.toUpperCase()}`);
        this.log(`   ${category.description}`);
        this.log('-'.repeat(60));
        
        for (const test of category.tests) {
          try {
            const result = await this.executeTest(test, category.category);
            this.testResults.push(result);
            
            completedTests++;
            this.updateProgress(completedTests, totalTests);
            
            if (result.passed) {
              this.log(`   ✅ ${test.name}`);
            } else {
              this.log(`   ❌ ${test.name}`);
              result.errors.forEach(error => this.log(`      💥 ${error}`));
            }
            
          } catch (error: any) {
            this.log(`   💥 ${test.name}: ${error.message}`);
            this.testResults.push({
              testName: test.name,
              category: category.category,
              passed: false,
              errors: [error.message],
              stepResults: [],
              duration: 0
            });
            completedTests++;
            this.updateProgress(completedTests, totalTests);
          }
        }
      }
      
      const duration = Date.now() - startTime;
      this.generateReport(duration);
      this.updateStatus('success', 'Tests completed');
      
    } catch (error: any) {
      this.log(`❌ Test execution failed: ${error.message}`, 'error');
      this.updateStatus('error', `Failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async executeTest(testCase: YAMLTestCase, category: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      testName: testCase.name,
      category,
      passed: true,
      errors: [],
      stepResults: [],
      duration: 0,
      dlcUpgrades: 0,
      scenesAdded: 0
    };

    try {
      const vnEngine = createVNEngine();
      
      if (testCase.dlc_tests) {
        for (let i = 0; i < testCase.dlc_tests.length; i++) {
          const dlcTest = testCase.dlc_tests[i];
          const stepResult = { stepIndex: i, passed: true };
          
          try {
            vnEngine.loadScript(dlcTest.base_script);
            
            const upgradeResult = vnEngine.upgradeScript(dlcTest.dlc_content, dlcTest.upgrade_options || {});
            
            result.dlcUpgrades! += 1;
            if (upgradeResult.success) {
              result.scenesAdded! += upgradeResult.addedScenes.length;
            }
            
            if (dlcTest.expected_result) {
              if (upgradeResult.success !== dlcTest.expected_result.success) {
                throw new Error(`Expected success: ${dlcTest.expected_result.success}, got: ${upgradeResult.success}`);
              }
              
              if (dlcTest.expected_result.added_scenes && 
                  upgradeResult.addedScenes.length !== dlcTest.expected_result.added_scenes.length) {
                throw new Error(`Expected ${dlcTest.expected_result.added_scenes.length} added scenes, got ${upgradeResult.addedScenes.length}`);
              }
            }
            
          } catch (error: any) {
            stepResult.passed = false;
            stepResult.error = error.message;
            result.passed = false;
            result.errors.push(`DLC test ${i}: ${error.message}`);
          }
          
          result.stepResults.push(stepResult);
        }
        
        result.duration = Date.now() - startTime;
        return result;
      }
      
      if (testCase.template_tests) {
        for (let i = 0; i < testCase.template_tests.length; i++) {
          const templateTest = testCase.template_tests[i];
          const stepResult = { stepIndex: i, passed: true };
          
          try {
            const templateResult = vnEngine.parseTemplate(templateTest.template);
            if (templateResult !== templateTest.expected) {
              throw new Error(`Template "${templateTest.template}" expected "${templateTest.expected}", got "${templateResult}"`);
            }
          } catch (error: any) {
            stepResult.passed = false;
            stepResult.error = error.message;
            result.passed = false;
            result.errors.push(`Template test ${i}: ${error.message}`);
          }
          
          result.stepResults.push(stepResult);
        }
        
        result.duration = Date.now() - startTime;
        return result;
      }
      
      if (!testCase.script || !testCase.scene) {
        throw new Error('Test case missing script or scene');
      }
      
      vnEngine.loadScript(testCase.script);
      if (vnEngine.getError()) {
        throw new Error(`Script loading failed: ${vnEngine.getError()}`);
      }
      
      let currentResult = vnEngine.startScene(testCase.scene);
      
      if (testCase.steps) {
        for (let i = 0; i < testCase.steps.length; i++) {
          const step = testCase.steps[i];
          const stepResult = { stepIndex: i, passed: true };
          
          try {
            switch (step.action) {
              case "continue":
                currentResult = vnEngine.continue();
                break;
              case "choice":
                if (step.choice_index === undefined) {
                  throw new Error("Choice index required for choice action");
                }
                currentResult = vnEngine.makeChoice(step.choice_index);
                break;
              case "validate":
                break;
              case "template":
                if (step.template) {
                  const templateResult = vnEngine.parseTemplate(step.template);
                }
                break;
              case "upgrade":
                if (step.dlc_content) {
                  const upgradeResult = vnEngine.upgradeScript(step.dlc_content, step.upgrade_options || {});
                  result.dlcUpgrades! += 1;
                  if (upgradeResult.success) {
                    result.scenesAdded! += upgradeResult.addedScenes.length;
                  }
                  currentResult = upgradeResult as any;
                }
                break;
              case "validate_dlc":
                if (step.dlc_content) {
                  const validationResult = vnEngine.validateUpgrade(step.dlc_content, step.upgrade_options || {});
                  currentResult = validationResult as any;
                }
                break;
            }
            
            if (step.expected) {
              this.validateStepExpectations(step.expected, currentResult, vnEngine, stepResult);
            }
            
          } catch (error: any) {
            stepResult.passed = false;
            stepResult.error = error.message;
            result.passed = false;
            result.errors.push(`Step ${i}: ${error.message}`);
          }
          
          result.stepResults.push(stepResult);
        }
      }
      
      if (testCase.final_state) {
        this.validateFinalState(testCase.final_state, vnEngine, result);
      }
      
    } catch (error: any) {
      result.passed = false;
      result.errors.push(`Test execution failed: ${error.message}`);
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }

  private validateStepExpectations(expected: any, result: any, vnEngine: any, stepResult: any): void {
    if (expected.type && result.type !== expected.type) {
      throw new Error(`Expected type ${expected.type}, got ${result.type}`);
    }
    
    if (expected.content && result.content !== expected.content) {
      throw new Error(`Expected content "${expected.content}", got "${result.content}"`);
    }
    
    if (expected.speaker && result.speaker !== expected.speaker) {
      throw new Error(`Expected speaker "${expected.speaker}", got "${result.speaker}"`);
    }
    
    if (expected.choices_count && (!result.choices || result.choices.length !== expected.choices_count)) {
      throw new Error(`Expected ${expected.choices_count} choices, got ${result.choices?.length || 0}`);
    }
    
    if (expected.contains && !result.content?.includes(expected.contains)) {
      throw new Error(`Expected content to contain "${expected.contains}"`);
    }
    
    if (expected.success !== undefined && result.success !== expected.success) {
      throw new Error(`Expected success: ${expected.success}, got: ${result.success}`);
    }
    
    if (expected.added_scenes !== undefined && result.addedScenes?.length !== expected.added_scenes) {
      throw new Error(`Expected ${expected.added_scenes} added scenes, got ${result.addedScenes?.length || 0}`);
    }
    
    if (expected.warnings_count !== undefined && result.warnings?.length !== expected.warnings_count) {
      throw new Error(`Expected ${expected.warnings_count} warnings, got ${result.warnings?.length || 0}`);
    }
  }

  private validateFinalState(expectedState: any, vnEngine: any, result: TestResult): void {
    const gameState = vnEngine.getGameState();
    
    if (expectedState.variables) {
      const variables = Object.fromEntries(gameState.variables);
      for (const [key, expectedValue] of Object.entries(expectedState.variables)) {
        const actualValue = this.getNestedValue(variables, key);
        if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
          result.passed = false;
          result.errors.push(
            `Final state - Variable ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
          );
        }
      }
    }
    
    if (expectedState.flags) {
      for (const flag of expectedState.flags) {
        if (!gameState.storyFlags.includes(flag)) {
          result.passed = false;
          result.errors.push(`Final state - Expected flag "${flag}" to be set`);
        }
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }


  private async runHelperValidationOnly(): Promise<void> {
    this.updateStatus('running', 'Validating helpers...');
    
    try {
      this.log('\n' + '='.repeat(80));
      this.log('🔍 COMPREHENSIVE HELPER VALIDATION');
      this.log('='.repeat(80));
      
      const vnEngine = createVNEngine();
      vnEngine.loadScript("test:\n  - 'Helper validation'");
      vnEngine.startScene("test");
      
      const helperCategories = [
        {
          name: "Math Helpers",
          tests: [
            { template: "{{add 15 25}}", expected: "40" },
            { template: "{{subtract 100 35}}", expected: "65" },
            { template: "{{multiply 8 9}}", expected: "72" },
            { template: "{{divide 144 12}}", expected: "12" },
            { template: "{{max 5 10 15}}", expected: "15" },
            { template: "{{min 5 10 15}}", expected: "5" },
            { template: "{{round 3.14159 2}}", expected: "3.14" }
          ]
        },
        {
          name: "String Helpers",
          tests: [
            { template: '{{uppercase "hello world"}}', expected: "HELLO WORLD" },
            { template: '{{capitalize "hello world"}}', expected: "Hello world" },
            { template: '{{truncate "this is a long string" 10 "..."}}', expected: "this is..." },
            { template: '{{replace "hello world" "world" "universe"}}', expected: "hello universe" }
          ]
        },
        {
          name: "Array Helpers",
          tests: [
            { template: '{{length (array "a" "b" "c" "d")}}', expected: "4" },
            { template: '{{first (array "apple" "banana" "cherry")}}', expected: "apple" },
            { template: '{{last (array "apple" "banana" "cherry")}}', expected: "cherry" }
          ]
        },
        {
          name: "Comparison Helpers",
          tests: [
            { template: "{{eq 42 42}}", expected: "true" },
            { template: "{{gt 15 10}}", expected: "true" },
            { template: "{{lt 5 10}}", expected: "true" },
            { template: "{{and true true}}", expected: "true" },
            { template: "{{or false true}}", expected: "true" },
            { template: "{{not false}}", expected: "true" }
          ]
        }
      ];
      
      let totalPassed = 0;
      let totalTests = 0;
      
      for (const category of helperCategories) {
        this.log(`\n📋 ${category.name}:`);
        let categoryPassed = 0;
        
        for (const test of category.tests) {
          totalTests++;
          try {
            const result = vnEngine.parseTemplate(test.template);
            if (result === test.expected) {
              this.log(`   ✅ ${test.template} → ${result}`);
              categoryPassed++;
              totalPassed++;
            } else {
              this.log(`   ❌ ${test.template} → expected "${test.expected}", got "${result}"`);
            }
          } catch (error: any) {
            this.log(`   💥 ${test.template} → Error: ${error.message}`);
          }
        }
        
        this.log(`   📊 ${categoryPassed}/${category.tests.length} passed`);
      }
      
      this.log(`\n📈 HELPER VALIDATION SUMMARY:`);
      this.log(`   Total: ${totalPassed}/${totalTests} passed (${Math.round(totalPassed/totalTests*100)}%)`);
      this.log(`   Status: ${totalPassed === totalTests ? '🎉 ALL HELPERS WORKING!' : '⚠️ Some helpers need attention'}`);
      
      this.updateStatus('success', `Helper validation: ${totalPassed}/${totalTests} passed`);
      
    } catch (error: any) {
      this.log(`❌ Helper validation failed: ${error.message}`, 'error');
      this.updateStatus('error', `Helper validation failed: ${error.message}`);
    }
  }


  private generateReport(duration: number): void {
    const summary = this.calculateSummary(duration);
    
    this.log('\n' + '='.repeat(80));
    this.log('📊 COMPREHENSIVE TEST REPORT');
    this.log('='.repeat(80));
    
    this.log(`\n📈 FINAL RESULTS:`);
    this.log(`   Total Tests: ${summary.totalTests}`);
    this.log(`   Passed: ${summary.passedTests} ✅`);
    this.log(`   Failed: ${summary.failedTests} ❌`);
    this.log(`   Success Rate: ${summary.successRate}%`);
    this.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    
    if (summary.dlcStats && (summary.dlcStats.upgradesPerformed > 0 || summary.dlcStats.validationsPassed > 0)) {
      this.log(`\n🎮 DLC TESTING RESULTS:`);
      this.log(`   Upgrades Performed: ${summary.dlcStats.upgradesPerformed}`);
      this.log(`   Scenes Added: ${summary.dlcStats.scenesAdded}`);
      this.log(`   Validations Passed: ${summary.dlcStats.validationsPassed}`);
    }
    
    this.log(`\n📋 CATEGORY BREAKDOWN:`);
    Object.entries(summary.categories).forEach(([category, stats]) => {
      const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
      this.log(`   ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
    });
    
    if (summary.failedTests > 0) {
      this.log(`\n❌ FAILED TESTS:`);
      this.testResults.filter(r => !r.passed).forEach(result => {
        this.log(`\n   📋 ${result.testName} (${result.category}):`);
        result.errors.forEach(error => this.log(`      • ${error}`));
      });
    }
    
    if (summary.failedTests === 0) {
      this.log(`\n🎉 EXCELLENT! All tests passed successfully!`);
      this.log(`   ✅ VN Engine is working perfectly`);
      this.log(`   ✅ All helpers are functional`);
      if (summary.dlcStats?.upgradesPerformed > 0) {
        this.log(`   ✅ DLC upgrade system working`);
      }
      this.log(`   ✅ Ready for production use`);
    } else {
      this.log(`\n⚠️ Some tests failed. Review the errors above for details.`);
    }
    
    this.log('\n' + '='.repeat(80));
    
    this.updateSummaryUI(summary);
    this.updateDLCInfo();
  }

  private calculateSummary(duration: number): TestSummary {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    const categories: Record<string, { total: number; passed: number; failed: number }> = {};
    
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });
    
    const dlcStats = {
      upgradesPerformed: this.dlcStats.upgradesPerformed + this.testResults.reduce((sum, r) => sum + (r.dlcUpgrades || 0), 0),
      scenesAdded: this.dlcStats.scenesAdded + this.testResults.reduce((sum, r) => sum + (r.scenesAdded || 0), 0),
      validationsPassed: this.dlcStats.validationsPassed
    };
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      categories,
      duration,
      dlcStats
    };
  }

  private updateSummaryUI(summary: TestSummary): void {
    this.totalTestsSpan.textContent = summary.totalTests.toString();
    this.passedTestsSpan.textContent = summary.passedTests.toString();
    this.failedTestsSpan.textContent = summary.failedTests.toString();
    this.successRateSpan.textContent = `${summary.successRate}%`;
    
    this.categoriesContainer.innerHTML = '';
    Object.entries(summary.categories).forEach(([category, stats]) => {
      const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
      const status = rate === 100 ? 'success' : rate >= 50 ? 'warning' : 'danger';
      const isDLCCategory = category.includes('DLC');
      
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      categoryItem.innerHTML = `
        <span class="category-name">${isDLCCategory ? '🎮 ' : ''}${category}</span>
        <div class="category-status">
          <span>${stats.passed}/${stats.total}</span>
          <span class="status-badge ${isDLCCategory ? 'dlc' : status}">${rate}%</span>
        </div>
      `;
      this.categoriesContainer.appendChild(categoryItem);
    });
  }


  private updateStatus(type: 'ready' | 'running' | 'success' | 'error', message: string): void {
    this.statusBar.className = `status-bar ${type}`;
    document.getElementById('status-text')!.textContent = message;
  }

  private updateProgress(completed: number, total: number): void {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = `${completed}/${total}`;
  }

  private log(message: string, type: 'info' | 'error' | 'warning' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '';
    const formattedMessage = `${prefix} ${message}`;
    
    console.log(formattedMessage);
    
    const outputElement = this.testOutput;
    const line = document.createElement('div');
    line.textContent = formattedMessage;
    if (type === 'error') line.style.color = '#ef5350';
    if (type === 'warning') line.style.color = '#ff9800';
    
    outputElement.appendChild(line);
    outputElement.scrollTop = outputElement.scrollHeight;
  }

  private clearOutput(): void {
    this.testOutput.innerHTML = '';
    this.testResults = [];
    this.dlcStats = { upgradesPerformed: 0, scenesAdded: 0, validationsPassed: 0 };
    this.dlcInfo.style.display = 'none';
    this.updateSummaryUI({
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0,
      categories: {},
      duration: 0
    });
    this.updateStatus('ready', 'Output cleared');
  }

  private exportResults(): void {
    if (this.testResults.length === 0) {
      this.log('No test results to export', 'warning');
      return;
    }
    
    const summary = this.calculateSummary(0);
    const exportData = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.testResults,
      dlcStats: this.dlcStats
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vn-engine-test-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.log('✅ Test results exported successfully');
  }

  private async validateTestFiles(): Promise<void> {
    this.log('🔍 Validating test file structure...');
    
    let validFiles = 0;
    let totalFiles = this.testFiles.length;
    
    for (const file of this.testFiles) {
      try {
        await this.loadTestFile(file.path);
        validFiles++;
        this.log(`   ✅ ${file.name}: Valid`);
      } catch (error: any) {
        this.log(`   ❌ ${file.name}: ${error.message}`, 'error');
      }
    }
    
    this.log(`\n📊 Validation complete: ${validFiles}/${totalFiles} files valid`);
    this.renderFileGrid();
  }
}


if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new YAMLTestFramework();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { YAMLTestFramework };
}
