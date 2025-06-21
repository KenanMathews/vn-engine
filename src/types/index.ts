export interface ChoiceRecord {
  scene: string
  instruction: number
  choiceIndex: number
  choiceText: string
  timestamp: number
}

export interface GameState {
  currentScene: string
  currentInstruction: number
  
  variables: Map<string, any>
  storyFlags: Set<string>
  
  choiceHistory: ChoiceRecord[]
}

export interface SerializableGameState {
  currentScene: string
  currentInstruction: number
  variables: [string, any][]
  storyFlags: string[]
  choiceHistory: ChoiceRecord[]
  schemaVersion: string
  saveDate: string
}

export interface SourceLocation {
  file: string
  line: number
  scene: string
}

export interface UserAction {
  type: string
  [key: string]: any
}

export type PrimitiveAction = 
  | { type: 'setFlag'; flag: string }
  | { type: 'clearFlag'; flag: string }
  | { type: 'setVar'; key: string; value: any }
  | { type: 'addVar'; key: string; value: number }
  | { type: 'addToList'; list: string; item: any }
  | { type: 'addTime'; minutes: number }

export interface ScriptInstruction {
  type: 'dialogue' | 'action' | 'conditional' | 'jump'
  _sourceLocation?: SourceLocation
}

export interface DialogueInstruction extends ScriptInstruction {
  type: 'dialogue'
  speaker?: string
  text?: string
  actions?: UserAction[]
  choices?: ChoiceOption[]
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

export interface ScriptResult {
  type: 'display_dialogue' | 'show_choices' | 'scene_complete' | 'error'
  content?: string
  speaker?: string
  choices?: ChoiceOption[]
  canContinue?: boolean
  error?: string
}

export interface RenderableState {
  storyFlags: string[]
  variables: Record<string, any>
  choiceHistory: ChoiceRecord[]
  
  computed: {
    gameTime: string
    hasFlag: (flag: string) => boolean
    getVar: (key: string) => any
    playerChose: (choiceText: string, inScene?: string) => boolean
  }
}
