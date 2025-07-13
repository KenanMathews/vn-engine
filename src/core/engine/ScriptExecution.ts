import type { ScriptResult } from '../../types';
import type { ScriptEngine } from '../script';
import type { EventEmitter } from '../events/EventEmitter';
import type { VNEngineEvents } from './EngineLifecycle';

export class ScriptExecution {
  constructor(
    private scriptEngine: ScriptEngine,
    private events: EventEmitter<VNEngineEvents>
  ) {}

  startScene(sceneName: string, instructionIndex: number = 0): ScriptResult {
    const result = this.scriptEngine.startScene(sceneName, instructionIndex);
    this.emitResult(result);
    return result;
  }

  continue(): ScriptResult {
    const result = this.scriptEngine.continue();
    this.emitResult(result);
    return result;
  }

  makeChoice(choiceIndex: number): ScriptResult {
    const result = this.scriptEngine.makeChoice(choiceIndex);
    this.emitResult(result);
    return result;
  }

  private emitResult(result: ScriptResult): void {
    this.events.emit("stateChange", result);

    if (result.type === "error") {
      const errorMessage = result.error || "Unknown error";
      this.events.emit("error", errorMessage);
    }
  }
}