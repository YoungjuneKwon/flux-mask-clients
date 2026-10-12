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
      
      const rawKey = await publicKeyResponse.text();
      // Remove any existing headers/footers just in case, and whitespace
      const cleanKey = rawKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');
        
      const chunkedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
      this.publicKey = `-----BEGIN PUBLIC KEY-----\n${chunkedKey}\n-----END PUBLIC KEY-----`;
      
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
    const headers = new Headers(modifiedInit.headers ?? {});

    // 암호문을 본문에 그대로 싣는다.
    //
    // 예전에는 {"encrypted": "..."} 봉투에 담아 application/json 으로 보냈는데,
    // 서버(Nginx 모듈)와 axios 인터셉터는 암호문을 날것으로 주고받는다. 봉투를
    // 쓰면 서버가 그 JSON 전체를 복호화하려다 실패한다. 규격을 날것 쪽으로 맞춘다.
    if (modifiedInit.body) {
      const bodyData =
        typeof modifiedInit.body === 'string' ? modifiedInit.body : String(modifiedInit.body);
      modifiedInit.body = await client.encryptRequest(bodyData);
      headers.set('Content-Type', 'text/plain');
    }

    // 본문이 없어도 헤더는 붙인다.
    //
    // 서버는 이 헤더를 보고 응답을 암호화할지 정한다. 예전에는 본문이 있을 때만
    // 붙여서, 정작 개발자도구로 가장 많이 들여다보는 GET 조회 응답이 평문으로
    // 나갔다. 보호 대상 경로면 메서드와 무관하게 붙인다.
    await client.initialize();
    headers.set(FLUX_MASK_HEADER, FLUX_MASK_ENCRYPTED);
    headers.set(FLUX_MASK_SESSION_HEADER, client.getSessionId() || '');
    modifiedInit.headers = headers;

    const response = await fetch(input, modifiedInit);

    if (response.headers.get(FLUX_MASK_HEADER) === FLUX_MASK_ENCRYPTED) {
      const cipher = await response.text();
      const decrypted = client.decryptResponse(cipher);
      return new Response(
        typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted),
        { status: response.status, statusText: response.statusText, headers: response.headers },
      );
    }

    return response;
  };
}
