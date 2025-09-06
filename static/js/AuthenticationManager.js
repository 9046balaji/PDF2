/**
 * AuthenticationManager - Handles authentication, token refresh, and permission checks
 * Robust client-side authentication with refresh tokens and permission management
 */
class AuthenticationManager {
  // Use singleton pattern to ensure only one instance
  static instance;
  
  /**
   * Get singleton instance
   * @returns {AuthenticationManager} The singleton instance
   */
  static getInstance() {
    if (!AuthenticationManager.instance) {
      AuthenticationManager.instance = new AuthenticationManager();
    }
    return AuthenticationManager.instance;
  }
  
  constructor() {
    if (AuthenticationManager.instance) {
      return AuthenticationManager.instance;
    }
    
    // Private properties
    this._initialized = false;
    this._authenticated = false;
    this._user = null;
    this._tokens = {
      access: null,
      refresh: null,
      expires: null
    };
    this._permissions = [];
    this._roles = [];
    this._eventBus = document.createElement('div'); // Simple event bus
    this._refreshPromise = null;
    
    // Initialize as soon as possible
    this._init();
  }
  
  /**
   * Initialize the authentication manager
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async _init() {
    if (this._initialized) {
      return this._authenticated;
    }
    
    try {
      console.log('AuthenticationManager: Initializing...');
      
      // Try to load tokens from storage
      this._loadTokens();
      
      // Check if we have a valid access token
      if (this._tokens.access) {
        const expired = this._isTokenExpired();
        
        if (expired && this._tokens.refresh) {
          // Try to refresh the token
          await this._refreshToken();
        } else if (!expired) {
          // Load user information
          await this._loadUserInfo();
        }
      }
      
      // Set up event listeners
      this._setupEventListeners();
      
      this._initialized = true;
      console.log(`AuthenticationManager: Initialization complete (authenticated: ${this._authenticated})`);
      
      // Notify listeners that initialization is complete
      this._triggerEvent('initialized', { authenticated: this._authenticated });
      
      return this._authenticated;
    } catch (error) {
      console.error('AuthenticationManager: Initialization failed', error);
      this._initialized = true;
      this._authenticated = false;
      this._triggerEvent('initialization-failed', { error });
      return false;
    }
  }
  
  /**
   * Load tokens from storage
   */
  _loadTokens() {
    try {
      // Try localStorage first
      const tokens = localStorage.getItem('auth_tokens');
      if (tokens) {
        this._tokens = JSON.parse(tokens);
        return;
      }
      
      // Then try session storage
      const sessionTokens = sessionStorage.getItem('auth_tokens');
      if (sessionTokens) {
        this._tokens = JSON.parse(sessionTokens);
        return;
      }
      
      // Finally, check for token in cookie (with http-only support)
      const authCookie = this._getCookie('auth_token');
      if (authCookie) {
        try {
          this._tokens = {
            access: authCookie,
            refresh: this._getCookie('refresh_token'),
            expires: null // We can't access this from http-only cookie
          };
        } catch (cookieError) {
          console.warn('AuthenticationManager: Error parsing token from cookie', cookieError);
        }
      }
    } catch (error) {
      console.warn('AuthenticationManager: Error loading tokens', error);
      this._tokens = {
        access: null,
        refresh: null,
        expires: null
      };
    }
  }
  
  /**
   * Save tokens to storage
   * @param {boolean} useLocalStorage Whether to use localStorage (vs sessionStorage)
   */
  _saveTokens(useLocalStorage = true) {
    try {
      const tokenStr = JSON.stringify(this._tokens);
      
      if (useLocalStorage) {
        localStorage.setItem('auth_tokens', tokenStr);
        sessionStorage.removeItem('auth_tokens');
      } else {
        sessionStorage.setItem('auth_tokens', tokenStr);
        localStorage.removeItem('auth_tokens');
      }
    } catch (error) {
      console.warn('AuthenticationManager: Error saving tokens', error);
    }
  }
  
  /**
   * Clear tokens from storage
   */
  _clearTokens() {
    this._tokens = {
      access: null,
      refresh: null,
      expires: null
    };
    
    try {
      localStorage.removeItem('auth_tokens');
      sessionStorage.removeItem('auth_tokens');
    } catch (error) {
      console.warn('AuthenticationManager: Error clearing tokens', error);
    }
  }
  
  /**
   * Parse JWT token to get expiration and payload
   * @param {string} token The JWT token
   * @returns {object} The decoded token
   */
  _parseToken(token) {
    try {
      if (!token) return null;
      
      // Split the token and get the payload
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode the payload
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.warn('AuthenticationManager: Error parsing token', error);
      return null;
    }
  }
  
  /**
   * Check if the token is expired
   * @returns {boolean} Whether the token is expired
   */
  _isTokenExpired() {
    try {
      if (!this._tokens.access) return true;
      
      // If we have an explicit expiration time, use that
      if (this._tokens.expires) {
        return Date.now() >= this._tokens.expires;
      }
      
      // Otherwise, parse the token to get expiration
      const payload = this._parseToken(this._tokens.access);
      if (!payload || !payload.exp) return true;
      
      // Token expiration is in seconds, convert to milliseconds
      const expiresAt = payload.exp * 1000;
      
      // Consider token expired 60 seconds before actual expiration
      // to account for clock differences and prevent using almost-expired tokens
      return Date.now() >= expiresAt - 60000;
    } catch (error) {
      console.warn('AuthenticationManager: Error checking token expiration', error);
      return true;
    }
  }
  
  /**
   * Refresh the access token using the refresh token
   * @returns {Promise<boolean>} Whether the refresh was successful
   */
  async _refreshToken() {
    // If there's already a refresh in progress, return that promise
    if (this._refreshPromise) {
      return this._refreshPromise;
    }
    
    // Create a new refresh promise
    this._refreshPromise = (async () => {
      try {
        if (!this._tokens.refresh) {
          throw new Error('No refresh token available');
        }
        
        console.log('AuthenticationManager: Refreshing token...');
        
        // Trigger event to notify refresh started
        this._triggerEvent('token-refresh-started');
        
        // Send request to refresh token
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: this._tokens.refresh
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        // Get new tokens
        const data = await response.json();
        
        // Update tokens
        this._tokens = {
          access: data.accessToken,
          refresh: data.refreshToken || this._tokens.refresh,
          expires: data.expiresAt ? new Date(data.expiresAt).getTime() : null
        };
        
        // Save tokens
        this._saveTokens();
        
        // Load user info
        await this._loadUserInfo();
        
        // Trigger event to notify refresh completed
        this._triggerEvent('token-refresh-completed', { success: true });
        
        return true;
      } catch (error) {
        console.error('AuthenticationManager: Token refresh failed', error);
        
        // Clear tokens and set as unauthenticated
        this._clearTokens();
        this._authenticated = false;
        this._user = null;
        this._permissions = [];
        this._roles = [];
        
        // Trigger event to notify refresh failed
        this._triggerEvent('token-refresh-failed', { error: error.message });
        
        return false;
      } finally {
        // Clear the refresh promise
        this._refreshPromise = null;
      }
    })();
    
    return this._refreshPromise;
  }
  
  /**
   * Load user information using the access token
   * @returns {Promise<boolean>} Whether loading user info was successful
   */
  async _loadUserInfo() {
    try {
      if (!this._tokens.access) {
        throw new Error('No access token available');
      }
      
      // Send request to get user info
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this._tokens.access}`
        }
      });
      
      if (!response.ok) {
        // If unauthorized, try to refresh token
        if (response.status === 401 && this._tokens.refresh) {
          const refreshed = await this._refreshToken();
          
          if (refreshed) {
            // Retry with new token
            return this._loadUserInfo();
          }
          
          throw new Error('Token refresh failed');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Get user data
      const data = await response.json();
      
      // Update user info
      this._user = data.user || {};
      this._permissions = Array.isArray(data.permissions) ? data.permissions : [];
      this._roles = Array.isArray(data.roles) ? data.roles : [];
      this._authenticated = true;
      
      // Trigger event to notify user info loaded
      this._triggerEvent('user-info-loaded', { user: this._user });
      
      return true;
    } catch (error) {
      console.error('AuthenticationManager: Loading user info failed', error);
      
      // Clear tokens if unauthorized
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        this._clearTokens();
        this._authenticated = false;
        this._user = null;
        this._permissions = [];
        this._roles = [];
      }
      
      return false;
    }
  }
  
  /**
   * Set up event listeners for auth state changes
   */
  _setupEventListeners() {
    // Listen for storage events to sync auth state across tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_tokens') {
        // Tokens changed in another tab
        if (event.newValue) {
          try {
            // Load new tokens
            this._tokens = JSON.parse(event.newValue);
            
            // Reload user info
            this._loadUserInfo();
          } catch (error) {
            console.warn('AuthenticationManager: Error parsing tokens from storage event', error);
          }
        } else {
          // Tokens cleared in another tab
          this._clearTokens();
          this._authenticated = false;
          this._user = null;
          this._permissions = [];
          this._roles = [];
          
          // Trigger event to notify logout
          this._triggerEvent('logged-out');
        }
      }
    });
    
    // Set up token refresh timer
    this._setupRefreshTimer();
  }
  
  /**
   * Set up a timer to refresh the token before it expires
   */
  _setupRefreshTimer() {
    // Clear any existing timer
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    
    // If not authenticated or no refresh token, don't set timer
    if (!this._authenticated || !this._tokens.refresh) {
      return;
    }
    
    try {
      // Calculate time until token expiration
      let timeUntilExpire = 0;
      
      if (this._tokens.expires) {
        // Use explicit expiration time
        timeUntilExpire = this._tokens.expires - Date.now();
      } else {
        // Parse token to get expiration
        const payload = this._parseToken(this._tokens.access);
        if (!payload || !payload.exp) return;
        
        // Token expiration is in seconds, convert to milliseconds
        const expiresAt = payload.exp * 1000;
        timeUntilExpire = expiresAt - Date.now();
      }
      
      // Refresh 5 minutes before expiration
      const refreshDelay = Math.max(timeUntilExpire - 5 * 60 * 1000, 0);
      
      // Set timer to refresh token
      this._refreshTimer = setTimeout(() => {
        this._refreshToken().then(success => {
          if (success) {
            // Set up new timer after refresh
            this._setupRefreshTimer();
          }
        });
      }, refreshDelay);
      
      console.log(`AuthenticationManager: Token refresh scheduled in ${Math.round(refreshDelay / 60000)} minutes`);
    } catch (error) {
      console.warn('AuthenticationManager: Error setting up refresh timer', error);
    }
  }
  
  /**
   * Get cookie value by name
   * @param {string} name The cookie name
   * @returns {string|null} The cookie value
   */
  _getCookie(name) {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
          return decodeURIComponent(cookieValue);
        }
      }
      return null;
    } catch (error) {
      console.warn(`AuthenticationManager: Error getting cookie ${name}`, error);
      return null;
    }
  }
  
  /**
   * Trigger a custom event with data
   * @param {string} eventName The name of the event
   * @param {object} data The event data
   */
  _triggerEvent(eventName, data = {}) {
    const event = new CustomEvent(`auth-${eventName}`, { 
      detail: { ...data, timestamp: Date.now() },
      bubbles: true
    });
    this._eventBus.dispatchEvent(event);
    document.dispatchEvent(event); // Also dispatch on document for global listeners
  }
  
  // Public API
  
  /**
   * Add event listener for authentication events
   * @param {string} eventName The name of the event
   * @param {Function} callback The callback function
   * @returns {AuthenticationManager} The instance for chaining
   */
  on(eventName, callback) {
    this._eventBus.addEventListener(`auth-${eventName}`, callback);
    return this; // For chaining
  }
  
  /**
   * Remove event listener
   * @param {string} eventName The name of the event
   * @param {Function} callback The callback function
   * @returns {AuthenticationManager} The instance for chaining
   */
  off(eventName, callback) {
    this._eventBus.removeEventListener(`auth-${eventName}`, callback);
    return this; // For chaining
  }
  
  /**
   * Login with email and password
   * @param {string} email The user's email
   * @param {string} password The user's password
   * @param {boolean} rememberMe Whether to remember the user
   * @returns {Promise<boolean>} Whether login was successful
   */
  async login(email, password, rememberMe = false) {
    try {
      // Trigger event to notify login started
      this._triggerEvent('login-started');
      
      // Send login request
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Get tokens
      const data = await response.json();
      
      // Update tokens
      this._tokens = {
        access: data.accessToken,
        refresh: data.refreshToken,
        expires: data.expiresAt ? new Date(data.expiresAt).getTime() : null
      };
      
      // Save tokens
      this._saveTokens(rememberMe);
      
      // Load user info
      await this._loadUserInfo();
      
      // Set up refresh timer
      this._setupRefreshTimer();
      
      // Trigger event to notify login completed
      this._triggerEvent('login-completed', { success: true, user: this._user });
      
      return true;
    } catch (error) {
      console.error('AuthenticationManager: Login failed', error);
      
      // Trigger event to notify login failed
      this._triggerEvent('login-failed', { error: error.message });
      
      throw error;
    }
  }
  
  /**
   * Log out the current user
   * @returns {Promise<boolean>} Whether logout was successful
   */
  async logout() {
    try {
      // Trigger event to notify logout started
      this._triggerEvent('logout-started');
      
      // If we have a refresh token, send logout request
      if (this._tokens.refresh) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this._tokens.access}`
            },
            body: JSON.stringify({
              refreshToken: this._tokens.refresh
            })
          });
        } catch (error) {
          console.warn('AuthenticationManager: Logout request failed', error);
          // Continue with local logout even if server request fails
        }
      }
      
      // Clear tokens and user info
      this._clearTokens();
      this._authenticated = false;
      this._user = null;
      this._permissions = [];
      this._roles = [];
      
      // Clear refresh timer
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
      
      // Trigger event to notify logout completed
      this._triggerEvent('logged-out');
      
      return true;
    } catch (error) {
      console.error('AuthenticationManager: Logout failed', error);
      
      // Still clear local state even if server request fails
      this._clearTokens();
      this._authenticated = false;
      this._user = null;
      this._permissions = [];
      this._roles = [];
      
      // Trigger event to notify logout
      this._triggerEvent('logged-out');
      
      return false;
    }
  }
  
  /**
   * Check if user is authenticated
   * @param {boolean} refresh Whether to refresh the token if expired
   * @returns {Promise<boolean>} Whether user is authenticated
   */
  async isAuthenticated(refresh = true) {
    // Ensure initialization is complete
    if (!this._initialized) {
      await this._init();
    }
    
    // If not authenticated, return false
    if (!this._authenticated || !this._tokens.access) {
      return false;
    }
    
    // Check if token is expired
    const expired = this._isTokenExpired();
    
    // If token is expired and we should refresh, try to refresh
    if (expired && refresh && this._tokens.refresh) {
      return this._refreshToken();
    }
    
    // Otherwise, return whether token is not expired
    return !expired;
  }
  
  /**
   * Get the current user
   * @returns {object|null} The current user or null if not authenticated
   */
  getUser() {
    return this._user;
  }
  
  /**
   * Get the user's roles
   * @returns {string[]} The user's roles
   */
  getRoles() {
    return [...this._roles];
  }
  
  /**
   * Check if user has a specific role
   * @param {string|string[]} role The role(s) to check
   * @returns {boolean} Whether user has the role
   */
  hasRole(role) {
    if (!this._authenticated) return false;
    
    if (Array.isArray(role)) {
      return role.some(r => this._roles.includes(r));
    }
    
    return this._roles.includes(role);
  }
  
  /**
   * Get the user's permissions
   * @returns {string[]} The user's permissions
   */
  getPermissions() {
    return [...this._permissions];
  }
  
  /**
   * Check if user has a specific permission
   * @param {string|string[]} permission The permission(s) to check
   * @returns {boolean} Whether user has the permission
   */
  hasPermission(permission) {
    if (!this._authenticated) return false;
    
    if (Array.isArray(permission)) {
      return permission.some(p => this._permissions.includes(p));
    }
    
    return this._permissions.includes(permission);
  }
  
  /**
   * Get access token for API requests
   * @param {boolean} refresh Whether to refresh the token if expired
   * @returns {Promise<string|null>} The access token or null if not authenticated
   */
  async getAccessToken(refresh = true) {
    // Ensure initialization is complete
    if (!this._initialized) {
      await this._init();
    }
    
    // If not authenticated, return null
    if (!this._authenticated || !this._tokens.access) {
      return null;
    }
    
    // Check if token is expired
    const expired = this._isTokenExpired();
    
    // If token is expired and we should refresh, try to refresh
    if (expired && refresh && this._tokens.refresh) {
      const refreshed = await this._refreshToken();
      return refreshed ? this._tokens.access : null;
    }
    
    // Return token if not expired, otherwise null
    return expired ? null : this._tokens.access;
  }
  
  /**
   * Check if user is in the specified tier
   * @param {string} tierName The tier name to check
   * @returns {boolean} Whether user is in the tier
   */
  isInTier(tierName) {
    if (!this._authenticated || !this._user) return false;
    
    // Parse user tier from JWT if not explicitly set
    if (!this._user.tier && this._tokens.access) {
      const payload = this._parseToken(this._tokens.access);
      if (payload && payload.tier) {
        this._user.tier = payload.tier;
      }
    }
    
    // Check tier hierarchy
    const tierHierarchy = {
      free: 0,
      basic: 1,
      premium: 2,
      professional: 3,
      enterprise: 4,
      admin: 5
    };
    
    const userTierLevel = tierHierarchy[this._user.tier?.toLowerCase()] || 0;
    const requestedTierLevel = tierHierarchy[tierName.toLowerCase()] || 0;
    
    return userTierLevel >= requestedTierLevel;
  }
}

// For compatibility with module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthenticationManager;
} else if (typeof window !== 'undefined') {
  window.AuthenticationManager = AuthenticationManager;
}
