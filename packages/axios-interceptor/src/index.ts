import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
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
class FluxMaskClient {
  private publicKey: string | null = null;
  private symmetricKey: Buffer | null = null;
  private sessionId: string | null = null;
  private initPromise: Promise<void> | null = null;
  
  constructor(
    private axiosInstance: AxiosInstance,
    private config: FluxMaskConfig
  ) {}
  
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
      const publicKeyResponse = await this.axiosInstance.get(
        this.config.publicKeyEndpoint!,
        { 
          headers: { [FLUX_MASK_HEADER]: 'init' },
          responseType: 'text'
        }
      );
      
      const rawKey = publicKeyResponse.data;
      // Remove any existing headers/footers just in case, and whitespace
      const cleanKey = typeof rawKey === 'string' ? rawKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '') : '';
        
      const chunkedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
      this.publicKey = `-----BEGIN PUBLIC KEY-----\n${chunkedKey}\n-----END PUBLIC KEY-----`;
      
      // Step 2: Generate symmetric key
      this.symmetricKey = generateSymmetricKey();
      this.sessionId = generateSessionId();
      
      // Step 3: Encrypt symmetric key with public key
      const encryptedKey = encryptWithPublicKey(this.symmetricKey, this.publicKey!);
      
      // Step 4: Send encrypted symmetric key to server
      await this.axiosInstance.post(
        this.config.keyExchangeEndpoint!,
        { encryptedKey, sessionId: this.sessionId },
        { headers: { [FLUX_MASK_HEADER]: 'key-exchange' } }
      );
      
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
 * Setup axios interceptors for flux-mask
 */
export function setupFluxMaskInterceptor(
  axiosInstance: AxiosInstance,
  userConfig?: FluxMaskConfig
): () => void {
  const config = mergeConfig(userConfig);
  const client = new FluxMaskClient(axiosInstance, config);
  
  // Request interceptor
  const requestInterceptor = axiosInstance.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig) => {
      const url = requestConfig.url || '';
      
      // Skip if obfuscation not needed
      if (!shouldObfuscate(url, config)) {
        return requestConfig;
      }
      
      // Skip for flux-mask internal endpoints
      if (url.includes('__flux-mask')) {
        return requestConfig;
      }
      
      // Encrypt request body if present
      if (requestConfig.data) {
        const encryptedData = await client.encryptRequest(requestConfig.data);
        requestConfig.data = encryptedData; // Send encrypted string directly
        
        // Add headers
        if (!requestConfig.headers) {
          requestConfig.headers = {} as any;
        }
        requestConfig.headers[FLUX_MASK_HEADER] = FLUX_MASK_ENCRYPTED;
        requestConfig.headers[FLUX_MASK_SESSION_HEADER] = client.getSessionId() || '';
        requestConfig.headers['Content-Type'] = 'text/plain'; // Changed from application/json
      }
      
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor
  const responseInterceptor = axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Check if response is encrypted (plain string format)
      if (
        response.headers[FLUX_MASK_HEADER.toLowerCase()] === FLUX_MASK_ENCRYPTED &&
        response.data &&
        typeof response.data === 'string'
      ) {
        response.data = client.decryptResponse(response.data);
      }
      
      return response;
    },
    (error) => Promise.reject(error)
  );
  
  // Return cleanup function
  return () => {
    axiosInstance.interceptors.request.eject(requestInterceptor);
    axiosInstance.interceptors.response.eject(responseInterceptor);
  };
}

/**
 * Create a new axios instance with flux-mask interceptor
 */
export function createFluxMaskAxios(
  userConfig?: FluxMaskConfig
): AxiosInstance {
  const instance = axios.create();
  setupFluxMaskInterceptor(instance, userConfig);
  return instance;
}
