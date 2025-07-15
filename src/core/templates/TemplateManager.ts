
import type { RenderableState } from '../../types/index.js';
import type { GameStateManager } from '../state';
import { SimpleTemplateEngine } from './SimpleTemplateEngine';
import { setGameStateManager, registerAllHelpers } from '../helpers/index.js';

export class TemplateManager {
  private handlebars: any | null = null;
  private simpleEngine: SimpleTemplateEngine;
  private isHandlebarsAvailable: boolean = false;
  private helpersRegistered: boolean = false;
  private isTestMode: boolean = false;
  private gameStateManager: GameStateManager | null = null;

  constructor() {
    this.simpleEngine = new SimpleTemplateEngine();
    this.isTestMode = typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test')));
  }
  
  setGameStateManager(gameStateManager: GameStateManager): void {
    this.gameStateManager = gameStateManager;
    setGameStateManager(gameStateManager);
  }

  async initialize(): Promise<void> {
    await this.detectHandlebars();
    if (this.isHandlebarsAvailable) {
      await this.setupHelpers();
    }
  }

  private async detectHandlebars(): Promise<void> {
    try {
      if (typeof require !== 'undefined') {
        try {
          const handlebarsModule = require('handlebars');
          this.handlebars = handlebarsModule.default || handlebarsModule;
          
          if (this.handlebars && typeof this.handlebars.create === 'function') {
            this.handlebars = this.handlebars.create();
            this.isHandlebarsAvailable = true;
            if (!this.isTestMode) {
              console.log('✅ Handlebars detected (sync) - Full template functionality available');
            }
            return;
          }
        } catch (error) {
        }
      }
      
      const handlebarsModule = await import('handlebars');
      this.handlebars = handlebarsModule.default || handlebarsModule;
      
      if (this.handlebars && typeof this.handlebars.create === 'function') {
        this.handlebars = this.handlebars.create();
        this.isHandlebarsAvailable = true;
        if (!this.isTestMode) {
          console.log('✅ Handlebars detected (async) - Full template functionality available');
        }
      } else {
        throw new Error('Invalid Handlebars module');
      }
    } catch (error) {
      if (!this.isTestMode) {
        console.log('ℹ️ Handlebars not available - Using simple template engine');
      }
      this.isHandlebarsAvailable = false;
    }
  }

  private async setupHelpers(): Promise<void> {
    if (!this.isHandlebarsAvailable || this.helpersRegistered) return;

    try {
      if (registerAllHelpers && this.handlebars) {
        registerAllHelpers(this.handlebars);
        this.helpersRegistered = true;
        if (!this.isTestMode) {
          console.log('✅ VN Engine helpers registered with Handlebars');
        }
      } else {
        throw new Error('registerAllHelpers function not available');
      }
    } catch (error) {
      if (!this.isTestMode) {
        console.warn('Failed to register VN Engine helpers:', error);
      }
    }
  }

  render(template: string, context: RenderableState): string {
    if (this.isHandlebarsAvailable && this.handlebars && this.helpersRegistered) {
      return this.renderWithHandlebars(template, context);
    } else {
      return this.simpleEngine.render(template, context);
    }
  }

  renderStrict(template: string, context: RenderableState): string {
    if (this.isHandlebarsAvailable && this.handlebars && this.helpersRegistered) {
      const compiledTemplate = this.handlebars.compile(template, {
        strict: true,
        noEscape: false,
        compat: true
      });
      return compiledTemplate(context) || '';
    } else {
      return this.simpleEngine.render(template, context);
    }
  }

  private renderWithHandlebars(template: string, context: RenderableState): string {
    try {
      const compiledTemplate = this.handlebars.compile(template, {
        strict: false,
        noEscape: false,
        compat: true
      });
      
      const result = compiledTemplate(context);
      return result || '';
    } catch (error: any) {
      if (!this.isTestMode) {
        console.error('Handlebars template rendering error:', error);
      }
      
      if (error.message.includes('Missing helper')) {
        const helperMatch = error.message.match(/Missing helper: "([^"]+)"/);
        if (helperMatch) {
          return `[Missing Helper: ${helperMatch[1]}]`;
        }
      }
      
      return `[Template Error: ${error.message}]`;
    }
  }

  getEngineInfo(): {
    type: 'handlebars' | 'simple';
    isHandlebarsAvailable: boolean;
    helpersRegistered: boolean;
    supportedFeatures: {
      variables: boolean;
      conditionals: boolean;
      helpers: boolean;
      loops: boolean;
      partials: boolean;
    };
  } {
    if (this.isHandlebarsAvailable) {
      return {
        type: 'handlebars',
        isHandlebarsAvailable: true,
        helpersRegistered: this.helpersRegistered,
        supportedFeatures: {
          variables: true,
          conditionals: true,
          helpers: this.helpersRegistered,
          loops: true,
          partials: true
        }
      };
    } else {
      return {
        type: 'simple',
        isHandlebarsAvailable: false,
        helpersRegistered: false,
        supportedFeatures: this.simpleEngine.getSupportedFeatures()
      };
    }
  }

  registerHelper(name: string, helper: any): boolean {
    if (this.isHandlebarsAvailable && this.handlebars) {
      this.handlebars.registerHelper(name, helper);
      return true;
    }
    if (!this.isTestMode) {
      console.warn(`Cannot register helper "${name}" - Handlebars not available`);
    }
    return false;
  }

  getHandlebarsInstance(): any | null {
    return this.isHandlebarsAvailable ? this.handlebars : null;
  }

  validateTemplate(template: string): { 
    valid: boolean; 
    error?: string; 
    engine: 'handlebars' | 'simple';
    supportedFeatures: string[];
  } {
    const engineInfo = this.getEngineInfo();
    
    try {
      if (this.isHandlebarsAvailable && this.handlebars) {
        this.handlebars.compile(template);
        return {
          valid: true,
          engine: 'handlebars',
          supportedFeatures: Object.keys(engineInfo.supportedFeatures).filter(
            key => engineInfo.supportedFeatures[key as keyof typeof engineInfo.supportedFeatures]
          )
        };
      } else {
        this.simpleEngine.render(template, {
          storyFlags: [],
          variables: {},
          choiceHistory: [],
          computed: {
            gameTime: '00:00',
            hasFlag: () => false,
            getVar: () => '',
            playerChose: () => false
          }
        });
        
        return {
          valid: true,
          engine: 'simple',
          supportedFeatures: Object.keys(engineInfo.supportedFeatures).filter(
            key => engineInfo.supportedFeatures[key as keyof typeof engineInfo.supportedFeatures]
          )
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
        engine: this.isHandlebarsAvailable ? 'handlebars' : 'simple',
        supportedFeatures: []
      };
    }
  }

  supportsFeature(feature: 'variables' | 'conditionals' | 'helpers' | 'loops' | 'partials'): boolean {
    const info = this.getEngineInfo();
    return info.supportedFeatures[feature];
  }

  isReady(): boolean {
    return !this.isHandlebarsAvailable || this.helpersRegistered;
  }
}
