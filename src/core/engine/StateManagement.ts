export interface SaveData {
  gameState: any;
  timestamp: string;
  version: string;
  metadata?: {
    playerName?: string;
    playtime?: number;
    checkpoint?: string;
    custom?: Record<string, any>;
  };
}

export class StateManagement {
  constructor(private gameState: any) {}

  getGameState() {
    const state = this.gameState.getState();
    
    return {
      variables: state.variables,
      storyFlags: Array.from(state.storyFlags),
      choiceHistory: state.choiceHistory,
      currentScene: state.currentScene,
      currentInstruction: state.currentInstruction,
      schemaVersion: '1.0.0',
      saveDate: new Date().toISOString()
    };
  }

  setGameState(state: any): void {
    try {
      if (state.variables && state.storyFlags && state.choiceHistory !== undefined) {
        const serializableState = {
          currentScene: state.currentScene || '',
          currentInstruction: state.currentInstruction || 0,
          variables: state.variables instanceof Map ? 
            Array.from(state.variables.entries()) : 
            Array.isArray(state.variables) ? state.variables : Object.entries(state.variables || {}),
          storyFlags: Array.isArray(state.storyFlags) ? state.storyFlags : [],
          choiceHistory: Array.isArray(state.choiceHistory) ? state.choiceHistory : [],
          schemaVersion: '1.0.0',
          saveDate: new Date().toISOString()
        };
        
        this.gameState.deserialize(serializableState);
      }
    } catch (error) {
      console.error('Error setting game state:', error);
    }
  }

  getCurrentScene(): string {
    return this.gameState.getCurrentScene();
  }

  getCurrentInstruction(): number {
    return this.gameState.getCurrentInstruction();
  }

  hasFlag(flag: string): boolean {
    return this.gameState.hasStoryFlag(flag);
  }

  getVariable(key: string): any {
    return this.gameState.getVariable(key);
  }

  setVariable(key: string, value: any): void {
    this.gameState.setVariable(key, value);
  }

  getChoiceHistory() {
    return this.gameState.getChoiceHistory();
  }

  exportForSave(metadata?: SaveData['metadata']): SaveData {
    const gameState = this.getGameState();
    
    return {
      gameState: {
        ...gameState,
        variables: gameState.variables instanceof Map ? 
          Array.from(gameState.variables.entries()) : 
          gameState.variables
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metadata: metadata || {}
    };
  }

  importFromSave(saveData: SaveData): boolean {
    try {
      if (!this.validateSaveData(saveData)) {
        return false;
      }
      
      this.setGameState(saveData.gameState);
      return true;
    } catch (error) {
      console.error('Error importing save data:', error);
      return false;
    }
  }

  validateSaveData(saveData: any): boolean {
    if (!saveData || typeof saveData !== 'object') {
      return false;
    }
    
    if (!saveData.gameState || typeof saveData.gameState !== 'object') {
      return false;
    }
    
    if (!saveData.timestamp || typeof saveData.timestamp !== 'string') {
      return false;
    }
    
    if (!saveData.version || typeof saveData.version !== 'string') {
      return false;
    }
    
    return true;
  }

  createCheckpoint(name: string): SaveData {
    return this.exportForSave({
      checkpoint: name,
      playtime: Date.now()
    });
  }

  reset(): void {
    this.gameState.reset();
  }

  getStateSize(): number {
    const state = this.getGameState();
    return JSON.stringify(state).length;
  }

  getVariableCount(): number {
    const state = this.gameState.getState();
    return state.variables ? state.variables.size : 0;
  }

  getFlagCount(): number {
    const state = this.gameState.getState();
    return state.storyFlags ? state.storyFlags.size : 0;
  }
}