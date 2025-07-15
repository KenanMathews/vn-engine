import type { ScriptResult, ParsedScene } from "./types";
import type { ScriptUpgradeOptions, UpgradeResult, ValidationResult } from "./types/upgrade";
import { GameStateManager } from "./core/state";
import { TemplateManager } from "./core/templates";
import { ScriptEngine, ScriptParser } from "./core/script";
import { EventEmitter } from "./core/events/EventEmitter";
import { EngineLifecycle, type VNEngineEvents } from "./core/engine/EngineLifecycle";
import { ScriptExecution } from "./core/engine/ScriptExecution";
import { StateManagement, type SaveData } from "./core/engine/StateManagement";
import { TemplateUtils } from "./core/engine/TemplateUtils";

export interface TemplateEngineInfo {
  type: 'handlebars' | 'simple';
  isHandlebarsAvailable: boolean;
  helpersRegistered: boolean;
  supportedFeatures: {
    variables: boolean;
    conditionals: boolean;
    helpers: boolean;
    loops: boolean;
    partials: boolean;
  };
  availableHelpers?: string[];
  limitations?: string[];
}

export class VNEngine {
  private readonly gameState: GameStateManager;
  private readonly scriptEngine: ScriptEngine;
  private readonly templateManager: TemplateManager;
  private readonly scriptParser: ScriptParser;
  private readonly events = new EventEmitter<VNEngineEvents>();

  private readonly lifecycle: EngineLifecycle;
  private readonly execution: ScriptExecution;
  private readonly stateManager: StateManagement;
  private readonly templateUtils: TemplateUtils;

  private currentResult: ScriptResult | null = null;
  private isTestMode: boolean = false;

  constructor() {
    this.isTestMode = typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test')));

    this.gameState = new GameStateManager();
    this.templateManager = new TemplateManager();
    
    this.templateManager.setGameStateManager(this.gameState);
    
    this.scriptEngine = new ScriptEngine(this.gameState, this.templateManager);
    this.scriptParser = new ScriptParser();

    this.lifecycle = new EngineLifecycle(
      this.gameState, 
      this.scriptEngine, 
      this.scriptParser, 
      this.events
    );
    this.execution = new ScriptExecution(this.scriptEngine, this.events);
    this.stateManager = new StateManagement(this.gameState);
    this.templateUtils = new TemplateUtils(this.templateManager, this.gameState);

    this.events.on('stateChange', (result) => {
      this.currentResult = result;
    });
  }

  async initialize(): Promise<void> {
    await this.templateManager.initialize();
    
    if (this.templateManager.getEngineInfo().isHandlebarsAvailable) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    if (!this.isTestMode) {
      this.logTemplateEngineInfo();
    }
  }

  private logTemplateEngineInfo(): void {
    const info = this.getTemplateEngineInfo();
    
    if (info.type === 'handlebars') {
      console.log('🎭 VN Engine initialized with Handlebars template engine');
      console.log(`   Helpers registered: ${info.helpersRegistered ? '✅' : '⚠️ Failed'}`);
      console.log('   📝 VN helpers now integrated with game state');
    } else {
      console.log('📝 VN Engine initialized with Simple template engine');
      console.log('   To enable full templating features, install Handlebars:');
      console.log('   npm install handlebars');
    }
  }

  getTemplateEngineInfo(): TemplateEngineInfo {
    const baseInfo = this.templateManager.getEngineInfo();
    
    if (baseInfo.type === 'handlebars') {
      return {
        ...baseInfo,
        availableHelpers: [
          'Array: first, last, length, includes, join, unique, shuffle, sample, etc.',
          'Math: add, subtract, multiply, divide, min, max, round, random, etc.',
          'String: uppercase, lowercase, capitalize, trim, truncate, etc.',
          'Comparison: eq, ne, gt, lt, and, or, not, contains, etc.',
          'VN: hasFlag, getVar, setVar, addFlag, removeFlag, playerChose, formatTime, etc.'
        ]
      };
    } else {
      return {
        ...baseInfo,
        limitations: [
          'No custom helper functions',
          'Limited conditional syntax (basic if/else only)',
          'No loops ({{#each}})',
          'No partials or includes',
          'Basic variable substitution only'
        ]
      };
    }
  }

  supportsTemplateFeature(feature: 'variables' | 'conditionals' | 'helpers' | 'loops' | 'partials'): boolean {
    return this.templateManager.supportsFeature(feature);
  }

  getTemplateCapabilities(): {
    canUseHelpers: boolean;
    canUseLoops: boolean;
    canUseConditionals: boolean;
    canUseVariables: boolean;
    recommendedSyntax: {
      variable: string;
      conditional: string;
      helper?: string;
      loop?: string;
    };
  } {
    const info = this.getTemplateEngineInfo();
    
    return {
      canUseHelpers: info.supportedFeatures.helpers,
      canUseLoops: info.supportedFeatures.loops,
      canUseConditionals: info.supportedFeatures.conditionals,
      canUseVariables: info.supportedFeatures.variables,
      recommendedSyntax: {
        variable: '{{variableName}} or {{player.name}}',
        conditional: info.type === 'handlebars' 
          ? '{{#if condition}}...{{else}}...{{/if}}'
          : '{{#if hasFlag(\'flagName\')}}...{{else}}...{{/if}}',
        helper: info.supportedFeatures.helpers 
          ? '{{setVar "score" 100}} or {{addFlag "completedQuest"}}'
          : undefined,
        loop: info.supportedFeatures.loops
          ? '{{#each items}}{{this}}{{/each}}'
          : undefined
      }
    };
  }

  isReady(): boolean {
    return this.templateManager.isReady();
  }

  loadScript(content: string, fileName?: string): void {
    this.lifecycle.loadScript(content, fileName);
  }

  reset(): void {
    this.lifecycle.reset();
    this.currentResult = null;
  }

  destroy(): void {
    this.lifecycle.destroy();
  }

  startScene(sceneName: string): ScriptResult {
    return this.execution.startScene(sceneName);
  }

  continue(): ScriptResult {
    return this.execution.continue();
  }

  makeChoice(choiceIndex: number): ScriptResult {
    return this.execution.makeChoice(choiceIndex);
  }

  loadSave(gameState: any): ScriptResult {
    this.setGameState(gameState);
    
    const currentScene = this.stateManager.getCurrentScene();
    const currentInstruction = this.stateManager.getCurrentInstruction();
    
    if (currentScene) {
      return this.execution.startScene(currentScene, currentInstruction);
    } else {
      return {
        type: "error",
        error: "No current scene found in game state"
      };
    }
  }

  getCurrentResult(): ScriptResult | null {
    return this.currentResult;
  }

  getIsLoaded(): boolean {
    return this.lifecycle.getIsLoaded();
  }

  getError(): string | null {
    return this.lifecycle.getError();
  }

  getGameState() {
    return this.stateManager.getGameState();
  }

  setGameState(state: any): void {
    this.stateManager.setGameState(state);
  }

  createSave(metadata?: SaveData['metadata']): SaveData {
    return this.stateManager.exportForSave(metadata);
  }

  parseTemplate(template: string): string {
    return this.templateUtils.parseTemplate(template);
  }

  renderWithVariables(template: string, variables: Record<string, any>): string {
    return this.templateUtils.renderWithVariables(template, variables);
  }

  validateTemplate(template: string): { valid: boolean; error?: string; engine: string; supportedFeatures: string[] } {
    return this.templateManager.validateTemplate(template);
  }

  registerHelper(name: string, helper: any): boolean {
    return this.templateManager.registerHelper(name, helper);
  }

  on<K extends keyof VNEngineEvents>(
    event: K,
    callback: (data: VNEngineEvents[K]) => void
  ): () => void {
    return this.events.on(event, callback);
  }

  upgradeScript(content: string, options?: ScriptUpgradeOptions): UpgradeResult {
    return this.lifecycle.upgradeScript(content, options);
  }

  validateUpgrade(content: string, options?: ScriptUpgradeOptions): ValidationResult {
    return this.lifecycle.validateUpgrade(content, options);
  }

  createUpgradePreview(content: string, options?: ScriptUpgradeOptions) {
    return this.lifecycle.createDryRunReport(content, options);
  }

  getAllScenes(): ParsedScene[] {
    return this.lifecycle.getAllScenes();
  }

  getSceneCount(): number {
    return this.lifecycle.getSceneCount();
  }

  getSceneNames(): string[] {
    return this.lifecycle.getSceneNames();
  }

  hasScene(sceneName: string): boolean {
    return this.lifecycle.hasScene(sceneName);
  }

  getScenesByNamespace(namespace: string): ParsedScene[] {
    return this.lifecycle.getScenesByNamespace(namespace);
  }

  hasDLCContent(): boolean {
    return this.lifecycle.hasDLCContent();
  }

  getUpgradeStats() {
    return this.lifecycle.getUpgradeStats();
  }

  getCurrentScene(): string {
    return this.stateManager.getCurrentScene();
  }

  getCurrentInstruction(): number {
    return this.stateManager.getCurrentInstruction();
  }

  hasFlag(flag: string): boolean {
    return this.stateManager.hasFlag(flag);
  }

  getVariable(key: string): any {
    return this.stateManager.getVariable(key);
  }

  setVariable(key: string, value: any): void {
    this.stateManager.setVariable(key, value);
  }

  getChoiceHistory() {
    return this.stateManager.getChoiceHistory();
  }

  getEngineInfo(): {
    version: string;
    templateEngine: TemplateEngineInfo;
    isLoaded: boolean;
    currentScene: string;
    sceneCount: number;
    hasError: boolean;
    error?: string;
  } {
    return {
      version: '1.2.2',
      templateEngine: this.getTemplateEngineInfo(),
      isLoaded: this.getIsLoaded(),
      currentScene: this.getCurrentScene(),
      sceneCount: this.getSceneCount(),
      hasError: !!this.getError(),
      error: this.getError() || undefined
    };
  }
}

/**
 * Create a VN Engine instance with proper initialization
 * This is now async to ensure all template features are ready
 */
export async function createVNEngine(): Promise<VNEngine> {
  const engine = new VNEngine();
  await engine.initialize();
  return engine;
}

export type { VNEngineEvents, SaveData, ScriptUpgradeOptions, UpgradeResult, ValidationResult };