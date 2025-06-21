
export class TestErrorReporter {
  constructor() {
    this.errors = [];
    this.context = {};
    this.startTime = null;
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  startTest(testName) {
    this.startTime = performance.now();
    this.setContext({ currentTest: testName });
  }

  createDetailedError(testName, error, expected, actual, extraInfo = {}) {
    const endTime = performance.now();
    const duration = this.startTime ? endTime - this.startTime : 0;

    const errorReport = {
      testName,
      category: this.context.category || 'unknown',
      timestamp: new Date().toISOString(),
      duration: `${duration.toFixed(2)}ms`,
      
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: this.sanitizeStack(error.stack)
      },
      
      comparison: {
        expected: this.serializeValue(expected),
        actual: this.serializeValue(actual),
        type: typeof actual,
        areEqual: this.deepEqual(expected, actual)
      },
      
      context: { ...this.context },
      
      engineState: extraInfo.engineState || null,
      suggestions: this.generateSuggestions(testName, expected, actual),
      relatedTests: extraInfo.relatedTests || [],
      
      system: {
        nodeVersion: typeof process !== 'undefined' ? process.version : 'browser',
        platform: typeof process !== 'undefined' ? process.platform : 'browser',
        memory: this.getMemoryUsage()
      }
    };

    this.errors.push(errorReport);
    return errorReport;
  }

  sanitizeStack(stack) {
    if (!stack) return null;
    
    return stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .filter(line => !line.includes('internal/'))
      .slice(0, 5)
      .map(line => line.trim())
      .join('\n');
  }

  serializeValue(value) {
    if (value === null) return { type: 'null', value: 'null' };
    if (value === undefined) return { type: 'undefined', value: 'undefined' };
    
    const type = typeof value;
    
    try {
      if (type === 'object') {
        if (Array.isArray(value)) {
          return {
            type: 'array',
            length: value.length,
            value: value.length > 10 ? 
              `[${value.slice(0, 3).map(v => JSON.stringify(v)).join(', ')}...+${value.length - 3} more]` :
              JSON.stringify(value),
            preview: value.slice(0, 3)
          };
        }
        
        if (value instanceof Map) {
          return {
            type: 'Map',
            size: value.size,
            value: `Map(${value.size})`,
            preview: Array.from(value.entries()).slice(0, 3)
          };
        }
        
        if (value instanceof Set) {
          return {
            type: 'Set',
            size: value.size,
            value: `Set(${value.size})`,
            preview: Array.from(value).slice(0, 3)
          };
        }
        
        const keys = Object.keys(value);
        return {
          type: 'object',
          keys: keys.length,
          value: keys.length > 10 ?
            `{${keys.slice(0, 3).join(', ')}...+${keys.length - 3} more}` :
            JSON.stringify(value, null, 2),
          preview: this.getObjectPreview(value)
        };
      }
      
      if (type === 'string' && value.length > 100) {
        return {
          type: 'string',
          length: value.length,
          value: `"${value.slice(0, 50)}...${value.slice(-20)}"`,
          preview: value.slice(0, 100)
        };
      }
      
      return {
        type,
        value: JSON.stringify(value)
      };
    } catch (error) {
      return {
        type: 'serialization-error',
        value: `[Cannot serialize: ${error.message}]`,
        originalType: type
      };
    }
  }

  getObjectPreview(obj) {
    try {
      const keys = Object.keys(obj).slice(0, 3);
      const preview = {};
      keys.forEach(key => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          preview[key] = `[${typeof value}]`;
        } else {
          preview[key] = value;
        }
      });
      return preview;
    } catch {
      return '[Preview unavailable]';
    }
  }

  deepEqual(a, b) {
    try {
      if (a === b) return true;
      if (a === null || b === null) return false;
      if (a === undefined || b === undefined) return false;
      if (typeof a !== typeof b) return false;
      
      if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        
        if (Array.isArray(a)) {
          if (a.length !== b.length) return false;
          for (let i = 0; i < a.length; i++) {
            if (!this.deepEqual(a[i], b[i])) return false;
          }
          return true;
        }
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
          if (!keysB.includes(key)) return false;
          if (!this.deepEqual(a[key], b[key])) return false;
        }
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  generateSuggestions(testName, expected, actual) {
    const suggestions = [];
    
    if (testName.toLowerCase().includes('variable')) {
      if (actual === undefined && expected !== undefined) {
        suggestions.push('Variable not set - check if actions are being executed properly');
        suggestions.push('Verify ScriptEngine.executeActions() is being called');
        suggestions.push('Check if template context includes the variable');
      }
      
      if (typeof actual !== typeof expected) {
        suggestions.push(`Type mismatch: expected ${typeof expected}, got ${typeof actual}`);
        suggestions.push('Check variable serialization/deserialization');
      }
    }
    
    if (testName.toLowerCase().includes('template')) {
      if (typeof actual === 'string' && actual.trim() === '') {
        suggestions.push('Template rendered as empty string - check variable availability');
        suggestions.push('Verify template context creation in createTemplateContext()');
        suggestions.push('Check if Handlebars helpers are properly registered');
      }
      
      if (typeof actual === 'string' && actual.includes('{{')) {
        suggestions.push('Template not parsed - variables not substituted');
        suggestions.push('Check if templateManager.render() is working');
      }
    }
    
    if (testName.toLowerCase().includes('state') || testName.toLowerCase().includes('save')) {
      suggestions.push('Check state serialization in GameStateManager.serialize()');
      suggestions.push('Verify state restoration in GameStateManager.deserialize()');
      suggestions.push('Check if state is properly synchronized');
    }
    
    if (testName.toLowerCase().includes('large')) {
      suggestions.push('Check if bulk operations are implemented');
      suggestions.push('Verify memory efficiency for large datasets');
      suggestions.push('Consider using setBulkVariables/setBulkFlags methods');
    }
    
    return suggestions;
  }

  getMemoryUsage() {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return {
          heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`
        };
      }
      return { info: 'Memory info not available in browser' };
    } catch {
      return { error: 'Memory info unavailable' };
    }
  }

  formatError(errorReport) {
    const lines = [];
    
    lines.push(`\n❌ ${errorReport.testName}`);
    lines.push(`   Category: ${errorReport.category}`);
    lines.push(`   Duration: ${errorReport.duration}`);
    lines.push(`   Time: ${errorReport.timestamp}`);
    
    lines.push(`\n   💭 Error: ${errorReport.error.message}`);
    
    lines.push(`\n   📊 Expected: ${errorReport.comparison.expected.value}`);
    lines.push(`   📊 Actual:   ${errorReport.comparison.actual.value}`);
    lines.push(`   📊 Types:    expected(${errorReport.comparison.expected.type}) vs actual(${errorReport.comparison.actual.type})`);
    
    if (errorReport.engineState) {
      lines.push(`\n   🔧 Engine State:`);
      lines.push(`      Loaded: ${errorReport.engineState.isLoaded}`);
      lines.push(`      Current Scene: "${errorReport.engineState.currentScene}"`);
      lines.push(`      Variables: ${errorReport.engineState.variableCount}`);
      lines.push(`      Flags: ${errorReport.engineState.flagCount}`);
    }
    
    if (errorReport.suggestions.length > 0) {
      lines.push(`\n   💡 Suggestions:`);
      errorReport.suggestions.forEach((suggestion, i) => {
        lines.push(`      ${i + 1}. ${suggestion}`);
      });
    }
    
    if (errorReport.error.stack) {
      lines.push(`\n   📚 Stack Trace:`);
      lines.push(`      ${errorReport.error.stack.replace(/\n/g, '\n      ')}`);
    }
    
    return lines.join('\n');
  }

  generateSummary() {
    if (this.errors.length === 0) {
      return '\n🎉 No errors to report!\n';
    }
    
    const summary = [];
    
    summary.push('\n📋 DETAILED ERROR ANALYSIS');
    summary.push('═'.repeat(50));
    
    const errorsByCategory = {};
    this.errors.forEach(error => {
      const category = error.category || 'unknown';
      if (!errorsByCategory[category]) {
        errorsByCategory[category] = [];
      }
      errorsByCategory[category].push(error);
    });
    
    summary.push(`\n📊 Error Summary:`);
    summary.push(`   Total Errors: ${this.errors.length}`);
    summary.push(`   Categories: ${Object.keys(errorsByCategory).join(', ')}`);
    
    const avgDuration = this.errors.reduce((sum, e) => sum + parseFloat(e.duration), 0) / this.errors.length;
    summary.push(`   Avg Test Duration: ${avgDuration.toFixed(2)}ms`);
    
    Object.entries(errorsByCategory).forEach(([category, errors]) => {
      summary.push(`\n🏷️  ${category.toUpperCase()} ERRORS (${errors.length}):`);
      summary.push('─'.repeat(30));
      
      errors.forEach(error => {
        summary.push(this.formatError(error));
      });
    });
    
    summary.push('\n🔍 COMMON PATTERNS:');
    summary.push('─'.repeat(30));
    
    const commonSuggestions = {};
    this.errors.forEach(error => {
      error.suggestions.forEach(suggestion => {
        commonSuggestions[suggestion] = (commonSuggestions[suggestion] || 0) + 1;
      });
    });
    
    Object.entries(commonSuggestions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([suggestion, count]) => {
        summary.push(`   • ${suggestion} (${count} tests)`);
      });
    
    return summary.join('\n');
  }

  reset() {
    this.errors = [];
    this.context = {};
    this.startTime = null;
  }

  exportErrors() {
    return {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      errors: this.errors,
      summary: this.generateSummary()
    };
  }
}

export class EnhancedAssert {
  constructor(errorReporter) {
    this.reporter = errorReporter;
  }

  assert(condition, message, expected = true, actual = condition, extraInfo = {}) {
    if (!condition) {
      const error = new Error(message);
      const testName = this.reporter.context.currentTest || 'Unknown Test';
      
      if (extraInfo.engine) {
        extraInfo.engineState = this.captureEngineState(extraInfo.engine);
      }
      
      const errorReport = this.reporter.createDetailedError(
        testName, 
        error, 
        expected, 
        actual, 
        extraInfo
      );
      
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message, extraInfo = {}) {
    const isEqual = this.reporter.deepEqual(actual, expected);
    this.assert(isEqual, message || `Expected ${expected}, got ${actual}`, expected, actual, extraInfo);
  }

  assertNotEqual(actual, expected, message, extraInfo = {}) {
    const isEqual = this.reporter.deepEqual(actual, expected);
    this.assert(!isEqual, message || `Expected not to equal ${expected}`, `not ${expected}`, actual, extraInfo);
  }

  assertType(actual, expectedType, message, extraInfo = {}) {
    const actualType = typeof actual;
    this.assert(
      actualType === expectedType, 
      message || `Expected type ${expectedType}, got ${actualType}`, 
      expectedType, 
      actualType, 
      extraInfo
    );
  }

  assertDefined(actual, message, extraInfo = {}) {
    this.assert(
      actual !== undefined, 
      message || 'Expected value to be defined', 
      'defined', 
      actual, 
      extraInfo
    );
  }

  assertNotNull(actual, message, extraInfo = {}) {
    this.assert(
      actual !== null, 
      message || 'Expected value to not be null', 
      'not null', 
      actual, 
      extraInfo
    );
  }

  captureEngineState(engine) {
    try {
      return {
        isLoaded: engine.getIsLoaded ? engine.getIsLoaded() : 'unknown',
        currentScene: engine.getCurrentScene ? engine.getCurrentScene() : 'unknown',
        variableCount: engine.getVariableCount ? engine.getVariableCount() : 'unknown',
        flagCount: engine.getFlagCount ? engine.getFlagCount() : 'unknown',
        error: engine.getError ? engine.getError() : 'none',
        engineInfo: engine.getEngineInfo ? engine.getEngineInfo() : 'unavailable'
      };
    } catch (error) {
      return { captureError: error.message };
    }
  }
}

export function createTestReporter() {
  const reporter = new TestErrorReporter();
  const assert = new EnhancedAssert(reporter);
  
  return { reporter, assert };
}
