
import type { TemplateManager } from '../templates';
import type { GameStateManager } from '../state';
import type { RenderableState } from '../../types';

export class TemplateUtils {
  constructor(
    private templateManager: TemplateManager,
    private gameState: GameStateManager
  ) {}

  parseTemplate(template: string): string {
    try {
      const context = this.createRenderContext();
      return this.templateManager.render(template, context);
    } catch (error: any) {
      console.error("parseTemplate error:", error);
      return `[Template Error: ${error.message}]`;
    }
  }

  parseTemplateStrict(template: string): string {
    const context = this.createRenderContext();
    return this.templateManager.renderStrict(template, context);
  }

  private createRenderContext(): RenderableState {
    const gameState = this.gameState.getState();
    const variables = Object.fromEntries(gameState.variables.entries());
    const storyFlags = Array.from(gameState.storyFlags) as string[];

    return {
      ...variables,
      
      storyFlags,
      variables,
      choiceHistory: gameState.choiceHistory,
      computed: {
        gameTime: this.formatGameTime(),
        hasFlag: (flag: string) => this.gameState.hasStoryFlag(flag),
        getVar: (key: string) => this.getNestedVariable(key),
        playerChose: (choiceText: string, inScene?: string) =>
          this.gameState.playerChose(choiceText, inScene),
      },
    };
  }

  private formatGameTime(): string {
    const currentTime = this.gameState.getCurrentTime();
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  private getNestedVariable(key: string): any {
    const variables = Object.fromEntries(
      this.gameState.getState().variables.entries()
    );
    return this.getNestedProperty(variables, key);
  }

  private getNestedProperty(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path
      .split(".")
      .reduce(
        (current, key) =>
          current && current[key] !== undefined ? current[key] : undefined,
        obj
      );
  }

  renderWithVariables(template: string, additionalVars: Record<string, any>): string {
    try {
      const context = this.createRenderContext();
      const extendedContext = {
        ...context,
        ...additionalVars,
        variables: { ...context.variables, ...additionalVars }
      };
      return this.templateManager.render(template, extendedContext);
    } catch (error: any) {
      console.error("renderWithVariables error:", error);
      return `[Template Error: ${error.message}]`;
    }
  }

  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      this.parseTemplateStrict(template);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
