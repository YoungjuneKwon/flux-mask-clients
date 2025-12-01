/**
 * Configuration options for encryption
 */
export interface FluxMaskConfig {
  /**
   * Enable/disable obfuscation
   */
  enabled?: boolean;
  
  /**
   * URL patterns to apply obfuscation (regex strings)
   */
  urlPatterns?: string[];
  
  /**
   * URL patterns to exclude from obfuscation (regex strings)
   */
  excludePatterns?: string[];
  
  /**
   * Server public key endpoint
   */
  publicKeyEndpoint?: string;
  
  /**
   * Key exchange endpoint
   */
  keyExchangeEndpoint?: string;
  
  /**
   * Session timeout in milliseconds (default: 1 hour)
   */
  sessionTimeout?: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: FluxMaskConfig = {
  enabled: true,
  urlPatterns: ['.*'],
  excludePatterns: [],
  publicKeyEndpoint: '/__flux-mask/key/public',
  keyExchangeEndpoint: '/__flux-mask/key',
  sessionTimeout: 60 * 60 * 1000, // 1 hour
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig?: FluxMaskConfig): FluxMaskConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}

/**
 * Check if URL should be obfuscated based on patterns
 */
export function shouldObfuscate(url: string, config: FluxMaskConfig): boolean {
  if (!config.enabled) {
    return false;
  }
  
  // Check exclude patterns first
  if (config.excludePatterns && config.excludePatterns.length > 0) {
    for (const pattern of config.excludePatterns) {
      if (new RegExp(pattern).test(url)) {
        return false;
      }
    }
  }
  
  // Check include patterns
  if (config.urlPatterns && config.urlPatterns.length > 0) {
    for (const pattern of config.urlPatterns) {
      if (new RegExp(pattern).test(url)) {
        return true;
      }
    }
    return false;
  }
  
  return true;
}
