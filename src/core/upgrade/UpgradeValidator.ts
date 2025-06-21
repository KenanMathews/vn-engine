import type { ParsedScene, ScriptInstruction, JumpInstruction, DialogueInstruction, ConditionalInstruction } from '../../types';
import type { 
  ScriptUpgradeOptions, 
  ConflictResult, 
  ReferenceValidationResult, 
  UpgradeError 
} from '../../types/upgrade';
import type { GameStateManager } from '../state';

export class UpgradeValidator {
  constructor(private gameState?: GameStateManager) {}

  /**
   * Validate scene name conflicts between base and DLC content
   */
  validateSceneConflicts(
    baseScenes: ParsedScene[], 
    dlcScenes: ParsedScene[], 
    options: ScriptUpgradeOptions
  ): ConflictResult {
    const baseSceneNames = new Set(baseScenes.map(scene => scene.name));
    const dlcSceneNames = dlcScenes.map(scene => scene.name);
    const allowOverwrite = new Set(options.allowOverwrite || []);
    
    const conflicts = dlcSceneNames.filter(name => baseSceneNames.has(name));
    
    const unauthorizedOverwrites = options.mode === 'replace' 
      ? conflicts.filter(name => !allowOverwrite.has(name))
      : conflicts;
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      unauthorizedOverwrites
    };
  }

  /**
   * Validate that all scene references (goto targets) exist
   */
  validateSceneReferences(scenes: ParsedScene[]): ReferenceValidationResult {
    const sceneNames = new Set(scenes.map(scene => scene.name));
    const invalidJumpTargets: string[] = [];
    const invalidChoiceTargets: string[] = [];
    const affectedScenes: string[] = [];
    
    for (const scene of scenes) {
      const sceneIssues = this.validateSceneInstructions(scene.instructions, sceneNames);
      
      if (sceneIssues.invalidJumps.length > 0 || sceneIssues.invalidChoices.length > 0) {
        affectedScenes.push(scene.name);
        invalidJumpTargets.push(...sceneIssues.invalidJumps);
        invalidChoiceTargets.push(...sceneIssues.invalidChoices);
      }
    }
    
    return {
      valid: invalidJumpTargets.length === 0 && invalidChoiceTargets.length === 0,
      invalidJumpTargets: [...new Set(invalidJumpTargets)],
      invalidChoiceTargets: [...new Set(invalidChoiceTargets)],
      affectedScenes: [...new Set(affectedScenes)]
    };
  }

  /**
   * Validate that current game state will remain valid after upgrade
   */
  validateCurrentState(newScenes: ParsedScene[]): { valid: boolean; issues: string[] } {
    if (!this.gameState) {
      return { valid: true, issues: [] };
    }

    const issues: string[] = [];
    const sceneNames = new Set(newScenes.map(scene => scene.name));
    
    const currentScene = this.gameState.getCurrentScene();
    if (currentScene && !sceneNames.has(currentScene)) {
      issues.push(`Current scene '${currentScene}' will no longer exist after upgrade`);
    }
    
    if (currentScene && sceneNames.has(currentScene)) {
      const scene = newScenes.find(s => s.name === currentScene);
      const currentInstruction = this.gameState.getCurrentInstruction();
      
      if (scene && currentInstruction >= scene.instructions.length) {
        issues.push(`Current instruction index ${currentInstruction} exceeds new scene length ${scene.instructions.length}`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Create a comprehensive upgrade error from validation results
   */
  createUpgradeError(
    conflicts: ConflictResult,
    references: ReferenceValidationResult,
    stateValidation: { valid: boolean; issues: string[] }
  ): UpgradeError | null {
    const errors: string[] = [];
    const details: UpgradeError['details'] = {};
    
    if (conflicts.unauthorizedOverwrites.length > 0) {
      errors.push(`Cannot overwrite scenes: ${conflicts.unauthorizedOverwrites.join(', ')}`);
      details.unauthorizedOverwrites = conflicts.unauthorizedOverwrites;
    }
    
    if (!references.valid) {
      if (references.invalidJumpTargets.length > 0) {
        errors.push(`Invalid jump targets: ${references.invalidJumpTargets.join(', ')}`);
        details.invalidReferences = references.invalidJumpTargets;
      }
      if (references.invalidChoiceTargets.length > 0) {
        errors.push(`Invalid choice targets: ${references.invalidChoiceTargets.join(', ')}`);
        details.invalidReferences = [
          ...(details.invalidReferences || []),
          ...references.invalidChoiceTargets
        ];
      }
    }
    
    if (!stateValidation.valid) {
      errors.push(`Current game state would become invalid: ${stateValidation.issues.join(', ')}`);
      details.affectedState = stateValidation.issues;
    }
    
    if (errors.length === 0) {
      return null;
    }
    
    let code: UpgradeError['code'] = 'SCENE_CONFLICT';
    if (details.unauthorizedOverwrites?.length) {
      code = 'UNAUTHORIZED_OVERWRITE';
    } else if (details.invalidReferences?.length) {
      code = 'INVALID_REFERENCE';
    } else if (details.affectedState?.length) {
      code = 'STATE_INVALID';
    }
    
    return {
      code,
      message: errors.join('; '),
      details
    };
  }

  /**
   * Validate instructions within a scene for reference issues
   */
  private validateSceneInstructions(
    instructions: ScriptInstruction[], 
    validSceneNames: Set<string>
  ): { invalidJumps: string[]; invalidChoices: string[] } {
    const invalidJumps: string[] = [];
    const invalidChoices: string[] = [];
    
    for (const instruction of instructions) {
      switch (instruction.type) {
        case 'jump':
          const jumpInstr = instruction as JumpInstruction;
          if (!validSceneNames.has(jumpInstr.target)) {
            invalidJumps.push(jumpInstr.target);
          }
          break;
          
        case 'dialogue':
          const dialogueInstr = instruction as DialogueInstruction;
          if (dialogueInstr.choices) {
            for (const choice of dialogueInstr.choices) {
              if (choice.goto && !validSceneNames.has(choice.goto)) {
                invalidChoices.push(choice.goto);
              }
            }
          }
          break;
          
        case 'conditional':
          const conditionalInstr = instruction as ConditionalInstruction;
          if (conditionalInstr.then) {
            const thenResults = this.validateSceneInstructions(conditionalInstr.then, validSceneNames);
            invalidJumps.push(...thenResults.invalidJumps);
            invalidChoices.push(...thenResults.invalidChoices);
          }
          if (conditionalInstr.else) {
            const elseResults = this.validateSceneInstructions(conditionalInstr.else, validSceneNames);
            invalidJumps.push(...elseResults.invalidJumps);
            invalidChoices.push(...elseResults.invalidChoices);
          }
          break;
      }
    }
    
    return { invalidJumps, invalidChoices };
  }

  /**
   * Generate warnings for potential issues that aren't errors
   */
  generateWarnings(
    baseScenes: ParsedScene[],
    dlcScenes: ParsedScene[],
    options: ScriptUpgradeOptions
  ): string[] {
    const warnings: string[] = [];
    
    if (options.namespace) {
      const namespacedNames = dlcScenes.map(scene => `${options.namespace}_${scene.name}`);
      const baseNames = new Set(baseScenes.map(scene => scene.name));
      
      const stillConflicting = namespacedNames.filter(name => baseNames.has(name));
      if (stillConflicting.length > 0) {
        warnings.push(`Namespaced scenes still conflict with existing scenes: ${stillConflicting.join(', ')}`);
      }
    }
    
    if (dlcScenes.length > 50) {
      warnings.push(`Adding ${dlcScenes.length} scenes - this is a large upgrade`);
    }
    
    const totalScenes = baseScenes.length + dlcScenes.length;
    if (totalScenes > 200) {
      warnings.push(`Total scenes after upgrade: ${totalScenes} - consider performance impact`);
    }
    
    return warnings;
  }
}
