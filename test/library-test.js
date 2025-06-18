// test/library-test.js
// ES Module compatible test for VN Engine

import { createVNEngine } from '../dist/vn-engine.js'

const testScript = `
test_scene:
  - "Hello from Node.js!"
  - speaker: "System"
    say: "Testing the VN engine as a library."
    actions:
      - type: setVar
        key: test_var
        value: 42
  - "Test variable is: {{test_var}}"
  
helper_test:
  - actions:
      - type: setVar
        key: num_a
        value: 10
      - type: setVar
        key: num_b
        value: 5
  - "Math test: {{add num_a num_b}}"
  - "Subtraction: {{subtract num_a num_b}}"
  - "Multiplication: {{multiply 3 4}}"
`

async function testLibrary() {
  console.log('🧪 Testing VN Engine Library...\n')

  try {
    const vnEngine = createVNEngine()
    
    // Load script
    console.log('📝 Loading test script...')
    vnEngine.loadScript(testScript, 'test.yaml')
    
    if (vnEngine.getError()) {
      throw new Error(vnEngine.getError())
    }
    console.log('✅ Script loaded successfully\n')

    // Test basic scene
    console.log('🎬 Starting test scene...')
    let result = vnEngine.startScene('test_scene')
    
    let step = 1
    while (result.type !== 'scene_complete' && result.type !== 'error') {
      console.log(`Step ${step}:`)
      console.log(`  Type: ${result.type}`)
      console.log(`  Content: ${result.content}`)
      if (result.speaker) console.log(`  Speaker: ${result.speaker}`)
      
      // Auto-continue dialogue
      if (result.type === 'display_dialogue' && result.canContinue) {
        result = vnEngine.continue()
      } else {
        break
      }
      
      step++
      console.log()
    }

    // Test helper scene
    console.log('\n🧮 Testing helpers scene...')
    result = vnEngine.startScene('helper_test')
    
    step = 1
    while (result.type !== 'scene_complete' && result.type !== 'error') {
      console.log(`Helper Step ${step}: ${result.content}`)
      
      if (result.type === 'display_dialogue' && result.canContinue) {
        result = vnEngine.continue()
      } else {
        break
      }
      
      step++
    }

    // Show final state
    console.log('\n🎯 Final game state:')
    const gameState = vnEngine.getGameState()
    const variablesObj = Object.fromEntries(gameState.variables)
    console.log('  Variables:', variablesObj)
    console.log('  Flags:', gameState.storyFlags)
    
    // Test direct template parsing
    console.log('\n🔍 Direct template tests:')
    const templateTests = [
      '{{add 5 3}}',
      '{{subtract 10 2}}', 
      '{{multiply 4 6}}',
      '{{test_var}}'
    ]
    
    for (const template of templateTests) {
      try {
        const result = vnEngine.parseTemplate(template)
        console.log(`  ${template} → ${result}`)
      } catch (error) {
        console.log(`  ${template} → ERROR: ${error.message}`)
      }
    }
    
    console.log('\n✅ Library test completed successfully!')
    
  } catch (error) {
    console.error('❌ Library test failed:', error.message)
    console.error('\n🔧 Possible fixes:')
    console.error('1. Make sure project is built: npm run build')
    console.error('2. Check helper libraries: node quick-helper-test.js')
    console.error('3. Verify dependencies: npm install')
    process.exit(1)
  }
}

testLibrary()