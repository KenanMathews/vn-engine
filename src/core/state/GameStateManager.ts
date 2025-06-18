// src/core/state/GameStateManager.ts

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

  // FIXED: Handle nested variable addition properly
  addToVariable(key: string, value: number): void {
    if (key.includes('.')) {
      // Handle nested keys like "player.level"
      const parts = key.split('.')
      const rootKey = parts[0]
      const nestedPath = parts.slice(1).join('.')
      
      // Get or create root object
      let rootObj = this.getVariable(rootKey)
      if (!rootObj || typeof rootObj !== 'object') {
        rootObj = {}
      }
      
      // Get current nested value and add to it
      const currentValue = this.getNestedProperty(rootObj, nestedPath) || 0
      this.setNestedProperty(rootObj, nestedPath, currentValue + value)
      
      // Save back to variables
      this.setVariable(rootKey, rootObj)
    } else {
      // Handle simple key
      const current = this.getVariable(key) || 0
      this.setVariable(key, current + value)
    }
  }

  // FIXED: Helper method to get nested properties
  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined
    
    return path.split('.').reduce((current, key) => {
      return (current && current[key] !== undefined) ? current[key] : undefined
    }, obj)
  }

  // FIXED: Helper method to set nested properties
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.')
    let current = obj
    
    // Navigate to the parent of the target property
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {}
      }
      current = current[parts[i]]
    }
    
    // Set the final property
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

  // FIXED: Use consistent variable name for time tracking
  addTime(minutes: number): void {
    // Use 'gameTime' as the standard variable name for consistency with templates
    const currentTime = this.getVariable('gameTime') || 0
    this.setVariable('gameTime', currentTime + minutes)
    
    // Also set 'currentTime' for backward compatibility
    this.setVariable('currentTime', currentTime + minutes)
  }

  getCurrentTime(): number {
    return this.getVariable('gameTime') || this.getVariable('currentTime') || 0
  }

  getState(): GameState {
    return { ...this.state }
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
    this.state = {
      currentScene: data.currentScene || '',
      currentInstruction: data.currentInstruction || 0,
      variables: new Map(data.variables || []),
      storyFlags: new Set(data.storyFlags || []),
      choiceHistory: data.choiceHistory || []
    }
  }
}