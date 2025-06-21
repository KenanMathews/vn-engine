import * as yaml from 'js-yaml'
import type { 
  ParsedScene, 
  ScriptInstruction, 
  SourceLocation, 
  DialogueInstruction,
  ActionInstruction,
  ConditionalInstruction,
  JumpInstruction
} from '@/types'
import { ScriptParseError } from '../errors';

export class ScriptParser {
  parse(content: string, fileName: string = 'script.yaml'): ParsedScene[] {
    try {
      const document = yaml.load(content) as any
      
      if (!document || typeof document !== 'object') {
        throw new ScriptParseError('Invalid YAML format', { file: fileName, line: 1, scene: 'root' })
      }

      const scenes: ParsedScene[] = []
      
      for (const [sceneName, sceneData] of Object.entries(document)) {
        const scene = this.parseScene(sceneName, sceneData as any, fileName)
        scenes.push(scene)
      }
      
      return scenes
    } catch (error: any) {
      if (error instanceof ScriptParseError) {
        throw error
      }
      throw new ScriptParseError(`Failed to parse script: ${error.message}`, { file: fileName, line: 0, scene: 'root' })
    }
  }

  private parseScene(name: string, data: any, fileName: string): ParsedScene {
    if (!Array.isArray(data)) {
      throw new ScriptParseError(`Scene "${name}" must be an array of instructions`, {
        file: fileName,
        scene: name,
        line: 1
      })
    }

    const instructions: ScriptInstruction[] = []

    data.forEach((item, index) => {
      const sourceLocation: SourceLocation = {
        file: fileName,
        line: index + 1,
        scene: name
      }

      const instruction = this.parseInstruction(item, sourceLocation)
      instructions.push(instruction)
    })

    return { name, instructions }
  }

  private parseInstruction(item: any, sourceLocation: SourceLocation): ScriptInstruction {
    if (typeof item === 'string') {
      const instruction: DialogueInstruction = {
        type: 'dialogue',
        text: item,
        _sourceLocation: sourceLocation
      }
      return instruction
    }

    if (typeof item === 'object' && item !== null) {
      if (item.action || item.actions) {
        const instruction: ActionInstruction = {
          type: 'action',
          actions: Array.isArray(item.actions) ? item.actions : [item.action],
          _sourceLocation: sourceLocation
        }
        return instruction
      }

      if (item.if) {
        const instruction: ConditionalInstruction = {
          type: 'conditional',
          condition: item.if,
          then: Array.isArray(item.then) ? item.then.map((i: any) => this.parseInstruction(i, sourceLocation)) : [this.parseInstruction(item.then, sourceLocation)],
          else: item.else ? (Array.isArray(item.else) ? item.else.map((i: any) => this.parseInstruction(i, sourceLocation)) : [this.parseInstruction(item.else, sourceLocation)]) : undefined,
          _sourceLocation: sourceLocation
        }
        return instruction
      }

      if (item.goto || item.jump) {
        const instruction: JumpInstruction = {
          type: 'jump',
          target: item.goto || item.jump,
          _sourceLocation: sourceLocation
        }
        return instruction
      }

      if (item.say || item.text || item.speaker || item.choices || item.choice) {
        const instruction: DialogueInstruction = {
          type: 'dialogue',
          speaker: item.speaker,
          text: item.say || item.text,
          actions: item.actions,
          choices: item.choices || item.choice,
          _sourceLocation: sourceLocation
        }
        return instruction
      }
    }

    throw new ScriptParseError(`Invalid instruction format`, sourceLocation)
  }
}
