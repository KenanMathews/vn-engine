// index.ts - Focused on public API types only

// Export main VN Engine class and factory
export { VNEngine, createVNEngine } from './VNEngine'

// Export all basic VN types (these are part of the public API)
export * from './types'

// Export public upgrade API types (users need these for upgrade methods)
export type {
  ScriptUpgradeOptions,
  UpgradeResult, 
  ValidationResult,
  UpgradeError
} from './types/upgrade'

// Export core classes (public API)
export { GameStateManager } from './core/state'
export { ScriptEngine, ScriptParser } from './core/script'  
export { TemplateManager } from './core/templates'

// Export helper registration (users might want to register additional helpers)
export { registerAllHelpers } from './core/helpers'

// Export error types (needed for error handling)
export { 
  VNEngineError, 
  ActionValidationError, 
  ScriptParseError, 
  TemplateRenderError 
} from './core/errors'

// Re-export from VNEngine for convenience
export type { VNEngineEvents, SaveData } from './VNEngine'