// src/core/helpers/index.ts

import { arrayHelpers, registerArrayHelpers, type ArrayHelpers } from './array';
import { comparisonHelpers, registerComparisonHelpers, type ComparisonHelpers } from './comparison';
import { mathHelpers, registerMathHelpers, type MathHelpers } from './math';
import { stringHelpers, registerStringHelpers, type StringHelpers } from './string';
import { vnHelpers, registerVNHelpers, type VNHelpers, getNestedValue, setNestedValue } from './vn-core';

// Unified helpers interface
export interface VNEngineHelpers {
  array: ArrayHelpers;
  comparison: ComparisonHelpers;
  math: MathHelpers;
  string: StringHelpers;
  vn: VNHelpers;
}

// Combined helpers object
export const helpers: VNEngineHelpers = {
  array: arrayHelpers,
  comparison: comparisonHelpers,
  math: mathHelpers,
  string: stringHelpers,
  vn: vnHelpers
};

// Registration function for all helpers
export function registerAllHelpers(handlebars: any): void {
  console.log('🎭 Registering VN Engine helpers...');
  
  try {
    registerArrayHelpers(handlebars);
    console.log('  ✅ Array helpers registered');
    
    registerComparisonHelpers(handlebars);
    console.log('  ✅ Comparison helpers registered');
    
    registerMathHelpers(handlebars);
    console.log('  ✅ Math helpers registered');
    
    registerStringHelpers(handlebars);
    console.log('  ✅ String helpers registered');
    
    registerVNHelpers(handlebars);
    console.log('  ✅ Core VN helpers registered');
    
    console.log('🎉 All core helpers successfully registered');
  } catch (error) {
    console.error('❌ Error registering VN Engine helpers:', error);
    throw error;
  }
}


// Export individual helper modules for advanced usage
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

// Export types
export type {
  ArrayHelpers,
  ComparisonHelpers,
  MathHelpers,
  StringHelpers,
  VNHelpers
};