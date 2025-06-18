import type { UserAction, SourceLocation } from '@/types/'

export class VNEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message)
    this.name = 'VNEngineError'
  }
}

export class ActionValidationError extends VNEngineError {
  constructor(
    message: string,
    public invalidAction: UserAction,
    public suggestion: string,
    public sourceLocation?: SourceLocation
  ) {
    super(message, 'ACTION_VALIDATION_ERROR', { invalidAction, suggestion, sourceLocation })
  }
}

export class ScriptParseError extends VNEngineError {
  constructor(
    message: string,
    public sourceLocation?: SourceLocation
  ) {
    super(message, 'SCRIPT_PARSE_ERROR', { sourceLocation })
  }
}

export class TemplateRenderError extends VNEngineError {
  constructor(
    message: string,
    public template: string,
    public originalError?: Error
  ) {
    super(message, 'TEMPLATE_RENDER_ERROR', { template, originalError })
  }
}