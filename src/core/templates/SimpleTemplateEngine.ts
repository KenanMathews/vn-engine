import type { RenderableState } from '../../types';

export class SimpleTemplateEngine {
  private static readonly VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;
  private static readonly CONDITION_REGEX = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs;
  private static readonly CONDITION_ELSE_REGEX = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/gs;

  render(template: string, context: RenderableState): string {
    try {
      let result = template;

      result = this.processConditionals(result, context);

      result = this.processVariables(result, context);

      return result;
    } catch (error: any) {
      console.error('Simple template rendering error:', error);
      return `[Template Error: ${error.message}]`;
    }
  }

  private processConditionals(template: string, context: RenderableState): string {
    template = template.replace(SimpleTemplateEngine.CONDITION_ELSE_REGEX, (match, condition, truthyContent, falsyContent) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? truthyContent : falsyContent;
    });

    template = template.replace(SimpleTemplateEngine.CONDITION_REGEX, (match, condition, content) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? content : '';
    });

    return template;
  }

  private processVariables(template: string, context: RenderableState): string {
    return template.replace(SimpleTemplateEngine.VARIABLE_REGEX, (match, expression) => {
      const value = this.evaluateExpression(expression.trim(), context);
      return this.formatValue(value);
    });
  }

  private evaluateCondition(condition: string, context: RenderableState): boolean {
    try {
      const flagMatch = condition.match(/hasFlag\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (flagMatch) {
        return context.computed.hasFlag(flagMatch[1]);
      }

      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(condition)) {
        const value = this.evaluateExpression(condition, context);
        return this.isTruthy(value);
      }

      const comparisonMatch = condition.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s+(eq|ne|gt|lt|gte|lte)\s+(.+)$/);
      if (comparisonMatch) {
        const [, leftVar, operator, rightValue] = comparisonMatch;
        const leftVal = this.evaluateExpression(leftVar, context);
        const rightVal = this.parseValue(rightValue.trim());
        
        return this.compareValues(leftVal, operator, rightVal);
      }

      const playerChoseMatch = condition.match(/playerChose\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (playerChoseMatch) {
        return context.computed.playerChose(playerChoseMatch[1]);
      }

      const value = this.evaluateExpression(condition, context);
      return this.isTruthy(value);
    } catch (error) {
      console.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private evaluateExpression(expression: string, context: RenderableState): any {
    const path = expression.split('.');
    
    let value: any = {
      ...context.variables,
      ...context,
    };

    for (const key of path) {
      if (value && typeof value === 'object') {
        if (key in value) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      } else {
        value = undefined;
        break;
      }
    }

    return value;
  }

  private parseValue(valueStr: string): any {
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      return valueStr.slice(1, -1);
    }

    if (/^-?\d+$/.test(valueStr)) {
      return parseInt(valueStr, 10);
    }
    if (/^-?\d*\.\d+$/.test(valueStr)) {
      return parseFloat(valueStr);
    }

    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (valueStr === 'null') return null;
    if (valueStr === 'undefined') return undefined;

    return valueStr;
  }

  private compareValues(left: any, operator: string, right: any): boolean {
    switch (operator) {
      case 'eq': return left == right;
      case 'ne': return left != right;
      case 'gt': return Number(left) > Number(right);
      case 'gte': return Number(left) >= Number(right);
      case 'lt': return Number(left) < Number(right);
      case 'lte': return Number(left) <= Number(right);
      default: return false;
    }
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0 && !isNaN(value);
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return !!value;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getSupportedFeatures(): {
    variables: boolean;
    conditionals: boolean;
    helpers: boolean;
    loops: boolean;
    partials: boolean;
  } {
    return {
      variables: true,
      conditionals: true,
      helpers: false,
      loops: false,
      partials: false
    };
  }

  getEngineType(): string {
    return 'simple';
  }
}
