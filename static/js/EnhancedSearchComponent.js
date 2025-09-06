/**
 * EnhancedSearchComponent - Advanced search with fuzzy matching and history
 * Features:
 * - Debounced search for better performance
 * - Search history tracking
 * - Keyboard navigation
 * - Fuzzy search with highlighted matches
 * - Graceful fallback to basic search
 */
class EnhancedSearchComponent {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      selector: options.selector || '#search-container',
      inputSelector: options.inputSelector || '#search-input',
      resultsSelector: options.resultsSelector || '#search-results',
      placeholderText: options.placeholderText || 'Search PDF tools...',
      debounceTime: options.debounceTime || 300,
      minSearchLength: options.minSearchLength || 2,
      maxHistoryItems: options.maxHistoryItems || 5,
      apiEndpoint: options.apiEndpoint || '/api/search',
      noResultsText: options.noResultsText || 'No results found',
      loadingText: options.loadingText || 'Searching...',
      historyEnabled: options.historyEnabled !== false,
      fuzzySearchEnabled: options.fuzzySearchEnabled !== false,
      onSelect: options.onSelect || function(item) {},
      onSearch: options.onSearch || function(query) {}
    };
    
    // State
    this.state = {
      query: '',
      results: [],
      loading: false,
      focused: -1,
      showResults: false,
      searchHistory: []
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the search component
   */
  init() {
    try {
      // Get container element
      this.container = document.querySelector(this.config.selector);
      if (!this.container) {
        throw new Error(`Container element ${this.config.selector} not found`);
      }
      
      // Create search elements if they don't exist
      this.createSearchElements();
      
      // Load search history from localStorage
      this.loadSearchHistory();
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('EnhancedSearchComponent: Initialization complete');
    } catch (error) {
      console.error('EnhancedSearchComponent: Initialization failed', error);
      // Create a simple fallback search if initialization fails
      this.createFallbackSearch();
    }
  }
  
  /**
   * Create search elements
   */
  createSearchElements() {
    // Get existing elements or create new ones
    this.inputElement = this.container.querySelector(this.config.inputSelector);
    
    if (!this.inputElement) {
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'search';
      this.inputElement.id = this.config.inputSelector.replace('#', '');
      this.inputElement.name = 'search-query'; // Add name attribute for form submission
      this.inputElement.placeholder = this.config.placeholderText;
      this.inputElement.classList.add('search-input');
      
      // Create label for the search input (for screen readers)
      const label = document.createElement('label');
      label.htmlFor = this.inputElement.id;
      label.className = 'sr-only'; // Visually hidden but available to screen readers
      label.textContent = 'Search PDF tools';
      
      this.container.appendChild(label);
      this.container.appendChild(this.inputElement);
    } else {
      // Ensure existing input has proper attributes
      if (!this.inputElement.hasAttribute('name')) {
        this.inputElement.setAttribute('name', 'search-query');
      }
    }
    
    this.resultsElement = this.container.querySelector(this.config.resultsSelector);
    
    if (!this.resultsElement) {
      this.resultsElement = document.createElement('div');
      this.resultsElement.id = this.config.resultsSelector.replace('#', '');
      this.resultsElement.classList.add('search-results');
      this.resultsElement.style.display = 'none';
      this.container.appendChild(this.resultsElement);
    }
    
    // Add ARIA attributes for accessibility
    this.inputElement.setAttribute('role', 'searchbox');
    this.inputElement.setAttribute('aria-autocomplete', 'list');
    this.inputElement.setAttribute('aria-controls', this.resultsElement.id);
    this.resultsElement.setAttribute('role', 'listbox');
  }
  
  /**
   * Create a simple fallback search if initialization fails
   */
  createFallbackSearch() {
    // Create a label first for accessibility
    const searchLabel = document.createElement('label');
    searchLabel.htmlFor = 'search-fallback';
    searchLabel.className = 'sr-only'; // Visually hidden but available to screen readers
    searchLabel.textContent = 'Search PDF tools';
    
    // Create a simple search input
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.id = 'search-fallback';
    searchInput.name = 'q'; // Name attribute for form submission
    searchInput.placeholder = this.config.placeholderText;
    searchInput.classList.add('search-input-fallback');
    searchInput.setAttribute('aria-label', 'Search PDF tools');
    
    // Add event listener for basic search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          // Perform basic search
          window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
      }
    });
    
    // Replace container contents with fallback search
    const container = document.querySelector(this.config.selector);
    if (container) {
      container.innerHTML = '';
      container.appendChild(searchLabel);
      container.appendChild(searchInput);
    } else {
      // If container doesn't exist, append to body
      document.body.appendChild(searchLabel);
      document.body.appendChild(searchInput);
    }
  }
  
  /**
   * Load search history from localStorage
   */
  loadSearchHistory() {
    if (!this.config.historyEnabled) {
      return;
    }
    
    try {
      const history = localStorage.getItem('searchHistory');
      this.state.searchHistory = history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('EnhancedSearchComponent: Failed to load search history', error);
      this.state.searchHistory = [];
    }
  }
  
  /**
   * Save search history to localStorage
   */
  saveSearchHistory() {
    if (!this.config.historyEnabled) {
      return;
    }
    
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.state.searchHistory));
    } catch (error) {
      console.warn('EnhancedSearchComponent: Failed to save search history', error);
    }
  }
  
  /**
   * Add query to search history
   * @param {string} query The search query to add
   */
  addToSearchHistory(query) {
    if (!this.config.historyEnabled || !query) {
      return;
    }
    
    // Remove existing instance of the query
    this.state.searchHistory = this.state.searchHistory.filter(item => item !== query);
    
    // Add to the beginning of the array
    this.state.searchHistory.unshift(query);
    
    // Limit history to max items
    if (this.state.searchHistory.length > this.config.maxHistoryItems) {
      this.state.searchHistory = this.state.searchHistory.slice(0, this.config.maxHistoryItems);
    }
    
    // Save to localStorage
    this.saveSearchHistory();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Input event with debounce
    let debounceTimeout;
    this.inputElement.addEventListener('input', (e) => {
      clearTimeout(debounceTimeout);
      
      const query = e.target.value.trim();
      this.state.query = query;
      
      // Show loading state
      if (query.length >= this.config.minSearchLength) {
        this.showLoading();
      } else {
        this.hideResults();
      }
      
      // Debounce search
      debounceTimeout = setTimeout(() => {
        if (query.length >= this.config.minSearchLength) {
          this.performSearch(query);
        }
      }, this.config.debounceTime);
    });
    
    // Focus event
    this.inputElement.addEventListener('focus', () => {
      if (this.state.query.length >= this.config.minSearchLength) {
        this.showResults();
      } else if (this.state.searchHistory.length > 0) {
        this.showSearchHistory();
      }
    });
    
    // Blur event - delayed to allow clicking on results
    this.inputElement.addEventListener('blur', () => {
      setTimeout(() => {
        this.hideResults();
      }, 200);
    });
    
    // Key navigation
    this.inputElement.addEventListener('keydown', (e) => {
      // Arrow up/down navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        if (!this.state.showResults) {
          this.showResults();
          return;
        }
        
        const items = this.resultsElement.querySelectorAll('.search-result-item');
        const maxIndex = items.length - 1;
        
        if (e.key === 'ArrowDown') {
          this.state.focused = Math.min(this.state.focused + 1, maxIndex);
        } else {
          this.state.focused = Math.max(this.state.focused - 1, -1);
        }
        
        this.updateFocusedItem();
      }
      
      // Select item with Enter
      if (e.key === 'Enter') {
        if (this.state.focused >= 0) {
          const items = this.resultsElement.querySelectorAll('.search-result-item');
          const selectedItem = items[this.state.focused];
          
          if (selectedItem) {
            e.preventDefault();
            const itemData = JSON.parse(selectedItem.dataset.item || '{}');
            this.selectItem(itemData);
          }
        } else if (this.state.query) {
          // Perform full search on Enter when no item is focused
          this.performSearch(this.state.query, true);
        }
      }
      
      // Close results with Escape
      if (e.key === 'Escape') {
        this.hideResults();
      }
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideResults();
      }
    });
  }
  
  /**
   * Show loading state
   */
  showLoading() {
    this.state.loading = true;
    this.state.showResults = true;
    
    this.resultsElement.innerHTML = `<div class="search-loading">${this.config.loadingText}</div>`;
    this.resultsElement.style.display = 'block';
    this.inputElement.setAttribute('aria-expanded', 'true');
  }
  
  /**
   * Show search results
   */
  showResults() {
    if (this.state.results.length === 0 && this.state.query.length < this.config.minSearchLength) {
      this.showSearchHistory();
      return;
    }
    
    this.state.showResults = true;
    this.resultsElement.style.display = 'block';
    this.inputElement.setAttribute('aria-expanded', 'true');
    this.renderResults();
  }
  
  /**
   * Show search history
   */
  showSearchHistory() {
    if (!this.config.historyEnabled || this.state.searchHistory.length === 0) {
      return;
    }
    
    this.state.showResults = true;
    this.resultsElement.innerHTML = '';
    
    // Create history header
    const historyHeader = document.createElement('div');
    historyHeader.classList.add('search-history-header');
    historyHeader.textContent = 'Recent searches';
    this.resultsElement.appendChild(historyHeader);
    
    // Create history items
    this.state.searchHistory.forEach((query, index) => {
      const historyItem = document.createElement('div');
      historyItem.classList.add('search-history-item');
      historyItem.textContent = query;
      historyItem.setAttribute('role', 'option');
      historyItem.setAttribute('tabindex', '-1');
      
      // Set as data item for selection
      historyItem.dataset.item = JSON.stringify({ query });
      
      // Add click event
      historyItem.addEventListener('click', () => {
        this.inputElement.value = query;
        this.state.query = query;
        this.performSearch(query);
      });
      
      this.resultsElement.appendChild(historyItem);
    });
    
    // Show results
    this.resultsElement.style.display = 'block';
    this.inputElement.setAttribute('aria-expanded', 'true');
  }
  
  /**
   * Hide search results
   */
  hideResults() {
    this.state.showResults = false;
    this.state.focused = -1;
    this.resultsElement.style.display = 'none';
    this.inputElement.setAttribute('aria-expanded', 'false');
  }
  
  /**
   * Update focused item
   */
  updateFocusedItem() {
    const items = this.resultsElement.querySelectorAll('.search-result-item, .search-history-item');
    
    // Remove focus from all items
    items.forEach((item, index) => {
      item.classList.remove('focused');
      item.setAttribute('aria-selected', 'false');
    });
    
    // Add focus to selected item
    if (this.state.focused >= 0 && this.state.focused < items.length) {
      const focusedItem = items[this.state.focused];
      focusedItem.classList.add('focused');
      focusedItem.setAttribute('aria-selected', 'true');
      
      // Update input value with selected item text
      if (focusedItem.classList.contains('search-result-item')) {
        const itemData = JSON.parse(focusedItem.dataset.item || '{}');
        const itemName = itemData.name || itemData.title || itemData.text || '';
        
        if (itemName) {
          this.inputElement.value = itemName;
        }
      } else if (focusedItem.classList.contains('search-history-item')) {
        this.inputElement.value = focusedItem.textContent || '';
      }
    }
  }
  
  /**
   * Perform search with the given query
   * @param {string} query The search query
   * @param {boolean} isSubmit Whether this is a full search submission
   */
  performSearch(query, isSubmit = false) {
    if (!query || query.length < this.config.minSearchLength) {
      this.state.results = [];
      this.hideResults();
      return;
    }
    
    this.state.loading = true;
    this.state.query = query;
    
    // Call the onSearch callback
    this.config.onSearch(query);
    
    // Add to search history if this is a full search
    if (isSubmit) {
      this.addToSearchHistory(query);
    }
    
    // Fetch results from API
    fetch(`${this.config.apiEndpoint}?q=${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Search API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        this.state.loading = false;
        
        // Process results
        this.state.results = Array.isArray(data.results) ? data.results : [];
        
        // Apply fuzzy search if enabled and no results from API
        if (this.config.fuzzySearchEnabled && this.state.results.length === 0) {
          this.applyFuzzySearch(query);
        }
        
        // Show results
        this.showResults();
      })
      .catch(error => {
        console.error('EnhancedSearchComponent: Search error', error);
        this.state.loading = false;
        
        // Fall back to fuzzy search on error
        if (this.config.fuzzySearchEnabled) {
          this.applyFuzzySearch(query);
        }
        
        this.showResults();
      });
  }
  
  /**
   * Apply fuzzy search algorithm to find matches
   * @param {string} query The search query
   */
  applyFuzzySearch(query) {
    try {
      // Get all available items to search through
      let availableItems = [];
      
      // Try to get items from global ALL_TOOLS
      if (window.ALL_TOOLS && Array.isArray(window.ALL_TOOLS)) {
        availableItems = window.ALL_TOOLS;
      }
      
      // If no items found, try to get from config
      if (availableItems.length === 0 && window.SEARCH_ITEMS && Array.isArray(window.SEARCH_ITEMS)) {
        availableItems = window.SEARCH_ITEMS;
      }
      
      // If still no items, use empty array
      if (availableItems.length === 0) {
        this.state.results = [];
        return;
      }
      
      // Simple fuzzy search
      const lowerQuery = query.toLowerCase();
      const queryChars = lowerQuery.split('');
      
      // Score and filter items
      this.state.results = availableItems
        .map(item => {
          const name = (item.name || item.title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          
          // Skip items with no name
          if (!name) return { item, score: 0 };
          
          // Calculate exact match score
          let score = 0;
          if (name.includes(lowerQuery)) {
            // Exact match in name
            score += 100 + (lowerQuery.length / name.length) * 50;
          } else if (description && description.includes(lowerQuery)) {
            // Exact match in description
            score += 50 + (lowerQuery.length / description.length) * 25;
          }
          
          // Calculate fuzzy match score if no exact match
          if (score === 0) {
            let lastIndex = -1;
            let charMatches = 0;
            
            // Check if all characters appear in sequence
            for (const char of queryChars) {
              const index = name.indexOf(char, lastIndex + 1);
              if (index > lastIndex) {
                lastIndex = index;
                charMatches++;
              }
            }
            
            // Score based on character matches and their sequence
            if (charMatches === queryChars.length) {
              score = 25 + (charMatches / name.length) * 25;
            } else {
              // Check for partial matches
              const nameWords = name.split(/\s+/);
              for (const word of nameWords) {
                if (word.startsWith(lowerQuery.charAt(0))) {
                  score += 10;
                  
                  // Bonus for more character matches at the start
                  let matchLen = 1;
                  while (matchLen < Math.min(word.length, lowerQuery.length) && 
                         word.charAt(matchLen) === lowerQuery.charAt(matchLen)) {
                    score += 5;
                    matchLen++;
                  }
                }
              }
            }
          }
          
          return { item, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.item);
    } catch (error) {
      console.error('EnhancedSearchComponent: Fuzzy search error', error);
      this.state.results = [];
    }
  }
  
  /**
   * Render search results
   */
  renderResults() {
    this.resultsElement.innerHTML = '';
    
    if (this.state.loading) {
      this.resultsElement.innerHTML = `<div class="search-loading">${this.config.loadingText}</div>`;
      return;
    }
    
    if (this.state.results.length === 0) {
      this.resultsElement.innerHTML = `<div class="search-no-results">${this.config.noResultsText}</div>`;
      return;
    }
    
    // Create results list
    const resultsList = document.createElement('div');
    resultsList.classList.add('search-results-list');
    
    // Add each result item
    this.state.results.forEach((item, index) => {
      const resultItem = document.createElement('div');
      resultItem.classList.add('search-result-item');
      resultItem.setAttribute('role', 'option');
      resultItem.setAttribute('tabindex', '-1');
      resultItem.setAttribute('aria-selected', 'false');
      
      // Highlight matching text if this is a search result
      const itemName = item.name || item.title || item.text || '';
      const itemDescription = item.description || '';
      
      if (this.state.query && itemName) {
        const highlightedName = this.highlightText(itemName, this.state.query);
        const nameElement = document.createElement('div');
        nameElement.classList.add('search-result-name');
        nameElement.innerHTML = highlightedName;
        resultItem.appendChild(nameElement);
      } else {
        const nameElement = document.createElement('div');
        nameElement.classList.add('search-result-name');
        nameElement.textContent = itemName;
        resultItem.appendChild(nameElement);
      }
      
      if (itemDescription) {
        const highlightedDescription = this.state.query 
          ? this.highlightText(itemDescription, this.state.query) 
          : itemDescription;
        
        const descriptionElement = document.createElement('div');
        descriptionElement.classList.add('search-result-description');
        descriptionElement.innerHTML = highlightedDescription;
        resultItem.appendChild(descriptionElement);
      }
      
      // Set as data item for selection
      resultItem.dataset.item = JSON.stringify(item);
      
      // Add click event
      resultItem.addEventListener('click', () => {
        this.selectItem(item);
      });
      
      resultsList.appendChild(resultItem);
    });
    
    this.resultsElement.appendChild(resultsList);
    
    // Reset focused item
    this.state.focused = -1;
  }
  
  /**
   * Highlight text matches
   * @param {string} text The text to highlight
   * @param {string} query The query to highlight
   * @returns {string} Highlighted HTML
   */
  highlightText(text, query) {
    try {
      // Escape special characters in the query
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create regex to match the query
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      
      // Replace matches with highlighted version
      return text.replace(regex, '<mark>$1</mark>');
    } catch (error) {
      console.warn('EnhancedSearchComponent: Highlight error', error);
      return text;
    }
  }
  
  /**
   * Select an item from the search results
   * @param {object} item The selected item
   */
  selectItem(item) {
    // Add to search history
    const itemName = item.name || item.title || item.text || item.query || '';
    if (itemName) {
      this.addToSearchHistory(itemName);
    }
    
    // Hide results
    this.hideResults();
    
    // Set input value
    if (itemName) {
      this.inputElement.value = itemName;
      this.state.query = itemName;
    }
    
    // Call the onSelect callback
    this.config.onSelect(item);
  }
}

// For compatibility with module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedSearchComponent;
} else if (typeof window !== 'undefined') {
  window.EnhancedSearchComponent = EnhancedSearchComponent;
}
