
export { VNEngine, createVNEngine } from './VNEngine'

export * from './types'

export type {
  ScriptUpgradeOptions,
  UpgradeResult, 
  ValidationResult,
  UpgradeError
} from './types/upgrade'

export { GameStateManager } from './core/state'
export { ScriptEngine, ScriptParser } from './core/script'  
export { TemplateManager, SimpleTemplateEngine } from './core/templates'

export { 
  registerAllHelpers,
  helpers,
  safeRegisterHelpers,
  getAvailableHelpers,
  type VNEngineHelpers,
  type ArrayHelpers,
  type ComparisonHelpers,
  type MathHelpers,
  type StringHelpers,
  type VNHelpers
} from './core/helpers'

export { 
  VNEngineError, 
  ActionValidationError, 
  ScriptParseError, 
  TemplateRenderError 
} from './core/errors'

export type { 
  VNEngineEvents, 
  SaveData, 
  TemplateEngineInfo 
} from './VNEngine'

export { 
  getNestedValue, 
  setNestedValue 
} from './core/helpers/vn-core'
