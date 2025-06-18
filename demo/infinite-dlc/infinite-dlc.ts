// infinite-dlc.ts - Enhanced version with multiple AI providers

import { createVNEngine } from "vn-engine";
import type {
  VNEngine,
  ScriptUpgradeOptions,
  UpgradeResult,
  ValidationResult,
} from "vn-engine";

// ===== AI PROVIDER TYPES =====
type AIProvider = "ollama" | "openai" | "claude";

interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  baseUrl?: string;
}

interface OllamaTagModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaTagModel[];
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ClaudeResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ===== DLC YAML TEMPLATES =====
const DLC_TEMPLATES = {
  side_quest: `dlc_side_quest_intro:
  - speaker: "Guide"
    text: "A new adventure awaits! Are you ready for a side quest?"
    choices:
      - text: "Yes, let's go!"
        actions:
          - type: setFlag
            flag: "side_quest_started"
        goto: "dlc_side_quest_main"
      - text: "Maybe later"
        goto: "dlc_side_quest_declined"

dlc_side_quest_main:
  - speaker: "Guide"
    text: "Excellent! Your quest is to find the mysterious artifact."
    actions:
      - type: setVar
        key: "quest_progress"
        value: 0
  - text: "You set off on your new adventure..."
    actions:
      - type: addTime
        minutes: 30
  - text: "What do you do first?"
    choices:
      - text: "Explore the forest"
        actions:
          - type: setVar
            key: "location"
            value: "forest"
        goto: "dlc_side_quest_complete"
      - text: "Visit the village"
        actions:
          - type: setVar
            key: "location"
            value: "village"
        goto: "dlc_side_quest_complete"

dlc_side_quest_complete:
  - text: "After exploring {{getVar 'location'}}, you successfully complete your quest!"
    actions:
      - type: setFlag
        flag: "side_quest_completed"
      - type: setVar
        key: "quest_progress"
        value: 100

dlc_side_quest_declined:
  - speaker: "Guide"
    text: "No worries! The quest will be here when you're ready."
    actions:
      - type: setFlag
        flag: "side_quest_available"`,

  character_story: `dlc_character_backstory:
  - speaker: "Alex"
    text: "I haven't told you much about my past, have I?"
    actions:
      - type: setFlag
        flag: "character_story_started"
  - text: "Alex looks thoughtful, as if deciding whether to share something important."
  - speaker: "Alex"
    text: "Would you like to hear about my childhood?"
    choices:
      - text: "I'd love to hear it"
        actions:
          - type: addVar
            key: "relationship_points"
            value: 1
        goto: "dlc_character_reveal"
      - text: "Only if you want to share"
        goto: "dlc_character_reveal"
      - text: "Maybe another time"
        goto: "dlc_character_postponed"

dlc_character_reveal:
  - speaker: "Alex"
    text: "I grew up in a small village far from here. My family ran the local bakery."
  - text: "As Alex tells their story, you feel like you understand them better."
    actions:
      - type: setVar
        key: "character_understanding"
        value: true
      - type: setFlag
        flag: "alex_backstory_known"

dlc_character_postponed:
  - speaker: "Alex"
    text: "That's okay. Maybe when we know each other better."`,

  bonus_ending: `dlc_bonus_ending_check:
  - if: "hasFlag 'main_story_complete'"
    then:
      - text: "As you reflect on your journey, you realize there might be more to discover..."
        goto: "dlc_bonus_ending_unlock"
    else:
      - text: "Complete the main story first to unlock this bonus content."

dlc_bonus_ending_unlock:
  - text: "Suddenly, a new path reveals itself - one you hadn't noticed before."
  - speaker: "Secret Character"
    text: "Well done on your journey. There is one more secret I can share with you."
    actions:
      - type: setFlag
        flag: "bonus_ending_unlocked"
  - text: "What would you like to know?"
    choices:
      - text: "Tell me the secret"
        goto: "dlc_bonus_secret_reveal"
      - text: "I'm satisfied with my journey"
        goto: "dlc_bonus_ending_decline"

dlc_bonus_secret_reveal:
  - speaker: "Secret Character"
    text: "The real treasure was the friends you made along the way... and this magical amulet!"
    actions:
      - type: setVar
        key: "bonus_reward"
        value: "Amulet of Friendship"
      - type: setFlag
        flag: "secret_ending_complete"

dlc_bonus_ending_decline:
  - text: "You choose to leave some mysteries unsolved. Sometimes that's the wisest choice."`,

  prequel: `dlc_prequel_start:
  - text: "Long before the main events began..."
    actions:
      - type: setVar
        key: "timeline"
        value: "past"
  - speaker: "Narrator"
    text: "This is the story of how everything started."
  - text: "In a time of peace, before the great conflict..."
  - text: "What aspect of the past interests you most?"
    choices:
      - text: "The origins of the conflict"
        actions:
          - type: setVar
            key: "prequel_path"
            value: "conflict_origins"
        goto: "dlc_prequel_conflict"
      - text: "Character relationships"
        actions:
          - type: setVar
            key: "prequel_path"
            value: "relationships"
        goto: "dlc_prequel_relationships"

dlc_prequel_conflict:
  - text: "The seeds of conflict were planted years ago..."
  - speaker: "Elder"
    text: "I remember when the first signs appeared. No one took them seriously."
    actions:
      - type: setVar
        key: "prequel_knowledge"
        value: "conflict_origins_learned"

dlc_prequel_relationships:
  - text: "The relationships that would define the future were already forming..."
  - speaker: "Young Character"
    text: "We were all so different back then, yet somehow we found each other."
    actions:
      - type: setVar
        key: "prequel_knowledge"
        value: "relationships_learned"`,

  epilogue: `dlc_epilogue_start:
  - if: "hasFlag 'main_story_complete'"
    then:
      - text: "Six months after the events of your adventure..."
        actions:
          - type: setVar
            key: "timeline"
            value: "future"
          - type: addTime
            minutes: 4320
      - text: "Life has settled into a peaceful routine."
      - text: "You often think about the choices you made and their consequences."
      - text: "What do you do on this particular day?"
        choices:
          - text: "Visit old friends"
            goto: "dlc_epilogue_friends"
          - text: "Explore new places"
            goto: "dlc_epilogue_exploration"
          - text: "Reflect on your journey"
            goto: "dlc_epilogue_reflection"
    else:
      - text: "This epilogue requires completing the main story first."

dlc_epilogue_friends:
  - text: "You decide to visit the friends you made during your adventure."
  - speaker: "Friend"
    text: "It's so good to see you! How have you been?"
    actions:
      - type: setVar
        key: "epilogue_choice"
        value: "reconnected_with_friends"

dlc_epilogue_exploration:
  - text: "With your new experience, you set out to explore places you've never been."
  - text: "Each new discovery reminds you of how much you've grown."
    actions:
      - type: setVar
        key: "epilogue_choice"
        value: "continued_exploring"

dlc_epilogue_reflection:
  - text: "You spend time reflecting on your journey and what it meant to you."
  - text: "The person you've become is shaped by every choice you made."
    actions:
      - type: setVar
        key: "epilogue_choice"
        value: "self_reflection"`,

  alternate_path: `dlc_alternate_choice_point:
  - text: "At a crucial moment in your original journey, you had made a different choice..."
    actions:
      - type: setFlag
        flag: "alternate_timeline"
  - text: "Instead of your original decision, you had chosen differently."
  - speaker: "Mysterious Voice"
    text: "Let me show you what could have been..."
  - text: "This alternate path reveals:"
    choices:
      - text: "A different relationship outcome"
        actions:
          - type: setVar
            key: "alternate_focus"
            value: "relationships"
        goto: "dlc_alternate_relationships"
      - text: "A different ending"
        actions:
          - type: setVar
            key: "alternate_focus"
            value: "ending"
        goto: "dlc_alternate_ending"

dlc_alternate_relationships:
  - text: "In this timeline, your relationships developed very differently..."
  - speaker: "Character"
    text: "We could have been so much more to each other."
    actions:
      - type: setVar
        key: "alternate_outcome"
        value: "different_relationships"

dlc_alternate_ending:
  - text: "The ending of your story takes a completely different turn..."
  - text: "Sometimes the path not taken leads to unexpected destinations."
    actions:
      - type: setVar
        key: "alternate_outcome"
        value: "different_ending"`,
};

// ===== DATA MODELS =====
interface Script {
  id: string;
  name: string;
  path: string;
  description: string;
  category: "featured" | "demo" | "example" | "advanced";
  icon: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  features: string[];
  version?: string;
  content?: string;
}

interface ValidationDisplayResult {
  type: "success" | "warning" | "error";
  message: string;
}

// ===== SCRIPT LIBRARY =====
const SCRIPT_LIBRARY: Script[] = [
  {
    id: "helper-showcase",
    name: "Helper Showcase",
    path: "scripts/showcase.yaml",
    description: "All template helpers & VN Engine features.",
    category: "featured",
    icon: "🎭",
    difficulty: "Intermediate",
    features: ["Templates", "Logic"],
  },
  {
    id: "rpg-adventure",
    name: "RPG Adventure",
    path: "scripts/rpg-complete.yaml",
    description: "Full RPG: creation, combat, quests.",
    category: "featured",
    icon: "⚔️",
    difficulty: "Advanced",
    features: ["RPG", "Combat", "Quests"],
  },
  {
    id: "basic-demo",
    name: "Basic Demo",
    path: "scripts/basic-demo.yaml",
    description: "VN Engine fundamentals.",
    category: "demo",
    icon: "📚",
    difficulty: "Beginner",
    features: ["Dialogue", "Variables"],
  },
  {
    id: "simple-example",
    name: "Hello World",
    path: "scripts/examples/simple.yaml",
    description: "Simplest possible VN script.",
    category: "example",
    icon: "👋",
    difficulty: "Beginner",
    features: ["Basic Dialogue"],
  },
];

const OLLAMA_API_BASE_URL = "http://localhost:11434/api";
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const CLAUDE_API_BASE_URL = "https://api.anthropic.com/v1";

// ===== MAIN APPLICATION CLASS =====
class InfiniteDLCApp {
  private vnEngine: VNEngine = createVNEngine();
  private currentScript: Script | null = null;
  private generatedDLCContent: string | null = null;
  private selectedScriptElement: HTMLElement | null = null;
  private currentAIConfig: AIConfig = { provider: "ollama", model: "" };

  // UI Elements
  private aiStatusDot!: HTMLElement;
  private aiStatusText!: HTMLElement;
  private settingsBtn!: HTMLButtonElement;
  private helpBtn!: HTMLButtonElement;
  private scriptListContainer!: HTMLElement;
  private loadScriptBtn!: HTMLButtonElement;
  private analyzeBtn!: HTMLButtonElement;

  // AI Provider Elements
  private aiProviderSelect!: HTMLSelectElement;
  private aiSidebarStatus!: HTMLElement;
  private aiModelText!: HTMLElement;

  // Ollama Elements
  private ollamaConfig!: HTMLElement;
  private ollamaModelSelect!: HTMLSelectElement;

  // OpenAI Elements
  private openaiConfig!: HTMLElement;
  private openaiApiKey!: HTMLInputElement;
  private openaiModelSelect!: HTMLSelectElement;

  // Claude Elements
  private claudeConfig!: HTMLElement;
  private claudeApiKey!: HTMLInputElement;
  private claudeModelSelect!: HTMLSelectElement;

  // Rest of UI Elements
  private dlcTypeSelect!: HTMLSelectElement;
  private dlcToneSelect!: HTMLSelectElement;
  private sceneCountSelect!: HTMLSelectElement;
  private customInstructionsTextarea!: HTMLTextAreaElement;
  private generateDLCBtn!: HTMLButtonElement;
  private integrationModeSelect!: HTMLSelectElement;
  private namespaceInput!: HTMLInputElement;
  private validateDLCBtn!: HTMLButtonElement;
  private integrateBtn!: HTMLButtonElement;
  private workspaceTabs: NodeListOf<HTMLButtonElement>;
  private tabContents: NodeListOf<HTMLElement>;
  private generationProgressFill!: HTMLElement;
  private stepAnalyzeDisplayEl!: HTMLElement;
  private stepGenerateDisplayEl!: HTMLElement;
  private stepValidateDisplayEl!: HTMLElement;
  private stepIntegrateDisplayEl!: HTMLElement;
  private generationLogContainer!: HTMLElement;
  private analysisResultsContainer!: HTMLElement;
  private contentPreviewCodeEditor!: HTMLElement;
  private copyContentBtn!: HTMLButtonElement;
  private downloadContentBtn!: HTMLButtonElement;
  private validationResultsDisplay!: HTMLElement;
  private notificationsContainer!: HTMLElement;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.renderScriptList();
    this.updateUIState();
    this.initializeAIProvider();
  }

  private initializeElements(): void {
    // Header elements
    this.aiStatusDot = document.getElementById("ai-status")!;
    this.aiStatusText = document.getElementById("ai-status-text")!;
    this.settingsBtn = document.getElementById(
      "settings-btn"
    ) as HTMLButtonElement;
    this.helpBtn = document.getElementById("help-btn") as HTMLButtonElement;

    // Script elements
    this.scriptListContainer = document.getElementById("script-list")!;
    this.loadScriptBtn = document.getElementById(
      "load-script-btn"
    ) as HTMLButtonElement;
    this.analyzeBtn = document.getElementById(
      "analyze-btn"
    ) as HTMLButtonElement;

    // AI Provider elements
    this.aiProviderSelect = document.getElementById(
      "ai-provider-select"
    ) as HTMLSelectElement;
    this.aiSidebarStatus = document.getElementById("ai-sidebar-status")!;
    this.aiModelText = document.getElementById("ai-model-text")!;

    // Ollama elements
    this.ollamaConfig = document.getElementById("ollama-config")!;
    this.ollamaModelSelect = document.getElementById(
      "ollama-model-select"
    ) as HTMLSelectElement;

    // OpenAI elements
    this.openaiConfig = document.getElementById("openai-config")!;
    this.openaiApiKey = document.getElementById(
      "openai-api-key"
    ) as HTMLInputElement;
    this.openaiModelSelect = document.getElementById(
      "openai-model-select"
    ) as HTMLSelectElement;

    // Claude elements
    this.claudeConfig = document.getElementById("claude-config")!;
    this.claudeApiKey = document.getElementById(
      "claude-api-key"
    ) as HTMLInputElement;
    this.claudeModelSelect = document.getElementById(
      "claude-model-select"
    ) as HTMLSelectElement;

    // DLC Generation elements
    this.dlcTypeSelect = document.getElementById(
      "dlc-type"
    ) as HTMLSelectElement;
    this.dlcToneSelect = document.getElementById(
      "dlc-tone"
    ) as HTMLSelectElement;
    this.sceneCountSelect = document.getElementById(
      "scene-count"
    ) as HTMLSelectElement;
    this.customInstructionsTextarea = document.getElementById(
      "custom-instructions"
    ) as HTMLTextAreaElement;
    this.generateDLCBtn = document.getElementById(
      "generate-dlc-btn"
    ) as HTMLButtonElement;

    // Integration elements
    this.integrationModeSelect = document.getElementById(
      "integration-mode"
    ) as HTMLSelectElement;
    this.namespaceInput = document.getElementById(
      "namespace"
    ) as HTMLInputElement;
    this.validateDLCBtn = document.getElementById(
      "validate-btn"
    ) as HTMLButtonElement;
    this.integrateBtn = document.getElementById(
      "integrate-btn"
    ) as HTMLButtonElement;

    // Workspace elements
    this.workspaceTabs = document.querySelectorAll(".workspace-tab");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.generationProgressFill = document.getElementById(
      "generation-progress"
    )!;
    this.stepAnalyzeDisplayEl = document.getElementById(
      "step-analyze-display"
    )!;
    this.stepGenerateDisplayEl = document.getElementById(
      "step-generate-display"
    )!;
    this.stepValidateDisplayEl = document.getElementById(
      "step-validate-display"
    )!;
    this.stepIntegrateDisplayEl = document.getElementById(
      "step-integrate-display"
    )!;
    this.generationLogContainer = document.getElementById("generation-log")!;
    this.analysisResultsContainer =
      document.getElementById("analysis-results")!;
    this.contentPreviewCodeEditor = document.getElementById("content-preview")!;
    this.copyContentBtn = document.getElementById(
      "copy-content-btn"
    ) as HTMLButtonElement;
    this.downloadContentBtn = document.getElementById(
      "download-content-btn"
    ) as HTMLButtonElement;
    this.validationResultsDisplay =
      document.getElementById("validation-results")!;
    this.notificationsContainer = document.getElementById("notifications")!;
  }

  private setupEventListeners(): void {
    // Collapsible sections
    document.querySelectorAll(".section-header").forEach((header) => {
      header.addEventListener("click", () => {
        const content = header.nextElementSibling as HTMLElement;
        const arrow = header.querySelector("span:last-child")!;
        content.classList.toggle("open");
        arrow.textContent = content.classList.contains("open") ? "▲" : "▼";
      });
    });

    // Workspace tabs
    this.workspaceTabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab!));
    });

    // Main buttons
    this.loadScriptBtn.addEventListener("click", () =>
      this.loadSelectedScript()
    );
    this.analyzeBtn.addEventListener("click", () => this.analyzeScript());
    this.generateDLCBtn.addEventListener("click", () => this.generateDLC());
    this.validateDLCBtn.addEventListener("click", () =>
      this.validateGeneratedDLC()
    );
    this.integrateBtn.addEventListener("click", () =>
      this.integrateGeneratedDLC()
    );

    // Content actions
    this.copyContentBtn.addEventListener("click", () =>
      this.copyGeneratedContent()
    );
    this.downloadContentBtn.addEventListener("click", () =>
      this.downloadGeneratedContent()
    );

    // AI Provider selection
    this.aiProviderSelect.addEventListener("change", () =>
      this.switchAIProvider()
    );

    // Model selections
    this.ollamaModelSelect.addEventListener("change", () =>
      this.updateAIConfig()
    );
    this.openaiModelSelect.addEventListener("change", () =>
      this.updateAIConfig()
    );
    this.claudeModelSelect.addEventListener("change", () =>
      this.updateAIConfig()
    );

    // API Key inputs
    this.openaiApiKey.addEventListener("input", () => this.updateAIConfig());
    this.claudeApiKey.addEventListener("input", () => this.updateAIConfig());

    // VN Engine events
    this.vnEngine.on("loaded", () => {
      this.showNotification(
        "Engine: Script loaded and parsed successfully.",
        "success"
      );
    });

    this.vnEngine.on("error", (errorMessage: string) => {
      this.showNotification(`Engine Error: ${errorMessage}`, "error");
    });
  }

  // ===== AI PROVIDER MANAGEMENT =====
  private async initializeAIProvider(): Promise<void> {
    await this.switchAIProvider();
  }

  private async switchAIProvider(): Promise<void> {
    const provider = this.aiProviderSelect.value as AIProvider;
    this.currentAIConfig.provider = provider;

    // Hide all config sections
    this.ollamaConfig.style.display = "none";
    this.openaiConfig.style.display = "none";
    this.claudeConfig.style.display = "none";

    // Show relevant config section
    switch (provider) {
      case "ollama":
        this.ollamaConfig.style.display = "block";
        await this.populateOllamaModels();
        break;
      case "openai":
        this.openaiConfig.style.display = "block";
        this.updateAIConfig();
        break;
      case "claude":
        this.claudeConfig.style.display = "block";
        this.updateAIConfig();
        break;
    }

    await this.checkAIStatus();
  }

  private updateAIConfig(): void {
    const provider = this.currentAIConfig.provider;

    switch (provider) {
      case "ollama":
        this.currentAIConfig.model = this.ollamaModelSelect.value;
        this.currentAIConfig.apiKey = undefined;
        break;
      case "openai":
        this.currentAIConfig.model = this.openaiModelSelect.value;
        this.currentAIConfig.apiKey = this.openaiApiKey.value;
        break;
      case "claude":
        this.currentAIConfig.model = this.claudeModelSelect.value;
        this.currentAIConfig.apiKey = this.claudeApiKey.value;
        break;
    }

    this.updateModelText();
    this.checkAIStatus();
    this.updateUIState();
  }

  private updateModelText(): void {
    const { provider, model } = this.currentAIConfig;

    if (!model) {
      this.aiModelText.textContent = `${provider.toUpperCase()}: No model selected`;
      return;
    }

    const displayModel = model.split(":")[0]; // Remove version tag for display
    this.aiModelText.textContent = `${provider.toUpperCase()}: ${displayModel}`;
  }

  private async checkAIStatus(): Promise<void> {
    const { provider, apiKey, model } = this.currentAIConfig;

    this.aiStatusText.textContent = `Checking ${provider.toUpperCase()}...`;

    try {
      let isConnected = false;

      switch (provider) {
        case "ollama":
          isConnected = await this.checkOllamaStatus();
          break;
        case "openai":
          isConnected = await this.checkOpenAIStatus(apiKey);
          break;
        case "claude":
          isConnected = await this.checkClaudeStatus(apiKey);
          break;
      }

      this.aiStatusDot.classList.toggle("connected", isConnected);
      this.aiSidebarStatus.classList.toggle("connected", isConnected);

      if (isConnected && model) {
        const displayModel = model.split(":")[0];
        this.aiStatusText.textContent = `${provider.toUpperCase()} Connected (${displayModel})`;
      } else if (isConnected) {
        this.aiStatusText.textContent = `${provider.toUpperCase()} Connected (No model selected)`;
      } else {
        this.aiStatusText.textContent = `${provider.toUpperCase()} Disconnected`;
      }
    } catch (error) {
      this.aiStatusDot.classList.remove("connected");
      this.aiSidebarStatus.classList.remove("connected");
      this.aiStatusText.textContent = `${provider.toUpperCase()} Error`;
      console.error(`${provider} connection error:`, error);
    }

    this.updateUIState();
  }

  private async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_API_BASE_URL}/tags`);
      if (!response.ok) {
        this.showNotification(
          "Ollama service not reachable. Please ensure Ollama is running.",
          "error"
        );
        return false;
      }
      return true;
    } catch (error) {
      this.showNotification(
        "Error connecting to Ollama. Check console for details.",
        "error"
      );
      return false;
    }
  }

  private async checkOpenAIStatus(apiKey?: string): Promise<boolean> {
    if (!apiKey) {
      this.showNotification("OpenAI API key required.", "warning");
      return false;
    }

    try {
      const response = await fetch(`${OPENAI_API_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.showNotification("Invalid OpenAI API key.", "error");
        } else {
          this.showNotification("Error connecting to OpenAI API.", "error");
        }
        return false;
      }
      return true;
    } catch (error) {
      this.showNotification(
        "Error connecting to OpenAI. Check console for details.",
        "error"
      );
      return false;
    }
  }

  private async checkClaudeStatus(apiKey?: string): Promise<boolean> {
    if (!apiKey) {
      this.showNotification("Claude API key required.", "warning");
      return false;
    }

    // For Claude, we'll just validate the API key format since there's no public endpoint to test
    if (!apiKey.startsWith("sk-ant-")) {
      this.showNotification(
        'Invalid Claude API key format. Should start with "sk-ant-".',
        "error"
      );
      return false;
    }

    return true; // Assume valid if format is correct
  }

  private async populateOllamaModels(): Promise<void> {
    this.aiModelText.textContent = "Ollama: Loading...";
    try {
      const response = await fetch(`${OLLAMA_API_BASE_URL}/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      const data: OllamaTagsResponse = await response.json();

      this.ollamaModelSelect.innerHTML =
        '<option value="">Select Model...</option>';
      if (data.models && data.models.length > 0) {
        data.models.forEach((model) => {
          const option = document.createElement("option");
          option.value = model.name;
          option.textContent = model.name;
          this.ollamaModelSelect.appendChild(option);
        });
      } else {
        this.aiModelText.textContent = "Ollama: No models found";
        this.showNotification(
          "No Ollama models found. Please pull some models.",
          "warning"
        );
      }
    } catch (error) {
      this.aiModelText.textContent = "Ollama: Error loading";
      this.showNotification("Failed to load Ollama models.", "error");
      console.error("Populate Ollama models error:", error);
    }
    this.updateAIConfig();
  }

  // ===== SCRIPT MANAGEMENT =====
  private renderScriptList(): void {
    this.scriptListContainer.innerHTML = "";
    SCRIPT_LIBRARY.forEach((script) => {
      const item = document.createElement("div");
      item.className = "script-item";
      item.dataset.scriptId = script.id;
      item.innerHTML = `
        <div class="script-name">${script.icon} ${script.name}</div>
        <div class="script-info">${
          script.difficulty
        } • ${script.description.substring(0, 30)}...</div>
      `;
      item.addEventListener("click", () => this.selectScript(item, script));
      this.scriptListContainer.appendChild(item);
    });
  }

  private selectScript(element: HTMLElement, script: Script): void {
    if (this.selectedScriptElement) {
      this.selectedScriptElement.classList.remove("selected");
    }
    element.classList.add("selected");
    this.selectedScriptElement = element;
    this.currentScript = script;
    this.logGenerationMessage(
      `Selected base script: ${script.name}. Click "Load Script".`
    );
    this.updateUIState();
  }

  private async loadSelectedScript(): Promise<void> {
    if (!this.currentScript || !this.selectedScriptElement) {
      this.showNotification("Please select a script first.", "warning");
      return;
    }

    const scriptToLoad = this.currentScript;
    this.logGenerationMessage(`Loading script: ${scriptToLoad.name}...`);
    this.resetProgressSteps();

    try {
      const response = await fetch(scriptToLoad.path);
      if (!response.ok)
        throw new Error(
          `HTTP error ${response.status} while fetching ${scriptToLoad.path}`
        );
      const content = await response.text();

      scriptToLoad.content = content;
      this.vnEngine.loadScript(content, scriptToLoad.path);

      if (this.vnEngine.getIsLoaded()) {
        this.currentScript = scriptToLoad;
        this.logGenerationMessage(
          `Script "${scriptToLoad.name}" loaded into engine. Ready for analysis.`
        );
        this.updateProgressStep("analyze", "active");
      } else {
        this.logGenerationMessage(
          `Engine failed to load script "${scriptToLoad.name}".`
        );
        this.currentScript = null;
        if (
          this.selectedScriptElement &&
          this.selectedScriptElement.dataset.scriptId === scriptToLoad.id
        ) {
          this.selectedScriptElement.classList.remove("selected");
          this.selectedScriptElement = null;
        }
      }
    } catch (error: any) {
      this.showNotification(
        `Failed to load script "${scriptToLoad.name}": ${error.message}`,
        "error"
      );
      this.logGenerationMessage(
        `Error during script loading: ${error.message}`
      );
      this.currentScript = null;
      if (
        this.selectedScriptElement &&
        this.selectedScriptElement.dataset.scriptId === scriptToLoad.id
      ) {
        this.selectedScriptElement.classList.remove("selected");
        this.selectedScriptElement = null;
      }
    }
    this.updateUIState();
  }

  // ===== DLC GENERATION PIPELINE =====
  private async analyzeScript(): Promise<void> {
    if (
      !this.currentScript ||
      !this.currentScript.content ||
      !this.vnEngine.getIsLoaded()
    ) {
      this.showNotification(
        "Please load a script successfully first.",
        "warning"
      );
      return;
    }

    this.logGenerationMessage(
      `Analyzing script: ${this.currentScript.name}...`
    );
    this.analysisResultsContainer.innerHTML = `<p>Analyzing "${this.currentScript.name}"...</p><div class="loader"></div>`;
    this.switchTab("analysis");
    this.updateProgressStep("analyze", "active", 50);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const sceneNames = this.vnEngine.getSceneNames();
      const hasUpgradedContent = this.vnEngine.hasDLCContent();
      const upgradeStats = this.vnEngine.getUpgradeStats();

      const analysisText = `
        <h3>Script Analysis: ${this.currentScript.name}</h3>
        <p><strong>Path:</strong> ${this.currentScript.path}</p>
        <p><strong>Total Scenes:</strong> ${sceneNames.length}</p>
        <p><strong>Base Scenes:</strong> ${upgradeStats.baseScenes}</p>
        <p><strong>DLC Scenes:</strong> ${upgradeStats.estimatedDLCScenes}</p>
        <p><strong>Has Upgraded Content:</strong> ${
          hasUpgradedContent ? "Yes" : "No"
        }</p>
        ${
          upgradeStats.namespaces.length > 0
            ? `<p><strong>Namespaces:</strong> ${upgradeStats.namespaces.join(
                ", "
              )}</p>`
            : ""
        }
        <p><strong>Scene Names:</strong></p>
        <ul>${sceneNames.map((name) => `<li>${name}</li>`).join("")}</ul>
        <p><em>Analysis complete. Ready for DLC generation.</em></p>
      `;

      this.analysisResultsContainer.innerHTML = analysisText;
      this.logGenerationMessage(
        `Analysis complete for "${this.currentScript.name}".`
      );
      this.showNotification("Script analysis complete.", "success");
      this.updateProgressStep("analyze", "complete");
      this.updateProgressStep("generate", "active");
    } catch (error: any) {
      this.logGenerationMessage(`Error during analysis: ${error.message}`);
      this.showNotification(`Analysis failed: ${error.message}`, "error");
      this.analysisResultsContainer.innerHTML = `<p style="color: red;">Analysis failed: ${error.message}</p>`;
      this.updateProgressStep("analyze", "active", 0);
    }
    this.updateUIState();
  }

  private async generateDLC(): Promise<void> {
    if (
      !this.currentScript ||
      !this.currentScript.content ||
      !this.vnEngine.getIsLoaded()
    ) {
      this.showNotification(
        "Please load and analyze a script first.",
        "warning"
      );
      return;
    }

    this.logGenerationMessage("Starting DLC generation...");
    this.generatedDLCContent = null;
    this.contentPreviewCodeEditor.textContent = "# Generating DLC content...";
    this.switchTab("preview");
    this.updateProgressStep("generate", "active", 0);

    const dlcType = this.dlcTypeSelect.value;
    const tone = this.dlcToneSelect.value;
    const sceneCount = parseInt(this.sceneCountSelect.value, 10);
    const customInstructions = this.customInstructionsTextarea.value;
    const useAI = this.isAIReady();

    try {
      // Start with template
      let dlcContent =
        DLC_TEMPLATES[dlcType as keyof typeof DLC_TEMPLATES] ||
        DLC_TEMPLATES.side_quest;
      this.updateProgressStep("generate", "active", 30);

      // Enhance with AI if available
      if (useAI) {
        this.logGenerationMessage(
          `Enhancing template with ${this.currentAIConfig.provider.toUpperCase()}...`
        );
        dlcContent = await this.enhanceWithAI(
          dlcContent,
          dlcType,
          tone,
          sceneCount,
          customInstructions
        );
      } else {
        this.logGenerationMessage("Using template without AI enhancement.");
        dlcContent = this.customizeTemplate(
          dlcContent,
          dlcType,
          tone,
          sceneCount,
          customInstructions
        );
      }

      this.updateProgressStep("generate", "active", 90);

      this.generatedDLCContent = dlcContent;
      this.contentPreviewCodeEditor.textContent = this.generatedDLCContent;
      this.logGenerationMessage("DLC content generated successfully.");
      this.showNotification("DLC content generated!", "success");
      this.updateProgressStep("generate", "complete");
      this.updateProgressStep("validate", "active");
    } catch (error: any) {
      console.error("DLC Generation Error:", error);
      this.generatedDLCContent = `# Error generating DLC: ${error.message}\n\n# Using fallback template:\n\n${DLC_TEMPLATES.side_quest}`;
      this.contentPreviewCodeEditor.textContent = this.generatedDLCContent;
      this.logGenerationMessage(`Error generating DLC: ${error.message}`);
      this.showNotification(`DLC generation failed: ${error.message}`, "error");
      this.updateProgressStep("generate", "active", 0);
    }
    this.updateUIState();
  }

  private isAIReady(): boolean {
    const { provider, model, apiKey } = this.currentAIConfig;

    if (!model) return false;

    switch (provider) {
      case "ollama":
        return this.aiStatusDot.classList.contains("connected");
      case "openai":
      case "claude":
        return !!(apiKey && this.aiStatusDot.classList.contains("connected"));
      default:
        return false;
    }
  }

  private async enhanceWithAI(
    template: string,
    dlcType: string,
    tone: string,
    sceneCount: number,
    customInstructions: string
  ): Promise<string> {
    const namespace = this.namespaceInput.value || "dlc";

    const prompt = `You are an expert visual novel writer creating DLC content for VN Engine. You must create a COMPLETE, self-contained story with ALL scenes properly defined.

BASE TEMPLATE TO ENHANCE:
${template}

REQUIREMENTS:
- DLC Type: ${dlcType}
- Tone: ${tone} 
- Target: ${sceneCount} scenes total
- Custom Instructions: ${customInstructions || "Create an engaging story"}
- Scene Prefix: All scenes must start with "${namespace}_"

CRITICAL RULES - FOLLOW EXACTLY:
1. EVERY scene referenced in 'goto' statements MUST be defined in your output
2. If you write "goto: ${namespace}_forest_path" then you MUST include a scene called "${namespace}_forest_path"
3. Create a complete story arc with beginning, middle, and end
4. All scenes must connect logically - no dead ends or missing links
5. Use proper YAML syntax with correct indentation

STORY STRUCTURE GUIDE:
- Start with an intro scene that sets up the premise
- Include 2-3 middle scenes with choices and character development  
- Add a conclusion scene that wraps up the story
- Each scene should be substantial (3-5 dialogue/text blocks)
- Choices should feel meaningful and lead to existing scenes

VN ENGINE FEATURES TO USE:
- Speaker dialogue: speaker: "Character Name"
- Player choices with consequences
- Actions: setVar, setFlag, addTime, addToList
- Conditional text: if/then/else blocks
- Template variables: {{getVar 'variable'}} {{hasFlag 'flag'}}

TONE GUIDELINES FOR "${tone}":
${this.getToneGuidelines(tone)}

SCENE NAMING EXAMPLES:
✓ ${namespace}_intro (good)
✓ ${namespace}_forest_encounter (good) 
✓ ${namespace}_final_choice (good)
✗ forest_path (missing prefix)
✗ intro (missing prefix)

VALIDATION CHECKLIST - Verify before responding:
□ All scene names start with "${namespace}_"
□ Every 'goto' target has a matching scene definition
□ Story has a clear beginning, middle, and end
□ YAML syntax is correct (proper colons, hyphens, indentation)
□ Each scene has engaging content (not just placeholders)
□ Choices lead to scenes that actually exist
□ Story matches the ${tone} tone throughout

EXAMPLE STRUCTURE:
${namespace}_intro:
  - "Story opening..."
  - text: "First choice:"
    choices:
      - text: "Option A"
        goto: "${namespace}_path_a"
      - text: "Option B" 
        goto: "${namespace}_path_b"

${namespace}_path_a:
  - "Content for path A..."
  - goto: "${namespace}_conclusion"

${namespace}_path_b:
  - "Content for path B..."
  - goto: "${namespace}_conclusion"

${namespace}_conclusion:
  - "Story ending..."

OUTPUT: Return ONLY the complete YAML content. No markdown fences, no explanations, no comments. Just valid YAML that defines ALL referenced scenes.`;

    this.logGenerationMessage(
      `Generating enhanced ${dlcType} content with ${this.currentAIConfig.provider.toUpperCase()}...`
    );

    switch (this.currentAIConfig.provider) {
      case "ollama":
        return await this.callOllama(prompt);
      case "openai":
        return await this.callOpenAI(prompt);
      case "claude":
        return await this.callClaude(prompt);
      default:
        throw new Error(
          `Unsupported AI provider: ${this.currentAIConfig.provider}`
        );
    }
  }

  private getToneGuidelines(tone: string): string {
    const guidelines = {
      match_original:
        "Match the tone and style of the base game. Keep consistency with existing characters and world.",
      lighthearted:
        "Use humor, optimism, and cheerful dialogue. Include jokes, puns, and upbeat situations. Keep conflicts light.",
      dramatic:
        "Create emotional intensity, serious conflicts, and meaningful stakes. Use powerful dialogue and impactful moments.",
      mysterious:
        "Build suspense and intrigue. Include secrets, puzzles, and atmospheric descriptions. Leave some questions unanswered.",
      romantic:
        "Focus on relationships, emotional connections, and heartfelt moments. Include tender dialogue and relationship development.",
      action_packed:
        "Emphasize excitement, fast-paced events, and dynamic choices. Include combat, chases, and high-energy scenarios.",
    };

    return (
      guidelines[tone as keyof typeof guidelines] ||
      "Create engaging content that fits the specified tone."
    );
  }

  private async callOllama(prompt: string): Promise<string> {
    const response = await fetch(`${OLLAMA_API_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.currentAIConfig.model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const result: OllamaGenerateResponse = await response.json();
    return this.cleanYamlResponse(result.response);
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content:
          "You are an expert visual novel content creator. Generate enhanced YAML content for VN Engine based on templates and requirements. Return only valid YAML without explanations or markdown formatting.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.currentAIConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: this.currentAIConfig.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result: OpenAIResponse = await response.json();
    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    return this.cleanYamlResponse(content);
  }

  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch(`${CLAUDE_API_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.currentAIConfig.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.currentAIConfig.model,
        max_tokens: 2000,
        system:
          "You are an expert visual novel content creator. Generate enhanced YAML content for VN Engine based on templates and requirements. Return only valid YAML without explanations or markdown formatting.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result: ClaudeResponse = await response.json();
    const content = result.content[0]?.text;
    if (!content) {
      throw new Error("No content returned from Claude");
    }

    return this.cleanYamlResponse(content);
  }

  private cleanYamlResponse(response: string): string {
    let cleaned = response.trim();

    // Remove code fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleaned.match(fenceRegex);
    if (match && match[2]) {
      cleaned = match[2].trim();
    }

    return cleaned;
  }

  private customizeTemplate(
    template: string,
    dlcType: string,
    tone: string,
    sceneCount: number,
    customInstructions: string
  ): string {
    let customized = template;

    // Apply namespace prefix
    const namespace = this.namespaceInput.value || "dlc";
    customized = customized.replace(/dlc_/g, `${namespace}_`);

    // Add custom instructions as a comment if provided
    if (customInstructions) {
      customized = `# Custom Instructions: ${customInstructions}\n\n${customized}`;
    }

    // Add tone information as a variable
    customized = customized.replace(
      /actions:\s*\n(\s*- type: setFlag)/,
      `actions:\n$1\n        - type: setVar\n          key: "dlc_tone"\n          value: "${tone}"`
    );

    return customized;
  }

  private async validateGeneratedDLC(): Promise<void> {
    if (!this.generatedDLCContent) {
      this.showNotification(
        "No DLC content to validate. Please generate DLC first.",
        "warning"
      );
      return;
    }
    if (!this.currentScript || !this.vnEngine.getIsLoaded()) {
      this.showNotification(
        "Base script not loaded. Cannot validate DLC.",
        "warning"
      );
      return;
    }

    this.logGenerationMessage("Validating generated DLC content...");
    this.validationResultsDisplay.innerHTML = "<p>Validating...</p>";
    this.switchTab("validation");
    this.updateProgressStep("validate", "active", 50);

    const options: ScriptUpgradeOptions = {
      mode: this.integrationModeSelect.value as "additive" | "replace",
      namespace: this.namespaceInput.value || "dlc",
      validateState: true,
    };

    try {
      // 🔧 FIX: Get the current base scenes properly
      const baseScenes = this.vnEngine.getAllScenes();
      console.log("🔍 Base scenes available:", baseScenes?.length || 0);
      console.log("🔍 Base scene names:", baseScenes?.map((s) => s.name) || []);

      // Parse DLC content
      const dlcScenes = this.scriptParser.parse(
        this.generatedDLCContent,
        "validation-dlc.yaml"
      );
      console.log("🔍 DLC scenes parsed:", dlcScenes.length);
      console.log(
        "🔍 DLC scene names:",
        dlcScenes.map((s) => s.name)
      );

      // 🔧 FIX: Handle case where no base scenes exist (new script)
      const currentScenes = baseScenes || [];

      // Create upgrader with proper dependencies
      const upgrader = new ScriptUpgrader(
        this.gameState, // You'll need to expose this
        this.vnEngine, // ScriptEngine
        this.scriptParser // ScriptParser
      );

      // Validate the upgrade
      const validationResult = upgrader.validateUpgrade(
        currentScenes,
        dlcScenes,
        options
      );

      // Display results
      let resultsHTML = "<h3>Validation Results:</h3>";
      const displayResults: ValidationDisplayResult[] = [];

      if (validationResult.valid) {
        displayResults.push({
          type: "success",
          message: "DLC content is valid and can be integrated.",
        });
        if (validationResult.wouldAddScenes.length > 0) {
          displayResults.push({
            type: "success",
            message: `Would add scenes: ${validationResult.wouldAddScenes.join(
              ", "
            )}`,
          });
        }
        if (validationResult.wouldReplaceScenes.length > 0) {
          displayResults.push({
            type: "success",
            message: `Would replace scenes: ${validationResult.wouldReplaceScenes.join(
              ", "
            )}`,
          });
        }
        this.updateProgressStep("validate", "complete");
        this.updateProgressStep("integrate", "active");
      } else {
        displayResults.push({
          type: "error",
          message: "DLC content has validation issues.",
        });
        validationResult.errors?.forEach((err) => {
          displayResults.push({
            type: "error",
            message: `Error: ${err.message} (Code: ${err.code})`,
          });

          // 🔧 FIX: Add detailed debugging for reference errors
          if (
            err.code === "INVALID_REFERENCE" &&
            err.details?.invalidReferences
          ) {
            const availableScenes = [
              ...currentScenes.map((s) => s.name),
              ...dlcScenes.map((s) => s.name),
            ];
            console.log(
              "🔍 Invalid references:",
              err.details.invalidReferences
            );
            console.log("🔍 Available scenes after merge:", availableScenes);

            displayResults.push({
              type: "error",
              message: `Missing scenes: ${err.details.invalidReferences.join(
                ", "
              )}. Available: ${availableScenes.join(", ")}`,
            });
          }
        });
        this.updateProgressStep("validate", "active", 0);
      }

      validationResult.warnings?.forEach((warn) => {
        displayResults.push({ type: "warning", message: `Warning: ${warn}` });
      });

      this.validationResultsDisplay.innerHTML =
        resultsHTML +
        displayResults
          .map(
            (r) => `<div class="validation-item ${r.type}">${r.message}</div>`
          )
          .join("");

      this.logGenerationMessage(
        `Validation complete. ${
          validationResult.valid ? "No issues found." : "Issues found."
        }`
      );
      this.showNotification(
        `Validation: ${validationResult.valid ? "OK" : "Failed"}`,
        validationResult.valid ? "success" : "error"
      );
    } catch (error: any) {
      console.error("🔍 Full validation error:", error);
      this.logGenerationMessage(
        `Error during DLC validation: ${error.message}`
      );
      this.showNotification(
        `Validation process error: ${error.message}`,
        "error"
      );
      this.validationResultsDisplay.innerHTML = `<div class="validation-item error">Validation process error: ${error.message}</div>`;
      this.updateProgressStep("validate", "active", 0);
    }
    this.updateUIState();
  }

  private async integrateGeneratedDLC(): Promise<void> {
    if (!this.generatedDLCContent) {
      this.showNotification("No DLC content to integrate.", "warning");
      return;
    }
    if (!this.currentScript || !this.vnEngine.getIsLoaded()) {
      this.showNotification(
        "Base script not loaded. Cannot integrate DLC.",
        "warning"
      );
      return;
    }

    this.logGenerationMessage("Integrating DLC content...");
    this.updateProgressStep("integrate", "active", 50);

    const options: ScriptUpgradeOptions = {
      mode: this.integrationModeSelect.value as "additive" | "replace",
      namespace: this.namespaceInput.value || "dlc",
      validateState: true,
    };

    try {
      // Get current scenes
      const baseScenes = this.vnEngine.getAllScenes() || [];

      // Create upgrader
      const upgrader = new ScriptUpgrader(
        this.gameState,
        this.vnEngine,
        this.scriptParser
      );

      // Perform the upgrade
      const result = upgrader.upgrade(
        baseScenes,
        this.generatedDLCContent,
        options
      );

      if (result.success) {
        this.logGenerationMessage(
          `DLC integrated successfully. Added: ${
            result.addedScenes.join(", ") || "None"
          }. Replaced: ${result.replacedScenes.join(", ") || "None"}.`
        );
        this.showNotification("DLC integrated successfully!", "success");
        this.updateProgressStep("integrate", "complete");
        this.generatedDLCContent = null;
        this.contentPreviewCodeEditor.textContent =
          "# DLC Integrated. Generate new content or load another script.";

        // Update analysis to show new state
        this.analyzeScript();
      } else {
        this.logGenerationMessage(
          `DLC integration failed: ${result.error?.message}`
        );
        this.showNotification(
          `DLC integration failed: ${result.error?.message}`,
          "error"
        );
        this.updateProgressStep("integrate", "active", 0);
      }
    } catch (error: any) {
      this.logGenerationMessage(
        `Error during DLC integration: ${error.message}`
      );
      this.showNotification(
        `Integration process error: ${error.message}`,
        "error"
      );
      this.updateProgressStep("integrate", "active", 0);
    }
    this.updateUIState();
  }

  // ===== UI UTILITY METHODS =====
  private switchTab(tabId: string): void {
    this.tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabId}-tab`);
    });
    this.workspaceTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });
    this.logGenerationMessage(`Switched to ${tabId} tab.`);
  }

  private resetProgressSteps(): void {
    ["analyze", "generate", "validate", "integrate"].forEach((step) => {
      this.updateProgressStep(step as any, "pending");
    });
    this.generationProgressFill.style.width = "0%";
  }

  private getStepIconElement(
    stepDisplayElement: HTMLElement
  ): HTMLElement | null {
    return stepDisplayElement.querySelector(".step-icon");
  }

  private updateProgressStep(
    step: "analyze" | "generate" | "validate" | "integrate",
    status: "pending" | "active" | "complete",
    stepPercentage?: number
  ): void {
    let displayElement: HTMLElement | null = null;
    let iconElement: HTMLElement | null = null;
    let overallProgressTarget = 0;

    const stepCompletionValues = {
      analyze: 25,
      generate: 50,
      validate: 75,
      integrate: 100,
    };
    const previousStepCompletionValues = {
      analyze: 0,
      generate: 25,
      validate: 50,
      integrate: 75,
    };

    switch (step) {
      case "analyze":
        displayElement = this.stepAnalyzeDisplayEl;
        break;
      case "generate":
        displayElement = this.stepGenerateDisplayEl;
        break;
      case "validate":
        displayElement = this.stepValidateDisplayEl;
        break;
      case "integrate":
        displayElement = this.stepIntegrateDisplayEl;
        break;
    }

    if (displayElement) {
      iconElement = this.getStepIconElement(displayElement);
    }

    if (status === "complete") {
      overallProgressTarget = stepCompletionValues[step];
    } else if (status === "active") {
      const baseProgress = previousStepCompletionValues[step];
      const stepRange = stepCompletionValues[step] - baseProgress;
      overallProgressTarget =
        baseProgress + ((stepPercentage || 0) / 100) * stepRange;
    } else {
      overallProgressTarget = previousStepCompletionValues[step];
    }

    // Reset subsequent steps to pending if a prior step is not complete
    const stepsOrder: Array<"analyze" | "generate" | "validate" | "integrate"> =
      ["analyze", "generate", "validate", "integrate"];
    const currentStepIndex = stepsOrder.indexOf(step);

    if (status !== "complete") {
      for (let i = currentStepIndex + 1; i < stepsOrder.length; i++) {
        const subsequentStep = stepsOrder[i];
        let subsequentDisplayEl: HTMLElement | null = null;
        if (subsequentStep === "analyze")
          subsequentDisplayEl = this.stepAnalyzeDisplayEl;
        else if (subsequentStep === "generate")
          subsequentDisplayEl = this.stepGenerateDisplayEl;
        else if (subsequentStep === "validate")
          subsequentDisplayEl = this.stepValidateDisplayEl;
        else if (subsequentStep === "integrate")
          subsequentDisplayEl = this.stepIntegrateDisplayEl;

        if (subsequentDisplayEl) {
          const subsequentIconEl = this.getStepIconElement(subsequentDisplayEl);
          if (subsequentIconEl) {
            subsequentIconEl.className = "step-icon pending";
            subsequentIconEl.textContent =
              subsequentIconEl.dataset.stepNumber || "?";
          }
          subsequentDisplayEl.classList.remove("active", "complete");
          subsequentDisplayEl.classList.add("pending");
        }
      }
    }

    if (iconElement && displayElement) {
      iconElement.className = `step-icon ${status}`;
      const stepNumber = iconElement.dataset.stepNumber || "?";
      if (status === "complete") iconElement.textContent = "✓";
      else iconElement.textContent = stepNumber;

      displayElement.classList.remove("pending", "active", "complete");
      displayElement.classList.add(status);
    }

    this.generationProgressFill.style.width = `${Math.min(
      100,
      Math.max(0, overallProgressTarget)
    )}%`;
  }

  private logGenerationMessage(message: string): void {
    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement("p");
    logEntry.innerHTML = `<strong>[${time}]</strong> ${message}`;
    this.generationLogContainer.appendChild(logEntry);
    this.generationLogContainer.scrollTop =
      this.generationLogContainer.scrollHeight;
  }

  private updateUIState(): void {
    const scriptLoadedInEngine = this.vnEngine.getIsLoaded();
    const currentScriptSelected = !!this.currentScript;
    const analysisDone =
      this.stepAnalyzeDisplayEl.classList.contains("complete");
    const generationDone = !!this.generatedDLCContent;
    const validationDone =
      this.stepValidateDisplayEl.classList.contains("complete");
    const aiReady = this.isAIReady();

    this.loadScriptBtn.disabled = !currentScriptSelected;
    this.analyzeBtn.disabled = !scriptLoadedInEngine;
    this.generateDLCBtn.disabled = !(scriptLoadedInEngine && analysisDone);
    this.validateDLCBtn.disabled = !generationDone || !scriptLoadedInEngine;
    this.integrateBtn.disabled =
      !generationDone || !scriptLoadedInEngine || !validationDone;
    this.copyContentBtn.disabled = !generationDone;
    this.downloadContentBtn.disabled = !generationDone;
  }

  private copyGeneratedContent(): void {
    if (!this.generatedDLCContent) return;
    navigator.clipboard
      .writeText(this.generatedDLCContent)
      .then(() =>
        this.showNotification("DLC content copied to clipboard!", "success")
      )
      .catch((err) =>
        this.showNotification("Failed to copy content.", "error")
      );
  }

  private downloadGeneratedContent(): void {
    if (!this.generatedDLCContent) return;
    const blob = new Blob([this.generatedDLCContent], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const namespace = this.namespaceInput.value || "dlc";
    const dlcType = this.dlcTypeSelect.value || "custom";
    a.download = `${
      this.currentScript?.id || "basescript"
    }_${namespace}_${dlcType}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showNotification("DLC content download started.", "success");
  }

  private showNotification(
    message: string,
    type: "info" | "success" | "warning" | "error"
  ): void {
    const notification = document.createElement("div");
    notification.className = `notification ${type} fade-in`;
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.6; padding: 0 0 0 10px;">×</button>
      </div>
    `;
    this.notificationsContainer.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  new InfiniteDLCApp();
});
