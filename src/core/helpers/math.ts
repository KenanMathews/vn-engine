
export interface MathHelpers {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
  multiply(a: number, b: number): number;
  divide(a: number, b: number): number;
  remainder(a: number, b: number): number;
  
  abs(value: number): number;
  min(...values: number[]): number;
  max(...values: number[]): number;
  round(value: number, precision?: number): number;
  ceil(value: number): number;
  floor(value: number): number;
  
  random(min: number, max: number): number;
  randomInt(min: number, max: number): number;
  clamp(value: number, min: number, max: number): number;
  
  sum(values: number[]): number;
  average(values: number[]): number;
  
  percentage(value: number, total: number): number;
  statCheck(stat: number, difficulty: number): boolean;
  rollDice(sides: number, count?: number): number;
  lerp(start: number, end: number, factor: number): number;
  normalizeValue(value: number, min: number, max: number): number;
  formatNumber(value: number, decimals?: number): string;
}

function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
}

function safeArray(value: any): number[] {
  if (Array.isArray(value)) {
    return value.map(v => safeNumber(v)).filter(n => !isNaN(n));
  }
  return [];
}

export const mathHelpers: MathHelpers = {
  add(a: number, b: number): number {
    return safeNumber(a) + safeNumber(b);
  },

  subtract(a: number, b: number): number {
    return safeNumber(a) - safeNumber(b);
  },

  multiply(a: number, b: number): number {
    return safeNumber(a) * safeNumber(b);
  },

  divide(a: number, b: number): number {
    const divisor = safeNumber(b);
    if (divisor === 0) return 0;
    return safeNumber(a) / divisor;
  },

  remainder(a: number, b: number): number {
    const divisor = safeNumber(b);
    if (divisor === 0) return 0;
    return safeNumber(a) % divisor;
  },

  abs(value: number): number {
    return Math.abs(safeNumber(value));
  },

  min(...values: number[]): number {
    const nums = values.map(safeNumber).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.min(...nums) : 0;
  },

  max(...values: number[]): number {
    const nums = values.map(safeNumber).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  },

  round(value: number, precision: number = 0): number {
    const num = safeNumber(value);
    const factor = Math.pow(10, safeNumber(precision));
    return Math.round(num * factor) / factor;
  },

  ceil(value: number): number {
    return Math.ceil(safeNumber(value));
  },

  floor(value: number): number {
    return Math.floor(safeNumber(value));
  },

  random(min: number, max: number): number {
    const minNum = safeNumber(min);
    const maxNum = safeNumber(max);
    return Math.random() * (maxNum - minNum) + minNum;
  },

  randomInt(min: number, max: number): number {
    const minNum = Math.ceil(safeNumber(min));
    const maxNum = Math.floor(safeNumber(max));
    return Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
  },

  clamp(value: number, min: number, max: number): number {
    const num = safeNumber(value);
    const minNum = safeNumber(min);
    const maxNum = safeNumber(max);
    return Math.min(Math.max(num, minNum), maxNum);
  },

  sum(values: number[]): number {
    return safeArray(values).reduce((sum, num) => sum + num, 0);
  },

  average(values: number[]): number {
    const nums = safeArray(values);
    return nums.length > 0 ? nums.reduce((sum, num) => sum + num, 0) / nums.length : 0;
  },

  percentage(value: number, total: number): number {
    const totalNum = safeNumber(total);
    if (totalNum === 0) return 0;
    return mathHelpers.round((safeNumber(value) / totalNum) * 100, 2);
  },

  statCheck(stat: number, difficulty: number): boolean {
    const statValue = safeNumber(stat);
    const difficultyValue = safeNumber(difficulty);
    const roll = Math.random() * 100;
    return (statValue + roll) >= difficultyValue;
  },

  rollDice(sides: number, count: number = 1): number {
    const safeSides = Math.max(1, Math.floor(safeNumber(sides)));
    const safeCount = Math.max(1, Math.floor(safeNumber(count)));
    
    let total = 0;
    for (let i = 0; i < safeCount; i++) {
      total += Math.floor(Math.random() * safeSides) + 1;
    }
    return total;
  },

  lerp(start: number, end: number, factor: number): number {
    const startNum = safeNumber(start);
    const endNum = safeNumber(end);
    const factorNum = mathHelpers.clamp(safeNumber(factor), 0, 1);
    return startNum + (endNum - startNum) * factorNum;
  },

  normalizeValue(value: number, min: number, max: number): number {
    const valueNum = safeNumber(value);
    const minNum = safeNumber(min);
    const maxNum = safeNumber(max);
    
    if (maxNum === minNum) return 0;
    return mathHelpers.clamp((valueNum - minNum) / (maxNum - minNum), 0, 1);
  },

  formatNumber(value: number, decimals: number = 0): string {
    const num = safeNumber(value);
    const dec = Math.max(0, Math.floor(safeNumber(decimals)));
    return num.toFixed(dec);
  }
};

export function registerMathHelpers(handlebars: any) {
  handlebars.registerHelper('add', (a: any, b: any) => mathHelpers.add(a, b));
  handlebars.registerHelper('subtract', (a: any, b: any) => mathHelpers.subtract(a, b));
  handlebars.registerHelper('multiply', (a: any, b: any) => mathHelpers.multiply(a, b));
  handlebars.registerHelper('divide', (a: any, b: any) => mathHelpers.divide(a, b));
  handlebars.registerHelper('remainder', (a: any, b: any) => mathHelpers.remainder(a, b));
  handlebars.registerHelper('mod', (a: any, b: any) => mathHelpers.remainder(a, b));
  
  handlebars.registerHelper('abs', (value: any) => mathHelpers.abs(value));
  handlebars.registerHelper('min', (...args: any[]) => {
    const values = args.slice(0, -1);
    return mathHelpers.min(...values);
  });
  handlebars.registerHelper('max', (...args: any[]) => {
    const values = args.slice(0, -1);
    return mathHelpers.max(...values);
  });
  
  handlebars.registerHelper('round', (value: any, precision?: any) => mathHelpers.round(value, precision));
  handlebars.registerHelper('ceil', (value: any) => mathHelpers.ceil(value));
  handlebars.registerHelper('floor', (value: any) => mathHelpers.floor(value));
  
  handlebars.registerHelper('random', (min: any, max: any) => mathHelpers.random(min, max));
  handlebars.registerHelper('randomInt', (min: any, max: any) => mathHelpers.randomInt(min, max));
  handlebars.registerHelper('clamp', (value: any, min: any, max: any) => mathHelpers.clamp(value, min, max));
  
  handlebars.registerHelper('sum', (values: any) => mathHelpers.sum(values));
  handlebars.registerHelper('average', (values: any) => mathHelpers.average(values));
  
  handlebars.registerHelper('percentage', (value: any, total: any) => mathHelpers.percentage(value, total));
  handlebars.registerHelper('statCheck', function(this: any, stat: any, difficulty: any, options: any) {
    const result = mathHelpers.statCheck(stat, difficulty);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  handlebars.registerHelper('rollDice', (sides: any, count?: any) => mathHelpers.rollDice(sides, count));
  handlebars.registerHelper('lerp', (start: any, end: any, factor: any) => mathHelpers.lerp(start, end, factor));
  handlebars.registerHelper('normalize', (value: any, min: any, max: any) => 
    mathHelpers.normalizeValue(value, min, max));
  handlebars.registerHelper('formatNumber', (value: any, decimals?: any) => 
    mathHelpers.formatNumber(value, decimals));
  
  handlebars.registerHelper('inRange', function(this: any, value: any, min: any, max: any, options: any) {
    const num = safeNumber(value);
    const minNum = safeNumber(min);
    const maxNum = safeNumber(max);
    const result = num >= minNum && num <= maxNum;
    
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('isEven', function(this: any, value: any, options: any) {
    const result = safeNumber(value) % 2 === 0;
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('isOdd', function(this: any, value: any, options: any) {
    const result = safeNumber(value) % 2 !== 0;
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
}
