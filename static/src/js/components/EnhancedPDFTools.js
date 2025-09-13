/**
 * EnhancedPDFTools - Premium PDF processing component
 * Implements premium features with API verification and fallbacks
 */
class EnhancedPDFTools {
  // Use singleton pattern to ensure only one instance exists
  static instance;
  
  /**
   * Get singleton instance
   * @returns {EnhancedPDFTools} The singleton instance
   */
  static getInstance() {
    if (!EnhancedPDFTools.instance) {
      EnhancedPDFTools.instance = new EnhancedPDFTools();
    }
    return EnhancedPDFTools.instance;
  }
  
  constructor() {
    if (EnhancedPDFTools.instance) {
      return EnhancedPDFTools.instance;
    }
    
    // Private properties
    this._initialized = false;
    this._premium = false;
    this._features = {};
    this._apiKey = null;
    this._userTier = 'basic';
    this._eventBus = document.createElement('div'); // Simple event bus
    
    // Initialize as soon as possible
    this._init();
  }
  
  /**
   * Initialize the component and verify premium features
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async _init() {
    if (this._initialized) {
      return this._premium;
    }
    
    try {
      console.log('EnhancedPDFTools: Initializing...');
      
      // Try to load API key from localStorage or session
      this._apiKey = this._getStoredApiKey();
      
      // Verify premium features if API key exists
      if (this._apiKey) {
        await this._verifyPremiumFeatures();
      } else {
        // Fall back to basic features
        this._setupBasicFeatures();
      }
      
      // Set up event listeners
      this._setupEventListeners();
      
      this._initialized = true;
      console.log(`EnhancedPDFTools: Initialization complete (tier: ${this._userTier})`);
      
      // Notify listeners that initialization is complete
      this._triggerEvent('initialized', { premium: this._premium, tier: this._userTier });
      
      return this._premium;
    } catch (error) {
      console.error('EnhancedPDFTools: Initialization failed', error);
      // Fall back to basic features on error
      this._setupBasicFeatures();
      this._initialized = true;
      this._triggerEvent('initialization-failed', { error });
      return false;
    }
  }
  
  /**
   * Get stored API key from localStorage or session
   * @returns {string|null} The stored API key or null
   */
  _getStoredApiKey() {
    try {
      // Try localStorage first
      const apiKey = localStorage.getItem('pdf_api_key');
      if (apiKey) {
        return apiKey;
      }
      
      // Then try session storage
      const sessionKey = sessionStorage.getItem('pdf_api_key');
      if (sessionKey) {
        return sessionKey;
      }
      
      // Finally, try cookie
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'pdf_api_key') {
          return decodeURIComponent(value);
        }
      }
      
      return null;
    } catch (error) {
      console.warn('EnhancedPDFTools: Error retrieving stored API key', error);
      return null;
    }
  }
  
  /**
   * Verify premium features by checking API key
   * @returns {Promise<void>}
   */
  async _verifyPremiumFeatures() {
    try {
      // Make API call to verify premium features
      const response = await fetch('/api/verify-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API verification failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update premium status and features
      this._premium = data.premium || false;
      this._userTier = data.tier || 'basic';
      this._features = data.features || {};
      
      if (this._premium) {
        console.log('EnhancedPDFTools: Premium features activated');
      } else {
        console.log('EnhancedPDFTools: Using basic features');
        this._setupBasicFeatures();
      }
    } catch (error) {
      console.warn('EnhancedPDFTools: API verification failed, falling back to basic features', error);
      this._setupBasicFeatures();
    }
  }
  
  /**
   * Set up basic features for non-premium users
   */
  _setupBasicFeatures() {
    this._premium = false;
    this._userTier = 'basic';
    this._features = {
      // Base features available to all users
      merge: true,
      split: true,
      compress: true,
      rotate: true,
      // Premium features disabled
      ocr: false,
      editText: false,
      annotations: false,
      redaction: false,
      encryption: false,
      watermark: false,
      signature: false,
      batchProcessing: false
    };
  }
  
  /**
   * Set up event listeners for state changes
   */
  _setupEventListeners() {
    // Listen for auth state changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'pdf_api_key') {
        // API key changed, re-verify premium features
        this._apiKey = event.newValue;
        this._verifyPremiumFeatures();
      }
    });
    
    // Listen for custom events
    document.addEventListener('pdf-auth-changed', (event) => {
      if (event.detail && event.detail.apiKey !== undefined) {
        this._apiKey = event.detail.apiKey;
        this._verifyPremiumFeatures();
      }
    });
  }
  
  /**
   * Trigger a custom event with data
   * @param {string} eventName The name of the event
   * @param {object} data The event data
   */
  _triggerEvent(eventName, data = {}) {
    const event = new CustomEvent(`pdf-tools-${eventName}`, { 
      detail: { ...data, timestamp: Date.now() },
      bubbles: true
    });
    this._eventBus.dispatchEvent(event);
    document.dispatchEvent(event); // Also dispatch on document for global listeners
  }
  
  /**
   * Add event listener for tool events
   * @param {string} eventName The name of the event
   * @param {Function} callback The callback function
   */
  on(eventName, callback) {
    this._eventBus.addEventListener(`pdf-tools-${eventName}`, callback);
    return this; // For chaining
  }
  
  /**
   * Remove event listener
   * @param {string} eventName The name of the event
   * @param {Function} callback The callback function
   */
  off(eventName, callback) {
    this._eventBus.removeEventListener(`pdf-tools-${eventName}`, callback);
    return this; // For chaining
  }
  
  /**
   * Check if a feature is available
   * @param {string} featureName The name of the feature to check
   * @returns {boolean} Whether the feature is available
   */
  hasFeature(featureName) {
    return Boolean(this._features[featureName]);
  }
  
  /**
   * Get available features
   * @returns {object} Available features
   */
  getAvailableFeatures() {
    return { ...this._features };
  }
  
  /**
   * Get user tier
   * @returns {string} User tier
   */
  getUserTier() {
    return this._userTier;
  }
  
  /**
   * Check if user has premium
   * @returns {boolean} Whether user has premium
   */
  isPremium() {
    return this._premium;
  }
  
  /**
   * Process a PDF file with the specified operation
   * @param {File} file The PDF file to process
   * @param {string} operation The operation to perform
   * @param {object} options Additional options
   * @returns {Promise<Blob|string>} The processed file or download URL
   */
  async processPDF(file, operation, options = {}) {
    // Ensure initialization is complete
    if (!this._initialized) {
      await this._init();
    }
    
    // Check if operation is available
    if (!this.hasFeature(operation)) {
      throw new Error(`Operation "${operation}" requires a premium subscription`);
    }
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('operation', operation);
    
    // Add all options to form data
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Add API key if available
    const headers = {};
    if (this._apiKey) {
      headers['Authorization'] = `Bearer ${this._apiKey}`;
    }
    
    try {
      // Trigger event to notify processing started
      this._triggerEvent('processing-started', { 
        operation, 
        filename: file.name, 
        fileSize: file.size 
      });
      
      // Send request to API
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Get response data
      const responseData = await response.json();
      
      // Trigger event to notify processing completed
      this._triggerEvent('processing-completed', { 
        operation, 
        result: responseData,
        filename: file.name
      });
      
      return responseData;
    } catch (error) {
      // Trigger event to notify processing failed
      this._triggerEvent('processing-failed', { 
        operation, 
        error: error.message,
        filename: file.name
      });
      
      throw error;
    }
  }
  
  /**
   * Set API key and verify premium features
   * @param {string} apiKey The API key
   * @returns {Promise<boolean>} Whether verification was successful
   */
  async setApiKey(apiKey) {
    this._apiKey = apiKey;
    
    // Store API key
    try {
      localStorage.setItem('pdf_api_key', apiKey);
    } catch (error) {
      console.warn('Failed to store API key in localStorage', error);
      // Fall back to session storage
      try {
        sessionStorage.setItem('pdf_api_key', apiKey);
      } catch (innerError) {
        console.warn('Failed to store API key in sessionStorage', innerError);
      }
    }
    
    // Verify premium features
    await this._verifyPremiumFeatures();
    return this._premium;
  }
  
  /**
   * Clear API key and fall back to basic features
   */
  clearApiKey() {
    this._apiKey = null;
    
    // Remove API key from storage
    try {
      localStorage.removeItem('pdf_api_key');
      sessionStorage.removeItem('pdf_api_key');
      
      // Also remove from cookies
      document.cookie = 'pdf_api_key=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (error) {
      console.warn('Failed to clear API key from storage', error);
    }
    
    // Reset to basic features
    this._setupBasicFeatures();
    
    // Trigger event
    this._triggerEvent('auth-cleared');
  }
}

// For compatibility with module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedPDFTools;
} else if (typeof window !== 'undefined') {
  window.EnhancedPDFTools = EnhancedPDFTools;
}
