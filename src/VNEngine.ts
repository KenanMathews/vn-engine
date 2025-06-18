// VNEngine.ts - Refactored with composition and upgrade support

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

export class VNEngine {
  // Core managers
  private readonly gameState: GameStateManager;
  private readonly scriptEngine: ScriptEngine;
  private readonly templateManager: TemplateManager;
  private readonly scriptParser: ScriptParser;
  private readonly events = new EventEmitter<VNEngineEvents>();

  // Composed components
  private readonly lifecycle: EngineLifecycle;
  private readonly execution: ScriptExecution;
  private readonly stateManager: StateManagement;
  private readonly templateUtils: TemplateUtils;

  // Simple state tracking
  private currentResult: ScriptResult | null = null;

  constructor() {
    // Initialize core managers
    this.gameState = new GameStateManager();
    this.templateManager = new TemplateManager();
    this.scriptEngine = new ScriptEngine(this.gameState, this.templateManager);
    this.scriptParser = new ScriptParser();

    // Initialize composed components
    this.lifecycle = new EngineLifecycle(
      this.gameState, 
      this.scriptEngine, 
      this.scriptParser, 
      this.events
    );
    this.execution = new ScriptExecution(this.scriptEngine, this.events);
    this.stateManager = new StateManagement(this.gameState);
    this.templateUtils = new TemplateUtils(this.templateManager, this.gameState);

    // Listen to state changes to update current result
    this.events.on('stateChange', (result) => {
      this.currentResult = result;
    });
  }

  // ===== LIFECYCLE MANAGEMENT =====
  /**
   * Load and parse a script file
   */
  loadScript(content: string, fileName?: string): void {
    this.lifecycle.loadScript(content, fileName);
  }

  /**
   * Reset the engine to initial state
   */
  reset(): void {
    this.lifecycle.reset();
    this.currentResult = null;
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(): void {
    this.lifecycle.destroy();
  }

  // ===== SCRIPT EXECUTION =====
  /**
   * Start executing a specific scene
   */
  startScene(sceneName: string): ScriptResult {
    return this.execution.startScene(sceneName);
  }

  /**
   * Continue to the next instruction
   */
  continue(): ScriptResult {
    return this.execution.continue();
  }

  /**
   * Make a choice and continue execution
   */
  makeChoice(choiceIndex: number): ScriptResult {
    return this.execution.makeChoice(choiceIndex);
  }

  // ===== STATE ACCESS (Simple getters) =====
  /**
   * Get the current execution result
   */
  getCurrentResult(): ScriptResult | null {
    return this.currentResult;
  }

  /**
   * Check if a script is currently loaded
   */
  getIsLoaded(): boolean {
    return this.lifecycle.getIsLoaded();
  }

  /**
   * Get the current error message if any
   */
  getError(): string | null {
    return this.lifecycle.getError();
  }

  // ===== STATE MANAGEMENT =====
  /**
   * Get serializable game state
   */
  getGameState() {
    return this.stateManager.getGameState();
  }

  /**
   * Load game state from serialized data
   */
  setGameState(state: any): void {
    this.stateManager.setGameState(state);
  }

  /**
   * Create a complete save file with metadata
   */
  createSave(metadata?: SaveData['metadata']): SaveData {
    return this.stateManager.exportForSave(metadata);
  }

  /**
   * Load from a complete save file
   */
  loadSave(saveData: SaveData): boolean {
    if (this.stateManager.validateSaveData(saveData)) {
      this.stateManager.importFromSave(saveData);
      return true;
    }
    return false;
  }

  // ===== TEMPLATE UTILITIES =====
  /**
   * Parse a template string using current game state
   */
  parseTemplate(template: string): string {
    return this.templateUtils.parseTemplate(template);
  }

  /**
   * Parse template with additional variables
   */
  renderWithVariables(template: string, variables: Record<string, any>): string {
    return this.templateUtils.renderWithVariables(template, variables);
  }

  /**
   * Validate if a template would render successfully
   */
  validateTemplate(template: string): { valid: boolean; error?: string } {
    return this.templateUtils.validateTemplate(template);
  }

  // ===== EVENT SYSTEM =====
  /**
   * Subscribe to engine events
   */
  on<K extends keyof VNEngineEvents>(
    event: K,
    callback: (data: VNEngineEvents[K]) => void
  ): () => void {
    return this.events.on(event, callback);
  }

  // ===== SCRIPT UPGRADE SYSTEM =====
  /**
   * Upgrade script with DLC content
   */
  upgradeScript(content: string, options?: ScriptUpgradeOptions): UpgradeResult {
    return this.lifecycle.upgradeScript(content, options);
  }

  /**
   * Validate upgrade without applying changes
   */
  validateUpgrade(content: string, options?: ScriptUpgradeOptions): ValidationResult {
    return this.lifecycle.validateUpgrade(content, options);
  }

  /**
   * Create a dry run report for upgrade preview
   */
  createUpgradePreview(content: string, options?: ScriptUpgradeOptions) {
    return this.lifecycle.createDryRunReport(content, options);
  }

  // ===== CONTENT INSPECTION =====

  /**
   * Get all loaded scenes
   */
  getAllScenes(): ParsedScene[] {
    return this.lifecycle.getAllScenes();
  }

  /**
   * Get current scene count
   */
  getSceneCount(): number {
    return this.lifecycle.getSceneCount();
  }

  /**
   * Get all available scene names
   */
  getSceneNames(): string[] {
    return this.lifecycle.getSceneNames();
  }

  /**
   * Check if a specific scene exists
   */
  hasScene(sceneName: string): boolean {
    return this.lifecycle.hasScene(sceneName);
  }

  /**
   * Get scenes by namespace (useful for DLC management)
   */
  getScenesByNamespace(namespace: string): ParsedScene[] {
    return this.lifecycle.getScenesByNamespace(namespace);
  }

  /**
   * Check if any DLC content is loaded
   */
  hasDLCContent(): boolean {
    return this.lifecycle.hasDLCContent();
  }

  /**
   * Get detailed upgrade statistics
   */
  getUpgradeStats() {
    return this.lifecycle.getUpgradeStats();
  }

  // ===== CONVENIENCE METHODS =====
  /**
   * Quick access to current scene name
   */
  getCurrentScene(): string {
    return this.stateManager.getCurrentScene();
  }

  /**
   * Quick check for story flags
   */
  hasFlag(flag: string): boolean {
    return this.stateManager.hasFlag(flag);
  }

  /**
   * Quick access to variables
   */
  getVariable(key: string): any {
    return this.stateManager.getVariable(key);
  }

  /**
   * Get choice history
   */
  getChoiceHistory() {
    return this.stateManager.getChoiceHistory();
  }
}

// ===== FACTORY FUNCTION =====
export function createVNEngine(): VNEngine {
  return new VNEngine();
}

// Re-export types and events for convenience
export type { VNEngineEvents, SaveData, ScriptUpgradeOptions, UpgradeResult, ValidationResult };