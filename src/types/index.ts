// Add new choice tracking type
export interface ChoiceRecord {
  scene: string
  instruction: number
  choiceIndex: number
  choiceText: string
  timestamp: number
}

// NEW: Pragmatic GameState interface
export interface GameState {
  // Story execution state
  currentScene: string
  currentInstruction: number
  
  // Data storage (universal foundation)
  variables: Map<string, any>
  storyFlags: Set<string>  // Renamed from 'flags'
  
  // Narrative tracking
  choiceHistory: ChoiceRecord[]
}

// NEW: Updated serializable state
export interface SerializableGameState {
  currentScene: string
  currentInstruction: number
  variables: [string, any][]
  storyFlags: string[]  // Renamed from 'flags'
  choiceHistory: ChoiceRecord[]
  schemaVersion: string
  saveDate: string
}

// Source location for error reporting
export interface SourceLocation {
  file: string
  line: number
  scene: string
}

// Action types
export interface UserAction {
  type: string
  [key: string]: any
}

// Basic primitive actions for initial implementation
export type PrimitiveAction = 
  | { type: 'setFlag'; flag: string }
  | { type: 'clearFlag'; flag: string }
  | { type: 'setVar'; key: string; value: any }
  | { type: 'addVar'; key: string; value: number }
  | { type: 'addToList'; list: string; item: any }
  | { type: 'addTime'; minutes: number }

// Script types
export interface ScriptInstruction {
  type: 'dialogue' | 'action' | 'conditional' | 'jump'  // Removed 'choice'
  _sourceLocation?: SourceLocation
}

// UPDATED: Unified dialogue instruction with optional text and choices
export interface DialogueInstruction extends ScriptInstruction {
  type: 'dialogue'
  speaker?: string
  text?: string              // Made optional
  actions?: UserAction[]
  choices?: ChoiceOption[]   // Added choices support
}

export interface ActionInstruction extends ScriptInstruction {
  type: 'action'
  actions: UserAction[]
}

export interface ChoiceOption {
  text: string
  condition?: string
  actions?: UserAction[]
  goto?: string
}

// REMOVED: ChoiceInstruction - now part of DialogueInstruction

export interface ConditionalInstruction extends ScriptInstruction {
  type: 'conditional'
  condition: string
  then: ScriptInstruction[]
  else?: ScriptInstruction[]
}

export interface JumpInstruction extends ScriptInstruction {
  type: 'jump'
  target: string
}

export interface ParsedScene {
  name: string
  instructions: ScriptInstruction[]
}

// Script execution results
export interface ScriptResult {
  type: 'display_dialogue' | 'show_choices' | 'scene_complete' | 'error'
  content?: string
  speaker?: string
  choices?: ChoiceOption[]
  canContinue?: boolean
  error?: string
}

// Template rendering - Clean structure without hardcoded objects
export interface RenderableState {
  // Core engine state
  storyFlags: string[]
  variables: Record<string, any>
  choiceHistory: ChoiceRecord[]
  
  // Computed helpers
  computed: {
    gameTime: string
    hasFlag: (flag: string) => boolean
    getVar: (key: string) => any
    playerChose: (choiceText: string, inScene?: string) => boolean
  }
}