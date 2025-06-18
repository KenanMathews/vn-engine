import type { ScriptResult, ParsedScene } from "../../types";
import type {
  ScriptUpgradeOptions,
  UpgradeResult,
  ValidationResult,
} from "../../types/upgrade";
import type { GameStateManager } from "../state";
import type { ScriptEngine, ScriptParser } from "../script";
import type { EventEmitter } from "../events/EventEmitter";
import { UpgradeManager } from "../upgrade/UpgradeManager";

export interface VNEngineEvents {
  stateChange: ScriptResult | null;
  error: string;
  loaded: void;
  upgradeCompleted: UpgradeResult;
  upgradeFailed: string;
}

export class EngineLifecycle {
  private isLoaded: boolean = false;
  private error: string | null = null;
  private upgradeManager: UpgradeManager;

  constructor(
    private gameState: GameStateManager,
    private scriptEngine: ScriptEngine,
    private scriptParser: ScriptParser,
    private events: EventEmitter<VNEngineEvents>
  ) {
    this.upgradeManager = new UpgradeManager(
      gameState,
      scriptEngine,
      scriptParser,
      events as any
    );
  }

  loadScript(content: string, fileName: string = "script.yaml"): void {
    try {
      this.error = null;

      const scenes = this.scriptParser.parse(content, fileName);
      this.scriptEngine.loadScenes(scenes);

      // Update upgrade manager with current scenes
      this.upgradeManager.setCurrentScenes(scenes);

      this.isLoaded = true;

      this.events.emit("loaded");
      this.events.emit("stateChange", null);
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      this.error = errorMessage;
      this.isLoaded = false;

      this.events.emit("error", errorMessage);
      this.events.emit("stateChange", null);
    }
  }

  /**
   * Upgrade script with DLC content
   */
  upgradeScript(
    content: string,
    options: ScriptUpgradeOptions = {}
  ): UpgradeResult {
    if (!this.isLoaded) {
      const errorResult: UpgradeResult = {
        success: false,
        error: {
          code: "STATE_INVALID",
          message: "Cannot upgrade script before loading base script",
          details: {},
        },
        addedScenes: [],
        replacedScenes: [],
        totalScenes: 0,
        warnings: [],
      };

      this.events.emit("upgradeFailed", errorResult.error!.message);
      return errorResult;
    }

    try {
      const result = this.upgradeManager.upgradeScript(content, options);

      if (result.success) {
        this.events.emit("upgradeCompleted", result);
      } else {
        this.events.emit(
          "upgradeFailed",
          result.error?.message || "Unknown upgrade error"
        );
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || "Unknown upgrade error";
      this.error = errorMessage;

      const errorResult: UpgradeResult = {
        success: false,
        error: {
          code: "SCENE_CONFLICT",
          message: errorMessage,
          details: {},
        },
        addedScenes: [],
        replacedScenes: [],
        totalScenes: this.upgradeManager.getSceneCount(),
        warnings: [],
      };

      this.events.emit("upgradeFailed", errorMessage);
      return errorResult;
    }
  }

  /**
   * Validate upgrade without applying changes
   */
  validateUpgrade(
    content: string,
    options: ScriptUpgradeOptions = {}
  ): ValidationResult {
    if (!this.isLoaded) {
      return {
        valid: false,
        errors: [
          {
            code: "STATE_INVALID",
            message: "Cannot validate upgrade before loading base script",
            details: {},
          },
        ],
        warnings: [],
        wouldAddScenes: [],
        wouldReplaceScenes: [],
      };
    }

    return this.upgradeManager.validateUpgrade(content, options);
  }

  reset(): void {
    this.isLoaded = false;
    this.error = null;

    // Reset game state
    this.gameState = new (this.gameState.constructor as any)();

    // Clear upgrade manager scenes
    this.upgradeManager.setCurrentScenes([]);

    this.events.emit("stateChange", null);
  }

  destroy(): void {
    this.events.removeAllListeners();
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getError(): string | null {
    return this.error;
  }

  setError(error: string): void {
    this.error = error;
    this.events.emit("error", error);
  }

  // ===== UPGRADE UTILITY METHODS =====

  /**
   * Get all loaded scenes
   */
  getAllScenes(): ParsedScene[] {
    return this.upgradeManager.getCurrentScenes();
  }

  /**
   * Get current scene count
   */
  getSceneCount(): number {
    return this.upgradeManager.getSceneCount();
  }

  /**
   * Check if a scene exists
   */
  hasScene(sceneName: string): boolean {
    return this.upgradeManager.hasScene(sceneName);
  }

  /**
   * Get all scene names
   */
  getSceneNames(): string[] {
    return this.upgradeManager.getSceneNames();
  }

  /**
   * Get scenes by namespace
   */
  getScenesByNamespace(namespace: string): ParsedScene[] {
    return this.upgradeManager.getScenesByNamespace(namespace);
  }

  /**
   * Check if DLC content is loaded
   */
  hasDLCContent(): boolean {
    return this.upgradeManager.hasDLCContent();
  }

  /**
   * Get upgrade statistics
   */
  getUpgradeStats() {
    return this.upgradeManager.getUpgradeStats();
  }

  /**
   * Create dry run report
   */
  createDryRunReport(content: string, options: ScriptUpgradeOptions = {}) {
    return this.upgradeManager.createDryRunReport(content, options);
  }

  /**
   * Get upgrade manager for advanced operations
   */
  getUpgradeManager(): UpgradeManager {
    return this.upgradeManager;
  }
}
