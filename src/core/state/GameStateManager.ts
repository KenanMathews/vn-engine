
import type { GameState, SerializableGameState, ChoiceRecord } from '@/types'

export class GameStateManager {
  private state: GameState

  constructor(initialState?: Partial<GameState>) {
    this.state = {
      currentScene: '',
      currentInstruction: 0,
      variables: new Map(),
      storyFlags: new Set(),
      choiceHistory: [],
      ...initialState
    }
  }

  setCurrentScene(scene: string): void {
    this.state.currentScene = scene
  }

  getCurrentScene(): string {
    return this.state.currentScene
  }

  setCurrentInstruction(instruction: number): void {
    this.state.currentInstruction = instruction
  }

  getCurrentInstruction(): number {
    return this.state.currentInstruction
  }

  setStoryFlag(flag: string): void {
    this.state.storyFlags.add(flag)
  }

  clearStoryFlag(flag: string): void {
    this.state.storyFlags.delete(flag)
  }

  hasStoryFlag(flag: string): boolean {
    return this.state.storyFlags.has(flag)
  }

  setVariable(key: string, value: any): void {
    this.state.variables.set(key, value)
  }

  getVariable(key: string): any {
    return this.state.variables.get(key)
  }

  addToVariable(key: string, value: number): void {
    if (key.includes('.')) {
      const parts = key.split('.')
      const rootKey = parts[0]
      const nestedPath = parts.slice(1).join('.')
      
      let rootObj = this.getVariable(rootKey)
      if (!rootObj || typeof rootObj !== 'object') {
        rootObj = {}
      }
      
      const currentValue = this.getNestedProperty(rootObj, nestedPath) || 0
      this.setNestedProperty(rootObj, nestedPath, currentValue + value)
      
      this.setVariable(rootKey, rootObj)
    } else {
      const current = this.getVariable(key) || 0
      this.setVariable(key, current + value)
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined
    
    return path.split('.').reduce((current, key) => {
      return (current && current[key] !== undefined) ? current[key] : undefined
    }, obj)
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.')
    let current = obj
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {}
      }
      current = current[parts[i]]
    }
    
    current[parts[parts.length - 1]] = value
  }

  addChoice(record: ChoiceRecord): void {
    this.state.choiceHistory.push(record)
  }

  getChoiceHistory(): ChoiceRecord[] {
    return [...this.state.choiceHistory]
  }

  playerChose(choiceText: string, inScene?: string): boolean {
    return this.state.choiceHistory.some(choice => 
      choice.choiceText === choiceText && 
      (!inScene || choice.scene === inScene)
    )
  }

  getList(listName: string): any[] {
    const variable = this.getVariable(listName)
    return Array.isArray(variable) ? variable : []
  }

  setList(listName: string, value: any[]): void {
    this.setVariable(listName, value)
  }

  addToList(listName: string, item: any): void {
    const list = this.getList(listName)
    list.push(item)
    this.setList(listName, list)
  }

  addTime(minutes: number): void {
    const currentTime = this.getVariable('gameTime') || 0
    this.setVariable('gameTime', currentTime + minutes)
    
    this.setVariable('currentTime', currentTime + minutes)
  }

  getCurrentTime(): number {
    return this.getVariable('gameTime') || this.getVariable('currentTime') || 0
  }

  getState(): GameState {
    return {
      currentScene: this.state.currentScene,
      currentInstruction: this.state.currentInstruction,
      variables: new Map(this.state.variables),
      storyFlags: new Set(this.state.storyFlags),
      choiceHistory: [...this.state.choiceHistory]
    }
  }

  serialize(): SerializableGameState {
    return {
      currentScene: this.state.currentScene,
      currentInstruction: this.state.currentInstruction,
      variables: Array.from(this.state.variables.entries()),
      storyFlags: Array.from(this.state.storyFlags),
      choiceHistory: [...this.state.choiceHistory],
      schemaVersion: '1.0.0',
      saveDate: new Date().toISOString()
    }
  }

  deserialize(data: SerializableGameState): void {
    try {
      this.state = {
        currentScene: data.currentScene || '',
        currentInstruction: data.currentInstruction || 0,
        variables: new Map(data.variables || []),
        storyFlags: new Set(data.storyFlags || []),
        choiceHistory: data.choiceHistory || []
      }
    } catch (error) {
      console.error('Failed to deserialize game state:', error)
      this.state = {
        currentScene: '',
        currentInstruction: 0,
        variables: new Map(),
        storyFlags: new Set(),
        choiceHistory: []
      }
    }
  }

  setBulkVariables(variables: Record<string, any>): void {
    try {
      Object.entries(variables).forEach(([key, value]) => {
        this.setVariable(key, value)
      })
    } catch (error) {
      console.error('Error setting bulk variables:', error)
    }
  }

  setBulkFlags(flags: string[]): void {
    try {
      flags.forEach(flag => {
        if (typeof flag === 'string' && flag.length > 0) {
          this.setStoryFlag(flag)
        }
      })
    } catch (error) {
      console.error('Error setting bulk flags:', error)
    }
  }

  reset(): void {
    this.state = {
      currentScene: '',
      currentInstruction: 0,
      variables: new Map(),
      storyFlags: new Set(),
      choiceHistory: []
    }
  }

  validateState(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof this.state.currentScene !== 'string') {
      errors.push('Current scene must be a string')
    }

    if (typeof this.state.currentInstruction !== 'number' || this.state.currentInstruction < 0) {
      errors.push('Current instruction must be a non-negative number')
    }

    if (!(this.state.variables instanceof Map)) {
      errors.push('Variables must be a Map')
    }

    if (!(this.state.storyFlags instanceof Set)) {
      errors.push('Story flags must be a Set')
    }

    if (!Array.isArray(this.state.choiceHistory)) {
      errors.push('Choice history must be an array')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
