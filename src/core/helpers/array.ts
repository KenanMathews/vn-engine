import _ from 'lodash';

export interface ArrayHelpers {
  first<T>(arr: T[], n?: number): T | T[] | undefined;
  last<T>(arr: T[], n?: number): T | T[] | undefined;
  length(value: any): number;
  includes<T>(arr: T[], item: T): boolean;
  isEmpty(arr: any): boolean;
  
  filter<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[];
  find<T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined;
  where<T>(arr: T[], properties: Partial<T>): T[];
  
  map<T, U>(arr: T[], iteratee: (item: T, index: number) => U): U[];
  pluck<T>(arr: T[], path: string): any[];
  join<T>(arr: T[], separator?: string): string;
  
  groupBy<T>(arr: T[], iteratee: string | ((item: T) => any)): Record<string, T[]>;
  chunk<T>(arr: T[], size: number): T[][];
  
  unique<T>(arr: T[]): T[];
  shuffle<T>(arr: T[]): T[];
  
  slice<T>(arr: T[], start: number, end?: number): T[];
  take<T>(arr: T[], count: number): T[];
  sample<T>(arr: T[]): T | undefined;
  sampleSize<T>(arr: T[], n: number): T[];
  
  flatten<T>(arr: any[]): T[];
  reverse<T>(arr: T[]): T[];
  concat<T>(...arrays: (T | T[])[]): T[];
  
  compact<T>(arr: (T | null | undefined | false | 0 | '')[]): T[];
  without<T>(arr: T[], ...values: T[]): T[];
  
  randomChoice<T>(arr: T[]): T | undefined;
  weightedChoice<T>(items: T[], weights: number[]): T | undefined;
  cycleNext<T>(arr: T[], currentIndex: number): T;
  findByProperty<T>(arr: T[], property: string, value: any): T | undefined;
}

function isArrayLike(value: any): boolean {
  return _.isArrayLike(value);
}

export const arrayHelpers: ArrayHelpers = {
  first<T>(arr: T[], n?: number): T | T[] | undefined {
    if (!isArrayLike(arr)) return undefined;
    return typeof n === 'number' ? _.take(arr, n) : _.head(arr);
  },

  last<T>(arr: T[], n?: number): T | T[] | undefined {
    if (!isArrayLike(arr)) return undefined;
    return typeof n === 'number' ? _.takeRight(arr, n) : _.last(arr);
  },

  length(value: any): number {
    return _.size(value);
  },

  includes<T>(arr: T[], item: T): boolean {
    return _.includes(arr, item);
  },

  isEmpty(arr: any): boolean {
    return _.isEmpty(arr);
  },

  filter<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
    return _.filter(arr, predicate);
  },

  find<T>(arr: T[], predicate: (item: T, index: number) => boolean): T | undefined {
    return _.find(arr, predicate);
  },

  where<T>(arr: T[], properties: Partial<T>): T[] | any {
    return _.filter(arr, properties);
  },

  map<T, U>(arr: T[], iteratee: (item: T, index: number) => U): U[] {
    return _.map(arr, iteratee);
  },

  pluck<T>(arr: T[], path: string): any[] {
    return _.map(arr, path);
  },

  join<T>(arr: T[], separator: string = ','): string {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator);
  },

  groupBy<T>(arr: T[], iteratee: string | ((item: T) => any)): Record<string, T[]> {
    return _.groupBy(arr, iteratee);
  },

  chunk<T>(arr: T[], size: number): T[][] {
    return _.chunk(arr, Math.max(1, size));
  },

  unique<T>(arr: T[]): T[] {
    return _.uniq(arr);
  },

  shuffle<T>(arr: T[]): T[] {
    return _.shuffle([...arr]);
  },

  slice<T>(arr: T[], start: number, end?: number): T[] {
    return _.slice(arr, start, end);
  },

  take<T>(arr: T[], count: number): T[] {
    return _.take(arr, Math.max(0, count));
  },

  sample<T>(arr: T[]): T | undefined {
    return _.sample(arr);
  },

  sampleSize<T>(arr: T[], n: number): T[] {
    return _.sampleSize(arr, Math.max(0, n));
  },

  flatten<T>(arr: any[]): T[] {
    return _.flatten(arr);
  },

  reverse<T>(arr: T[]): T[] {
    return [...arr].reverse();
  },

  concat<T>(...arrays: (T | T[])[]): T[] {
    return _.concat([], ...arrays);
  },

  compact<T>(arr: (T | null | undefined | false | 0 | '')[]): T[] {
    return _.compact(arr);
  },

  without<T>(arr: T[], ...values: T[]): T[] {
    return _.without(arr, ...values);
  },

  randomChoice<T>(arr: T[]): T | undefined {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  },

  weightedChoice<T>(items: T[], weights: number[]): T | undefined {
    if (!Array.isArray(items) || !Array.isArray(weights) || items.length !== weights.length) {
      return undefined;
    }
    
    const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
    if (totalWeight === 0) return undefined;
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= Math.max(0, weights[i]);
      if (random <= 0) return items[i];
    }
    
    return items[items.length - 1];
  },

  cycleNext<T>(arr: T[], currentIndex: number): T {
    if (!Array.isArray(arr) || arr.length === 0) return undefined as any;
    const nextIndex = (currentIndex + 1) % arr.length;
    return arr[nextIndex];
  },

  findByProperty<T>(arr: T[], property: string, value: any): T | any {
    return _.find(arr, { [property]: value });
  }
};

export function registerArrayHelpers(handlebars: any) {
  handlebars.registerHelper('first', (arr: any, n?: number) => arrayHelpers.first(arr, n));
  handlebars.registerHelper('last', (arr: any, n?: number) => arrayHelpers.last(arr, n));
  handlebars.registerHelper('length', (value: any) => arrayHelpers.length(value));
  handlebars.registerHelper('size', (value: any) => arrayHelpers.length(value));
  handlebars.registerHelper('includes', (arr: any, item: any) => arrayHelpers.includes(arr, item));
  handlebars.registerHelper('isEmpty', (arr: any) => arrayHelpers.isEmpty(arr));

  handlebars.registerHelper('where', (arr: any, properties: any) => arrayHelpers.where(arr, properties));
  handlebars.registerHelper('pluck', (arr: any, path: string) => arrayHelpers.pluck(arr, path));

  handlebars.registerHelper('join', (arr: any, separator?: string) => arrayHelpers.join(arr, separator));

  handlebars.registerHelper('groupBy', (arr: any, iteratee: string) => arrayHelpers.groupBy(arr, iteratee));
  handlebars.registerHelper('chunk', (arr: any, size: number) => arrayHelpers.chunk(arr, size));

  handlebars.registerHelper('unique', (arr: any) => arrayHelpers.unique(arr));
  handlebars.registerHelper('shuffle', (arr: any) => arrayHelpers.shuffle(arr));

  handlebars.registerHelper('slice', (arr: any, start: number, end?: number) => arrayHelpers.slice(arr, start, end));
  handlebars.registerHelper('take', (arr: any, count: number) => arrayHelpers.take(arr, count));
  handlebars.registerHelper('sample', (arr: any) => arrayHelpers.sample(arr));

  handlebars.registerHelper('flatten', (arr: any) => arrayHelpers.flatten(arr));
  handlebars.registerHelper('reverse', (arr: any) => arrayHelpers.reverse(arr));
  handlebars.registerHelper('compact', (arr: any) => arrayHelpers.compact(arr));
  handlebars.registerHelper('without', (arr: any, ...values: any[]) => {
    const valuesToRemove = values.slice(0, -1);
    return arrayHelpers.without(arr, ...valuesToRemove);
  });

  handlebars.registerHelper('randomChoice', (arr: any) => arrayHelpers.randomChoice(arr));
  handlebars.registerHelper('weightedChoice', (items: any, weights: any) => arrayHelpers.weightedChoice(items, weights));
  handlebars.registerHelper('cycleNext', (arr: any, currentIndex: any) => arrayHelpers.cycleNext(arr, currentIndex));
  handlebars.registerHelper('findByProperty', (arr: any, property: string, value: any) => 
    arrayHelpers.findByProperty(arr, property, value));

  handlebars.registerHelper('array', (...args: any[]) => {
    const options = args.pop();
    return args;
  });

  handlebars.registerHelper('range', (start: number, end?: number, step?: number) => {
    return _.range(start, end, step);
  });

  handlebars.registerHelper('times', function(n: number, options: any) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn({ index: i, first: i === 0, last: i === n - 1 });
    }
    return result;
  });
}
