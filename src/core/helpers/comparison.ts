// src/core/helpers/comparison.ts

export interface ComparisonHelpers {
  // Basic comparisons
  eq(a: any, b: any): boolean;
  ne(a: any, b: any): boolean;
  gt(a: any, b: any): boolean;
  gte(a: any, b: any): boolean;
  lt(a: any, b: any): boolean;
  lte(a: any, b: any): boolean;
  
  // Logical operations
  and(...args: any[]): boolean;
  or(...args: any[]): boolean;
  not(value: any): boolean;
  
  // Collection operations
  contains(collection: any, value: any): boolean;
  isEmpty(value: any): boolean;
  
  // Type checking
  isString(value: any): boolean;
  isNumber(value: any): boolean;
  isArray(value: any): boolean;
  isObject(value: any): boolean;
  isBoolean(value: any): boolean;
  
  // Advanced comparisons
  compare(a: any, operator: string, b: any): boolean;
  between(value: number, min: number, max: number): boolean;
  
  // Utility
  ifx(condition: any, truthyValue: any, falsyValue: any): any;
  coalesce(...values: any[]): any;
  defaultTo(value: any, defaultValue: any): any;
}

function isTruthy(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && !isNaN(value);
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return !!value;
}

function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

export const comparisonHelpers: ComparisonHelpers = {
  // Basic comparisons
  eq(a: any, b: any): boolean {
    return a === b;
  },

  ne(a: any, b: any): boolean {
    return a !== b;
  },

  gt(a: any, b: any): boolean {
    return safeNumber(a) > safeNumber(b);
  },

  gte(a: any, b: any): boolean {
    return safeNumber(a) >= safeNumber(b);
  },

  lt(a: any, b: any): boolean {
    return safeNumber(a) < safeNumber(b);
  },

  lte(a: any, b: any): boolean {
    return safeNumber(a) <= safeNumber(b);
  },

  // Logical operations
  and(...args: any[]): boolean {
    return args.every(isTruthy);
  },

  or(...args: any[]): boolean {
    return args.some(isTruthy);
  },

  not(value: any): boolean {
    return !isTruthy(value);
  },

  // Collection operations
  contains(collection: any, value: any): boolean {
    if (Array.isArray(collection)) return collection.includes(value);
    if (typeof collection === 'string') return collection.includes(value);
    if (collection && typeof collection === 'object') return value in collection;
    return false;
  },

  isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  // Type checking
  isString(value: any): boolean {
    return typeof value === 'string';
  },

  isNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
  },

  isArray(value: any): boolean {
    return Array.isArray(value);
  },

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },

  isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  },

  // Advanced comparisons
  compare(a: any, operator: string, b: any): boolean {
    switch (operator) {
      case '==': case 'eq': return a == b;
      case '===': case 'eqStrict': return a === b;
      case '!=': case 'ne': return a != b;
      case '!==': case 'neStrict': return a !== b;
      case '>': case 'gt': return comparisonHelpers.gt(a, b);
      case '>=': case 'gte': return comparisonHelpers.gte(a, b);
      case '<': case 'lt': return comparisonHelpers.lt(a, b);
      case '<=': case 'lte': return comparisonHelpers.lte(a, b);
      case 'contains': return comparisonHelpers.contains(a, b);
      case 'between': return comparisonHelpers.between(a, safeNumber(b), safeNumber(arguments[3]));
      case 'typeof': return typeof a === b;
      default: return false;
    }
  },

  between(value: number, min: number, max: number): boolean {
    const num = safeNumber(value);
    const minNum = safeNumber(min);
    const maxNum = safeNumber(max);
    return num >= minNum && num <= maxNum;
  },

  // Utility
  ifx(condition: any, truthyValue: any, falsyValue: any): any {
    return isTruthy(condition) ? truthyValue : falsyValue;
  },

  coalesce(...values: any[]): any {
    for (const value of values) {
      if (value !== null && value !== undefined) return value;
    }
    return undefined;
  },

  defaultTo(value: any, defaultValue: any): any {
    return (value !== null && value !== undefined && value !== '') ? value : defaultValue;
  }
};

// Block helper utility for handlebars
function createBlockHelper(helperFn: (...args: any[]) => boolean) {
  return function(...args: any[]) {
    const options = args[args.length - 1];
    const result = helperFn(...args.slice(0, -1));
    
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  };
}

// Handlebars helper registration function
export function registerComparisonHelpers(handlebars: any) {
  // Basic comparisons (both inline and block)
  handlebars.registerHelper('eq', createBlockHelper(comparisonHelpers.eq));
  handlebars.registerHelper('ne', createBlockHelper(comparisonHelpers.ne));
  handlebars.registerHelper('gt', createBlockHelper(comparisonHelpers.gt));
  handlebars.registerHelper('gte', createBlockHelper(comparisonHelpers.gte));
  handlebars.registerHelper('lt', createBlockHelper(comparisonHelpers.lt));
  handlebars.registerHelper('lte', createBlockHelper(comparisonHelpers.lte));
  
  // Logical operations
  handlebars.registerHelper('and', createBlockHelper(comparisonHelpers.and));
  handlebars.registerHelper('or', createBlockHelper(comparisonHelpers.or));
  handlebars.registerHelper('not', createBlockHelper(comparisonHelpers.not));
  
  // Collection/string operations
  handlebars.registerHelper('contains', createBlockHelper(comparisonHelpers.contains));
  handlebars.registerHelper('isEmpty', createBlockHelper(comparisonHelpers.isEmpty));
  
  // Type checking (inline only - no block form needed)
  handlebars.registerHelper('isString', (value: any) => comparisonHelpers.isString(value));
  handlebars.registerHelper('isNumber', (value: any) => comparisonHelpers.isNumber(value));
  handlebars.registerHelper('isArray', (value: any) => comparisonHelpers.isArray(value));
  handlebars.registerHelper('isObject', (value: any) => comparisonHelpers.isObject(value));
  handlebars.registerHelper('isBoolean', (value: any) => comparisonHelpers.isBoolean(value));
  
  // Advanced comparison
  handlebars.registerHelper('compare', function(a: any, operator: string, b: any, options: any) {
    const result = comparisonHelpers.compare(a, operator, b);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('between', function(value: any, min: any, max: any, options: any) {
    const result = comparisonHelpers.between(value, min, max);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  // Utility helpers
  handlebars.registerHelper('ifx', comparisonHelpers.ifx);
  handlebars.registerHelper('ternary', comparisonHelpers.ifx); // Alias
  
  handlebars.registerHelper('coalesce', function(...args: any[]) {
    const options = args.pop();
    return comparisonHelpers.coalesce(...args);
  });
  
  handlebars.registerHelper('default', function(...args: any[]) {
    const options = args.pop();
    return comparisonHelpers.defaultTo(args[0], args[1]);
  });
  
  // Weak equality helpers for flexibility
  handlebars.registerHelper('eqw', function(a: any, b: any, options: any) {
    const result = a == b; // Intentional weak equality
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('neqw', function(a: any, b: any, options: any) {
    const result = a != b; // Intentional weak inequality
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
}