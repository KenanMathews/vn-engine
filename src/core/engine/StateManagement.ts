// core/engine/StateManagement.ts

import type { GameStateManager } from '../state';
import type { SerializableGameState } from '../../types';

export interface SaveData {
  gameState: SerializableGameState;
  timestamp: number;
  version: string;
  metadata?: {
    currentScene?: string;
    playtime?: number;
    saveSlot?: string | number;
  };
}

export class StateManagement {
  constructor(private gameState: GameStateManager) {}

  getGameState(): SerializableGameState {
    return this.gameState.serialize();
  }

  setGameState(state: SerializableGameState): void {
    this.gameState.deserialize(state);
  }

  exportForSave(metadata?: SaveData['metadata']): SaveData {
    return {
      gameState: this.getGameState(),
      timestamp: Date.now(),
      version: '1.0.0',
      metadata: {
        currentScene: this.gameState.getCurrentScene(),
        playtime: this.gameState.getCurrentTime(),
        ...metadata
      }
    };
  }

  importFromSave(saveData: SaveData): void {
    if (saveData.gameState) {
      this.setGameState(saveData.gameState);
    }
  }

  validateSaveData(saveData: any): saveData is SaveData {
    return (
      saveData &&
      typeof saveData === 'object' &&
      saveData.gameState &&
      typeof saveData.timestamp === 'number' &&
      typeof saveData.version === 'string'
    );
  }

  // Quick access methods for common state operations
  getCurrentScene(): string {
    return this.gameState.getCurrentScene();
  }

  hasFlag(flag: string): boolean {
    return this.gameState.hasStoryFlag(flag);
  }

  getVariable(key: string): any {
    return this.gameState.getVariable(key);
  }

  getChoiceHistory() {
    return this.gameState.getChoiceHistory();
  }
}