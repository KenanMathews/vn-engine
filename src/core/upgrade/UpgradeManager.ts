
import type { ParsedScene } from '../../types';
import type { 
  ScriptUpgradeOptions, 
  UpgradeResult, 
  ValidationResult 
} from '../../types/upgrade';
import type { GameStateManager } from '../state';
import type { ScriptEngine, ScriptParser } from '../script';
import type { EventEmitter } from '../events/EventEmitter';
import { ScriptUpgrader } from './ScriptUpgrader';

export interface UpgradeEvents {
  upgradeStarted: { options: ScriptUpgradeOptions };
  upgradeCompleted: { result: UpgradeResult };
  upgradeFailed: { error: string };
  validationCompleted: { result: ValidationResult };
}

export class UpgradeManager {
  private upgrader: ScriptUpgrader;
  private currentScenes: ParsedScene[] = [];

  constructor(
    private gameState: GameStateManager,
    private scriptEngine: ScriptEngine,
    private scriptParser: ScriptParser,
    private events: EventEmitter<any>
  ) {
    this.upgrader = new ScriptUpgrader(gameState, scriptEngine, scriptParser);
  }

  /**
   * Set current scenes (called when base script is loaded)
   */
  setCurrentScenes(scenes: ParsedScene[]): void {
    this.currentScenes = [...scenes];
  }

  /**
   * Upgrade script with DLC content
   */
  upgradeScript(content: string, options: ScriptUpgradeOptions = {}): UpgradeResult {
    // Emit upgrade started event
    this.events.emit('upgradeStarted', { options });

    try {
      const result = this.upgrader.upgrade(this.currentScenes, content, options);
      
      if (result.success) {
        // Update current scenes if upgrade succeeded
        const mergedScenes = this.getMergedScenes(content, options);
        if (mergedScenes) {
          this.currentScenes = mergedScenes;
        }
        
        this.events.emit('upgradeCompleted', { result });
      } else {
        this.events.emit('upgradeFailed', { 
          error: result.error?.message || 'Unknown upgrade error' 
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.events.emit('upgradeFailed', { error: errorMessage });
      
      return {
        success: false,
        error: {
          code: 'SCENE_CONFLICT',
          message: errorMessage,
          details: {}
        },
        addedScenes: [],
        replacedScenes: [],
        totalScenes: this.currentScenes.length,
        warnings: []
      };
    }
  }

  /**
   * Validate upgrade without applying changes
   */
  validateUpgrade(content: string, options: ScriptUpgradeOptions = {}): ValidationResult {
    try {
      // Parse DLC content
      const dlcScenes = this.scriptParser.parse(content, 'dlc.yaml');
      
      // Apply namespace if specified
      const namespacedDlcScenes = options.namespace 
        ? this.applyNamespaceToScenes(dlcScenes, options.namespace)
        : dlcScenes;

      const result = this.upgrader.validateUpgrade(this.currentScenes, namespacedDlcScenes, options);
      
      this.events.emit('validationCompleted', { result });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: ValidationResult = {
        valid: false,
        errors: [{
          code: 'PARSE_ERROR',
          message: errorMessage,
          details: { parseErrors: [errorMessage] }
        }],
        warnings: [],
        wouldAddScenes: [],
        wouldReplaceScenes: []
      };
      
      this.events.emit('validationCompleted', { result });
      
      return result;
    }
  }

  /**
   * Get current loaded scenes
   */
  getCurrentScenes(): ParsedScene[] {
    return [...this.currentScenes];
  }

  /**
   * Get current scene count
   */
  getSceneCount(): number {
    return this.currentScenes.length;
  }

  /**
   * Check if a scene exists
   */
  hasScene(sceneName: string): boolean {
    return this.currentScenes.some(scene => scene.name === sceneName);
  }

  /**
   * Get scene names
   */
  getSceneNames(): string[] {
    return this.currentScenes.map(scene => scene.name);
  }

  /**
   * Get scenes by namespace prefix
   */
  getScenesByNamespace(namespace: string): ParsedScene[] {
    const prefix = `${namespace}_`;
    return this.currentScenes.filter(scene => scene.name.startsWith(prefix));
  }

  /**
   * Check if any DLC content is loaded
   */
  hasDLCContent(): boolean {
    // Simple heuristic: check for scenes with underscore prefixes
    return this.currentScenes.some(scene => scene.name.includes('_'));
  }

  /**
   * Get upgrade statistics
   */
  getUpgradeStats(): {
    totalScenes: number;
    estimatedDLCScenes: number;
    baseScenes: number;
    namespaces: string[];
  } {
    const totalScenes = this.currentScenes.length;
    const namespacedScenes = this.currentScenes.filter(scene => scene.name.includes('_'));
    const estimatedDLCScenes = namespacedScenes.length;
    const baseScenes = totalScenes - estimatedDLCScenes;
    
    // Extract unique namespaces
    const namespaces = [...new Set(
      namespacedScenes
        .map(scene => scene.name.split('_')[0])
        .filter(ns => ns.length > 0)
    )];

    return {
      totalScenes,
      estimatedDLCScenes,
      baseScenes,
      namespaces
    };
  }

  /**
   * Create a dry run report for UI display
   */
  createDryRunReport(content: string, options: ScriptUpgradeOptions = {}): {
    valid: boolean;
    summary: string;
    details: {
      wouldAdd: string[];
      wouldReplace: string[];
      warnings: string[];
      errors: string[];
    };
  } {
    const validation = this.validateUpgrade(content, { ...options, dryRun: true });
    
    const summary = validation.valid 
      ? `Would add ${validation.wouldAddScenes.length} scenes and replace ${validation.wouldReplaceScenes.length} scenes`
      : `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`;

    return {
      valid: validation.valid,
      summary,
      details: {
        wouldAdd: validation.wouldAddScenes,
        wouldReplace: validation.wouldReplaceScenes,
        warnings: validation.warnings,
        errors: validation.errors.map(e => e.message)
      }
    };
  }

  /**
   * Helper to get merged scenes for internal use
   */
  private getMergedScenes(content: string, options: ScriptUpgradeOptions): ParsedScene[] | null {
    try {
      const dlcScenes = this.scriptParser.parse(content, 'dlc.yaml');
      const namespacedDlcScenes = options.namespace 
        ? this.applyNamespaceToScenes(dlcScenes, options.namespace)
        : dlcScenes;

      if (options.mode === 'additive') {
        return [...this.currentScenes, ...namespacedDlcScenes];
      } else {
        // Replace mode
        const dlcSceneNames = new Set(namespacedDlcScenes.map(s => s.name));
        const allowOverwrite = new Set(options.allowOverwrite || []);
        
        const filteredBaseScenes = this.currentScenes.filter(scene => 
          !dlcSceneNames.has(scene.name) || !allowOverwrite.has(scene.name)
        );
        
        return [...filteredBaseScenes, ...namespacedDlcScenes];
      }
    } catch (error) {
      console.error('Failed to get merged scenes:', error);
      return null;
    }
  }

  /**
   * Helper to apply namespace to scenes
   */
  private applyNamespaceToScenes(scenes: ParsedScene[], namespace: string): ParsedScene[] {
    return scenes.map(scene => ({
      ...scene,
      name: `${namespace}_${scene.name}`
      // Note: Internal references would be updated by ScriptUpgrader
    }));
  }
}