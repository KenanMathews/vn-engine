// src/core/script/ScriptEngine.ts

import type { 
  ScriptResult, 
  ParsedScene, 
  ScriptInstruction, 
  DialogueInstruction,
  ActionInstruction,
  ConditionalInstruction,
  JumpInstruction,
  ChoiceOption,
  UserAction,
  PrimitiveAction,
  ChoiceRecord
} from '../../types'
import type { GameStateManager } from '../state'
import type { TemplateManager } from '../templates'

export class ScriptEngine {
  private scenes: Map<string, ParsedScene> = new Map()
  private currentScene: string = ''
  private currentInstructionIndex: number = 0
  private pendingChoices: ChoiceOption[] | null = null

  constructor(
    private gameState: GameStateManager,
    private templateManager: TemplateManager
  ) {}

  // ===== SCENE MANAGEMENT =====

  loadScenes(scenes: ParsedScene[]): void {
    this.scenes.clear()
    scenes.forEach(scene => {
      this.scenes.set(scene.name, scene)
    })
  }

  startScene(sceneName: string): ScriptResult {
    const scene = this.scenes.get(sceneName)
    if (!scene) {
      return {
        type: 'error',
        error: `Scene "${sceneName}" not found`
      }
    }

    this.currentScene = sceneName
    this.currentInstructionIndex = 0
    this.pendingChoices = null
    
    this.gameState.setCurrentScene(sceneName)
    this.gameState.setCurrentInstruction(0)

    return this.executeCurrentInstruction()
  }

  continue(): ScriptResult {
    if (this.pendingChoices) {
      return {
        type: 'error',
        error: 'Cannot continue while choices are pending. Make a choice first.'
      }
    }

    this.currentInstructionIndex++
    this.gameState.setCurrentInstruction(this.currentInstructionIndex)
    
    return this.executeCurrentInstruction()
  }

  makeChoice(choiceIndex: number): ScriptResult {
    if (!this.pendingChoices) {
      return {
        type: 'error',
        error: 'No choices are currently available'
      }
    }

    if (choiceIndex < 0 || choiceIndex >= this.pendingChoices.length) {
      return {
        type: 'error',
        error: `Invalid choice index: ${choiceIndex}`
      }
    }

    const choice = this.pendingChoices[choiceIndex]
    
    // Record the choice
    const choiceRecord: ChoiceRecord = {
      scene: this.currentScene,
      instruction: this.currentInstructionIndex,
      choiceIndex,
      choiceText: choice.text,
      timestamp: Date.now()
    }
    this.gameState.addChoice(choiceRecord)

    // Execute choice actions
    if (choice.actions) {
      this.executeActions(choice.actions)
    }

    // Handle scene transition
    if (choice.goto) {
      this.pendingChoices = null
      return this.startScene(choice.goto)
    }

    // Continue in current scene
    this.pendingChoices = null
    this.currentInstructionIndex++
    this.gameState.setCurrentInstruction(this.currentInstructionIndex)
    
    return this.executeCurrentInstruction()
  }

  // ===== INSTRUCTION EXECUTION =====

  private executeCurrentInstruction(): ScriptResult {
    const scene = this.scenes.get(this.currentScene)
    if (!scene) {
      return {
        type: 'error',
        error: `Current scene "${this.currentScene}" not found`
      }
    }

    if (this.currentInstructionIndex >= scene.instructions.length) {
      return {
        type: 'scene_complete'
      }
    }

    const instruction = scene.instructions[this.currentInstructionIndex]
    return this.executeInstruction(instruction)
  }

  private executeInstruction(instruction: ScriptInstruction): ScriptResult {
    try {
      switch (instruction.type) {
        case 'dialogue':
          return this.executeDialogue(instruction as DialogueInstruction)
        case 'action':
          return this.executeActionInstruction(instruction as ActionInstruction)
        case 'conditional':
          return this.executeConditional(instruction as ConditionalInstruction)
        case 'jump':
          return this.executeJump(instruction as JumpInstruction)
        default:
          return {
            type: 'error',
            error: `Unknown instruction type: ${(instruction as any).type}`
          }
      }
    } catch (error: any) {
      return {
        type: 'error',
        error: `Execution error: ${error.message}`
      }
    }
  }

  private executeDialogue(instruction: DialogueInstruction): ScriptResult {
    // Execute any actions first
    if (instruction.actions) {
      this.executeActions(instruction.actions)
    }

    // Handle choices
    if (instruction.choices) {
      const availableChoices = this.filterAvailableChoices(instruction.choices)
      if (availableChoices.length === 0) {
        // No choices available, continue to next instruction
        this.currentInstructionIndex++
        this.gameState.setCurrentInstruction(this.currentInstructionIndex)
        return this.executeCurrentInstruction()
      }

      this.pendingChoices = availableChoices
      return {
        type: 'show_choices',
        content: instruction.text ? this.renderTemplate(instruction.text) : undefined,
        speaker: instruction.speaker ? this.renderTemplate(instruction.speaker) : undefined,
        choices: availableChoices.map(choice => ({
          ...choice,
          text: this.renderTemplate(choice.text)
        }))
      }
    }

    // Regular dialogue
    if (instruction.text) {
      return {
        type: 'display_dialogue',
        content: this.renderTemplate(instruction.text),
        speaker: instruction.speaker ? this.renderTemplate(instruction.speaker) : undefined,
        canContinue: true
      }
    }

    // No text, just continue (for action-only dialogue instructions)
    this.currentInstructionIndex++
    this.gameState.setCurrentInstruction(this.currentInstructionIndex)
    return this.executeCurrentInstruction()
  }

  private executeActionInstruction(instruction: ActionInstruction): ScriptResult {
    this.executeActions(instruction.actions)
    
    // Continue to next instruction
    this.currentInstructionIndex++
    this.gameState.setCurrentInstruction(this.currentInstructionIndex)
    return this.executeCurrentInstruction()
  }

  private executeConditional(instruction: ConditionalInstruction): ScriptResult {
    const conditionResult = this.evaluateCondition(instruction.condition)
    const instructionsToExecute = conditionResult ? instruction.then : instruction.else

    if (!instructionsToExecute || instructionsToExecute.length === 0) {
      // No instructions to execute, continue to next
      this.currentInstructionIndex++
      this.gameState.setCurrentInstruction(this.currentInstructionIndex)
      return this.executeCurrentInstruction()
    }

    // Execute the first instruction from the conditional branch
    const result = this.executeInstruction(instructionsToExecute[0])
    
    // If there are more instructions in the branch, we need to handle them
    // For now, we'll execute them sequentially (this could be enhanced)
    if (instructionsToExecute.length > 1) {
      for (let i = 1; i < instructionsToExecute.length; i++) {
        this.executeInstruction(instructionsToExecute[i])
      }
    }

    // If the result wants to continue, move to next instruction
    if (result.type === 'display_dialogue' && result.canContinue) {
      return result
    }

    // Continue to next instruction
    this.currentInstructionIndex++
    this.gameState.setCurrentInstruction(this.currentInstructionIndex)
    return this.executeCurrentInstruction()
  }

  private executeJump(instruction: JumpInstruction): ScriptResult {
    return this.startScene(instruction.target)
  }

  // ===== ACTION EXECUTION =====

  private executeActions(actions: UserAction[]): void {
    actions.forEach(action => this.executeAction(action))
  }

  private executeAction(action: UserAction): void {
    try {
      switch (action.type) {
        case 'setVar':
          this.gameState.setVariable(action.key, action.value)
          break
        case 'addVar':
          this.gameState.addToVariable(action.key, action.value)
          break
        case 'setFlag':
          this.gameState.setStoryFlag(action.flag)
          break
        case 'clearFlag':
          this.gameState.clearStoryFlag(action.flag)
          break
        case 'addToList':
          this.gameState.addToList(action.list, action.item)
          break
        case 'addTime':
          this.gameState.addTime(action.minutes)
          break
        default:
          console.warn(`Unknown action type: ${action.type}`)
      }
    } catch (error: any) {
      console.error(`Error executing action ${action.type}:`, error)
    }
  }

  // ===== UTILITY METHODS =====

  private filterAvailableChoices(choices: ChoiceOption[]): ChoiceOption[] {
    return choices.filter(choice => {
      if (!choice.condition) return true
      return this.evaluateCondition(choice.condition)
    })
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Use template engine to evaluate condition
      const result = this.renderTemplate(`{{${condition}}}`)
      return result === 'true'
    } catch (error) {
      console.error('Condition evaluation error:', error)
      return false
    }
  }

  private renderTemplate(template: string): string {
    try {
      const context = this.createTemplateContext()
      return this.templateManager.render(template, context)
    } catch (error: any) {
      console.error('Template rendering error:', error)
      return template // Return original template on error
    }
  }

  private createTemplateContext(): any {
    const gameState = this.gameState.getState()
    const variables = Object.fromEntries(gameState.variables.entries())
    const storyFlags = Array.from(gameState.storyFlags)

    return {
      // Direct variable access
      ...variables,
      
      // Core game state
      storyFlags,
      variables,
      choiceHistory: gameState.choiceHistory,
      
      // Computed properties
      gameTime: this.gameState.getCurrentTime(),
      
      // Helper functions are registered with the template manager
      // and will be available automatically through the context
      computed: {
        hasFlag: (flag: string) => this.gameState.hasStoryFlag(flag),
        getVar: (key: string, defaultValue: any = '') => {
          const value = this.getNestedProperty(variables, key)
          return value !== undefined ? value : defaultValue
        },
        playerChose: (choiceText: string, inScene?: string) =>
          this.gameState.playerChose(choiceText, inScene)
      }
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}