import type { ParsedScene } from '../../types';
import type { 
  ScriptUpgradeOptions, 
  UpgradeResult, 
  UpgradeError,
  ValidationResult,
  BackupData 
} from '../../types/upgrade';
import type { GameStateManager } from '../state';
import type { ScriptEngine, ScriptParser } from '../script';
import { UpgradeValidator } from './UpgradeValidator';
import { StatePreserver } from './StatePreserver';

export class ScriptUpgrader {
  private validator: UpgradeValidator;
  private statePreserver: StatePreserver;

  constructor(
    private gameState: GameStateManager,
    private scriptEngine: ScriptEngine,
    private scriptParser: ScriptParser
  ) {
    this.validator = new UpgradeValidator(gameState);
    this.statePreserver = new StatePreserver(gameState, scriptEngine);
  }

  /**
   * Upgrade script with DLC content
   */
  upgrade(
    currentScenes: ParsedScene[],
    dlcContent: string,
    options: ScriptUpgradeOptions = {}
  ): UpgradeResult {
    // Set default options
    const upgradeOptions: Required<ScriptUpgradeOptions> = {
      mode: 'additive',
      namespace: '',
      allowOverwrite: [],
      validateState: true,
      dryRun: false,
      ...options
    };

    try {
      // Parse DLC content
      const dlcScenes = this.parseDLCContent(dlcContent);
      
      // Apply namespace if specified
      const namespacedDlcScenes = upgradeOptions.namespace 
        ? this.applyNamespace(dlcScenes, upgradeOptions.namespace)
        : dlcScenes;

      // Validate upgrade
      const validation = this.validateUpgrade(currentScenes, namespacedDlcScenes, upgradeOptions);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors[0], // Return first error
          addedScenes: [],
          replacedScenes: [],
          totalScenes: currentScenes.length,
          warnings: validation.warnings
        };
      }

      // If dry run, return validation results without applying
      if (upgradeOptions.dryRun) {
        return {
          success: true,
          addedScenes: validation.wouldAddScenes,
          replacedScenes: validation.wouldReplaceScenes,
          totalScenes: currentScenes.length + validation.wouldAddScenes.length,
          warnings: validation.warnings
        };
      }

      // Create backup before applying changes
      const backup = this.statePreserver.backup(currentScenes);

      try {
        // Apply upgrade
        const mergedScenes = this.mergeScenes(currentScenes, namespacedDlcScenes, upgradeOptions);
        
        // Load new scenes into script engine
        this.scriptEngine.loadScenes(mergedScenes);

        // Restore execution state
        const stateRestoration = this.statePreserver.restoreExecutionState(mergedScenes);
        if (!stateRestoration.success) {
          throw new Error(`Failed to restore execution state: ${stateRestoration.message}`);
        }

        // Success!
        return {
          success: true,
          addedScenes: this.getAddedScenes(currentScenes, namespacedDlcScenes, upgradeOptions),
          replacedScenes: this.getReplacedScenes(currentScenes, namespacedDlcScenes),
          totalScenes: mergedScenes.length,
          warnings: validation.warnings
        };

      } catch (error) {
        // Rollback on failure
        console.error('Upgrade failed, rolling back:', error);
        this.statePreserver.restore(backup);
        
        throw new Error(`Upgrade failed and was rolled back: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('parse') ? 'PARSE_ERROR' : 'SCENE_CONFLICT',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            parseErrors: error instanceof Error ? [error.message] : ['Unknown parse error']
          }
        },
        addedScenes: [],
        replacedScenes: [],
        totalScenes: currentScenes.length,
        warnings: []
      };
    }
  }

  /**
   * Validate upgrade without applying changes
   */
  validateUpgrade(
    baseScenes: ParsedScene[],
    dlcScenes: ParsedScene[],
    options: ScriptUpgradeOptions
  ): ValidationResult {
    // Check scene conflicts
    const conflicts = this.validator.validateSceneConflicts(baseScenes, dlcScenes, options);
    
    // Check scene references after merge
    const mergedScenes = this.mergeScenes(baseScenes, dlcScenes, options);
    const references = this.validator.validateSceneReferences(mergedScenes);
    
    // Check current state validity
    const stateValidation = options.validateState 
      ? this.validator.validateCurrentState(mergedScenes)
      : { valid: true, issues: [] };

    // Generate warnings
    const warnings = this.validator.generateWarnings(baseScenes, dlcScenes, options);

    // Create error if validation failed
    const error = this.validator.createUpgradeError(conflicts, references, stateValidation);
    
    return {
      valid: error === null,
      errors: error ? [error] : [],
      warnings,
      wouldAddScenes: this.getAddedScenes(baseScenes, dlcScenes, options),
      wouldReplaceScenes: this.getReplacedScenes(baseScenes, dlcScenes)
    };
  }

  /**
   * Parse DLC content into scenes
   */
  private parseDLCContent(content: string): ParsedScene[] {
    try {
      return this.scriptParser.parse(content, 'dlc.yaml');
    } catch (error) {
      throw new Error(`Failed to parse DLC content: ${error instanceof Error ? error.message : 'Unknown parse error'}`);
    }
  }

  /**
   * Apply namespace prefix to scene names
   */
  private applyNamespace(scenes: ParsedScene[], namespace: string): ParsedScene[] {
    return scenes.map(scene => ({
      ...scene,
      name: `${namespace}_${scene.name}`,
      // Also update any internal references to use namespace
      instructions: this.updateInstructionReferences(scene.instructions, scenes.map(s => s.name), namespace)
    }));
  }

  /**
   * Update instruction references to use namespaced scene names
   */
  private updateInstructionReferences(
    instructions: any[], 
    originalSceneNames: string[], 
    namespace: string
  ): any[] {
    return instructions.map(instruction => {
      const updated = { ...instruction };
      
      // Update jump targets
      if (instruction.type === 'jump' && originalSceneNames.includes(instruction.target)) {
        updated.target = `${namespace}_${instruction.target}`;
      }
      
      // Update choice targets
      if (instruction.type === 'dialogue' && instruction.choices) {
        updated.choices = instruction.choices.map((choice: any) => ({
          ...choice,
          goto: choice.goto && originalSceneNames.includes(choice.goto) 
            ? `${namespace}_${choice.goto}` 
            : choice.goto
        }));
      }
      
      // Update conditional instruction references
      if (instruction.type === 'conditional') {
        if (instruction.then) {
          updated.then = this.updateInstructionReferences(instruction.then, originalSceneNames, namespace);
        }
        if (instruction.else) {
          updated.else = this.updateInstructionReferences(instruction.else, originalSceneNames, namespace);
        }
      }
      
      return updated;
    });
  }

  /**
   * Merge base scenes with DLC scenes based on mode
   */
  private mergeScenes(
    baseScenes: ParsedScene[], 
    dlcScenes: ParsedScene[], 
    options: ScriptUpgradeOptions
  ): ParsedScene[] {
    if (options.mode === 'additive') {
      // Simple addition - all DLC scenes are new
      return [...baseScenes, ...dlcScenes];
    } else {
      // Replace mode - replace allowed scenes, add new ones
      const dlcSceneNames = new Set(dlcScenes.map(s => s.name));
      const allowOverwrite = new Set(options.allowOverwrite || []);
      
      // Filter out base scenes that will be replaced
      const filteredBaseScenes = baseScenes.filter(scene => 
        !dlcSceneNames.has(scene.name) || !allowOverwrite.has(scene.name)
      );
      
      return [...filteredBaseScenes, ...dlcScenes];
    }
  }

  /**
   * Get list of scenes that would be added
   */
  private getAddedScenes(
    baseScenes: ParsedScene[], 
    dlcScenes: ParsedScene[], 
    options: ScriptUpgradeOptions
  ): string[] {
    const baseSceneNames = new Set(baseScenes.map(s => s.name));
    
    if (options.mode === 'additive') {
      return dlcScenes.map(s => s.name);
    } else {
      return dlcScenes
        .filter(scene => !baseSceneNames.has(scene.name))
        .map(s => s.name);
    }
  }

  /**
   * Get list of scenes that would be replaced
   */
  private getReplacedScenes(baseScenes: ParsedScene[], dlcScenes: ParsedScene[]): string[] {
    const baseSceneNames = new Set(baseScenes.map(s => s.name));
    
    return dlcScenes
      .filter(scene => baseSceneNames.has(scene.name))
      .map(s => s.name);
  }
}