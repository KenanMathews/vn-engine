// src/core/helpers/vn-core.ts
// Essential VN helpers for core visual novel functionality

import type { ChoiceRecord, RenderableState } from '../../types';

export interface VNHelpers {
  // State management
  hasFlag(flagName: string, context: RenderableState): boolean;
  addFlag(flagName: string, context: RenderableState): void;
  removeFlag(flagName: string, context: RenderableState): void;
  toggleFlag(flagName: string, context: RenderableState): boolean;
  
  // Variable management
  getVar(key: string, defaultValue?: any, context?: RenderableState): any;
  setVar(key: string, value: any, context: RenderableState): void;
  hasVar(key: string, context: RenderableState): boolean;
  incrementVar(key: string, amount: number, context: RenderableState): number;
  
  // Choice history
  playerChose(choiceText: string, inScene?: string, context?: RenderableState): boolean;
  getLastChoice(context: RenderableState): ChoiceRecord | undefined;
  choiceCount(context: RenderableState): number;
  
  // Utility functions
  formatTime(minutes: number): string;
  randomBool(probability?: number): boolean;
  
  // Save/load state helpers
  exportFlags(context: RenderableState): string[];
  exportVariables(context: RenderableState): Record<string, any>;
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  if (!obj) return;
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

export const vnHelpers: VNHelpers = {
  // State management
  hasFlag(flagName: string, context: RenderableState): boolean {
    return context.storyFlags?.includes(flagName) || false;
  },

  addFlag(flagName: string, context: RenderableState): void {
    if (!context.storyFlags) context.storyFlags = [];
    if (!context.storyFlags.includes(flagName)) {
      context.storyFlags.push(flagName);
    }
  },

  removeFlag(flagName: string, context: RenderableState): void {
    if (!context.storyFlags) return;
    const index = context.storyFlags.indexOf(flagName);
    if (index > -1) {
      context.storyFlags.splice(index, 1);
    }
  },

  toggleFlag(flagName: string, context: RenderableState): boolean {
    if (vnHelpers.hasFlag(flagName, context)) {
      vnHelpers.removeFlag(flagName, context);
      return false;
    } else {
      vnHelpers.addFlag(flagName, context);
      return true;
    }
  },

  // Variable management
  getVar(key: string, defaultValue: any = undefined, context?: RenderableState): any {
    if (!context?.variables) return defaultValue;
    const value = getNestedValue(context.variables, key);
    return value !== undefined ? value : defaultValue;
  },

  setVar(key: string, value: any, context: RenderableState): void {
    if (!context.variables) context.variables = {};
    setNestedValue(context.variables, key, value);
  },

  hasVar(key: string, context: RenderableState): boolean {
    return getNestedValue(context.variables, key) !== undefined;
  },

  incrementVar(key: string, amount: number, context: RenderableState): number {
    const currentValue = safeNumber(vnHelpers.getVar(key, 0, context));
    const newValue = currentValue + safeNumber(amount);
    vnHelpers.setVar(key, newValue, context);
    return newValue;
  },

  // Choice history
  playerChose(choiceText: string, inScene?: string, context?: RenderableState): boolean {
    if (!context?.choiceHistory) return false;
    return context.choiceHistory.some(choice => {
      const textMatches = choice.choiceText === choiceText;
      const sceneMatches = !inScene || choice.scene === inScene;
      return textMatches && sceneMatches;
    });
  },

  getLastChoice(context: RenderableState): ChoiceRecord | undefined {
    if (!context.choiceHistory || context.choiceHistory.length === 0) return undefined;
    return context.choiceHistory[context.choiceHistory.length - 1];
  },

  choiceCount(context: RenderableState): number {
    return context.choiceHistory?.length || 0;
  },

  // Utility functions
  formatTime(minutes: number): string {
    const totalMinutes = Math.floor(safeNumber(minutes));
    if (totalMinutes < 60) return `${totalMinutes}m`;
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  },

  randomBool(probability: number = 0.5): boolean {
    return Math.random() < Math.max(0, Math.min(1, safeNumber(probability)));
  },

  // Save/load state helpers
  exportFlags(context: RenderableState): string[] {
    return [...(context.storyFlags || [])];
  },

  exportVariables(context: RenderableState): Record<string, any> {
    return JSON.parse(JSON.stringify(context.variables || {}));
  }
};

// Handlebars helper registration function
export function registerVNHelpers(handlebars: any) {
  // State management helpers
  handlebars.registerHelper('hasFlag', function(flagName: string, options: any) {
    const context = options.data.root as RenderableState;
    const result = vnHelpers.hasFlag(flagName, context);
    
    return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
  });

  handlebars.registerHelper('addFlag', function(flagName: string, options: any) {
    const context = options.data.root as RenderableState;
    vnHelpers.addFlag(flagName, context);
    return '';
  });

  handlebars.registerHelper('removeFlag', function(flagName: string, options: any) {
    const context = options.data.root as RenderableState;
    vnHelpers.removeFlag(flagName, context);
    return '';
  });

  handlebars.registerHelper('toggleFlag', function(flagName: string, options: any) {
    const context = options.data.root as RenderableState;
    const result = vnHelpers.toggleFlag(flagName, context);
    return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
  });

  // Variable management helpers
  handlebars.registerHelper('getVar', function(key: string, defaultValue: any, options: any) {
    // Handle case where defaultValue is omitted
    if (typeof defaultValue === 'object' && defaultValue.fn) {
      options = defaultValue;
      defaultValue = undefined;
    }
    const context = options.data.root as RenderableState;
    return vnHelpers.getVar(key, defaultValue, context);
  });

  handlebars.registerHelper('setVar', function(key: string, value: any, options: any) {
    const context = options.data.root as RenderableState;
    vnHelpers.setVar(key, value, context);
    return '';
  });

  handlebars.registerHelper('hasVar', function(key: string, options: any) {
    const context = options.data.root as RenderableState;
    const result = vnHelpers.hasVar(key, context);
    return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
  });

  handlebars.registerHelper('incrementVar', function(key: string, amount: any, options: any) {
    const context = options.data.root as RenderableState;
    return vnHelpers.incrementVar(key, amount, context);
  });

  // Choice history helpers
  handlebars.registerHelper('playerChose', function(...args: any[]) {
    const options = args[args.length - 1];
    const choiceText = args[0];
    const inScene = args.length > 2 ? args[1] : undefined;
    const context = options.data.root as RenderableState;
    const result = vnHelpers.playerChose(choiceText, inScene, context);
    
    return options.fn ? (result ? options.fn(context) : options.inverse(context)) : result;
  });

  handlebars.registerHelper('getLastChoice', function(options: any) {
    const context = options.data.root as RenderableState;
    return vnHelpers.getLastChoice(context);
  });

  handlebars.registerHelper('choiceCount', function(options: any) {
    const context = options.data.root as RenderableState;
    return vnHelpers.choiceCount(context);
  });

  // Utility helpers
  handlebars.registerHelper('formatTime', (minutes: any) => vnHelpers.formatTime(minutes));

  handlebars.registerHelper('randomBool', function(probability: any, options: any) {
    // Handle case where probability is omitted
    if (typeof probability === 'object' && probability.fn) {
      options = probability;
      probability = 0.5;
    }
    const result = vnHelpers.randomBool(probability);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });

  // Debug helper for development
  handlebars.registerHelper('debug', function(value: any, label?: string, options?: any) {
    if (typeof label === 'object') {
      options = label;
      label = 'DEBUG';
    }
    console.log(`🐛 ${label || 'DEBUG'}:`, value);
    if (value && typeof value === 'object') {
      console.log('   Type:', Array.isArray(value) ? 'Array' : 'Object');
      console.log('   Keys/Length:', Array.isArray(value) ? value.length : Object.keys(value));
    }
    return '';
  });

  // Utility helpers
  handlebars.registerHelper('timestamp', () => Date.now());
  handlebars.registerHelper('currentDate', () => new Date().toLocaleDateString());
  handlebars.registerHelper('currentTime', () => new Date().toLocaleTimeString());
}

// Export utility functions for use elsewhere in the VN engine
export { getNestedValue, setNestedValue };