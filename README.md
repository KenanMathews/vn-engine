# 🎭 VN Engine Library

A powerful, flexible TypeScript library for creating visual novels and interactive narratives. Built with a pragmatic, variables-based architecture that can support any genre.

## ✨ Features

- 📝 **YAML-based scripting** - Clean, readable narrative format
- 🎮 **Universal game state** - Variables system supports any data structure  
- 🌟 **Advanced template engine** - Handlebars with comprehensive helper library
- 🔀 **Choice tracking** - Advanced branching narrative support
- 🎯 **Event-driven** - React to game state changes
- 🏗️ **Framework-agnostic** - Works with any UI framework or vanilla JS
- 📱 **TypeScript first** - Full type safety and excellent DX
- 🪶 **Lightweight** - Minimal dependencies
- 🔧 **Robust fallbacks** - Graceful degradation if helper libraries fail
- 🚀 **Script Upgrades & DLC** - Hot-swappable content with validation and rollback

## 🚀 Quick Start

### Installation

```bash
npm install vn-engine
```

### Basic Usage

```typescript
import { createVNEngine } from 'vn-engine'

// Create engine instance
const vnEngine = createVNEngine()

// Load a script
const script = `
welcome:
  - "Hello, welcome to my visual novel!"
  - speaker: "Guide"
    say: "What's your name?"
    actions:
      - type: setVar
        key: player_name
        value: "Hero"
  - speaker: "{{player_name}}"
    say: "Nice to meet you!"
`

// Set up event listeners
vnEngine.on('stateChange', (result) => {
  console.log('New result:', result)
})

// Load and start
vnEngine.loadScript(script)
vnEngine.startScene('welcome')

// Continue through dialogue
vnEngine.continue()
```

## 📚 API Reference

### VNEngine Class

#### Factory Function
```typescript
createVNEngine(): VNEngine
```
Creates a new VN engine instance. Multiple instances are supported.

#### Core Methods

```typescript
// Script management
loadScript(content: string, fileName?: string): void
startScene(sceneName: string): ScriptResult
continue(): ScriptResult
makeChoice(choiceIndex: number): ScriptResult
reset(): void

// State management  
getGameState(): SerializableGameState
setGameState(state: SerializableGameState): void

// State getters
getCurrentResult(): ScriptResult | null
getIsLoaded(): boolean
getError(): string | null

```

#### Event System

```typescript
// Listen to events
const unsubscribe = vnEngine.on('stateChange', (result) => {
  // Handle state changes
})

vnEngine.on('error', (error) => {
  console.error('VN Error:', error)
})

vnEngine.on('loaded', () => {
  console.log('Script loaded successfully!')
})

// Clean up
unsubscribe()
```

### Script Result Types

```typescript
interface ScriptResult {
  type: 'display_dialogue' | 'show_choices' | 'scene_complete' | 'error'
  content?: string
  speaker?: string
  choices?: ChoiceOption[]
  canContinue?: boolean
  error?: string
}
```

## 🔄 Script Upgrades & DLC System

The VN Engine includes a powerful upgrade system that allows you to dynamically add or replace content without losing game state. Perfect for DLC, content updates, mods, and episodic releases.

### Core Upgrade Methods

```typescript
// Upgrade script with new content
upgradeScript(content: string, options?: ScriptUpgradeOptions): UpgradeResult

// Validate upgrade without applying changes  
validateUpgrade(content: string, options?: ScriptUpgradeOptions): ValidationResult

// Create preview of what upgrade would do
createUpgradePreview(content: string, options?: ScriptUpgradeOptions): UpgradePreviewReport
```

### Upgrade Types

#### ScriptUpgradeOptions

```typescript
interface ScriptUpgradeOptions {
  mode?: 'additive' | 'replace'        // How to handle new content
  namespace?: string                    // Prefix for scene names
  allowOverwrite?: string[]            // Scenes that can be replaced
  validateState?: boolean              // Check if current state remains valid
  dryRun?: boolean                    // Preview only, don't apply changes
}
```

#### UpgradeResult

```typescript
interface UpgradeResult {
  success: boolean                     // Whether upgrade succeeded
  error?: UpgradeError                // Error details if failed
  addedScenes: string[]               // New scenes that were added
  replacedScenes: string[]            // Existing scenes that were replaced
  totalScenes: number                 // Total scenes after upgrade
  warnings: string[]                  // Non-critical issues
}
```

#### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean                       // Whether upgrade would succeed
  errors: UpgradeError[]              // Validation errors found
  warnings: string[]                  // Potential issues
  wouldAddScenes: string[]           // Scenes that would be added
  wouldReplaceScenes: string[]       // Scenes that would be replaced
}
```

#### UpgradeError

```typescript
interface UpgradeError {
  code: 'SCENE_CONFLICT' | 'INVALID_REFERENCE' | 'STATE_INVALID' | 'PARSE_ERROR' | 'UNAUTHORIZED_OVERWRITE'
  message: string                      // Human-readable error message
  details: {                          // Specific error details
    conflictingScenes?: string[]
    invalidReferences?: string[]
    affectedState?: string[]
    unauthorizedOverwrites?: string[]
    parseErrors?: string[]
  }
}
```

### Upgrade Modes

#### Additive Mode (Default)
Adds new content without replacing existing scenes. Conflicts result in errors.

```typescript
// Add DLC content without touching base game
const dlcContent = `
dlc_new_area:
  - "Welcome to the secret garden!"
  - "This area was added in the DLC."

dlc_bonus_scene:
  - speaker: "New Character"
    say: "I wasn't in the original story!"
`

const result = vnEngine.upgradeScript(dlcContent, {
  mode: 'additive',
  namespace: 'dlc'  // Scenes become 'dlc_new_area', 'dlc_bonus_scene'
})

if (result.success) {
  console.log(`Added ${result.addedScenes.length} new scenes`)
}
```

#### Replace Mode
Allows replacing existing scenes with explicit permission.

```typescript
// Update existing scenes with new content
const updatedContent = `
intro:
  - "Welcome to the Enhanced Edition!"
  - "This intro has been completely rewritten."

new_ending:
  - "This is a brand new ending!"
`

const result = vnEngine.upgradeScript(updatedContent, {
  mode: 'replace',
  allowOverwrite: ['intro'],  // Only 'intro' can be replaced
  validateState: true         // Ensure current game state remains valid
})

if (result.success) {
  console.log(`Replaced ${result.replacedScenes.length} scenes`)
  console.log(`Added ${result.addedScenes.length} new scenes`)
}
```

### Advanced Upgrade Examples

#### Safe DLC Addition with Validation

```typescript
const dlcContent = `
expansion_start:
  - "Welcome to the Northern Territories expansion!"
  - actions:
      - type: setFlag
        flag: expansion_unlocked
  - goto: expansion_hub

expansion_hub:
  - if: "hasFlag 'main_story_complete'"
    then:
      - "Since you've completed the main story, here's bonus content!"
    else:
      - "You can return here after completing the main story."
  - text: "Where would you like to go?"
    choices:
      - text: "Explore the Frozen Cave"
        goto: exp_frozen_cave
      - text: "Visit the Mountain Village" 
        goto: exp_mountain_village
      - text: "Return to main game"
        goto: town_square

exp_frozen_cave:
  - "The cave glistens with ancient ice..."
  - "This is completely new content!"

exp_mountain_village:
  - "High in the mountains, a small village thrives."
  - speaker: "Village Elder"
    say: "Welcome, traveler from the lowlands!"
`

// Validate before applying
const validation = vnEngine.validateUpgrade(dlcContent, {
  mode: 'additive',
  namespace: 'expansion',
  validateState: true
})

if (validation.valid) {
  const result = vnEngine.upgradeScript(dlcContent, {
    mode: 'additive',
    namespace: 'expansion'
  })
  
  if (result.success) {
    console.log('DLC installed successfully!')
    console.log(`New scenes: ${result.addedScenes.join(', ')}`)
    
    // Add transition to DLC from main game
    if (vnEngine.hasScene('town_square')) {
      // Could modify existing scenes to add DLC access
    }
  }
} else {
  console.error('DLC validation failed:', validation.errors)
}
```

#### Content Update with Scene Replacement

```typescript
const contentUpdate = `
# Updated intro with better writing
intro:
  - "Welcome to Mystical Realms: Director's Cut!"
  - speaker: "Narrator"
    say: "This enhanced version features improved dialogue and new scenes."
  - actions:
      - type: setFlag
        flag: directors_cut
      - type: setVar
        key: version
        value: "2.0"
  - goto: character_creation

# New alternative ending
secret_ending:
  - if: "and (hasFlag 'directors_cut') (hasFlag 'found_all_secrets')"
    then:
      - "Congratulations! You've unlocked the secret ending!"
      - "This ending is only available in the Director's Cut."
    else:
      - goto: normal_ending

# Enhanced existing scene
character_creation:
  - "Choose your character class:"
  - text: "Enhanced character creation with new options:"
    choices:
      - text: "Warrior (Classic)"
        actions:
          - type: setVar
            key: player_class
            value: "warrior"
        goto: game_start
      - text: "Mage (Classic)" 
        actions:
          - type: setVar
            key: player_class
            value: "mage"
        goto: game_start
      - text: "Necromancer (NEW!)"
        condition: "hasFlag 'directors_cut'"
        actions:
          - type: setVar
            key: player_class
            value: "necromancer"
          - type: setFlag
            flag: chose_necromancer
        goto: necromancer_intro
`

// Preview the update first
const preview = vnEngine.createUpgradePreview(contentUpdate, {
  mode: 'replace',
  allowOverwrite: ['intro', 'character_creation'],
  validateState: true
})

console.log('Update Preview:', preview.summary)
console.log('Would add:', preview.details.wouldAdd)
console.log('Would replace:', preview.details.wouldReplace)

if (preview.valid) {
  const result = vnEngine.upgradeScript(contentUpdate, {
    mode: 'replace',
    allowOverwrite: ['intro', 'character_creation'],
    validateState: true
  })
  
  if (result.success) {
    console.log('Content update applied successfully!')
  }
}
```

#### Modding Support with Namespaces

```typescript
// Community mod that adds new storyline
const communityMod = `
mod_start:
  - "Welcome to the Community Romance Mod!"
  - actions:
      - type: setFlag
        flag: romance_mod_active
  - goto: mod_romance_hub

mod_romance_hub:
  - speaker: "Mod Author"
    say: "This mod adds romance options to the base game!"
  - text: "Choose your romance interest:"
    choices:
      - text: "Mysterious Stranger"
        goto: mod_romance_stranger
      - text: "Childhood Friend"
        goto: mod_romance_friend
      - text: "Return to main game"
        goto: town_square

mod_romance_stranger:
  - speaker: "Stranger"
    say: "You intrigue me, {{player_name}}..."
  - "This is user-generated content!"

mod_romance_friend:
  - speaker: "Friend"
    say: "I've been waiting to tell you something..."
  - "Community mods can extend the story!"
`

// Install mod with clear namespace
const result = vnEngine.upgradeScript(communityMod, {
  mode: 'additive',
  namespace: 'romance_mod',
  validateState: true
})

if (result.success) {
  console.log('Romance mod installed!')
  
  // Mods are clearly separated
  const modScenes = vnEngine.getScenesByNamespace('romance_mod')
  console.log('Mod scenes:', modScenes.map(s => s.name))
  
  // Check what content is loaded
  const stats = vnEngine.getUpgradeStats()
  console.log('Content breakdown:', stats)
  // {
  //   totalScenes: 25,
  //   estimatedDLCScenes: 8,
  //   baseScenes: 17,
  //   namespaces: ['romance_mod', 'expansion']
  // }
}
```

### Upgrade Safety Features

#### Automatic State Validation

```typescript
// Engine automatically checks if current game state remains valid
const result = vnEngine.upgradeScript(newContent, {
  validateState: true  // Default: true
})

if (!result.success && result.error?.code === 'STATE_INVALID') {
  console.error('Upgrade would break current save game')
  console.error('Issues:', result.error.details.affectedState)
}
```

#### Dry Run Mode

```typescript
// Test upgrade without applying changes
const dryRun = vnEngine.upgradeScript(newContent, {
  dryRun: true,
  mode: 'replace',
  allowOverwrite: ['intro']
})

console.log('Dry run results:')
console.log('Would add:', dryRun.addedScenes)
console.log('Would replace:', dryRun.replacedScenes)
console.log('Warnings:', dryRun.warnings)

// Only apply if dry run looks good
if (dryRun.success && dryRun.warnings.length === 0) {
  const realResult = vnEngine.upgradeScript(newContent, {
    mode: 'replace',
    allowOverwrite: ['intro']
  })
}
```

#### Error Handling and Rollback

```typescript
// The engine automatically handles rollback on failure
try {
  const result = vnEngine.upgradeScript(problematicContent, {
    mode: 'replace',
    allowOverwrite: ['critical_scene']
  })
  
  if (!result.success) {
    console.error('Upgrade failed:', result.error?.message)
    
    switch (result.error?.code) {
      case 'SCENE_CONFLICT':
        console.error('Scene name conflicts:', result.error.details.conflictingScenes)
        break
      case 'INVALID_REFERENCE':
        console.error('Broken scene references:', result.error.details.invalidReferences)
        break
      case 'UNAUTHORIZED_OVERWRITE':
        console.error('Attempted to overwrite protected scenes:', result.error.details.unauthorizedOverwrites)
        break
      case 'STATE_INVALID':
        console.error('Would break current game state:', result.error.details.affectedState)
        break
      case 'PARSE_ERROR':
        console.error('YAML parsing errors:', result.error.details.parseErrors)
        break
    }
    
    // Game state is automatically restored to pre-upgrade condition
    console.log('Game state has been restored')
  }
} catch (error) {
  console.error('Unexpected upgrade error:', error)
  // Engine handles cleanup automatically
}
```

### Upgrade Event System

```typescript
// Listen for upgrade events
vnEngine.on('upgradeCompleted', (result: UpgradeResult) => {
  console.log('Upgrade completed successfully!')
  console.log(`Added: ${result.addedScenes.length}, Replaced: ${result.replacedScenes.length}`)
  
  // Notify UI about new content
  showUpgradeNotification(result)
})

vnEngine.on('upgradeFailed', (error: string) => {
  console.error('Upgrade failed:', error)
  showErrorDialog('Content update failed', error)
})
```

### Content Management Utilities

```typescript
// Check what content is currently loaded
console.log('Current scenes:', vnEngine.getSceneNames())
console.log('Total scene count:', vnEngine.getSceneCount())
console.log('Has DLC content:', vnEngine.hasDLCContent())

// Get content by namespace
const dlcScenes = vnEngine.getScenesByNamespace('dlc')
const modScenes = vnEngine.getScenesByNamespace('romance_mod')

// Get detailed statistics
const stats = vnEngine.getUpgradeStats()
console.log('Content breakdown:', {
  base: stats.baseScenes,
  dlc: stats.estimatedDLCScenes,
  total: stats.totalScenes,
  namespaces: stats.namespaces
})

// Check if specific content exists
if (vnEngine.hasScene('dlc_bonus_scene')) {
  console.log('DLC bonus scene is available')
}
```

### Best Practices for Upgrades

#### 1. Always Validate First
```typescript
const validation = vnEngine.validateUpgrade(content, options)
if (validation.valid) {
  vnEngine.upgradeScript(content, options)
} else {
  console.error('Validation failed:', validation.errors)
}
```

#### 2. Use Namespaces for Organization
```typescript
// Clear organization with namespaces
vnEngine.upgradeScript(dlcContent, { namespace: 'winter_dlc' })
vnEngine.upgradeScript(modContent, { namespace: 'community_mod' })
vnEngine.upgradeScript(seasonalContent, { namespace: 'holiday_2024' })
```

#### 3. Preserve Backward Compatibility
```typescript
// Check for existing content before adding references
const updateContent = `
enhanced_intro:
  - if: "hasFlag 'directors_cut'"
    then:
      - "Enhanced edition features activated!"
    else:
      - "Welcome to the original game!"
  - goto: character_creation
`
```

#### 4. Handle Dependencies
```typescript
// Ensure prerequisite content exists
if (vnEngine.hasScene('main_story_complete')) {
  vnEngine.upgradeScript(epilogueContent, { namespace: 'epilogue' })
} else {
  console.warn('Main story required for epilogue DLC')
}
```

## 📝 Script Format

### Basic Structure

Scripts are written in YAML with scenes as top-level keys:

```yaml
scene_name:
  - instruction1
  - instruction2
  - instruction3

another_scene:
  - "Simple dialogue"
  - speaker: "Character"
    say: "Dialogue with speaker"
```

### Instruction Types

#### 1. Simple Dialogue
```yaml
intro:
  - "This is simple narrator text."
```

#### 2. Dialogue with Speaker
```yaml
conversation:
  - speaker: "Alice"
    say: "Hello there!"
  - speaker: "Bob"  
    say: "Nice to meet you, Alice."
```

#### 3. Actions
```yaml
setup:
  - actions:
      - type: setVar
        key: player_name
        value: "Hero"
      - type: setFlag
        flag: game_started
      - type: addTime
        minutes: 30
```

#### 4. Choices
```yaml
decision:
  - text: "What do you choose?"
    choices:
      - text: "Go left"
        actions:
          - type: setFlag
            flag: went_left
        goto: left_path
      - text: "Go right"
        goto: right_path
      - text: "Stay here"
        # No goto = continue current scene
```

#### 5. Conditional Logic
```yaml
check_health:
  - if: "gt health 50"
    then:
      - "You feel healthy!"
    else:
      - "You need rest."
```

#### 6. Scene Jumps
```yaml
ending:
  - "The end!"
  - goto: credits
```

### Action Types

#### Variable Actions
- `setVar` - Set a variable value
- `addVar` - Add to a numeric variable  

#### Flag Actions  
- `setFlag` - Set a story flag
- `clearFlag` - Remove a story flag

#### List Actions
- `addToList` - Add item to an array

#### Time Actions
- `addTime` - Add minutes to game time

#### Examples
```yaml
actions_demo:
  - actions:
      # Variables
      - type: setVar
        key: player_name
        value: "Alice"
      - type: setVar  
        key: player.coins
        value: 100
      - type: addVar
        key: player.coins
        value: 50
      
      # Flags
      - type: setFlag
        flag: met_merchant
      - type: clearFlag
        flag: tutorial_mode
      
      # Lists
      - type: addToList
        list: inventory
        item: { name: "Sword", damage: 10 }
      
      # Time
      - type: addTime
        minutes: 15
```

## 🎨 Advanced Template System

The engine uses Handlebars with a comprehensive helper library for dynamic content. All dialogue, speaker names, and choice text support templating with robust fallback mechanisms.

### Template System Features

```yaml
# Variable access
greetings:
  - "Hello {{player_name}}!"
  - "You are level {{player.level}}."

# Comparison helpers
conditions:
  - if: "eq player.class 'warrior'"
    then: ["You swing your sword!"]
  - if: "gt player.level 10"  
    then: ["You're experienced!"]

# Math helpers  
calculations:
  - "Total: {{add player.coins bonus}}"
  - "Damage: {{multiply weapon.power player.strength}}"

# Array helpers
inventory:
  - "You have {{length inventory}} items."
  - "{{#each inventory}}{{name}}{{/each}}"

# VN-specific helpers
story_logic:
  - "{{#hasFlag 'met_merchant'}}The merchant recognizes you.{{/hasFlag}}"
  - "{{#playerChose 'helped villager'}}Your kindness is remembered.{{/playerChose}}"
  - "Welcome back, {{getVar 'player.name' 'Stranger'}}!"
  - "Time: {{formatTime gameTime}}"

# Error-safe templates
error_safe:
  - "Health: {{getVar 'nonexistent.health' 'Unknown'}}"  # Won't crash
  - "{{#hasFlag 'undefined_flag'}}Won't show{{/hasFlag}}"  # Safe fallback
```

### Template Context
All game state is available:
- **Variables**: `{{variable_name}}`, `{{object.property}}`
- **Flags**: `{{hasFlag 'flag_name'}}`
- **Choices**: `{{playerChose 'choice_text'}}`
- **Helpers**: Math, comparison, array, and VN-specific functions

## 🎮 Game State Management

### Universal Variables System
Store any data structure in the variables system:

```typescript
// Set complex nested data
vnEngine.gameState.setVariable('player', {
  name: 'Alice',
  stats: { health: 100, level: 1 },
  inventory: [{ name: 'Sword', damage: 10 }]
})

// Access in templates: {{player.name}}, {{player.stats.health}}, {{player.inventory.0.name}}
```

### Story Flags
Boolean flags for tracking story progression:

```typescript
vnEngine.gameState.setStoryFlag('intro_completed')
vnEngine.gameState.hasStoryFlag('intro_completed') // true

// In templates: {{hasFlag 'intro_completed'}}, {{#hasFlag 'intro_completed'}}...{{/hasFlag}}
```

### Choice History
Automatic tracking of all player decisions:

```typescript
const history = vnEngine.gameState.getChoiceHistory()
// [{ scene: 'intro', choiceText: 'Help the stranger', timestamp: ... }]

// In templates: {{playerChose 'Help the stranger'}}, {{#playerChose 'Go to market' 'town_scene'}}...{{/playerChose}}
```

### Save/Load System
```typescript
// Save game state
const saveData = vnEngine.getGameState()
localStorage.setItem('save', JSON.stringify(saveData))

// Load game state  
const saveData = JSON.parse(localStorage.getItem('save'))
vnEngine.setGameState(saveData)
```

## 📋 Core Examples

### Basic Story Structure

```yaml
intro:
  - "Welcome to our story!"
  - actions:
      - type: setVar
        key: player_name
        value: "Hero"
      - type: setFlag
        flag: story_started
  - speaker: "Guide"
    say: "Hello, {{player_name}}!"
  - goto: first_choice

first_choice:
  - text: "What do you want to do?"
    choices:
      - text: "Explore the forest"
        actions:
          - type: setFlag
            flag: chose_forest
        goto: forest_scene
      - text: "Visit the town"
        goto: town_scene

forest_scene:
  - "You enter the mysterious forest..."
  - if: "hasFlag 'story_started'"
    then:
      - "Your adventure begins here."
    else:
      - "How did you get here?"
```

### Character System Example

```yaml
character_creation:
  - "Choose your class:"
  - text: "What are you?"
    choices:
      - text: "Warrior"
        actions:
          - type: setVar
            key: player
            value: { class: "warrior", health: 150, strength: 15 }
          - type: setFlag
            flag: warrior_class
        goto: game_start
      - text: "Mage"
        actions:
          - type: setVar
            key: player
            value: { class: "mage", health: 100, mana: 100 }
          - type: setFlag
            flag: mage_class
        goto: game_start

game_start:
  - "You are a {{player.class}} with {{player.health}} health."
  - "{{#hasFlag 'warrior_class'}}Your sword gleams in the sunlight.{{/hasFlag}}"
  - "{{#hasFlag 'mage_class'}}Magical energy flows through you.{{/hasFlag}}"
```

### Shop System Example

```yaml
shop:
  - speaker: "Merchant"
    say: "You have {{coins}} coins."
  - text: "What would you like?"
    choices:
      - text: "Sword (50 coins)"
        condition: "gte coins 50"
        actions:
          - type: addVar
            key: coins
            value: -50
          - type: addToList
            list: inventory
            item: { name: "Iron Sword", damage: 10 }
        goto: shop
      - text: "Potion (20 coins)"
        condition: "gte coins 20"
        actions:
          - type: addVar
            key: coins
            value: -20
          - type: addToList
            list: inventory
            item: { name: "Health Potion", healing: 50 }
        goto: shop
      - text: "Leave"
        goto: town_square
```

### Consequence Tracking Example

```yaml
village_choice:
  - "A stranger asks for help."
  - text: "Do you help them?"
    choices:
      - text: "Help the stranger"
        actions:
          - type: setFlag
            flag: helped_stranger
          - type: addVar
            key: reputation
            value: 1
        goto: help_result
      - text: "Ignore them"
        goto: ignore_result

later_scene:
  - if: "playerChose 'Help the stranger'"
    then:
      - "The stranger recognizes you and offers a reward!"
    else:
      - "The stranger looks at you with disappointment."
  - "Your reputation: {{reputation}}"
```

## 🔧 Development & Testing

### Error Handling
```yaml
debug_scene:
  - "{{debug player 'Player State'}}"              # Console logging
  - "Name: {{getVar 'player.name' 'UNKNOWN'}}"     # Safe fallbacks
  - "{{hasFlag 'nonexistent_flag'}}"               # Returns false safely
```

### Building
```bash
npm run build      # Build library
npm run dev        # Development mode  
npm test          # Run tests
```

## 📦 Dependencies

- **handlebars** - Core template engine
- **js-yaml** - YAML parsing
- **lodash** - Utility functions

## 🚀 Advanced Features

### Multiple Engine Instances

```typescript
// Run multiple stories simultaneously
const mainStory = createVNEngine()
const sideQuest = createVNEngine()

mainStory.loadScript(mainScript)
sideQuest.loadScript(questScript)

// Each maintains separate state
```

### Event-Driven UI Updates

```typescript
const vnEngine = createVNEngine()

vnEngine.on('stateChange', (result) => {
  switch (result?.type) {
    case 'display_dialogue':
      showDialogue(result.speaker, result.content)
      break
    case 'show_choices':
      showChoices(result.choices)
      break
    case 'scene_complete':
      showSceneComplete()
      break
    case 'error':
      showError(result.error)
      break
  }
})

vnEngine.on('error', (error) => {
  console.error('VN Engine Error:', error)
})

vnEngine.on('loaded', () => {
  console.log('Script loaded successfully!')
})
```

### Custom Template Helper Registration

```typescript
import { TemplateManager } from 'vn-engine'

// Access the internal Handlebars instance if needed
// (Advanced usage - most needs covered by built-in helpers)
```

## 🎯 Use Cases

- **Visual Novels** - Traditional VN games with complex branching
- **Interactive Fiction** - Text-based adventures with state tracking
- **Educational Content** - Interactive tutorials with progress tracking
- **RPGs** - Dialogue systems and narrative branches
- **Choose-Your-Own-Adventure** - Multi-path storytelling
- **Game Tutorials** - Context-aware step-by-step guides
- **Chatbots** - Stateful conversational interfaces
- **Training Simulations** - Scenario-based learning with consequences
- **DLC & Content Updates** - Seamless content expansion
- **Modding Support** - Community-generated content with validation
- **Episodic Releases** - Sequential content delivery

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

---

Built with ❤️ for interactive storytelling