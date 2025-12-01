import * as crypto from 'crypto';

/**
 * RSA key pair for asymmetric encryption
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate RSA key pair (2048-bit)
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  return { publicKey, privateKey };
}

/**
 * Generate random AES-256 symmetric key
 */
export function generateSymmetricKey(): Buffer {
  return crypto.randomBytes(32); // 256 bits
}

/**
 * Encrypt data with RSA public key (for key exchange)
 */
export function encryptWithPublicKey(data: Buffer, publicKey: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    data
  );
  
  return encrypted.toString('base64');
}

/**
 * Decrypt data with RSA private key (for key exchange)
 */
export function decryptWithPrivateKey(encryptedData: string, privateKey: string): Buffer {
  const buffer = Buffer.from(encryptedData, 'base64');
  
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
}

/**
 * Encrypt data with AES-256-GCM (symmetric encryption)
 */
export function encryptWithSymmetricKey(data: string, key: Buffer): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + authTag + encrypted data
  const result = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: encrypted,
  };
  
  return Buffer.from(JSON.stringify(result)).toString('base64');
}

/**
 * Decrypt data with AES-256-GCM (symmetric decryption)
 */
export function decryptWithSymmetricKey(encryptedData: string, key: Buffer): string {
  const buffer = Buffer.from(encryptedData, 'base64');
  const payload = JSON.parse(buffer.toString('utf8'));
  
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const encrypted = payload.data;
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash session ID for storage
 */
export function hashSessionId(sessionId: string): string {
  return crypto.createHash('sha256').update(sessionId).digest('hex');
}

/**
 * Generate random session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}
