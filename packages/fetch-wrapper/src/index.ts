import {
  FluxMaskConfig,
  mergeConfig,
  shouldObfuscate,
  generateSymmetricKey,
  encryptWithPublicKey,
  encryptWithSymmetricKey,
  decryptWithSymmetricKey,
  generateSessionId,
  FLUX_MASK_HEADER,
  FLUX_MASK_SESSION_HEADER,
  FLUX_MASK_ENCRYPTED,
} from '@flux-mask/core';

/**
 * Client state for managing encryption
 */
class FluxMaskFetchClient {
  private publicKey: string | null = null;
  private symmetricKey: Buffer | null = null;
  private sessionId: string | null = null;
  private initPromise: Promise<void> | null = null;
  
  constructor(private config: FluxMaskConfig) {}
  
  /**
   * Initialize encryption by fetching public key and exchanging symmetric key
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }
  
  private async doInitialize(): Promise<void> {
    try {
      // Step 1: Get public key from server
      const publicKeyResponse = await fetch(this.config.publicKeyEndpoint!, {
        headers: { [FLUX_MASK_HEADER]: 'init' },
      });
      
      const publicKeyData = await publicKeyResponse.json();
      this.publicKey = publicKeyData.publicKey;
      
      // Step 2: Generate symmetric key
      this.symmetricKey = generateSymmetricKey();
      this.sessionId = generateSessionId();
      
      // Step 3: Encrypt symmetric key with public key
      const encryptedKey = encryptWithPublicKey(this.symmetricKey, this.publicKey!);
      
      // Step 4: Send encrypted symmetric key to server
      await fetch(this.config.keyExchangeEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [FLUX_MASK_HEADER]: 'key-exchange',
        },
        body: JSON.stringify({ encryptedKey, sessionId: this.sessionId }),
      });
      
    } catch (error) {
      this.initPromise = null;
      throw new Error(`Failed to initialize flux-mask: ${error}`);
    }
  }
  
  /**
   * Encrypt request body
   */
  async encryptRequest(data: any): Promise<string> {
    if (!this.symmetricKey) {
      await this.initialize();
    }
    
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    return encryptWithSymmetricKey(jsonData, this.symmetricKey!);
  }
  
  /**
   * Decrypt response body
   */
  decryptResponse(encryptedData: string): any {
    if (!this.symmetricKey) {
      throw new Error('Symmetric key not initialized');
    }
    
    const decrypted = decryptWithSymmetricKey(encryptedData, this.symmetricKey);
    
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }
  
  getSessionId(): string | null {
    return this.sessionId;
  }
}

/**
 * Create a fetch wrapper with flux-mask encryption
 */
export function createFluxMaskFetch(userConfig?: FluxMaskConfig) {
  const config = mergeConfig(userConfig);
  const client = new FluxMaskFetchClient(config);
  
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Skip if obfuscation not needed
    if (!shouldObfuscate(url, config)) {
      return fetch(input, init);
    }
    
    // Skip for flux-mask internal endpoints
    if (url.includes('__flux-mask')) {
      return fetch(input, init);
    }
    
    // Clone init to avoid mutation
    const modifiedInit = { ...init };
    
    // Encrypt request body if present
    if (modifiedInit.body) {
      let bodyData: any;
      
      if (typeof modifiedInit.body === 'string') {
        try {
          bodyData = JSON.parse(modifiedInit.body);
        } catch {
          bodyData = modifiedInit.body;
        }
      } else {
        bodyData = modifiedInit.body;
      }
      
      const encryptedData = await client.encryptRequest(bodyData);
      modifiedInit.body = JSON.stringify({ encrypted: encryptedData });
      
      // Add headers
      if (!modifiedInit.headers) {
        modifiedInit.headers = {};
      }
      
      const headers = new Headers(modifiedInit.headers);
      headers.set(FLUX_MASK_HEADER, FLUX_MASK_ENCRYPTED);
      headers.set(FLUX_MASK_SESSION_HEADER, client.getSessionId() || '');
      headers.set('Content-Type', 'application/json');
      modifiedInit.headers = headers;
    }
    
    // Make request
    const response = await fetch(input, modifiedInit);
    
    // Check if response is encrypted
    if (response.headers.get(FLUX_MASK_HEADER) === FLUX_MASK_ENCRYPTED) {
      const responseData = await response.json();
      
      if (responseData.encrypted) {
        const decryptedData = client.decryptResponse(responseData.encrypted);
        
        // Create new response with decrypted data
        return new Response(JSON.stringify(decryptedData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    }
    
    return response;
  };
}
