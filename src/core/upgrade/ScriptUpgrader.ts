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
    const upgradeOptions: Required<ScriptUpgradeOptions> = {
      mode: 'additive',
      namespace: '',
      allowOverwrite: [],
      validateState: true,
      dryRun: false,
      ...options
    };

    try {
      const dlcScenes = this.parseDLCContent(dlcContent);
      
      const namespacedDlcScenes = upgradeOptions.namespace 
        ? this.applyNamespace(dlcScenes, upgradeOptions.namespace)
        : dlcScenes;

      const validation = this.validateUpgrade(currentScenes, namespacedDlcScenes, upgradeOptions);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors[0],
          addedScenes: [],
          replacedScenes: [],
          totalScenes: currentScenes.length,
          warnings: validation.warnings
        };
      }

      if (upgradeOptions.dryRun) {
        return {
          success: true,
          addedScenes: validation.wouldAddScenes,
          replacedScenes: validation.wouldReplaceScenes,
          totalScenes: currentScenes.length + validation.wouldAddScenes.length,
          warnings: validation.warnings
        };
      }

      const backup = this.statePreserver.backup(currentScenes);

      try {
        const mergedScenes = this.mergeScenes(currentScenes, namespacedDlcScenes, upgradeOptions);
        
        this.scriptEngine.loadScenes(mergedScenes);

        const stateRestoration = this.statePreserver.restoreExecutionState(mergedScenes);
        if (!stateRestoration.success) {
          throw new Error(`Failed to restore execution state: ${stateRestoration.message}`);
        }

        return {
          success: true,
          addedScenes: this.getAddedScenes(currentScenes, namespacedDlcScenes, upgradeOptions),
          replacedScenes: this.getReplacedScenes(currentScenes, namespacedDlcScenes),
          totalScenes: mergedScenes.length,
          warnings: validation.warnings
        };

      } catch (error) {
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
    const conflicts = this.validator.validateSceneConflicts(baseScenes, dlcScenes, options);
    
    const mergedScenes = this.mergeScenes(baseScenes, dlcScenes, options);
    const references = this.validator.validateSceneReferences(mergedScenes);
    
    const stateValidation = options.validateState 
      ? this.validator.validateCurrentState(mergedScenes)
      : { valid: true, issues: [] };

    const warnings = this.validator.generateWarnings(baseScenes, dlcScenes, options);

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
      
      if (instruction.type === 'jump' && originalSceneNames.includes(instruction.target)) {
        updated.target = `${namespace}_${instruction.target}`;
      }
      
      if (instruction.type === 'dialogue' && instruction.choices) {
        updated.choices = instruction.choices.map((choice: any) => ({
          ...choice,
          goto: choice.goto && originalSceneNames.includes(choice.goto) 
            ? `${namespace}_${choice.goto}` 
            : choice.goto
        }));
      }
      
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
      return [...baseScenes, ...dlcScenes];
    } else {
      const dlcSceneNames = new Set(dlcScenes.map(s => s.name));
      const allowOverwrite = new Set(options.allowOverwrite || []);
      
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
