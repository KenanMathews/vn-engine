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
  ChoiceRecord,
} from "../../types";
import type { GameStateManager } from "../state";
import type { TemplateManager } from "../templates";
import { helpers } from '../helpers';

export class ScriptEngine {
  private scenes: Map<string, ParsedScene> = new Map();
  private currentScene: string = "";
  private currentInstructionIndex: number = 0;
  private pendingChoices: ChoiceOption[] | null = null;

  constructor(
    private gameState: GameStateManager,
    private templateManager: TemplateManager
  ) {}

  loadScenes(scenes: ParsedScene[]): void {
    this.scenes.clear();
    scenes.forEach((scene) => {
      this.scenes.set(scene.name, scene);
    });
  }

  startScene(sceneName: string, instructionIndex: number = 0): ScriptResult {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      return {
        type: "error",
        error: `Scene "${sceneName}" not found`,
      };
    }

    this.currentScene = sceneName;
    this.currentInstructionIndex = instructionIndex; // Use provided index instead of 0
    this.pendingChoices = null;

    this.gameState.setCurrentScene(sceneName);
    this.gameState.setCurrentInstruction(instructionIndex);

    // Validate instruction index
    if (instructionIndex >= scene.instructions.length) {
      return { type: "scene_complete" };
    }

    return this.executeCurrentInstruction();
  }

  continue(): ScriptResult {
    if (this.pendingChoices) {
      return {
        type: "error",
        error:
          "Cannot continue while choices are pending. Make a choice first.",
      };
    }

    this.currentInstructionIndex++;
    this.gameState.setCurrentInstruction(this.currentInstructionIndex);

    return this.executeCurrentInstruction();
  }

  makeChoice(choiceIndex: number): ScriptResult {
    if (!this.pendingChoices) {
      return {
        type: "error",
        error: "No choices are currently available",
      };
    }

    if (
      choiceIndex === null ||
      choiceIndex === undefined ||
      typeof choiceIndex !== "number" ||
      isNaN(choiceIndex)
    ) {
      return {
        type: "error",
        error: "Choice index must be a valid number",
      };
    }

    if (choiceIndex < 0 || choiceIndex >= this.pendingChoices.length) {
      return {
        type: "error",
        error: `Invalid choice index: ${choiceIndex}`,
      };
    }

    const choice = this.pendingChoices[choiceIndex];

    const choiceRecord: ChoiceRecord = {
      scene: this.currentScene,
      instruction: this.currentInstructionIndex,
      choiceIndex,
      choiceText: choice.text,
      timestamp: Date.now(),
    };
    this.gameState.addChoice(choiceRecord);

    if (choice.actions) {
      this.executeActions(choice.actions);
    }

    if (choice.goto) {
      this.pendingChoices = null;
      const target = this.renderTemplate(choice.goto);
      return this.startScene(target);
    }

    this.pendingChoices = null;
    this.currentInstructionIndex++;
    this.gameState.setCurrentInstruction(this.currentInstructionIndex);

    return this.executeCurrentInstruction();
  }

  private executeCurrentInstruction(): ScriptResult {
    const scene = this.scenes.get(this.currentScene);
    if (!scene) {
      return {
        type: "error",
        error: `Current scene "${this.currentScene}" not found`,
      };
    }

    if (this.currentInstructionIndex >= scene.instructions.length) {
      return {
        type: "scene_complete",
      };
    }

    const instruction = scene.instructions[this.currentInstructionIndex];
    return this.executeInstruction(instruction);
  }

  private executeInstruction(instruction: ScriptInstruction): ScriptResult {
    try {
      switch (instruction.type) {
        case "dialogue":
          return this.executeDialogue(instruction as DialogueInstruction);
        case "action":
          return this.executeActionInstruction(
            instruction as ActionInstruction
          );
        case "conditional":
          return this.executeConditional(instruction as ConditionalInstruction);
        case "jump":
          return this.executeJump(instruction as JumpInstruction);
        default:
          return {
            type: "error",
            error: `Unknown instruction type: ${(instruction as any).type}`,
          };
      }
    } catch (error: any) {
      return {
        type: "error",
        error: `Execution error: ${error.message}`,
      };
    }
  }

  private executeDialogue(instruction: DialogueInstruction): ScriptResult {
    if (instruction.actions) {
      this.executeActions(instruction.actions);
    }

    if (instruction.choices) {
      const availableChoices = this.filterAvailableChoices(instruction.choices);
      if (availableChoices.length === 0) {
        this.currentInstructionIndex++;
        this.gameState.setCurrentInstruction(this.currentInstructionIndex);
        return this.executeCurrentInstruction();
      }

      this.pendingChoices = availableChoices;
      return {
        type: "show_choices",
        content: instruction.text
          ? this.renderTemplate(instruction.text)
          : undefined,
        speaker: instruction.speaker
          ? this.renderTemplate(instruction.speaker)
          : undefined,
        choices: availableChoices.map((choice) => ({
          ...choice,
          text: this.renderTemplate(choice.text),
        })),
      };
    }

    if (instruction.text) {
      return {
        type: "display_dialogue",
        content: this.renderTemplate(instruction.text),
        speaker: instruction.speaker
          ? this.renderTemplate(instruction.speaker)
          : undefined,
        canContinue: true,
      };
    }

    this.currentInstructionIndex++;
    this.gameState.setCurrentInstruction(this.currentInstructionIndex);
    return this.executeCurrentInstruction();
  }

  private executeActionInstruction(
    instruction: ActionInstruction
  ): ScriptResult {
    this.executeActions(instruction.actions);

    this.currentInstructionIndex++;
    this.gameState.setCurrentInstruction(this.currentInstructionIndex);
    return this.executeCurrentInstruction();
  }

  private executeConditional(
    instruction: ConditionalInstruction
  ): ScriptResult {
    const conditionResult = this.evaluateCondition(instruction.condition);
    const instructionsToExecute = conditionResult
      ? instruction.then
      : instruction.else;

    if (!instructionsToExecute || instructionsToExecute.length === 0) {
      this.currentInstructionIndex++;
      this.gameState.setCurrentInstruction(this.currentInstructionIndex);
      return this.executeCurrentInstruction();
    }

    const result = this.executeInstruction(instructionsToExecute[0]);

    if (instructionsToExecute.length > 1) {
      for (let i = 1; i < instructionsToExecute.length; i++) {
        this.executeInstruction(instructionsToExecute[i]);
      }
    }

    if (result.type === "display_dialogue" && result.canContinue) {
      return result;
    }

    this.currentInstructionIndex++;
    this.gameState.setCurrentInstruction(this.currentInstructionIndex);
    return this.executeCurrentInstruction();
  }

  private executeJump(instruction: JumpInstruction): ScriptResult {
    const target = this.renderTemplate(instruction.target);
    return this.startScene(target);
  }


  private executeActions(actions: UserAction[]): void {
    actions.forEach((action) => this.executeAction(action));
  }

  private executeAction(action: UserAction): void {
    try {
      switch (action.type) {
        case "setVar":
          const key = this.renderTemplate(action.key.toString());
          const value = this.renderActionValue(action.value);
          this.gameState.setVariable(key, value);
          break;
          
        case "addVar":
          const addKey = this.renderTemplate(action.key.toString());
          const addValue = this.renderActionValue(action.value);
          this.gameState.addToVariable(addKey, addValue);
          break;
          
        case "setFlag":
          const flag = this.renderTemplate(action.flag.toString());
          this.gameState.setStoryFlag(flag);
          break;
          
        case "clearFlag":
          const clearFlag = this.renderTemplate(action.flag.toString());
          this.gameState.clearStoryFlag(clearFlag);
          break;
          
        case "addToList":
          const listName = this.renderTemplate(action.list.toString());
          const item = this.renderActionValue(action.item);
          this.gameState.addToList(listName, item);
          break;
          
        case "addTime":
          const minutes = this.renderActionValue(action.minutes);
          this.gameState.addTime(Number(minutes));
          break;
          
        case "helper":
          this.executeHelperAction(action);
          break;
          
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error: any) {
      console.error(`Error executing action ${action.type}:`, error);
    }
  }

  private renderActionValue(value: any): any {
    if (typeof value === 'string') {
      if (value.includes('{{') && value.includes('}}')) {
        const rendered = this.renderTemplate(value);
        if (/^\-?\d+(\.\d+)?$/.test(rendered)) {
          return Number(rendered);
        }
        if (rendered === 'true') return true;
        if (rendered === 'false') return false;
        return rendered;
      }
      return value;
    }
    return value;
  }
  private executeHelperAction(action: any): void {
    const { helper } = action;
    const args = action.args?.map((arg: any) => this.renderActionValue(arg)) || [];
    const result = action.result ? this.renderTemplate(action.result.toString()) : null;
    const value = this.callHelper(helper, args);
    
    if (result && value !== undefined) {
      this.gameState.setVariable(result, value);
    }
  }

  private callHelper(helperRef: string, args: any[]): any {
    const parts = helperRef.split('.');
    if (parts.length !== 2) {
      throw new Error(`Invalid helper reference: ${helperRef}`);
    }
    
    const [category, method] = parts;
    const helperCategory = (helpers as any)[category];
    
    if (!helperCategory) {
      throw new Error(`Helper category not found: ${category}`);
    }
    
    const helperFunction = helperCategory[method];
    if (!helperFunction || typeof helperFunction !== 'function') {
      throw new Error(`Helper method not found: ${helperRef}`);
    }
    
    return helperFunction(...args);
  }

  private filterAvailableChoices(choices: ChoiceOption[]): ChoiceOption[] {
    return choices.filter((choice) => {
      if (!choice.condition) return true;
      return this.evaluateCondition(choice.condition);
    });
  }

  private evaluateCondition(condition: string): boolean {
    try {
      const result = this.renderTemplate(condition);
      return result === "true";
    } catch (error) {
      console.error("Condition evaluation error:", error);
      return false;
    }
  }

  private renderTemplate(template: string): string {
    try {
      const context = this.createTemplateContext();
      return this.templateManager.render(template, context);
    } catch (error: any) {
      console.error("Template rendering error:", error);
      return template;
    }
  }

  private createTemplateContext(): any {
    const gameState = this.gameState.getState();
    const variables = Object.fromEntries(gameState.variables.entries());
    const storyFlags = Array.from(gameState.storyFlags);

    return {
      ...variables,

      storyFlags,
      variables,
      choiceHistory: gameState.choiceHistory,

      gameTime: this.gameState.getCurrentTime(),

      computed: {
        hasFlag: (flag: string) => this.gameState.hasStoryFlag(flag),
        getVar: (key: string, defaultValue: any = "") => {
          const value = this.getNestedProperty(variables, key);
          return value !== undefined ? value : defaultValue;
        },
        playerChose: (choiceText: string, inScene?: string) =>
          this.gameState.playerChose(choiceText, inScene),
      },
    };
  }

  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}