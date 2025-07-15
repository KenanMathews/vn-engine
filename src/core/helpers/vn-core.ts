import type { ChoiceRecord, RenderableState } from '../../types';
import type { GameStateManager } from '../state';

export interface VNHelpers {
  hasFlag(flagName: string, context: RenderableState): boolean;
  addFlag(flagName: string, context: RenderableState): void;
  removeFlag(flagName: string, context: RenderableState): void;
  toggleFlag(flagName: string, context: RenderableState): boolean;
  
  getVar(key: string, defaultValue?: any, context?: RenderableState): any;
  setVar(key: string, value: any, context: RenderableState): void;
  hasVar(key: string, context: RenderableState): boolean;
  incrementVar(key: string, amount: number, context: RenderableState): number;
  
  playerChose(choiceText: string, inScene?: string, context?: RenderableState): boolean;
  getLastChoice(context: RenderableState): ChoiceRecord | undefined;
  choiceCount(context: RenderableState): number;
  
  formatTime(minutes: number): string;
  randomBool(probability?: number): boolean;
  
  exportFlags(context: RenderableState): string[];
  exportVariables(context: RenderableState): Record<string, any>;
}

let gameStateManager: GameStateManager | null = null;

export function setGameStateManager(gsm: GameStateManager): void {
  gameStateManager = gsm;
}

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path || typeof path !== 'string') return undefined;
  
  return path.split('.').reduce((current, key) => {
    return (current != null && typeof current === 'object' && key in current) 
      ? current[key] 
      : undefined;
  }, obj);
}

export function setNestedValue(obj: any, path: string, value: any): void {
  if (!obj || !path || typeof path !== 'string') return;
  
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    
    if (current[key] == null || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[parts[parts.length - 1]] = value;
}

function safeNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  const num = Number(value);
  return (isNaN(num) || !isFinite(num)) ? fallback : num;
}

function safeString(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return '';
  }
}

export const vnHelpers: VNHelpers = {
  hasFlag(flagName: string, context: RenderableState): boolean {
    if (!flagName || typeof flagName !== 'string') return false;
    
    if (gameStateManager) {
      return gameStateManager.hasStoryFlag(flagName);
    }
    
    return Array.isArray(context.storyFlags) && context.storyFlags.includes(flagName);
  },

  addFlag(flagName: string, context: RenderableState): void {
    if (!flagName || typeof flagName !== 'string') return;
    
    if (gameStateManager) {
      gameStateManager.setStoryFlag(flagName);
    }
    
    if (!Array.isArray(context.storyFlags)) {
      context.storyFlags = [];
    }
    
    if (!context.storyFlags.includes(flagName)) {
      context.storyFlags.push(flagName);
    }
  },

  removeFlag(flagName: string, context: RenderableState): void {
    if (!flagName || typeof flagName !== 'string') return;
    
    if (gameStateManager) {
      gameStateManager.clearStoryFlag(flagName);
    }
    
    if (!Array.isArray(context.storyFlags)) return;
    
    const index = context.storyFlags.indexOf(flagName);
    if (index > -1) {
      context.storyFlags.splice(index, 1);
    }
  },

  toggleFlag(flagName: string, context: RenderableState): boolean {
    if (!flagName || typeof flagName !== 'string') return false;
    
    if (vnHelpers.hasFlag(flagName, context)) {
      vnHelpers.removeFlag(flagName, context);
      return false;
    } else {
      vnHelpers.addFlag(flagName, context);
      return true;
    }
  },

  getVar(key: string, defaultValue: any = undefined, context?: RenderableState): any {
    if (!key || typeof key !== 'string') {
      return defaultValue;
    }
    
    if (gameStateManager) {
      const value = gameStateManager.getVariable(key);
      if (value !== undefined) {
        return value;
      }
    }
    
    if (context?.variables) {
      const value = getNestedValue(context.variables, key);
      return value !== undefined ? value : defaultValue;
    }
    
    return defaultValue;
  },

  setVar(key: string, value: any, context: RenderableState): void {
    if (!key || typeof key !== 'string' || !context) return;
    
    if (gameStateManager) {
      gameStateManager.setVariable(key, value);
    }
    
    if (!context.variables || typeof context.variables !== 'object') {
      context.variables = {};
    }
    
    setNestedValue(context.variables, key, value);
  },

  hasVar(key: string, context: RenderableState): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    if (gameStateManager) {
      return gameStateManager.getVariable(key) !== undefined;
    }
    
    if (context?.variables) {
      return getNestedValue(context.variables, key) !== undefined;
    }
    
    return false;
  },

  incrementVar(key: string, amount: number, context: RenderableState): number {
    if (!key || typeof key !== 'string' || !context) {
      return 0;
    }
    
    const currentValue = safeNumber(vnHelpers.getVar(key, 0, context));
    const incrementAmount = safeNumber(amount);
    const newValue = currentValue + incrementAmount;
    
    vnHelpers.setVar(key, newValue, context);
    
    return newValue;
  },

  playerChose(choiceText: string, inScene?: string, context?: RenderableState): boolean {
    if (!choiceText || typeof choiceText !== 'string') {
      return false;
    }
    
    if (gameStateManager) {
      return gameStateManager.playerChose(choiceText, inScene);
    }
    
    if (context?.choiceHistory && Array.isArray(context.choiceHistory)) {
      return context.choiceHistory.some(choice => {
        if (!choice || typeof choice !== 'object') return false;
        
        const textMatches = choice.choiceText === choiceText;
        const sceneMatches = !inScene || choice.scene === inScene;
        return textMatches && sceneMatches;
      });
    }
    
    return false;
  },

  getLastChoice(context: RenderableState): ChoiceRecord | undefined {
    if (gameStateManager) {
      const choiceHistory = gameStateManager.getChoiceHistory();
      if (choiceHistory.length > 0) {
        return choiceHistory[choiceHistory.length - 1];
      }
    }
    
    if (context?.choiceHistory && Array.isArray(context.choiceHistory) && context.choiceHistory.length > 0) {
      return context.choiceHistory[context.choiceHistory.length - 1];
    }
    
    return undefined;
  },

  choiceCount(context: RenderableState): number {
    if (gameStateManager) {
      return gameStateManager.getChoiceHistory().length;
    }
    
    if (context?.choiceHistory && Array.isArray(context.choiceHistory)) {
      return context.choiceHistory.length;
    }
    
    return 0;
  },

  formatTime(minutes: number): string {
    const totalMinutes = Math.floor(safeNumber(minutes));
    
    if (totalMinutes < 0) return '0m';
    if (totalMinutes < 60) return `${totalMinutes}m`;
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },

  randomBool(probability: number = 0.5): boolean {
    const prob = safeNumber(probability, 0.5);
    const clampedProb = Math.max(0, Math.min(1, prob));
    return Math.random() < clampedProb;
  },

  exportFlags(context: RenderableState): string[] {
    if (gameStateManager) {
      const state = gameStateManager.getState();
      return Array.from(state.storyFlags);
    }
    
    if (context?.storyFlags && Array.isArray(context.storyFlags)) {
      return context.storyFlags.filter(flag => typeof flag === 'string' && flag.length > 0);
    }
    
    return [];
  },

  exportVariables(context: RenderableState): Record<string, any> {
    if (gameStateManager) {
      const state = gameStateManager.getState();
      return Object.fromEntries(state.variables.entries());
    }
    
    if (context?.variables && typeof context.variables === 'object') {
      try {
        return JSON.parse(JSON.stringify(context.variables));
      } catch {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(context.variables)) {
          try {
            JSON.stringify(value);
            result[key] = value;
          } catch {
            result[key] = '[Non-serializable value]';
          }
        }
        return result;
      }
    }
    
    return {};
  }
};

export function registerVNHelpers(handlebars: any) {
  if (!handlebars || typeof handlebars.registerHelper !== 'function') {
    console.warn('Invalid Handlebars instance provided to registerVNHelpers');
    return;
  }

  try {
    handlebars.registerHelper('setVar', function(key: string, value: any, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (context) {
          vnHelpers.setVar(key, value, context);
        }
        return ''; 
      } catch (error) {
        console.warn('Error in setVar helper:', error);
        return '';
      }
    });

    handlebars.registerHelper('getVar', function(key: string, defaultValue: any, options: any) {
      try {
        if (typeof defaultValue === 'object' && defaultValue?.fn) {
          options = defaultValue;
          defaultValue = '';
        }
        
        const context = options?.data?.root as RenderableState;
        const value = vnHelpers.getVar(key, defaultValue, context);
        
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return value;
        }
        
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        
        if (typeof value === 'object' && value !== null) {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }
        
        return String(value);
        
      } catch (error) {
        console.warn('Error in getVar helper:', error);
        return defaultValue || '';
      }
    });

    handlebars.registerHelper('hasVar', function(key: string, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        const result = vnHelpers.hasVar(key, context);
        return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
      } catch (error) {
        console.warn('Error in hasVar helper:', error);
        return false;
      }
    });

    handlebars.registerHelper('hasFlag', function(flagName: string, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        const result = vnHelpers.hasFlag(flagName, context);
        return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
      } catch (error) {
        console.warn('Error in hasFlag helper:', error);
        return false;
      }
    });

    handlebars.registerHelper('addFlag', function(flagName: string, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (context) {
          vnHelpers.addFlag(flagName, context);
        }
        return '';
      } catch (error) {
        console.warn('Error in addFlag helper:', error);
        return '';
      }
    });

    handlebars.registerHelper('removeFlag', function(flagName: string, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (context) {
          vnHelpers.removeFlag(flagName, context);
        }
        return '';
      } catch (error) {
        console.warn('Error in removeFlag helper:', error);
        return '';
      }
    });

    handlebars.registerHelper('toggleFlag', function(flagName: string, options: any) {
      try {
          const context = options?.data?.root as RenderableState;
          if (!context) return false;
          
          const result = vnHelpers.toggleFlag(flagName, context);
          return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
        } catch (error) {
          console.warn('Error in toggleFlag helper:', error);
          return false;
        }
    });

    handlebars.registerHelper('incrementVar', function(key: string, amount: any, options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (!context) return 0;
        
        const newValue = vnHelpers.incrementVar(key, amount, context);
        return newValue;
      } catch (error) {
        console.warn('Error in incrementVar helper:', error);
        return 0;
      }
    });

    handlebars.registerHelper('playerChose', function(...args: any[]) {
      try {
        const options = args[args.length - 1];
        const choiceText = args[0];
        const inScene = args.length > 2 ? args[1] : undefined;
        const context = options?.data?.root as RenderableState;
        
        if (!context) return false;
        
        const result = vnHelpers.playerChose(choiceText, inScene, context);
        return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
      } catch (error) {
        console.warn('Error in playerChose helper:', error);
        return false;
      }
    });

    handlebars.registerHelper('getLastChoice', function(options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (!context) return undefined;
        
        return vnHelpers.getLastChoice(context);
      } catch (error) {
        console.warn('Error in getLastChoice helper:', error);
        return undefined;
      }
    });

    handlebars.registerHelper('choiceCount', function(options: any) {
      try {
        const context = options?.data?.root as RenderableState;
        if (!context) return 0;
        
        return vnHelpers.choiceCount(context);
      } catch (error) {
        console.warn('Error in choiceCount helper:', error);
        return 0;
      }
    });

    handlebars.registerHelper('formatTime', (minutes: any) => {
      try {
        return vnHelpers.formatTime(minutes);
      } catch (error) {
        console.warn('Error in formatTime helper:', error);
        return '0m';
      }
    });

    handlebars.registerHelper('randomBool', function(this: any, probability: any, options: any) {
      try {
        if (typeof probability === 'object' && probability?.fn) {
          options = probability;
          probability = 0.5;
        }
        
        const result = vnHelpers.randomBool(probability);
        return options?.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
      } catch (error) {
        console.warn('Error in randomBool helper:', error);
        return false;
      }
    });

    handlebars.registerHelper('debug', function(value: any, label?: string, options?: any) {
      try {
        if (label && typeof label === 'object' && 'fn' in label) {
          options = label;
          label = 'DEBUG';
        }
        
        const safeLabel = safeString(label || 'DEBUG');
        console.log(`🐛 ${safeLabel}:`, value);
        
        if (value && typeof value === 'object') {
          console.log('   Type:', Array.isArray(value) ? 'Array' : 'Object');
          
          if (Array.isArray(value)) {
            console.log('   Length:', value.length);
          } else {
            try {
              console.log('   Keys:', Object.keys(value));
            } catch {
              console.log('   Keys: [Unable to enumerate]');
            }
          }
        }
        
        return '';
      } catch (error) {
        console.warn('Error in debug helper:', error);
        return '';
      }
    });

    handlebars.registerHelper('timestamp', () => {
      try {
        return Date.now();
      } catch (error) {
        console.warn('Error in timestamp helper:', error);
        return 0;
      }
    });

    handlebars.registerHelper('currentDate', () => {
      try {
        return new Date().toLocaleDateString();
      } catch (error) {
        console.warn('Error in currentDate helper:', error);
        return '';
      }
    });

    handlebars.registerHelper('currentTime', () => {
      try {
        return new Date().toLocaleTimeString();
      } catch (error) {
        console.warn('Error in currentTime helper:', error);
        return '';
      }
    });

  } catch (error) {
    console.error('Failed to register VN helpers:', error);
  }
}