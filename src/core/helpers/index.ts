
import { arrayHelpers, registerArrayHelpers, type ArrayHelpers } from './array';
import { comparisonHelpers, registerComparisonHelpers, type ComparisonHelpers } from './comparison';
import { mathHelpers, registerMathHelpers, type MathHelpers } from './math';
import { stringHelpers, registerStringHelpers, type StringHelpers } from './string';
import { vnHelpers, registerVNHelpers, type VNHelpers, getNestedValue, setNestedValue } from './vn-core';

export interface VNEngineHelpers {
  array: ArrayHelpers;
  comparison: ComparisonHelpers;
  math: MathHelpers;
  string: StringHelpers;
  vn: VNHelpers;
}

export const helpers: VNEngineHelpers = {
  array: arrayHelpers,
  comparison: comparisonHelpers,
  math: mathHelpers,
  string: stringHelpers,
  vn: vnHelpers
};

function isHandlebarsAvailable(): boolean {
  try {
    return typeof window !== 'undefined' ? 
      !!(window as any).Handlebars : 
      typeof require !== 'undefined';
  } catch {
    return false;
  }
}

export function registerAllHelpers(handlebars: any): void {
  if (!handlebars || typeof handlebars.registerHelper !== 'function') {
    console.warn('⚠️ Invalid Handlebars instance provided to registerAllHelpers');
    return;
  }
  
  try {
    registerArrayHelpers(handlebars);    
    registerComparisonHelpers(handlebars);    
    registerMathHelpers(handlebars);    
    registerStringHelpers(handlebars);    
    registerVNHelpers(handlebars);    
  } catch (error) {
    console.error('❌ Error registering VN Engine helpers:', error);
    throw error;
  }
}

export function safeRegisterHelpers(handlebars?: any): {
  registered: boolean;
  engine: 'handlebars' | 'simple';
  message: string;
} {
  if (handlebars && typeof handlebars.registerHelper === 'function') {
    try {
      registerAllHelpers(handlebars);
      return {
        registered: true,
        engine: 'handlebars',
        message: 'All helpers registered with Handlebars'
      };
    } catch (error) {
      return {
        registered: false,
        engine: 'handlebars',
        message: `Failed to register helpers: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  } else {
    return {
      registered: false,
      engine: 'simple',
      message: 'Handlebars not available - using simple template engine without helpers'
    };
  }
}

export function getAvailableHelpers(): {
  handlebarsRequired: string[];
  standalone: string[];
  description: string;
} {
  return {
    handlebarsRequired: [
      'first', 'last', 'length', 'includes', 'isEmpty', 'where', 'pluck', 'join', 
      'groupBy', 'chunk', 'unique', 'shuffle', 'slice', 'take', 'sample', 'flatten',
      'reverse', 'compact', 'without', 'randomChoice', 'weightedChoice', 'array', 'range', 'times',
      
      'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'and', 'or', 'not', 'contains', 'isEmpty',
      'compare', 'between', 'ifx', 'ternary', 'coalesce', 'default',
      
      'add', 'subtract', 'multiply', 'divide', 'mod', 'abs', 'min', 'max', 'round',
      'ceil', 'floor', 'random', 'randomInt', 'clamp', 'sum', 'average', 'percentage',
      'statCheck', 'rollDice', 'lerp', 'normalize', 'formatNumber',
      
      'uppercase', 'lowercase', 'capitalize', 'titleCase', 'trim', 'truncate', 'replace',
      'repeat', 'padStart', 'padEnd', 'center', 'substring', 'words', 'wordCount', 'slugify',
      'typewriter', 'nameTag', 'dialogueFormat', 'parseMarkdown', 'colorText',
      
      'hasFlag', 'getVar', 'setVar', 'hasVar', 'playerChose', 'formatTime', 'randomBool', 'debug'
    ],
    standalone: [
      'All helper functions are available as JavaScript functions in the helpers object',
      'Use helpers.array.first(), helpers.math.add(), helpers.string.capitalize(), etc.'
    ],
    description: 'When Handlebars is not available, all helper functions can still be used directly from the helpers object in JavaScript code.'
  };
}

export {
  arrayHelpers,
  comparisonHelpers,
  mathHelpers,
  stringHelpers,
  vnHelpers,
  registerArrayHelpers,
  registerComparisonHelpers,
  registerMathHelpers,
  registerStringHelpers,
  registerVNHelpers,
  getNestedValue,
  setNestedValue
};

export type {
  ArrayHelpers,
  ComparisonHelpers,
  MathHelpers,
  StringHelpers,
  VNHelpers
};
