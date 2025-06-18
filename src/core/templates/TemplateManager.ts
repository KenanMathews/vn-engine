// src/core/templates/TemplateManager.ts

import * as Handlebars from 'handlebars'
import { registerAllHelpers } from '../helpers'
import type { RenderableState } from '../../types/index.js'

export class TemplateManager {
  private handlebars: typeof Handlebars

  constructor() {
    this.handlebars = Handlebars.create()
    this.setupHelpers()
  }

  private setupHelpers(): void {
    // Register all VN Engine helpers (replaces just-handlebars-helpers completely)
    registerAllHelpers(this.handlebars)
  }

  render(template: string, context: RenderableState): string {
    try {
      const compiledTemplate = this.handlebars.compile(template, {
        strict: false,
        noEscape: false,
        compat: true
      })
      
      return compiledTemplate(context) || ''
    } catch (error: any) {
      console.error('Template rendering error:', error)
      
      // Enhanced error messages
      if (error.message.includes('Missing helper')) {
        const helperMatch = error.message.match(/Missing helper: "([^"]+)"/)
        if (helperMatch) {
          return `[Missing Helper: ${helperMatch[1]} - Check helper registration]`
        }
      }
      
      return `[Template Error: ${error.message}]`
    }
  }

  renderStrict(template: string, context: RenderableState): string {
    const compiledTemplate = this.handlebars.compile(template, {
      strict: false,
      noEscape: false,
      compat: true
    })
    
    return compiledTemplate(context) || ''
  }

  getHandlebarsInstance(): typeof Handlebars {
    return this.handlebars
  }
}