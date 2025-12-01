/**
 * Session storage for symmetric keys
 */
export interface SessionData {
  symmetricKey: Buffer;
  createdAt: number;
  expiresAt: number;
}

/**
 * Session manager for storing symmetric keys
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(private sessionTimeout: number = 60 * 60 * 1000) {
    this.startCleanup();
  }
  
  /**
   * Store a symmetric key for a session
   */
  setSession(sessionId: string, symmetricKey: Buffer): void {
    const now = Date.now();
    this.sessions.set(sessionId, {
      symmetricKey,
      createdAt: now,
      expiresAt: now + this.sessionTimeout,
    });
  }
  
  /**
   * Get symmetric key for a session
   */
  getSession(sessionId: string): Buffer | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session.symmetricKey;
  }
  
  /**
   * Remove a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
  
  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
  }
  
  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        toDelete.push(sessionId);
      }
    }
    
    for (const sessionId of toDelete) {
      this.sessions.delete(sessionId);
    }
  }
  
  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}
