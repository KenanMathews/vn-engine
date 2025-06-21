
export interface StringHelpers {
  uppercase(str: string): string;
  lowercase(str: string): string;
  capitalize(str: string): string;
  capitalizeFirst(str: string): string;
  titleCase(str: string): string;
  
  trim(str: string): string;
  truncate(str: string, length: number, suffix?: string): string;
  ellipsis(str: string, length: number): string;
  replace(str: string, search: string, replacement: string): string;
  remove(str: string, target: string): string;
  reverse(str: string): string;
  repeat(str: string, count: number): string;
  
  padStart(str: string, length: number, padString?: string): string;
  padEnd(str: string, length: number, padString?: string): string;
  center(str: string, length: number): string;
  
  startsWith(str: string, searchString: string): boolean;
  endsWith(str: string, searchString: string): boolean;
  includes(str: string, searchString: string): boolean;
  
  substring(str: string, start: number, end?: number): string;
  words(str: string, count?: number): string[];
  wordCount(str: string): number;
  
  slugify(str: string): string;
  stripTags(str: string): string;
  
  typewriter(str: string, speed?: number): string;
  nameTag(name: string): string;
  dialogueFormat(speaker: string, text: string): string;
  parseMarkdown(str: string): string;
  sanitizeInput(str: string): string;
  colorText(str: string, color: string): string;
}

function safeString(value: any): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

export const stringHelpers: StringHelpers = {
  uppercase(str: string): string {
    return safeString(str).toUpperCase();
  },

  lowercase(str: string): string {
    return safeString(str).toLowerCase();
  },

  capitalize(str: string): string {
    const s = safeString(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },

  capitalizeFirst(str: string): string {
    const s = safeString(str);
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  titleCase(str: string): string {
    return safeString(str).replace(/\w\S*/g, (word) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  },

  trim(str: string): string {
    return safeString(str).trim();
  },

  truncate(str: string, length: number, suffix: string = '...'): string {
    const s = safeString(str);
    if (s.length <= length) return s;
    return s.slice(0, length - suffix.length) + suffix;
  },

  ellipsis(str: string, length: number): string {
    return stringHelpers.truncate(str, length, '…');
  },

  replace(str: string, search: string, replacement: string): string {
    return safeString(str).split(search).join(replacement);
  },

  remove(str: string, target: string): string {
    return stringHelpers.replace(str, target, '');
  },

  reverse(str: string): string {
    return safeString(str).split('').reverse().join('');
  },

  repeat(str: string, count: number): string {
    const safeCount = Math.max(0, Math.floor(count));
    return safeString(str).repeat(safeCount);
  },

  padStart(str: string, length: number, padString: string = ' '): string {
    return safeString(str).padStart(length, padString);
  },

  padEnd(str: string, length: number, padString: string = ' '): string {
    return safeString(str).padEnd(length, padString);
  },

  center(str: string, length: number): string {
    const s = safeString(str);
    const totalPadding = Math.max(0, length - s.length);
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;
    return ' '.repeat(leftPadding) + s + ' '.repeat(rightPadding);
  },

  startsWith(str: string, searchString: string): boolean {
    return safeString(str).startsWith(searchString);
  },

  endsWith(str: string, searchString: string): boolean {
    return safeString(str).endsWith(searchString);
  },

  includes(str: string, searchString: string): boolean {
    return safeString(str).includes(searchString);
  },

  substring(str: string, start: number, end?: number): string {
    return safeString(str).substring(start, end);
  },

  words(str: string, count?: number): string[] {
    const words = safeString(str).trim().split(/\s+/).filter(word => word.length > 0);
    return typeof count === 'number' ? words.slice(0, count) : words;
  },

  wordCount(str: string): number {
    return stringHelpers.words(str).length;
  },

  slugify(str: string): string {
    return safeString(str)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  stripTags(str: string): string {
    return safeString(str).replace(/<[^>]*>/g, '');
  },

  typewriter(str: string, speed: number = 50): string {
    const s = safeString(str);
    return `<typewriter speed="${speed}">${s}</typewriter>`;
  },

  nameTag(name: string): string {
    const cleanName = safeString(name).trim();
    return cleanName ? `<name>${cleanName}</name>` : '';
  },

  dialogueFormat(speaker: string, text: string): string {
    const safeSpeaker = safeString(speaker).trim();
    const safeText = safeString(text).trim();
    
    if (!safeSpeaker) return safeText;
    return `${stringHelpers.nameTag(safeSpeaker)}\n${safeText}`;
  },

  parseMarkdown(str: string): string {
    return safeString(str)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>');
  },

  sanitizeInput(str: string): string {
    return safeString(str)
      .replace(/[<>\"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .trim();
  },

  colorText(str: string, color: string): string {
    const s = safeString(str);
    const safeColor = safeString(color).trim();
    return safeColor ? `<color="${safeColor}">${s}</color>` : s;
  }
};

export function registerStringHelpers(handlebars: any) {
  handlebars.registerHelper('uppercase', (str: any) => stringHelpers.uppercase(str));
  handlebars.registerHelper('lowercase', (str: any) => stringHelpers.lowercase(str));
  handlebars.registerHelper('capitalize', (str: any) => stringHelpers.capitalize(str));
  handlebars.registerHelper('capitalizeFirst', (str: any) => stringHelpers.capitalizeFirst(str));
  handlebars.registerHelper('titleCase', (str: any) => stringHelpers.titleCase(str));
  
  handlebars.registerHelper('trim', (str: any) => stringHelpers.trim(str));
  handlebars.registerHelper('truncate', (str: any, length: any, suffix?: any) => 
    stringHelpers.truncate(str, length, suffix));
  handlebars.registerHelper('ellipsis', (str: any, length: any) => stringHelpers.ellipsis(str, length));
  handlebars.registerHelper('replace', (str: any, search: any, replacement: any) => 
    stringHelpers.replace(str, search, replacement));
  handlebars.registerHelper('remove', (str: any, target: any) => stringHelpers.remove(str, target));
  handlebars.registerHelper('reverse', (str: any) => stringHelpers.reverse(str));
  handlebars.registerHelper('repeat', (str: any, count: any) => stringHelpers.repeat(str, count));
  
  handlebars.registerHelper('padStart', (str: any, length: any, padString?: any) => 
    stringHelpers.padStart(str, length, padString));
  handlebars.registerHelper('padEnd', (str: any, length: any, padString?: any) => 
    stringHelpers.padEnd(str, length, padString));
  handlebars.registerHelper('center', (str: any, length: any) => stringHelpers.center(str, length));
  
  handlebars.registerHelper('startsWith', function(this: any, str: any, searchString: any, options: any) {
    const result = stringHelpers.startsWith(str, searchString);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('endsWith', function(this: any, str: any, searchString: any, options: any) {
    const result = stringHelpers.endsWith(str, searchString);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('includes', function(this: any, str: any, searchString: any, options: any) {
    const result = stringHelpers.includes(str, searchString);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('substring', (str: any, start: any, end?: any) => 
    stringHelpers.substring(str, start, end));
  handlebars.registerHelper('words', (str: any, count?: any) => stringHelpers.words(str, count));
  handlebars.registerHelper('wordCount', (str: any) => stringHelpers.wordCount(str));
  
  handlebars.registerHelper('slugify', (str: any) => stringHelpers.slugify(str));
  handlebars.registerHelper('stripTags', (str: any) => stringHelpers.stripTags(str));
  
  handlebars.registerHelper('typewriter', (str: any, speed?: any) => stringHelpers.typewriter(str, speed));
  handlebars.registerHelper('nameTag', (name: any) => stringHelpers.nameTag(name));
  handlebars.registerHelper('dialogueFormat', (speaker: any, text: any) => 
    stringHelpers.dialogueFormat(speaker, text));
  handlebars.registerHelper('parseMarkdown', (str: any) => stringHelpers.parseMarkdown(str));
  handlebars.registerHelper('sanitizeInput', (str: any) => stringHelpers.sanitizeInput(str));
  handlebars.registerHelper('colorText', (str: any, color: any) => stringHelpers.colorText(str, color));
  
  handlebars.registerHelper('charAt', (str: any, index: any) => {
    return safeString(str).charAt(Math.floor(index));
  });
}
