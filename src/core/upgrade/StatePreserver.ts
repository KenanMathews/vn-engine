import type { ParsedScene, ScriptResult } from '../../types';
import type { BackupData } from '../../types/upgrade';
import type { GameStateManager } from '../state';
import type { ScriptEngine } from '../script';

export class StatePreserver {
  constructor(
    private gameState: GameStateManager,
    private scriptEngine: ScriptEngine
  ) {}

  /**
   * Create a complete backup of current state
   */
  backup(scenes: ParsedScene[]): BackupData {
    return {
      scenes: this.deepCloneScenes(scenes),
      currentScene: this.gameState.getCurrentScene(),
      currentInstruction: this.gameState.getCurrentInstruction(),
      gameState: this.gameState.serialize(),
      timestamp: Date.now()
    };
  }

  /**
   * Restore state from backup data
   */
  restore(backup: BackupData): void {
    try {
      this.scriptEngine.loadScenes(backup.scenes);
      
      this.gameState.deserialize(backup.gameState);
      
      this.gameState.setCurrentScene(backup.currentScene);
      this.gameState.setCurrentInstruction(backup.currentInstruction);
      
    } catch (error) {
      console.error('Failed to restore state from backup:', error);
      throw new Error(`State restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that current execution position is still valid in new scenes
   */
  validateCurrentPosition(newScenes: ParsedScene[]): { valid: boolean; reason?: string } {
    const currentScene = this.gameState.getCurrentScene();
    const currentInstruction = this.gameState.getCurrentInstruction();
    
    if (!currentScene) {
      return { valid: true };
    }
    
    const scene = newScenes.find(s => s.name === currentScene);
    if (!scene) {
      return { 
        valid: false, 
        reason: `Current scene '${currentScene}' no longer exists` 
      };
    }
    
    if (currentInstruction >= scene.instructions.length) {
      return { 
        valid: false, 
        reason: `Current instruction index ${currentInstruction} exceeds scene length ${scene.instructions.length}` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Attempt to restore execution state after upgrade
   */
  restoreExecutionState(newScenes: ParsedScene[]): { success: boolean; message?: string } {
    const validation = this.validateCurrentPosition(newScenes);
    
    if (!validation.valid) {
      return { 
        success: false, 
        message: validation.reason 
      };
    }
    
    try {
      this.scriptEngine.loadScenes(newScenes);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to load new scenes: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if a backup is valid and can be restored
   */
  validateBackup(backup: BackupData): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!backup.scenes || !Array.isArray(backup.scenes)) {
      issues.push('Backup scenes are missing or invalid');
    }
    
    if (!backup.gameState) {
      issues.push('Backup game state is missing');
    }
    
    if (typeof backup.currentScene !== 'string') {
      issues.push('Backup current scene is invalid');
    }
    
    if (typeof backup.currentInstruction !== 'number') {
      issues.push('Backup current instruction is invalid');
    }
    
    if (!backup.timestamp || typeof backup.timestamp !== 'number') {
      issues.push('Backup timestamp is missing or invalid');
    }
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (backup.timestamp < oneHourAgo) {
      issues.push('Backup is older than 1 hour and may be stale');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get current execution context for debugging
   */
  getCurrentContext(): {
    scene: string;
    instruction: number;
    hasState: boolean;
    stateSize: number;
  } {
    const gameState = this.gameState.getState();
    
    return {
      scene: gameState.currentScene,
      instruction: gameState.currentInstruction,
      hasState: gameState.variables.size > 0 || gameState.storyFlags.size > 0,
      stateSize: gameState.variables.size + gameState.storyFlags.size + gameState.choiceHistory.length
    };
  }

  /**
   * Deep clone scenes to ensure backup integrity
   */
  private deepCloneScenes(scenes: ParsedScene[]): ParsedScene[] {
    try {
      return JSON.parse(JSON.stringify(scenes));
    } catch (error) {
      console.error('Failed to clone scenes, using shallow copy:', error);
      return scenes.map(scene => ({ ...scene }));
    }
  }

  /**
   * Create a minimal backup for quick rollback
   */
  createQuickBackup(): {
    currentScene: string;
    currentInstruction: number;
    timestamp: number;
  } {
    return {
      currentScene: this.gameState.getCurrentScene(),
      currentInstruction: this.gameState.getCurrentInstruction(),
      timestamp: Date.now()
    };
  }

  /**
   * Restore from quick backup (position only, not full state)
   */
  restoreQuickBackup(backup: {
    currentScene: string;
    currentInstruction: number;
  }): void {
    this.gameState.setCurrentScene(backup.currentScene);
    this.gameState.setCurrentInstruction(backup.currentInstruction);
  }
}
