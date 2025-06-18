// test/helper-verification.js
// Quick test to verify all helpers work after migration

// Try different import methods for compatibility
let createVNEngine;

try {
  // Try ES modules first
  const vnEngineModule = await import('../src/index.ts');
  createVNEngine = vnEngineModule.createVNEngine;
} catch (error) {
  try {
    // Try built version
    const vnEngineModule = await import('../dist/vn-engine.js');
    createVNEngine = vnEngineModule.createVNEngine;
  } catch (error2) {
    try {
      // Try CommonJS fallback
      const vnEngineModule = require('../dist/vn-engine.js');
      createVNEngine = vnEngineModule.createVNEngine;
    } catch (error3) {
      console.error('❌ Could not import VN Engine. Please build the project first:');
      console.error('   npm run build');
      console.error('\nOriginal errors:');
      console.error('ES modules:', error.message);
      console.error('Built version:', error2.message);
      console.error('CommonJS:', error3.message);
      process.exit(1);
    }
  }
}

const testScript = `
helper_verification:
  - actions:
      - type: setVar
        key: player
        value: { name: "Alice", level: 5, coins: 100 }
      - type: setVar
        key: items
        value: [{ name: "Sword", damage: 10 }, { name: "Shield", defense: 5 }]
      - type: setFlag
        flag: test_complete

  # Test math helpers
  - "=== MATH HELPERS ==="
  - "Addition: {{add 7 8}}"
  - "Subtraction: {{subtract 15 6}}"
  - "Multiplication: {{multiply 6 7}}"
  - "Division: {{divide 24 6}}"
  
  # Test array helpers
  - "=== ARRAY HELPERS ==="
  - "Item count: {{length items}}"
  - "First item: {{first items.name}}"
  - "Last item: {{last items.name}}"
  
  # Test comparison helpers
  - "=== COMPARISON HELPERS ==="
  - "Equal test: {{eq player.level 5}}"
  - "Greater test: {{gt player.coins 50}}"
  - "Less than test: {{lt player.level 10}}"
  
  # Test logical helpers
  - "=== LOGICAL HELPERS ==="
  - "AND test: {{and true (gt player.coins 50)}}"
  - "OR test: {{or false true}}"
  - "NOT test: {{not false}}"
  
  # Test VN custom helpers
  - "=== VN CUSTOM HELPERS ==="
  - "Has flag: {{hasFlag 'test_complete'}}"
  - "Get variable: {{getVar 'player.name' 'Unknown'}}"
  - "Get with default: {{getVar 'missing.value' 'Default'}}"
  
  # Test complex expressions
  - "=== COMPLEX EXPRESSIONS ==="
  - "Nested math: {{add (multiply 3 4) 5}}"
  - "Conditional: {{#if (and (gt player.level 3) (hasFlag 'test_complete'))}}All conditions met!{{else}}Something failed{{/if}}"
  
  # Test conditionals with helpers
  - if: "gt (length items) 1"
    then:
      - "You have multiple items!"
    else:
      - "You need more items."
      
  - if: "and (eq player.name 'Alice') (gte player.coins 100)"
    then:
      - "Alice has enough coins!"
    else:
      - "Conditions not met."
`

async function runHelperVerification() {
  console.log('🧪 VN Engine Helper Verification Test')
  console.log('=====================================\n')

  try {
    const vnEngine = createVNEngine()
    
    // Test template parsing first
    console.log('📝 Testing template parsing...')
    vnEngine.loadScript(testScript)
    
    if (vnEngine.getError()) {
      throw new Error(`Script loading failed: ${vnEngine.getError()}`)
    }
    console.log('✅ Script loaded successfully\n')

    // Start scene and process all instructions
    console.log('🎬 Running helper verification scene...\n')
    let result = vnEngine.startScene('helper_verification')
    
    let step = 1
    while (result && result.type !== 'scene_complete' && result.type !== 'error') {
      if (result.type === 'display_dialogue') {
        console.log(`Step ${step}: ${result.content}`)
        
        // Check for specific test results
        if (result.content.includes('MATH HELPERS')) {
          console.log('  🧮 Testing math helpers...')
        } else if (result.content.includes('ARRAY HELPERS')) {
          console.log('  📊 Testing array helpers...')
        } else if (result.content.includes('COMPARISON HELPERS')) {
          console.log('  ⚖️ Testing comparison helpers...')
        } else if (result.content.includes('LOGICAL HELPERS')) {
          console.log('  🧠 Testing logical helpers...')
        } else if (result.content.includes('VN CUSTOM HELPERS')) {
          console.log('  🎭 Testing VN custom helpers...')
        } else if (result.content.includes('COMPLEX EXPRESSIONS')) {
          console.log('  🎯 Testing complex expressions...')
        }
        
        step++
      }
      
      if (result.canContinue) {
        result = vnEngine.continue()
      } else {
        break
      }
    }

    // Final checks
    console.log('\n📊 Final Verification:')
    
    // Test individual helpers directly
    const directTests = [
      { template: '{{add 5 3}}', expected: '8', description: 'Basic addition' },
      { template: '{{subtract 10 4}}', expected: '6', description: 'Basic subtraction' },
      { template: '{{multiply 6 7}}', expected: '42', description: 'Basic multiplication' },
      { template: '{{length (array "a" "b" "c")}}', expected: '3', description: 'Array length' },
      { template: '{{hasFlag "test_complete"}}', expected: 'true', description: 'Flag check' },
      { template: '{{getVar "player.name" "Unknown"}}', expected: 'Alice', description: 'Variable access' }
    ]
    
    let passedTests = 0
    let totalTests = directTests.length
    
    for (const test of directTests) {
      try {
        const result = vnEngine.parseTemplate(test.template)
        if (result === test.expected) {
          console.log(`  ✅ ${test.description}: ${result}`)
          passedTests++
        } else {
          console.log(`  ❌ ${test.description}: expected "${test.expected}", got "${result}"`)
        }
      } catch (error) {
        console.log(`  💥 ${test.description}: Error - ${error.message}`)
      }
    }
    
    console.log(`\n📈 Test Results: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`)
    
    if (passedTests === totalTests) {
      console.log('🎉 All helper tests passed! The migration was successful.')
    } else {
      console.log('⚠️ Some tests failed. Check the helper registration.')
    }
    
  } catch (error) {
    console.error('❌ Helper verification failed:', error.message)
    process.exit(1)
  }
}

runHelperVerification()