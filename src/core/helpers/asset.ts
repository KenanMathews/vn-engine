export interface AssetHelpers {
  hasAsset(assetKey: string, assets: any[]): boolean;
  getAsset(assetKey: string, assets: any[]): any | null;
  resolveAsset(assetKey: string, assets: any[]): string | null;
  
  getMediaType(filename: string): 'image' | 'audio' | 'video' | 'unknown';
  getAssetInfo(assetKey: string, assets: any[]): { type: string; size?: number; name?: string } | null;
  
  validateAsset(assetKey: string, assets: any[]): boolean;
  
  assetCount(assets: any[]): number;
  formatFileSize(bytes: number): string;
  
  normalizeKey(input: string): string;
}

export const assetHelpers: AssetHelpers = {
  hasAsset(assetKey: string, assets: any[]): boolean {
    if (!Array.isArray(assets)) return false;
    const normalizedKey = assetHelpers.normalizeKey(assetKey);
    
    return assets.some(asset => {
      if (!asset) return false;
      
      const checks = [
        asset.id === assetKey,
        asset.id === normalizedKey,
        asset.name === assetKey,
        asset.path === assetKey,
        assetHelpers.normalizeKey(asset.name || '') === normalizedKey,
        assetHelpers.normalizeKey(asset.path || '') === normalizedKey
      ];
      
      return checks.some(Boolean);
    });
  },

  getAsset(assetKey: string, assets: any[]): any | null {
    if (!Array.isArray(assets)) return null;
    const normalizedKey = assetHelpers.normalizeKey(assetKey);
    
    return assets.find(asset => {
      if (!asset) return false;
      
      return asset.id === assetKey ||
             asset.id === normalizedKey ||
             asset.name === assetKey ||
             asset.path === assetKey ||
             assetHelpers.normalizeKey(asset.name || '') === normalizedKey ||
             assetHelpers.normalizeKey(asset.path || '') === normalizedKey;
    }) || null;
  },

  resolveAsset(assetKey: string, assets: any[]): string | null {
    const asset = assetHelpers.getAsset(assetKey, assets);
    if (!asset) return null;
    
    return asset.data || asset.url || asset.path || asset.src || null;
  },

  getMediaType(filename: string): 'image' | 'audio' | 'video' | 'unknown' {
    if (!filename) return 'unknown';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return 'image';
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
      return 'audio';
    }
    if (['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      return 'video';
    }
    return 'unknown';
  },

  getAssetInfo(assetKey: string, assets: any[]): { type: string; size?: number; name?: string } | null {
    const asset = assetHelpers.getAsset(assetKey, assets);
    if (!asset) return null;
    
    return {
      type: assetHelpers.getMediaType(asset.name || asset.path || ''),
      size: asset.size,
      name: asset.name || asset.path
    };
  },

  validateAsset(assetKey: string, assets: any[]): boolean {
    return assetHelpers.resolveAsset(assetKey, assets) !== null;
  },

  assetCount(assets: any[]): number {
    return Array.isArray(assets) ? assets.length : 0;
  },

  formatFileSize(bytes: number): string {
    if (typeof bytes !== 'number' || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  normalizeKey(input: string): string {
    if (!input) return '';
    return input.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
};

export function registerAssetHelpers(handlebars: any) {
  handlebars.registerHelper('hasAsset', function(this: any, assetKey: string, assets: any[], options: any) {
    const result = assetHelpers.hasAsset(assetKey, assets);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });
  
  handlebars.registerHelper('getAsset', assetHelpers.getAsset);
  handlebars.registerHelper('resolveAsset', assetHelpers.resolveAsset);
  handlebars.registerHelper('getAssetInfo', assetHelpers.getAssetInfo);
  
  handlebars.registerHelper('getMediaType', assetHelpers.getMediaType);
  handlebars.registerHelper('normalizeKey', assetHelpers.normalizeKey);
  
  handlebars.registerHelper('assetCount', assetHelpers.assetCount);
  handlebars.registerHelper('formatFileSize', assetHelpers.formatFileSize);
  
  handlebars.registerHelper('validateAsset', function(this: any, assetKey: string, assets: any[], options: any) {
    const result = assetHelpers.validateAsset(assetKey, assets);
    return options.fn ? (result ? options.fn(this) : options.inverse(this)) : result;
  });

  handlebars.registerHelper('showImage', function(assetKey: string, assets: any[], alt?: string, className?: string) {
    const url = assetHelpers.resolveAsset(assetKey, assets);
    if (!url) return '';
    const altText = typeof alt === 'string' ? alt : assetKey;
    const cssClass = typeof className === 'string' ? ` class="${className}"` : '';
    return new handlebars.SafeString(`<img src="${url}" alt="${altText}"${cssClass}>`);
  });
  
  handlebars.registerHelper('playAudio', function(assetKey: string, assets: any[], autoplay: boolean = false, loop: boolean = false) {
    const url = assetHelpers.resolveAsset(assetKey, assets);
    if (!url) return '';
    const autoAttr = autoplay ? ' autoplay' : '';
    const loopAttr = loop ? ' loop' : '';
    return new handlebars.SafeString(`<audio src="${url}" controls${autoAttr}${loopAttr}></audio>`);
  });
  
  handlebars.registerHelper('playVideo', function(assetKey: string, assets: any[], autoplay: boolean = false, loop: boolean = false, className?: string) {
    const url = assetHelpers.resolveAsset(assetKey, assets);
    if (!url) return '';
    const autoAttr = autoplay ? ' autoplay' : '';
    const loopAttr = loop ? ' loop' : '';
    const cssClass = typeof className === 'string' ? ` class="${className}"` : '';
    return new handlebars.SafeString(`<video src="${url}" controls${autoAttr}${loopAttr}${cssClass}></video>`);
  });
}