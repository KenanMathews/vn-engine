# 🎭 VN Engine Library

A powerful, flexible TypeScript library for creating visual novels and interactive narratives. Built with a pragmatic, variables-based architecture that can support any genre.

## ✨ Features

- 📝 **YAML-based scripting** - Clean, readable narrative format
- 🎮 **Universal game state** - Variables system supports any data structure  
- 🌟 **Dual template engine** - Full Handlebars support with robust fallback
- 🎨 **Asset management** - Comprehensive multimedia support with validation and display helpers
- 🔀 **Choice tracking** - Advanced branching narrative support
- 🎯 **Event-driven** - React to game state changes
- 🏗️ **Framework-agnostic** - Works with any UI framework or vanilla JS
- 📱 **TypeScript first** - Full type safety and excellent DX
- 🪶 **Lightweight** - Zero required dependencies for basic functionality
- 🔧 **Robust fallbacks** - Graceful degradation when optional libraries unavailable
- 🚀 **Script Upgrades & DLC** - Hot-swappable content with validation and rollback
- ⚡ **Async-ready** - Modern async/await patterns with backward compatibility

## 🚀 Quick Start

### Installation

```bash
npm install vn-engine
```

### Optional Dependencies

For enhanced template functionality, you can install Handlebars:

```bash
npm install handlebars
npm install @types/handlebars  # For TypeScript projects
```

**Note:** VN Engine works perfectly without Handlebars! It includes a built-in simple template engine that covers most use cases. Handlebars is only needed for advanced template features like loops and custom helpers.

### Basic Usage (Recommended - Async)

```typescript
import { createVNEngine } from 'vn-engine'

async function initializeGame() {
  // Create engine instance
  const vnEngine = createVNEngine()
  
  // Initialize async (detects and sets up Handlebars if available)
  await vnEngine.initialize()

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
}

initializeGame()
```

### Synchronous Usage (Legacy Support)

```typescript
import { createVNEngine } from 'vn-engine'

// Create engine instance (uses simple template engine by default)
const vnEngine = createVNEngine()

// Use immediately - no initialization required for basic functionality
vnEngine.loadScript(script)
vnEngine.startScene('welcome')
```

### Template Engine Information

Check which template engine is active:

```typescript
const engineInfo = vnEngine.getTemplateEngineInfo()
console.log(`Using ${engineInfo.type} template engine`)
console.log('Available features:', engineInfo.supportedFeatures)

if (engineInfo.type === 'handlebars') {
  console.log('✅ Full template functionality available')
  console.log('📊 Advanced helpers loaded:', engineInfo.helpersRegistered)
} else {
  console.log('ℹ️ Using simple template engine - basic functionality available')
  console.log('💡 Install handlebars for advanced features')
}
```

## 📚 API Reference

### VNEngine Class

#### Factory Function
```typescript
createVNEngine(): VNEngine
```
Creates a new VN engine instance. Multiple instances are supported.

#### Initialization (Recommended)

```typescript
// Async initialization - detects and configures Handlebars
await vnEngine.initialize(): Promise<void>

// Check if engine is ready for advanced templates
vnEngine.isTemplateEngineReady(): boolean

// Get template engine information
vnEngine.getTemplateEngineInfo(): TemplateEngineInfo
```

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

### Template Engine Types

```typescript
interface TemplateEngineInfo {
  type: 'handlebars' | 'simple'
  isHandlebarsAvailable: boolean
  helpersRegistered: boolean
  supportedFeatures: {
    variables: boolean
    conditionals: boolean
    helpers: boolean
    loops: boolean
    partials: boolean
  }
}
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
        condition: "{{hasFlag 'directors_cut'}}"
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

## 🎨 Template System

VN Engine features a dual template system that adapts to your needs:

### Handlebars Mode (Full Features)
When Handlebars is installed and detected, you get access to all advanced template features:

```yaml
# Full Handlebars functionality
advanced_templates:
  - "Hello {{player_name}}!"
  - "You have {{add coins bonus}} total coins."
  - "Inventory: {{#each inventory}}{{name}} {{/each}}"
  - "{{#if (gt player.level 10)}}You're experienced!{{/if}}"
  - "Random choice: {{sample choices}}"
  - "{{#hasFlag 'met_merchant'}}The merchant recognizes you.{{/hasFlag}}"
```

### Simple Mode (Built-in Fallback)
When Handlebars isn't available, the engine uses a lightweight template system:

```yaml
# Simple template features (always available)
simple_templates:
  - "Hello {{player_name}}!"
  - "{{#if player.healthy}}You feel great!{{else}}You need rest.{{/if}}"
  - "Health: {{player.health}}"
  - "Condition check: {{#if (gt player.level 5)}}High level{{/if}}"
```

### Template Engine Detection

```typescript
async function setupTemplates() {
  await vnEngine.initialize()
  
  const info = vnEngine.getTemplateEngineInfo()
  
  if (info.type === 'handlebars') {
    console.log('✅ Full template functionality available')
    console.log('Available helpers:', info.helpersRegistered ? 'Yes' : 'Basic only')
  } else {
    console.log('ℹ️ Using simple template engine')
    console.log('Supported features:', info.supportedFeatures)
  }
}
```

### Advanced Template Features (Handlebars Required)

```yaml
# Math helpers
calculations:
  - "Total: {{add player.coins bonus}}"
  - "Damage: {{multiply weapon.power player.strength}}"
  - "Random damage: {{randomInt 10 20}}"

# Array helpers  
inventory_display:
  - "Items: {{join inventory.names ', '}}"
  - "First item: {{first inventory}}"
  - "{{#each (take inventory 3)}}{{name}} {{/each}}"

# String helpers
text_formatting:
  - "{{uppercase player.name}} the {{titleCase player.class}}"
  - "{{truncate long_description 50}}"
  - "{{typewriter 'Mysterious text appears...' 30}}"

# Asset helpers
multimedia_content:
  - "Total assets: {{assetCount gameAssets}}"
  - "{{#hasAsset 'hero_portrait' gameAssets}}✅ Character loaded{{else}}❌ Missing{{/hasAsset}}"
  - "{{showImage 'background' gameAssets 'Forest Scene' 'scene-bg'}}"
  - "{{playAudio 'theme_music' gameAssets true true}}"
  - "File size: {{formatFileSize 1048576}}"
  - "Media type: {{getMediaType 'image.jpg'}}"
  - "{{#validateAsset 'sound_effect' gameAssets}}Audio ready{{/validateAsset}}"

# VN-specific helpers
story_logic:
  - "{{#hasFlag 'met_merchant'}}The merchant recognizes you.{{/hasFlag}}"
  - "{{#playerChose 'helped villager'}}Your kindness is remembered.{{/playerChose}}"
  - "Welcome back, {{getVar 'player.name' 'Stranger'}}!"
  - "Time: {{formatTime gameTime}}"

# Comparison helpers
conditionals:
  - "{{#gt player.level 10}}You're experienced!{{/gt}}"
  - "{{#between player.health 25 75}}Your health is moderate.{{/between}}"
  - "{{#isEmpty inventory}}Your inventory is empty.{{/isEmpty}}"
```

### Template Context
All game state is available in templates:
- **Variables**: `{{variable_name}}`, `{{object.property}}`
- **Flags**: `{{hasFlag 'flag_name'}}`
- **Choices**: `{{playerChose 'choice_text'}}`
- **Helpers**: Math, comparison, array, and VN-specific functions

### Validating Templates

```typescript
// Check if a template is valid for current engine
const validation = vnEngine.validateTemplate('{{gt player.level 5}}')

if (validation.valid) {
  console.log(`Template valid for ${validation.engine} engine`)
} else {
  console.warn(`Template error: ${validation.error}`)
  console.log('Available features:', validation.supportedFeatures)
}
```

## 🎨 Asset Management System

VN Engine includes a comprehensive asset management system that handles multimedia content with validation, display helpers, and seamless integration with your visual novel scripts.

### Asset Structure

Assets are stored as objects with standardized properties:

```yaml
# Asset setup in your script
setup:
  - actions:
      - type: setVar
        key: gameAssets
        value:
          - id: "hero_portrait"
            name: "hero.jpg"
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400"
            size: 52000
            category: "portrait"
          - id: "forest_bg"
            name: "forest.jpg"
            url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600"
            size: 180000
            category: "background"
          - id: "theme_music"
            name: "theme.mp3"
            url: "https://example.com/music.mp3"
            size: 1200000
            category: "audio"
```

### Asset Helper Functions

#### Asset Detection & Validation
```yaml
asset_check:
  - "Total assets: {{assetCount gameAssets}}"
  - "Hero available: {{#hasAsset 'hero_portrait' gameAssets}}YES{{else}}NO{{/hasAsset}}"
  - "Asset valid: {{#validateAsset 'hero_portrait' gameAssets}}✅{{else}}❌{{/validateAsset}}"
  - "URL exists: {{#if (resolveAsset 'hero_portrait' gameAssets)}}✅{{else}}❌{{/if}}"
```

#### Media Display
```yaml
multimedia_scene:
  - "{{showImage 'hero_portrait' gameAssets 'Hero Character' 'character-portrait'}}"
  - speaker: "Hero"
    say: "My portrait should be visible above!"
  - "{{showImage 'forest_bg' gameAssets 'Forest Scene' 'scene-background'}}"
  - "Background music: {{playAudio 'theme_music' gameAssets true true}}"
```

#### File Information
```yaml
asset_info:
  - "Portrait type: {{getMediaType 'hero.jpg'}}"
  - "Music type: {{getMediaType 'theme.mp3'}}"
  - "File size: {{formatFileSize 52000}}"
  - "Large file: {{formatFileSize 1048576}}"
  - "Normalized key: {{normalizeKey 'Hero Portrait.PNG'}}"
```

### Asset Helper Reference

#### Core Helpers (Handlebars Required)

| Helper | Purpose | Example |
|--------|---------|---------|
| `{{assetCount assets}}` | Count assets in array | `Total: {{assetCount gameAssets}}` |
| `{{hasAsset 'id' assets}}` | Check if asset exists | `{{#hasAsset 'hero' assets}}Found{{/hasAsset}}` |
| `{{validateAsset 'id' assets}}` | Validate asset integrity | `{{#validateAsset 'hero' assets}}Valid{{/validateAsset}}` |
| `{{resolveAsset 'id' assets}}` | Get asset URL | `{{resolveAsset 'hero' assets}}` |
| `{{getAssetInfo 'id' assets}}` | Get asset metadata | Access with `{{#with (getAssetInfo 'hero' assets)}}` |
| `{{showImage 'id' assets 'alt' 'class'}}` | Generate image HTML | `{{showImage 'hero' assets 'Hero' 'portrait'}}` |
| `{{playAudio 'id' assets autoplay loop}}` | Generate audio HTML | `{{playAudio 'music' assets true false}}` |
| `{{playVideo 'id' assets autoplay loop 'class'}}` | Generate video HTML | `{{playVideo 'intro' assets true false 'fullscreen'}}` |
| `{{getMediaType 'filename'}}` | Detect media type | `{{getMediaType 'image.jpg'}}` → `"image"` |
| `{{formatFileSize bytes}}` | Format file size | `{{formatFileSize 1024}}` → `"1.0 KB"` |
| `{{normalizeKey 'input'}}` | Normalize asset key | `{{normalizeKey 'My File.PNG'}}` → `"my_file"` |

#### Media Type Detection

| File Extension | Detected Type |
|----------------|---------------|
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp` | `image` |
| `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac` | `audio` |
| `.mp4`, `.webm`, `.avi`, `.mov`, `.wmv`, `.flv` | `video` |
| All others | `unknown` |

### Asset Usage Examples

#### Character Introduction with Portrait
```yaml
character_intro:
  - "Meet our protagonist!"
  - "{{showImage 'hero_portrait' gameAssets 'Main Character' 'character-image'}}"
  - speaker: "Hero"
    say: "Hello! I'm the main character of this story."
  - "Character file: {{getMediaType 'hero.jpg'}} ({{formatFileSize 52000}})"
```

#### Interactive Scene with Background and Audio
```yaml
forest_scene:
  - "{{showImage 'forest_bg' gameAssets 'Mystical Forest' 'scene-background'}}"
  - "You enter a mystical forest filled with ancient magic..."
  - "{{playAudio 'forest_ambience' gameAssets true true}}"
  - "The sounds of nature surround you as you explore."
  - text: "What do you do?"
    choices:
      - text: "Explore deeper"
        goto: forest_depths
      - text: "Return to town"
        goto: town_square
```

#### Asset Validation and Error Handling
```yaml
asset_validation:
  - "Checking game assets..."
  - "Hero portrait: {{#hasAsset 'hero_portrait' gameAssets}}✅ Ready{{else}}❌ Missing{{/hasAsset}}"
  - "Background: {{#hasAsset 'forest_bg' gameAssets}}✅ Ready{{else}}❌ Missing{{/hasAsset}}"
  - "Audio: {{#hasAsset 'theme_music' gameAssets}}✅ Ready{{else}}❌ Missing{{/hasAsset}}"
  - "{{#validateAsset 'hero_portrait' gameAssets}}All systems ready!{{else}}Please check your assets.{{/validateAsset}}"
```

#### Dynamic Asset Information Display
```yaml
asset_library:
  - "📚 **Asset Library Overview**"
  - "• Total Assets: {{assetCount gameAssets}}"
  - "• Storage Used: {{formatFileSize totalAssetSize}}"
  - ""
  - "**Character Portraits:**"
  - "{{#each characterAssets}}"
  - "• {{name}} ({{../formatFileSize size}}) - {{#../hasAsset id ../gameAssets}}✅{{else}}❌{{/../hasAsset}}"
  - "{{/each}}"
```

### Integration with External Assets

#### Using Real URLs (Recommended for Production)
```yaml
# Using reliable, open-source image providers
production_assets:
  - actions:
      - type: setVar
        key: gameAssets
        value:
          # Unsplash for high-quality photos (Creative Commons)
          - id: "hero_portrait"
            name: "hero.jpg"
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop&crop=face"
            size: 52000
          # OpenGameArt for game audio (Open Source)
          - id: "background_music"
            name: "theme.mp3"
            url: "https://opengameart.org/sites/default/files/audio_preview/theme_music.mp3"
            size: 856000
          # Freesound for sound effects (Creative Commons)
          - id: "sword_clash"
            name: "combat.wav"
            url: "https://freesound.org/data/previews/316/316847_5247576-hq.mp3"
            size: 45000
```

#### Local Asset Management
```yaml
# For local development or packaged games
local_assets:
  - actions:
      - type: setVar
        key: gameAssets
        value:
          - id: "hero_portrait"
            name: "hero.jpg"
            url: "./assets/images/hero.jpg"
            size: 52000
          - id: "background_music"
            name: "theme.mp3"
            url: "./assets/audio/theme.mp3"
            size: 856000
```

### Error Handling & Graceful Degradation

The asset system is designed to handle missing or invalid assets gracefully:

```yaml
error_resilience:
  - "Testing missing assets..."
  - "Missing image: {{showImage 'nonexistent' gameAssets 'Missing' 'placeholder'}}"
  - "Missing audio: {{playAudio 'nonexistent' gameAssets}}"
  - "Invalid count: {{assetCount invalidVariable}}"
  - "Safe fallback: {{getMediaType ''}}"
  - "Zero size: {{formatFileSize 0}}"
```

**Expected Results:**
- Missing assets return empty strings (no broken HTML)
- Invalid inputs return safe defaults (`0`, `"unknown"`, `""`)
- Asset validation helpers return `false` for missing assets
- File size formatting handles edge cases (0 bytes → "0 B")

### Asset Performance Tips

1. **Optimize Asset URLs**: Use CDN links with proper sizing parameters
2. **Validate Early**: Check assets during scene setup, not during display
3. **Cache Asset Info**: Store frequently accessed asset metadata in variables
4. **Progressive Loading**: Load critical assets first, then background elements
5. **Error Boundaries**: Always provide fallbacks for missing assets

### Best Practices

#### Organize Assets by Category
```yaml
setup_organized_assets:
  - actions:
      - type: setVar
        key: portraitAssets
        value: [list of character portraits]
      - type: setVar
        key: backgroundAssets  
        value: [list of scene backgrounds]
      - type: setVar
        key: audioAssets
        value: [list of music and sound effects]
```

#### Use Consistent Naming
```yaml
# Good: Consistent, descriptive naming
consistent_assets:
  - id: "char_hero_portrait"
  - id: "char_villain_portrait"
  - id: "bg_forest_day"
  - id: "bg_castle_night"
  - id: "sfx_sword_clash"
  - id: "music_town_theme"
```

#### Validate Asset Collections
```yaml
asset_validation_scene:
  - "Validating asset collection..."
  - "Characters: {{assetCount portraitAssets}} portraits loaded"
  - "Backgrounds: {{assetCount backgroundAssets}} scenes ready"
  - "Audio: {{assetCount audioAssets}} sounds available"
  - "{{#gt (assetCount gameAssets) 0}}Asset system ready!{{else}}No assets loaded.{{/gt}}"
```

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
const saveFile = vnEngine.createSave({
  playerName: 'Alice',
  playtime: 120,
  checkpoint: 'forest_entrance'
})

// Load with error handling
const loadResult = vnEngine.loadSave(saveFile.gameState)
const loadSuccess = loadResult.type !== 'error'

if (loadSuccess) {
  console.log('Restored to scene:', vnEngine.getCurrentScene())
  console.log('At instruction:', vnEngine.getCurrentInstruction())
}
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
        condition: "{{gte coins 50}}"
        actions:
          - type: addVar
            key: coins
            value: -50
          - type: addToList
            list: inventory
            item: { name: "Iron Sword", damage: 10 }
        goto: shop
      - text: "Potion (20 coins)"
        condition: "{{gte coins 20}}"
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

### Asset-Driven Visual Novel Example

```yaml
# Setup game assets
setup:
  - actions:
      - type: setVar
        key: gameAssets
        value:
          - id: "hero_portrait"
            name: "hero.jpg"
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400"
            size: 52000
          - id: "castle_bg"
            name: "castle.jpg"
            url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600"
            size: 220000
          - id: "dramatic_music"
            name: "drama.mp3"
            url: "https://opengameart.org/sites/default/files/dramatic_theme.mp3"
            size: 890000

# Visual scene with multimedia
castle_approach:
  - "{{showImage 'castle_bg' gameAssets 'Ancient Castle' 'scene-background'}}"
  - "{{playAudio 'dramatic_music' gameAssets true true}}"
  - "You approach the imposing castle, its towers reaching toward storm clouds..."
  - text: "How do you proceed?"
    choices:
      - text: "Approach openly"
        goto: castle_main_gate
      - text: "Sneak around back"
        goto: castle_secret_entrance

castle_main_gate:
  - "{{showImage 'hero_portrait' gameAssets 'Hero Character' 'character-portrait'}}"
  - speaker: "Hero"
    say: "I'll face whatever awaits me with courage!"
  - "The guards notice your approach..."
  - "{{#hasAsset 'guard_portrait' gameAssets}}{{showImage 'guard_portrait' gameAssets 'Castle Guard' 'character-portrait'}}{{/hasAsset}}"
  - speaker: "Guard"
    say: "State your business here!"
  - text: "What do you say?"
    choices:
      - text: "I seek an audience with the lord"
        actions:
          - type: setFlag
            flag: diplomatic_approach
        goto: castle_diplomatic
      - text: "I demand entry!"
        actions:
          - type: setFlag
            flag: aggressive_approach
        goto: castle_confrontation
```

## 🔧 Development & Testing

### Initialization Patterns

```typescript
// Modern async pattern (recommended)
async function initGame() {
  const vnEngine = createVNEngine()
  await vnEngine.initialize()  // Detects Handlebars, sets up helpers
  // Engine ready with all features
}

// Legacy sync pattern (still supported)
function initGameSync() {
  const vnEngine = createVNEngine()
  // Engine ready with basic features immediately
  // Handlebars detection happens lazily
}

// Check engine status
function checkEngineStatus(vnEngine) {
  console.log('Template engine ready:', vnEngine.isTemplateEngineReady())
  console.log('Engine info:', vnEngine.getTemplateEngineInfo())
}
```

### Error Handling
```yaml
debug_scene:
  - "{{debug player 'Player State'}}"              # Console logging (Handlebars only)
  - "Name: {{getVar 'player.name' 'UNKNOWN'}}"     # Safe fallbacks (both engines)
  - "{{hasFlag 'nonexistent_flag'}}"               # Returns false safely (both engines)
```

### Building & Testing Scripts
```bash
npm run build           # Build the library
npm run dev             # Start development server (for demo)
npm test                # Run full test suite (core, performance, edge cases on packaged version)
npm run type-check      # Check TypeScript types
npm run test:core       # Run only core functionality tests
npm run test:package    # Build library and run tests on the packaged version
npm run package:test    # Dry run npm pack to check package contents
npm run package:analyze # Build, pack, analyze package size, then cleanup
npm run demo            # Run demo application
```

## 📦 Dependencies

### Required (Core Functionality)
- **js-yaml** - YAML parsing
- **lodash** - Utility functions (used internally for robust operations)

### Optional (Enhanced Features)
- **handlebars** - Advanced template engine with helpers and loops

### Zero Dependencies Mode
VN Engine can work with zero external dependencies by using a simplified YAML parser and template engine (future feature).

## 🚀 Advanced Features

### Multiple Engine Instances

```typescript
// Run multiple stories simultaneously
const mainStory = createVNEngine()
const sideQuest = createVNEngine()

await Promise.all([
  mainStory.initialize(),
  sideQuest.initialize()
])

mainStory.loadScript(mainScript)
sideQuest.loadScript(questScript)

// Each maintains separate state and template engines
```

### Event-Driven UI Updates

```typescript
const vnEngine = createVNEngine()
await vnEngine.initialize()

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
// Only works when Handlebars is available
await vnEngine.initialize()

const templateEngine = vnEngine.getTemplateEngineInfo()
if (templateEngine.type === 'handlebars') {
  const handlebars = vnEngine.getHandlebarsInstance()
  
  // Register custom helper
  handlebars.registerHelper('customHelper', (value) => {
    return `Custom: ${value}`
  })
  
  console.log('Custom helper registered!')
} else {
  console.log('Custom helpers require Handlebars')
}
```

### Template Engine Feature Detection

```typescript
const vnEngine = createVNEngine()
await vnEngine.initialize()

// Check what features are available
const features = vnEngine.getTemplateEngineInfo().supportedFeatures

if (features.helpers) {
  console.log('Advanced helpers available')
  // Use complex template features
} else {
  console.log('Using simple templates')
  // Stick to basic variable interpolation
}

if (features.loops) {
  // Can use {{#each}} loops
} else {
  // Use simple conditionals only
}
```

## 🎯 Use Cases

- **Visual Novels** - Traditional VN games with multimedia assets and complex branching
- **Interactive Fiction** - Text-based adventures with images, audio, and state tracking
- **Educational Content** - Interactive tutorials with multimedia content and progress tracking
- **RPGs** - Dialogue systems, character portraits, and narrative branches
- **Choose-Your-Own-Adventure** - Multi-path storytelling with visual and audio elements
- **Game Tutorials** - Context-aware guides with screenshots and demonstration videos
- **Chatbots** - Stateful conversational interfaces with rich media support
- **Training Simulations** - Scenario-based learning with multimedia assets and consequences
- **DLC & Content Updates** - Seamless content expansion with new assets and scenes
- **Modding Support** - Community-generated content with asset validation
- **Episodic Releases** - Sequential content delivery with episode-specific assets
- **Progressive Web Apps** - Lightweight narrative experiences with optimized asset loading
- **Content Management** - Template-driven systems with multimedia content
- **Digital Storytelling** - Interactive narratives with photos, audio, and video
- **Museum Exhibits** - Interactive displays with historical images and audio guides
- **Product Demos** - Interactive showcases with product images and videos

### Template Compatibility

#### Always Compatible (Both Engines)
```yaml
- "Hello {{player_name}}!"
- "Health: {{player.health}}"
- if: "gt player.level 5"
  then: ["You're experienced!"]
```

#### Handlebars Only
```yaml
- "{{#each inventory}}{{name}} {{/each}}"
- "{{add coins bonus}}"
- "{{randomInt 1 6}}"
- "{{#hasFlag 'special'}}Secret content{{/hasFlag}}"
- "{{showImage 'hero' assets 'Hero' 'portrait'}}"
- "{{formatFileSize 1024}}"
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

### Development Setup

```bash
git clone <repository>
cd vn-engine
npm install

# For testing with Handlebars
npm install handlebars @types/handlebars

# Run tests
npm test

# Build library
npm run build
```

---

Built with ❤️ for interactive storytelling

**Note:** VN Engine is designed to work perfectly out of the box with zero configuration. Install Handlebars for advanced features, or use the built-in simple template engine for lightweight projects!