import { createVNEngine } from "vn-engine";
import type { ScriptUpgradeOptions, UpgradeResult } from "vn-engine";

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
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  wouldAddScenes?: string[];
  status: "validating" | "valid" | "invalid";
  message?: string;
}

const SCRIPT_LIBRARY: Script[] = [
  {
    id: "helper-showcase",
    name: "Helper Showcase",
    path: "scripts/showcase.yaml",
    description:
      "Complete demonstration of all template helpers and VN Engine features",
    category: "featured",
    icon: "🎭",
    difficulty: "Intermediate",
    features: ["Template Helpers", "Advanced Logic", "Interactive Demo"],
  },
  {
    id: "rpg-adventure",
    name: "RPG Adventure",
    path: "scripts/rpg-complete.yaml",
    description:
      "Full RPG experience with character creation, combat, and quest system",
    category: "featured",
    icon: "⚔️",
    difficulty: "Advanced",
    features: [
      "Character Creation",
      "Combat System",
      "Inventory Management",
      "Quest System",
    ],
  },

  {
    id: "basic-demo",
    name: "Basic Demo",
    path: "scripts/basic-demo.yaml",
    description: "Introduction to VN Engine fundamentals and core concepts",
    category: "demo",
    icon: "📚",
    difficulty: "Beginner",
    features: ["Basic Dialogue", "Variables", "Simple Choices"],
  },

  {
    id: "simple-example",
    name: "Hello World",
    path: "scripts/examples/simple.yaml",
    description:
      "The simplest possible VN script - perfect for getting started",
    category: "example",
    icon: "👋",
    difficulty: "Beginner",
    features: ["Basic Dialogue", "Speaker Names"],
  },
  {
    id: "variables-example",
    name: "Variables Demo",
    path: "scripts/examples/variables.yaml",
    description: "Learn how to use variables and template rendering",
    category: "example",
    icon: "📊",
    difficulty: "Beginner",
    features: ["Variables", "Template Rendering"],
  },
  {
    id: "choices-example",
    name: "Choice System",
    path: "scripts/examples/choices.yaml",
    description: "Interactive choices and branching storylines",
    category: "example",
    icon: "🔀",
    difficulty: "Beginner",
    features: ["Choices", "Branching", "Navigation"],
  },

  {
    id: "advanced-helpers",
    name: "Advanced Helpers",
    path: "scripts/examples/advanced.yaml",
    description: "Complex scenarios showcasing advanced template helpers",
    category: "advanced",
    icon: "🔧",
    difficulty: "Advanced",
    features: ["Complex Logic", "Array Operations", "Math Helpers"],
  },

  {
    id: "christmas-dlc",
    name: "Winter Festival",
    path: "scripts/dlc/christmas-dlc.yaml",
    description:
      "Experience a magical winter festival with holiday-themed quests",
    category: "demo",
    icon: "🎄",
    difficulty: "Intermediate",
    features: ["Holiday Quests", "Winter Magic", "Festival Activities"],
  },
  {
    id: "bonus-content",
    name: "Secret Adventures",
    path: "scripts/dlc/bonus-content.yaml",
    description: "Unlock hidden paths and discover secret endings",
    category: "example",
    icon: "🎁",
    difficulty: "Beginner",
    features: ["Secret Paths", "Hidden Endings", "Bonus Scenes"],
  },
  {
    id: "asset-showcase",
    name: "Asset Management",
    path: "scripts/examples/asset-showcase.yaml",
    description:
      "Complete demonstration of multimedia asset handling and management",
    category: "featured",
    icon: "🎨",
    difficulty: "Intermediate",
    features: [
      "Asset Management",
      "Image Display",
      "Audio Playback",
      "File Validation",
    ],
  },

  {
    id: "basic-assets",
    name: "Basic Assets Demo",
    path: "scripts/examples/assets.yaml",
    description: "Simple introduction to using assets in your visual novels",
    category: "example",
    icon: "📁",
    difficulty: "Beginner",
    features: ["Asset Loading", "Image Display", "File Validation"],
  },
];

const DLC_COMPATIBILITY: Record<string, string[]> = {
  "scripts/rpg-complete.yaml": ["christmas-dlc"],
  "scripts/basic-demo.yaml": ["bonus-content"],
  "scripts/showcase.yaml": ["christmas-dlc", "bonus-content"],
  'scripts/asset-showcase.yaml': ['bonus-content'],
};

class VNEngineDemo {
  private vnEngine: Awaited<ReturnType<typeof createVNEngine>>;
  private currentScript: Script | null = null;
  private loadedDLCs: Set<string> = new Set();
  private validationCache: Map<string, ValidationResult> = new Map();

  private gameContent: HTMLElement;
  private gameState: HTMLElement;
  private sceneSelect: HTMLSelectElement;
  private yamlEditor: HTMLTextAreaElement;
  private scriptGrid: HTMLElement;
  private libraryModal: HTMLElement;
  private statusDot: HTMLElement;
  private scriptName: HTMLElement;

  constructor() {
    this.initialize();
    (window as any).demo = this;
  }

  private async initialize(): Promise<void> {
    this.vnEngine = await createVNEngine();
    this.initializeElements();
    this.setupEventListeners();
    this.updateUI();
  }

  private initializeElements(): void {
    this.gameContent = document.getElementById("game-content")!;
    this.gameState = document.getElementById("game-state")!;
    this.sceneSelect = document.getElementById(
      "scene-select"
    ) as HTMLSelectElement;
    this.yamlEditor = document.getElementById(
      "yaml-editor"
    ) as HTMLTextAreaElement;
    this.scriptGrid = document.getElementById("script-grid")!;
    this.libraryModal = document.getElementById("library-modal")!;
    this.statusDot = document.getElementById("status-dot")!;
    this.scriptName = document.getElementById("script-name")!;
  }

  private setupEventListeners(): void {
    this.vnEngine.on("stateChange", () => {
      this.renderGame();
      this.renderGameState();
    });
    this.vnEngine.on("error", (error) =>
      this.showNotification(`Error: ${error}`, "error")
    );
    this.vnEngine.on("loaded", () => {
      this.showNotification("✅ Script loaded successfully!", "success");
      this.updateSceneSelect();
      this.updateUI();
    });

    this.vnEngine.on("upgradeCompleted", (result) => {
      this.showNotification(
        `🎉 DLC installed! Added ${result.addedScenes.length} scenes`,
        "success"
      );
      this.updateSceneSelect();
      this.updateUI();
      this.renderGameState();
      this.renderLibrary();
    });

    this.vnEngine.on("upgradeFailed", (error) => {
      this.showNotification(`❌ DLC installation failed: ${error}`, "error");
    });

    document
      .getElementById("browse-library-btn")!
      .addEventListener("click", () => this.openLibrary());
    document
      .getElementById("edit-script-btn")!
      .addEventListener("click", () => this.toggleEditor(true));

    document
      .getElementById("start-scene-btn")!
      .addEventListener("click", () => this.startScene());
    document
      .getElementById("reset-btn")!
      .addEventListener("click", () => this.reset());

    document
      .getElementById("load-from-editor-btn")!
      .addEventListener("click", () => this.loadFromEditor());
    document
      .getElementById("validate-btn")!
      .addEventListener("click", () => this.validateScript());
    document
      .getElementById("clear-btn")!
      .addEventListener("click", () => this.clearEditor());

    document
      .getElementById("editor-toggle-header")!
      .addEventListener("click", () => this.toggleEditor());

    document
      .getElementById("close-library-modal")!
      .addEventListener("click", () => this.closeLibrary());
    this.libraryModal.addEventListener("click", (e) => {
      if (e.target === this.libraryModal) this.closeLibrary();
    });

    document
      .getElementById("library-search")!
      .addEventListener("input", (e) => {
        this.filterLibrary((e.target as HTMLInputElement).value);
      });

    this.yamlEditor.addEventListener("input", () => this.autoResizeTextarea());
  }

  private openLibrary(): void {
    this.renderLibrary();
    this.libraryModal.classList.add("active");
  }

  private closeLibrary(): void {
    this.libraryModal.classList.remove("active");
  }

  private renderLibrary(): void {
    const categories = [
      {
        id: "featured",
        name: "🌟 Featured",
        scripts: SCRIPT_LIBRARY.filter((s) => s.category === "featured"),
      },
      {
        id: "demo",
        name: "📚 Demos",
        scripts: SCRIPT_LIBRARY.filter((s) => s.category === "demo"),
      },
      {
        id: "example",
        name: "📝 Examples",
        scripts: SCRIPT_LIBRARY.filter((s) => s.category === "example"),
      },
      {
        id: "advanced",
        name: "🔧 Advanced",
        scripts: SCRIPT_LIBRARY.filter((s) => s.category === "advanced"),
      },
    ];

    let html = "";

    categories.forEach((category) => {
      if (category.scripts.length === 0) return;

      html += `<div style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 12px; color: #495057; font-size: 16px;">${
          category.name
        }</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
          ${category.scripts
            .map((script) => this.renderScriptCard(script))
            .join("")}
        </div>
      </div>`;
    });

    this.scriptGrid.innerHTML = html;
  }

  private renderScriptCard(script: Script): string {
    const isCurrent = this.currentScript?.id === script.id;
    const canAddDLC = this.canAddAsDLC(script);
    const validation = this.validationCache.get(script.id);

    let badge = script.category;
    let badgeClass = script.category;

    if (isCurrent) {
      badge = "current";
      badgeClass = "current";
    } else if (script.category === "featured") {
      badgeClass = "featured";
    }

    const difficultyColors = {
      Beginner: "#28a745",
      Intermediate: "#ffc107",
      Advanced: "#dc3545",
    };

    return `
      <div class="script-card ${isCurrent ? "current" : ""} ${
      script.category === "featured" ? "featured" : ""
    }">
        <div class="script-meta">
          <div class="script-icon">${script.icon}</div>
          <div class="script-badge ${badgeClass}">${
      isCurrent ? "✓ Current" : badge
    }</div>
        </div>
        <div class="script-title">${script.name}</div>
        <div class="script-description">${script.description}</div>
        <div class="script-features">
          <strong style="color: ${difficultyColors[script.difficulty]};">${
      script.difficulty
    }</strong> • 
          ${script.features.slice(0, 2).join(" • ")}${
      script.features.length > 2 ? " • ..." : ""
    }
        </div>
        
        ${
          validation
            ? `
          <div class="script-status ${validation.status}">
            ${
              validation.status === "validating"
                ? "🔍 Validating..."
                : validation.valid
                ? `✅ ${validation.message}`
                : `❌ ${validation.message}`
            }
          </div>
        `
            : ""
        }
        
        <div class="script-actions">
          ${
            isCurrent
              ? `
            <button class="script-btn secondary" disabled>
              ✓ Loaded
            </button>
          `
              : canAddDLC
              ? `
            <button class="script-btn secondary" onclick="demo.validateDLC('${script.id}')">
              🔍 Validate
            </button>
            <button class="script-btn success" onclick="demo.installDLC('${script.id}')">
              ➕ Add DLC
            </button>
          `
              : `
            <button class="script-btn primary" onclick="demo.loadScript('${script.id}')">
              📥 Load
            </button>
            <button class="script-btn secondary" onclick="demo.loadToEditor('${script.id}')">
              ✏️ Edit
            </button>
          `
          }
        </div>
      </div>
    `;
  }

  private filterLibrary(query: string): void {
    const cards = this.scriptGrid.querySelectorAll(".script-card");
    cards.forEach((card) => {
      const title =
        card.querySelector(".script-title")?.textContent?.toLowerCase() || "";
      const description =
        card.querySelector(".script-description")?.textContent?.toLowerCase() ||
        "";
      const features =
        card.querySelector(".script-features")?.textContent?.toLowerCase() ||
        "";

      const matches = [title, description, features].some((text) =>
        text.includes(query.toLowerCase())
      );

      (card as HTMLElement).style.display = matches ? "block" : "none";
    });
  }

  private canAddAsDLC(script: Script): boolean {
    if (!this.currentScript) return false;
    if (script.id === this.currentScript.id) return false;

    const compatibleDLCs = DLC_COMPATIBILITY[this.currentScript.path] || [];
    return compatibleDLCs.includes(script.id);
  }

  private async validateDLC(scriptId: string): Promise<void> {
    const script = SCRIPT_LIBRARY.find((s) => s.id === scriptId);
    if (!script || !this.currentScript) return;

    this.validationCache.set(scriptId, {
      valid: false,
      status: "validating",
      message: "Checking compatibility...",
    });
    this.renderLibrary();

    try {
      const response = await fetch(script.path);
      if (!response.ok)
        throw new Error(`Cannot load script: ${response.status}`);

      const content = await response.text();
      const validation = this.vnEngine.validateUpgrade(content, {
        mode: "additive",
        namespace: "dlc",
      });

      const result: ValidationResult = {
        valid: validation.valid,
        status: validation.valid ? "valid" : "invalid",
        errors: validation.errors,
        wouldAddScenes: validation.wouldAddScenes,
        message: validation.valid
          ? `Would add ${validation.wouldAddScenes.length} scenes`
          : `${validation.errors?.length || 0} validation errors`,
      };

      this.validationCache.set(scriptId, result);
      this.renderLibrary();
    } catch (error: any) {
      this.validationCache.set(scriptId, {
        valid: false,
        status: "invalid",
        message: `Failed to validate: ${error.message}`,
      });
      this.renderLibrary();
    }
  }

  private async installDLC(scriptId: string): Promise<void> {
    const script = SCRIPT_LIBRARY.find((s) => s.id === scriptId);
    if (!script || !this.currentScript) return;

    try {
      const response = await fetch(script.path);
      if (!response.ok)
        throw new Error(`Cannot load script: ${response.status}`);

      const content = await response.text();
      const result = this.vnEngine.upgradeScript(content, {
        mode: "additive",
        namespace: "dlc",
        validateState: true,
      });

      if (result.success) {
        this.loadedDLCs.add(scriptId);
        this.closeLibrary();
        this.showNotification(`🎉 ${script.name} added as DLC!`, "success");
      } else {
        this.showNotification(
          `❌ Failed to install DLC: ${result.error?.message}`,
          "error"
        );
      }
    } catch (error: any) {
      this.showNotification(`Failed to install DLC: ${error.message}`, "error");
    }
  }

  public async loadScript(scriptId: string): Promise<void> {
    const script = SCRIPT_LIBRARY.find((s) => s.id === scriptId);
    if (!script) {
      this.showNotification("Script not found", "error");
      return;
    }

    try {
      const response = await fetch(script.path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const content = await response.text();
      this.yamlEditor.value = content;
      this.autoResizeTextarea();

      this.vnEngine.loadScript(content, script.path);
      this.currentScript = script;
      this.loadedDLCs.clear();
      this.validationCache.clear();

      this.closeLibrary();
      this.showNotification(`Loaded: ${script.name}`, "success");
    } catch (error: any) {
      this.showNotification(
        `Failed to load ${script.name}: ${error.message}`,
        "error"
      );
    }
  }

  public async loadToEditor(scriptId: string): Promise<void> {
    await this.loadScript(scriptId);
    this.toggleEditor(true);
  }

  public loadFromEditor(): void {
    const content = this.yamlEditor.value.trim();
    if (!content) {
      this.showNotification("Please enter YAML content", "error");
      return;
    }

    try {
      this.vnEngine.loadScript(content, "custom.yaml");
      this.currentScript = null;
      this.loadedDLCs.clear();
      this.validationCache.clear();
      this.showNotification("✅ Custom script loaded!", "success");
    } catch (error: any) {
      this.showNotification(`Failed to load script: ${error.message}`, "error");
    }
  }

  public validateScript(): void {
    const content = this.yamlEditor.value.trim();
    if (!content) {
      this.showNotification("Please enter YAML content to validate", "error");
      return;
    }

    try {
      this.vnEngine.loadScript(content, "validation.yaml");
      this.showNotification("✅ Script is valid!", "success");
      if (this.currentScript) {
        this.loadScript(this.currentScript.id);
      }
    } catch (error: any) {
      this.showNotification(`❌ Validation failed: ${error.message}`, "error");
    }
  }

  public clearEditor(): void {
    this.yamlEditor.value = "";
    this.autoResizeTextarea();
  }

  public startScene(): void {
    if (!this.vnEngine.getIsLoaded()) {
      this.showNotification("Please load a script first", "error");
      return;
    }

    const selectedScene = this.sceneSelect.value;

    if (!selectedScene) {
      const sceneNames = this.vnEngine.getSceneNames();
      if (sceneNames.length > 0) {
        this.vnEngine.startScene(sceneNames[0]);
        this.sceneSelect.value = sceneNames[0];
      } else {
        this.showNotification("No scenes found", "error");
      }
    } else {
      this.vnEngine.startScene(selectedScene);
    }

    this.renderGameState();
  }

  public reset(): void {
    this.vnEngine.reset();
    this.currentScript = null;
    this.loadedDLCs.clear();
    this.validationCache.clear();

    this.gameContent.innerHTML = `
      <div class="welcome-screen">
        <h3>Engine Reset</h3>
        <p>Click <strong>Browse Library</strong> to load a visual novel.</p>
      </div>
    `;

    this.updateUI();
    this.showNotification("🔄 Engine reset", "info");
  }

  private toggleEditor(forceOpen?: boolean): void {
    const content = document.getElementById("editor-toggle-content")!;
    const header = document.getElementById("editor-toggle-header")!;
    const arrow = header.querySelector("span:last-child")!;

    const isOpen = content.classList.contains("open");

    if (forceOpen === true || !isOpen) {
      content.classList.add("open");
      arrow.textContent = "▲";
    } else {
      content.classList.remove("open");
      arrow.textContent = "▼";
    }
  }

  private updateUI(): void {
    if (this.vnEngine.getIsLoaded()) {
      this.statusDot.classList.add("loaded");
      this.scriptName.textContent = this.currentScript
        ? this.currentScript.name
        : "Custom Script";
      document.getElementById("edit-script-btn")!.removeAttribute("disabled");
    } else {
      this.statusDot.classList.remove("loaded");
      this.scriptName.textContent = "No script loaded";
      document
        .getElementById("edit-script-btn")!
        .setAttribute("disabled", "true");
    }

    this.updateSceneSelect();
    this.renderGame();
    this.renderGameState();
  }

  private updateSceneSelect(): void {
    this.sceneSelect.innerHTML = '<option value="">Select Scene...</option>';

    if (this.vnEngine.getIsLoaded()) {
      const sceneNames = this.vnEngine.getSceneNames();
      sceneNames.forEach((sceneName) => {
        const option = document.createElement("option");
        option.value = sceneName;
        option.textContent = sceneName;

        if (
          sceneName.includes("_dlc") ||
          sceneName.includes("winter") ||
          sceneName.includes("secret")
        ) {
          option.textContent += " (DLC)";
          option.style.color = "#9c27b0";
          option.style.fontWeight = "600";
        }

        this.sceneSelect.appendChild(option);
      });
    }
  }

  private renderGame(): void {
    const result = this.vnEngine.getCurrentResult();
    const error = this.vnEngine.getError();

    this.gameContent.innerHTML = "";

    if (error) {
      this.gameContent.innerHTML = `
        <div class="dialogue-box" style="background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); border-color: #f5c6cb;">
          <div style="color: #721c24;">
            <strong>⚠️ Error:</strong> ${error}
          </div>
        </div>
      `;
      return;
    }

    if (!result) {
      this.gameContent.innerHTML = `
        <div class="welcome-screen">
          <h3>🎮 Ready to Play</h3>
          <p>Your visual novel experience will appear here.</p>
          ${
            this.loadedDLCs.size > 0
              ? `<p style="margin-top: 12px;"><strong>🎉 DLC Active:</strong> ${
                  this.loadedDLCs.size
                } expansion${this.loadedDLCs.size > 1 ? "s" : ""} loaded!</p>`
              : ""
          }
        </div>
      `;
      return;
    }

    switch (result.type) {
      case "display_dialogue":
        this.renderDialogue(result);
        break;
      case "show_choices":
        this.renderChoices(result);
        break;
      case "scene_complete":
        this.renderSceneComplete();
        break;
    }
  }

  private renderDialogue(result: any): void {
    const dialogueBox = document.createElement("div");
    dialogueBox.className = "dialogue-box";

    if (result.speaker) {
      const speaker = document.createElement("div");
      speaker.className = "speaker";
      speaker.textContent = result.speaker;
      dialogueBox.appendChild(speaker);
    }

    const content = document.createElement("div");
    content.className = "dialogue-content";
    content.innerHTML = this.formatContent(result.content);
    dialogueBox.appendChild(content);

    if (result.canContinue) {
      const continueButton = document.createElement("button");
      continueButton.className = "continue-button";
      continueButton.textContent = "→ Continue";
      continueButton.addEventListener("click", () => this.vnEngine.continue());
      dialogueBox.appendChild(continueButton);
    }

    this.gameContent.appendChild(dialogueBox);
  }

  private renderChoices(result: any): void {
    const dialogueBox = document.createElement("div");
    dialogueBox.className = "dialogue-box";

    if (result.content) {
      const content = document.createElement("div");
      content.className = "dialogue-content";
      content.innerHTML = this.formatContent(result.content);
      dialogueBox.appendChild(content);
    }

    if (result.choices) {
      const choicesContainer = document.createElement("div");
      choicesContainer.className = "choices-container";

      result.choices.forEach((choice: any, index: number) => {
        const choiceButton = document.createElement("button");
        choiceButton.className = "choice-button";
        choiceButton.innerHTML = this.formatContent(choice.text);
        choiceButton.addEventListener("click", () =>
          this.vnEngine.makeChoice(index)
        );
        choicesContainer.appendChild(choiceButton);
      });

      dialogueBox.appendChild(choicesContainer);
    }

    this.gameContent.appendChild(dialogueBox);
  }

  private renderSceneComplete(): void {
    this.gameContent.innerHTML = `
      <div class="dialogue-box" style="background: linear-gradient(135deg, #d4edda 0%, #e8f5e9 100%); border-color: #c3e6cb; text-align: center; color: #155724;">
        <h3 style="margin-bottom: 12px;">🎊 Scene Complete!</h3>
        <p>Great job! You've completed this scene.</p>
        <p style="margin-top: 8px;">Browse the Library for more adventures or try adding some DLC!</p>
      </div>
    `;
  }

  private renderGameState(): void {
    if (!this.vnEngine.getIsLoaded()) {
      this.gameState.innerHTML =
        '<div style="opacity: 0.7;">No script loaded</div>';
      return;
    }

    const gameState = this.vnEngine.getGameState();
    const variablesObj = Object.fromEntries(gameState.variables || []);
    const sceneNames = this.vnEngine.getSceneNames();

    let variablesDisplay = "";
    if (Object.keys(variablesObj).length > 0) {
      variablesDisplay = Object.entries(variablesObj)
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("<br>");
      if (Object.keys(variablesObj).length > 5) {
        variablesDisplay += "<br>...";
      }
    } else {
      variablesDisplay = '<span style="opacity: 0.6;">none</span>';
    }

    let flagsDisplay = "";
    if (gameState.storyFlags && gameState.storyFlags.length > 0) {
      flagsDisplay = gameState.storyFlags.slice(0, 3).join(", ");
      if (gameState.storyFlags.length > 3) {
        flagsDisplay += ", ...";
      }
    } else {
      flagsDisplay = '<span style="opacity: 0.6;">none</span>';
    }

    this.gameState.innerHTML = `
      <div style="color: #2c3e50; line-height: 1.4; font-size: 11px;">
        <div style="margin-bottom: 8px;">
          <strong>Scene:</strong><br>
          <span style="color: #667eea;">${
            gameState.currentScene || "none"
          }</span>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong>Instruction:</strong> ${gameState.currentInstruction || 0}
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong>Variables (${Object.keys(variablesObj).length}):</strong><br>
          <div style="font-family: monospace; font-size: 10px; color: #6c757d; margin-top: 4px;">
            ${variablesDisplay}
          </div>
        </div>
        
        <div style="margin-bottom: 8px;">
          <strong>Story Flags (${
            (gameState.storyFlags || []).length
          }):</strong><br>
          <div style="font-size: 10px; color: #6c757d; margin-top: 4px;">
            ${flagsDisplay}
          </div>
        </div>
        
        ${
          this.loadedDLCs.size > 0
            ? `
          <div style="margin-bottom: 8px;">
            <strong>DLC:</strong> <span style="color: #9c27b0;">${this.loadedDLCs.size} active</span>
          </div>
        `
            : ""
        }
        
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #dee2e6; font-size: 10px; opacity: 0.7;">
          ${sceneNames.length} scenes available
        </div>
      </div>
    `;
  }

  private formatContent(content: string): string {
    return content
      .replace(
        /=== (.+?) ===/g,
        '<h4 style="color: #667eea; margin: 8px 0;">$1</h4>'
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  private autoResizeTextarea(): void {
    this.yamlEditor.style.height = "auto";
    this.yamlEditor.style.height =
      Math.max(200, this.yamlEditor.scrollHeight) + "px";
  }

  private showNotification(
    message: string,
    type: "info" | "success" | "error"
  ): void {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.6;">×</button>
      </div>
    `;

    document.getElementById("notifications")!.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new VNEngineDemo();
});

export { VNEngineDemo };
