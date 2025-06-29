import { createTestPackage, verifyTestPackage, getPackageInfo, cleanupTestPackage } from './utils/packager.js';
import { createTestReporter } from './utils/errorReporter.js';

const MOCK_ASSETS = [
  {
    id: 'hero_portrait',
    name: 'hero_portrait.jpg',
    path: '/assets/images/hero_portrait.jpg',
    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
    url: 'https://example.com/assets/hero_portrait.jpg',
    size: 45678,
    type: 'image'
  },
  {
    id: 'background_music',
    name: 'background_music.mp3',
    path: '/assets/audio/background_music.mp3',
    url: 'https://example.com/assets/background_music.mp3',
    size: 3456789,
    type: 'audio'
  },
  {
    id: 'intro_video',
    name: 'intro_video.mp4',
    path: '/assets/videos/intro_video.mp4',
    src: 'https://example.com/assets/intro_video.mp4',
    size: 12345678,
    type: 'video'
  },
  {
    id: 'character_sprite',
    name: 'character sprite.png',
    path: '/assets/sprites/character sprite.png',
    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    size: 23456
  }
];

const ASSET_SCRIPT = `
asset_demo:
  - "Welcome to the asset demo!"
  - "Here's our hero: {{showImage 'hero_portrait' assets 'Hero Character' 'character-image'}}"
  - "{{#if (hasAsset 'background_music' assets)}}We have background music available!{{/if}}"
  - "Asset count: {{assetCount assets}}"
  - "Hero portrait info: {{getAssetInfo 'hero_portrait' assets}}"
  - actions:
    - type: setVar
      key: assets
      value: ${JSON.stringify(MOCK_ASSETS)}
  - choices:
    - text: "Play background music"
      actions:
        - type: setVar
          key: currentMusic
          value: "{{resolveAsset 'background_music' assets}}"
    - text: "Show video"
      actions:
        - type: setVar
          key: currentVideo
          value: "{{playVideo 'intro_video' assets false false 'video-player'}}"
`;

function generateLargeAssetArray(count) {
  const assets = [];
  const types = ['jpg', 'png', 'gif', 'mp3', 'wav', 'mp4', 'webm'];
  
  for (let i = 0; i < count; i++) {
    const ext = types[i % types.length];
    const size = Math.floor(Math.random() * 5000000) + 10000; // 10KB to 5MB
    
    assets.push({
      id: `asset_${i}`,
      name: `asset_${i}.${ext}`,
      path: `/assets/generated/asset_${i}.${ext}`,
      url: `https://example.com/assets/asset_${i}.${ext}`,
      size: size,
      type: ext.includes('jpg') || ext.includes('png') || ext.includes('gif') ? 'image' :
            ext.includes('mp3') || ext.includes('wav') ? 'audio' : 'video'
    });
  }
  
  return assets;
}

export async function runAssetTests() {
  console.log('🎨 VN Engine Asset Helper Tests (Package-based)');
  console.log('===============================================\n');

  const { reporter, assert } = createTestReporter();
  const tests = [];
  let passed = 0;
  let failed = 0;
  let createVNEngine = null;
  let packageInfo = null;

  reporter.setContext({ category: 'asset-helpers-packaged' });

  console.log('📦 Setting up packaged library for asset testing...');
  
  try {
    const importPath = await createTestPackage({
      includeDependencies: false,
      customPackageJson: {}
    });
    
    console.log(`✅ Package created, import path: ${importPath}`);
    
    await verifyTestPackage();
    console.log('✅ Package verification successful');
    
    packageInfo = getPackageInfo();
    console.log(`📦 Testing package: ${packageInfo.name}@${packageInfo.version}`);
    
    const packagedLibrary = await import(importPath);
    createVNEngine = packagedLibrary.createVNEngine;
    
    if (!createVNEngine) {
      throw new Error('createVNEngine not exported from packaged library');
    }
    
    console.log('✅ Successfully imported from packaged library\n');
    
  } catch (error) {
    console.error('❌ Package setup failed:', error.message);
    await cleanupTestPackage();
    throw error;
  }

  function test(name, testFn) {
    tests.push({ name, testFn });
  }

  reporter.setContext({ 
    packageInfo: {
      name: packageInfo.name,
      version: packageInfo.version,
      main: packageInfo.main,
      tarballPath: packageInfo.tarballPath
    }
  });

  test('Asset Detection (Package)', async () => {
    reporter.startTest('Asset Detection (Package)');
    reporter.setContext({ subcategory: 'asset-detection' });
    
    const engine = await createVNEngine();
    
    const hasAssetResult = engine.renderWithVariables(
      '{{hasAsset "hero_portrait" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(hasAssetResult, 'true', 'Should detect existing asset', {
      engine,
      packageInfo,
      hasAssetResult,
      assets: MOCK_ASSETS,
      relatedTests: ['Asset Retrieval (Package)']
    });
    
    const hasNonExistentResult = engine.renderWithVariables(
      '{{hasAsset "nonexistent_asset" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(hasNonExistentResult, 'false', 'Should not detect nonexistent asset', {
      engine,
      packageInfo,
      hasNonExistentResult,
      assets: MOCK_ASSETS
    });
    
    console.log(`   ✅ Asset detection working: found=${hasAssetResult}, missing=${hasNonExistentResult}`);
    
    engine.destroy();
  });

  test('Asset Retrieval (Package)', async () => {
    reporter.startTest('Asset Retrieval (Package)');
    reporter.setContext({ subcategory: 'asset-retrieval' });
    
    const engine = await createVNEngine();
    
    const getAssetResult = engine.renderWithVariables(
      '{{getAsset "hero_portrait" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertType(getAssetResult, 'string', 'Should return asset as string', {
      engine,
      packageInfo,
      getAssetResult,
      assets: MOCK_ASSETS
    });
    
    const resolveAssetResult = engine.renderWithVariables(
      '{{resolveAsset "hero_portrait" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    const expectedUrl = MOCK_ASSETS[0].data || MOCK_ASSETS[0].url || MOCK_ASSETS[0].path;
    assert.assertEqual(resolveAssetResult, expectedUrl, 'Should resolve asset URL correctly', {
      engine,
      packageInfo,
      resolveAssetResult,
      expectedUrl,
      assets: MOCK_ASSETS,
      relatedTests: ['Asset URL Resolution (Package)']
    });
    
    console.log(`   ✅ Asset retrieval working: resolved to ${resolveAssetResult.substring(0, 50)}...`);
    
    engine.destroy();
  });

  test('Asset Media Type Detection (Package)', async () => {
    reporter.startTest('Asset Media Type Detection (Package)');
    reporter.setContext({ subcategory: 'asset-metadata' });
    
    const engine = await createVNEngine();
    
    const imageTypeResult = engine.renderWithVariables(
      '{{getMediaType "hero_portrait.jpg"}}', 
      {}
    );
    
    assert.assertEqual(imageTypeResult, 'image', 'Should detect image type', {
      engine,
      packageInfo,
      imageTypeResult,
      filename: 'hero_portrait.jpg'
    });
    
    const audioTypeResult = engine.renderWithVariables(
      '{{getMediaType "background_music.mp3"}}', 
      {}
    );
    
    assert.assertEqual(audioTypeResult, 'audio', 'Should detect audio type', {
      engine,
      packageInfo,
      audioTypeResult,
      filename: 'background_music.mp3'
    });
    
    const videoTypeResult = engine.renderWithVariables(
      '{{getMediaType "intro_video.mp4"}}', 
      {}
    );
    
    assert.assertEqual(videoTypeResult, 'video', 'Should detect video type', {
      engine,
      packageInfo,
      videoTypeResult,
      filename: 'intro_video.mp4'
    });
    
    const unknownTypeResult = engine.renderWithVariables(
      '{{getMediaType "document.txt"}}', 
      {}
    );
    
    assert.assertEqual(unknownTypeResult, 'unknown', 'Should return unknown for unsupported types', {
      engine,
      packageInfo,
      unknownTypeResult,
      filename: 'document.txt'
    });
    
    console.log(`   ✅ Media type detection: image=${imageTypeResult}, audio=${audioTypeResult}, video=${videoTypeResult}`);
    
    engine.destroy();
  });

  test('Asset Count and File Size (Package)', async () => {
    reporter.startTest('Asset Count and File Size (Package)');
    reporter.setContext({ subcategory: 'asset-utilities' });
    
    const engine = await createVNEngine();
    
    const assetCountResult = engine.renderWithVariables(
      '{{assetCount assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(assetCountResult, MOCK_ASSETS.length.toString(), 'Should count assets correctly', {
      engine,
      packageInfo,
      assetCountResult,
      expectedCount: MOCK_ASSETS.length,
      assets: MOCK_ASSETS
    });
    
    const fileSizeResult = engine.renderWithVariables(
      '{{formatFileSize 1048576}}', 
      {}
    );
    
    assert.assertEqual(fileSizeResult, '1 MB', 'Should format file size correctly', {
      engine,
      packageInfo,
      fileSizeResult,
      inputBytes: 1048576
    });
    
    const smallSizeResult = engine.renderWithVariables(
      '{{formatFileSize 1024}}', 
      {}
    );
    
    assert.assertEqual(smallSizeResult, '1 KB', 'Should format small file size correctly', {
      engine,
      packageInfo,
      smallSizeResult,
      inputBytes: 1024
    });
    
    const decimalSizeResult = engine.renderWithVariables(
      '{{formatFileSize 1536}}', 
      {}
    );
    
    assert.assertEqual(decimalSizeResult, '1.5 KB', 'Should format decimal file sizes correctly', {
      engine,
      packageInfo,
      decimalSizeResult,
      inputBytes: 1536
    });
    
    console.log(`   ✅ Asset utilities: count=${assetCountResult}, size formatting working`);
    
    engine.destroy();
  });

  test('Asset Template Integration (Package)', async () => {
    reporter.startTest('Asset Template Integration (Package)');
    reporter.setContext({ subcategory: 'template-integration' });
    
    const engine = await createVNEngine();
    
    const showImageResult = engine.renderWithVariables(
      '{{showImage "hero_portrait" assets "Hero Character" "character-img"}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assert(showImageResult.includes('<img'), 'Should generate img tag', {
      engine,
      packageInfo,
      showImageResult,
      assets: MOCK_ASSETS
    });
    
    assert.assert(showImageResult.includes('alt="Hero Character"'), 'Should include alt text', {
      engine,
      packageInfo,
      showImageResult
    });
    
    assert.assert(showImageResult.includes('class="character-img"'), 'Should include CSS class', {
      engine,
      packageInfo,
      showImageResult
    });
    
    const playAudioResult = engine.renderWithVariables(
      '{{playAudio "background_music" assets false true}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assert(playAudioResult.includes('<audio'), 'Should generate audio tag', {
      engine,
      packageInfo,
      playAudioResult,
      assets: MOCK_ASSETS
    });
    
    assert.assert(playAudioResult.includes('loop'), 'Should include loop attribute', {
      engine,
      packageInfo,
      playAudioResult
    });
    
    const playVideoResult = engine.renderWithVariables(
      '{{playVideo "intro_video" assets true false "video-container"}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assert(playVideoResult.includes('<video'), 'Should generate video tag', {
      engine,
      packageInfo,
      playVideoResult,
      assets: MOCK_ASSETS
    });
    
    assert.assert(playVideoResult.includes('autoplay'), 'Should include autoplay attribute', {
      engine,
      packageInfo,
      playVideoResult
    });
    
    console.log(`   ✅ Template integration: image, audio, and video helpers working`);
    
    engine.destroy();
  });

  test('Asset Key Normalization (Package)', async () => {
    reporter.startTest('Asset Key Normalization (Package)');
    reporter.setContext({ subcategory: 'key-normalization' });
    
    const engine = await createVNEngine();
    
    const normalizedResult = engine.renderWithVariables(
      '{{normalizeKey "Character Sprite.png"}}', 
      {}
    );
    
    assert.assertEqual(normalizedResult, 'character_sprite', 'Should normalize asset key correctly', {
      engine,
      packageInfo,
      normalizedResult,
      originalKey: 'Character Sprite.png'
    });
    
    const findByNormalizedResult = engine.renderWithVariables(
      '{{hasAsset "character sprite.png" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(findByNormalizedResult, 'true', 'Should find asset by normalized key', {
      engine,
      packageInfo,
      findByNormalizedResult,
      assets: MOCK_ASSETS,
      searchKey: 'character sprite.png'
    });
    
    console.log(`   ✅ Key normalization: "${normalizedResult}" found asset: ${findByNormalizedResult}`);
    
    engine.destroy();
  });

  test('Asset Validation (Package)', async () => {
    reporter.startTest('Asset Validation (Package)');
    reporter.setContext({ subcategory: 'asset-validation' });
    
    const engine = await createVNEngine();
    
    const validAssetResult = engine.renderWithVariables(
      '{{validateAsset "hero_portrait" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(validAssetResult, 'true', 'Should validate existing asset', {
      engine,
      packageInfo,
      validAssetResult,
      assets: MOCK_ASSETS
    });
    
    const invalidAssetResult = engine.renderWithVariables(
      '{{validateAsset "missing_asset" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(invalidAssetResult, 'false', 'Should invalidate missing asset', {
      engine,
      packageInfo,
      invalidAssetResult,
      assets: MOCK_ASSETS
    });
    
    const emptyAssetsResult = engine.renderWithVariables(
      '{{validateAsset "any_asset" emptyAssets}}', 
      { emptyAssets: [] }
    );
    
    assert.assertEqual(emptyAssetsResult, 'false', 'Should handle empty assets array', {
      engine,
      packageInfo,
      emptyAssetsResult,
      emptyAssets: []
    });
    
    console.log(`   ✅ Asset validation: valid=${validAssetResult}, invalid=${invalidAssetResult}, empty=${emptyAssetsResult}`);
    
    engine.destroy();
  });

  test('Asset Error Handling (Package)', async () => {
    reporter.startTest('Asset Error Handling (Package)');
    reporter.setContext({ subcategory: 'error-handling' });
    
    const engine = await createVNEngine();
    
    const nullAssetsResult = engine.renderWithVariables(
      '{{hasAsset "test" nullAssets}}', 
      { nullAssets: null }
    );
    
    assert.assertEqual(nullAssetsResult, 'false', 'Should handle null assets gracefully', {
      engine,
      packageInfo,
      nullAssetsResult
    });
    
    const invalidKeyResult = engine.renderWithVariables(
      '{{resolveAsset "" assets}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(invalidKeyResult, '', 'Should handle empty asset key gracefully', {
      engine,
      packageInfo,
      invalidKeyResult,
      assets: MOCK_ASSETS
    });
    
    const missingImageResult = engine.renderWithVariables(
      '{{showImage "missing_image" assets "Alt text"}}', 
      { assets: MOCK_ASSETS }
    );
    
    assert.assertEqual(missingImageResult, '', 'Should return empty string for missing image asset', {
      engine,
      packageInfo,
      missingImageResult,
      assets: MOCK_ASSETS
    });
    
    console.log(`   ✅ Error handling: null assets, empty keys, missing assets handled gracefully`);
    
    engine.destroy();
  });

  test('Large Asset Collection Performance (Package)', async () => {
    reporter.startTest('Large Asset Collection Performance (Package)');
    reporter.setContext({ subcategory: 'performance' });
    
    const engine = await createVNEngine();
    const largeAssets = generateLargeAssetArray(500);
    
    const performanceStart = performance.now();
    
    const countResult = engine.renderWithVariables(
      '{{assetCount assets}}', 
      { assets: largeAssets }
    );
    
    const hasResult = engine.renderWithVariables(
      '{{hasAsset "asset_250" assets}}', 
      { assets: largeAssets }
    );
    
    const getResult = engine.renderWithVariables(
      '{{getAsset "asset_100" assets}}', 
      { assets: largeAssets }
    );
    
    const performanceEnd = performance.now();
    const executionTime = performanceEnd - performanceStart;
    
    assert.assertEqual(countResult, '500', 'Should count large asset collection correctly', {
      engine,
      packageInfo,
      countResult,
      assetCount: largeAssets.length,
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
    assert.assertEqual(hasResult, 'true', 'Should find asset in large collection', {
      engine,
      packageInfo,
      hasResult,
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
    assert.assertType(getResult, 'string', 'Should retrieve asset from large collection', {
      engine,
      packageInfo,
      getResult: getResult.substring(0, 50) + '...',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
    console.log(`   ✅ Large collection performance: ${largeAssets.length} assets processed in ${executionTime.toFixed(2)}ms`);
    
    assert.assert(executionTime < 100, 'Large asset operations should complete under 100ms', {
      engine,
      packageInfo,
      executionTime: `${executionTime.toFixed(2)}ms`,
      threshold: '100ms',
      assetCount: largeAssets.length
    });
    
    engine.destroy();
  });

  console.log('🔍 Running asset helper tests...\n');

  for (const { name, testFn } of tests) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n🧹 Cleaning up test package...');
  try {
    await cleanupTestPackage();
    console.log('✅ Asset test cleanup completed');
  } catch (error) {
    console.warn(`⚠️ Cleanup failed: ${error.message}`);
  }

  if (reporter.errors.length > 0) {
    console.log(reporter.generateSummary());
  }

  console.log(`\n📊 Asset Helper Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Asset Test Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (packageInfo) {
    console.log(`📦 Tested Package: ${packageInfo.name}@${packageInfo.version}`);
  }

  if (failed > 0) {
    console.log('\n🔧 Review the detailed error analysis above for debugging information');
    return { passed, failed, success: false, errors: reporter.exportErrors(), packageInfo };
  } else {
    console.log('\n🎉 All asset helper tests passed!');
    return { passed, failed, success: true, errors: null, packageInfo };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAssetTests().then(results => {
    if (!results.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Asset test runner failed:', error);
    process.exit(1);
  });
}