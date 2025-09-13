// AccessibleNavigation.js - Enhanced navigation with accessible mobile menu

/**
 * AccessibleNavigation - Component for responsive navigation with accessibility features
 * Provides full keyboard navigation, ARIA attributes, and screen reader support
 */
class AccessibleNavigation {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      container: options.container || '#nav-container',
      menuId: options.menuId || 'main-navigation',
      breakpoint: options.breakpoint || 768, // Default md breakpoint in pixels
      openButtonText: options.openButtonText || 'Menu',
      closeButtonText: options.closeButtonText || 'Close Menu',
      menuIcon: options.menuIcon || '☰', // Hamburger icon as fallback
      closeIcon: options.closeIcon || '✕', // X icon as fallback
      expandedClass: options.expandedClass || 'is-expanded',
      navigationItems: options.navigationItems || [],
      onToggle: options.onToggle || function(isOpen) {},
      includeSearch: options.includeSearch !== false
    };
    
    // State
    this.state = {
      isOpen: false,
      initialized: false
    };
    
    // Initialize on DOM content loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  /**
   * Initialize the navigation component
   */
  init() {
    try {
      // Get or create container
      this.container = document.querySelector(this.config.container);
      if (!this.container) {
        console.warn(`Navigation container ${this.config.container} not found, creating one`);
        this.container = document.createElement('nav');
        this.container.id = this.config.container.replace('#', '');
        document.body.prepend(this.container);
      }
      
      // Create navigation elements
      this.createNavigationElements();
      
      // Add event listeners
      this.setupEventListeners();
      
      // Initial state
      this.state.initialized = true;
      
      console.log('AccessibleNavigation: Initialized');
    } catch (error) {
      console.error('AccessibleNavigation: Initialization failed', error);
    }
  }
  
  /**
   * Create navigation elements
   */
  createNavigationElements() {
    // Set container attributes
    this.container.setAttribute('role', 'navigation');
    this.container.setAttribute('aria-label', 'Main navigation');
    
    // Create a wrapper div
    const navWrapper = document.createElement('div');
    navWrapper.className = 'relative flex flex-wrap items-center justify-between p-4 bg-white shadow-md';
    
    // Create logo/brand area
    const brandArea = document.createElement('div');
    brandArea.className = 'flex items-center flex-shrink-0 mr-6';
    
    const brandLink = document.createElement('a');
    brandLink.href = '/';
    brandLink.className = 'text-xl font-bold text-blue-600 hover:text-blue-800';
    brandLink.textContent = 'PDF Tool';
    
    brandArea.appendChild(brandLink);
    navWrapper.appendChild(brandArea);
    
    // Create mobile menu toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'md:hidden p-2 rounded border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-controls', this.config.menuId);
    toggleButton.setAttribute('aria-label', this.config.openButtonText);
    
    // Create icon and screen reader text
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'block text-xl';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = this.config.menuIcon;
    
    // Hidden text for screen readers
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = this.config.openButtonText;
    
    toggleButton.appendChild(toggleIcon);
    toggleButton.appendChild(srText);
    navWrapper.appendChild(toggleButton);
    
    // Create navigation menu
    const navMenu = document.createElement('div');
    navMenu.id = this.config.menuId;
    navMenu.className = 'w-full hidden md:flex md:items-center md:w-auto';
    navMenu.setAttribute('aria-labelledby', toggleButton.id);
    
    // Create navigation list
    const navList = document.createElement('ul');
    navList.className = 'md:flex flex-col md:flex-row mt-4 md:mt-0 md:space-x-4';
    
    // Add navigation items
    this.config.navigationItems.forEach(item => {
      const listItem = document.createElement('li');
      
      const link = document.createElement('a');
      link.href = item.url || '#';
      link.textContent = item.text || '';
      link.className = 'block px-4 py-2 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-600';
      
      if (item.current) {
        link.className += ' font-bold text-blue-600';
        link.setAttribute('aria-current', 'page');
      }
      
      listItem.appendChild(link);
      navList.appendChild(listItem);
    });
    
    // Add search component if enabled
    if (this.config.includeSearch) {
      const searchItem = document.createElement('li');
      searchItem.className = 'md:ml-4 mt-4 md:mt-0';
      
      const searchContainer = document.createElement('div');
      searchContainer.id = 'nav-search';
      searchContainer.className = 'search-container relative';
      
      searchItem.appendChild(searchContainer);
      navList.appendChild(searchItem);
    }
    
    navMenu.appendChild(navList);
    navWrapper.appendChild(navMenu);
    
    // Clear container and add new elements
    this.container.innerHTML = '';
    this.container.appendChild(navWrapper);
    
    // Store references
    this.toggleButton = toggleButton;
    this.navMenu = navMenu;
    this.navList = navList;
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Toggle button click
    this.toggleButton.addEventListener('click', () => {
      this.toggleMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (this.state.isOpen && !this.container.contains(event.target)) {
        this.closeMenu();
      }
    });
    
    // Close menu when ESC key is pressed
    document.addEventListener('keydown', (event) => {
      if (this.state.isOpen && event.key === 'Escape') {
        this.closeMenu();
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    // Initialize search component if enabled
    if (this.config.includeSearch && window.EnhancedSearchComponent) {
      setTimeout(() => {
        try {
          new EnhancedSearchComponent({
            selector: '#nav-search',
            debounceTime: 300,
            placeholderText: 'Search PDF tools...',
            onSelect: (item) => {
              if (item.url) {
                window.location.href = item.url;
              }
            }
          });
        } catch (error) {
          console.warn('Failed to initialize search component:', error);
        }
      }, 100);
    }
  }
  
  /**
   * Toggle menu open/closed
   */
  toggleMenu() {
    if (this.state.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  /**
   * Open the menu
   */
  openMenu() {
    // Update state
    this.state.isOpen = true;
    
    // Update UI
    this.navMenu.classList.remove('hidden');
    this.navMenu.classList.add(this.config.expandedClass);
    
    // Update ARIA
    this.toggleButton.setAttribute('aria-expanded', 'true');
    
    // Update toggle button text and icon
    const icon = this.toggleButton.querySelector('[aria-hidden="true"]');
    const srText = this.toggleButton.querySelector('.sr-only');
    
    if (icon) icon.textContent = this.config.closeIcon;
    if (srText) srText.textContent = this.config.closeButtonText;
    
    // Call onToggle callback
    this.config.onToggle(true);
    
    // Trap focus within menu for accessibility
    this.trapFocus();
  }
  
  /**
   * Close the menu
   */
  closeMenu() {
    // Update state
    this.state.isOpen = false;
    
    // Update UI
    this.navMenu.classList.add('hidden');
    this.navMenu.classList.remove(this.config.expandedClass);
    
    // Update ARIA
    this.toggleButton.setAttribute('aria-expanded', 'false');
    
    // Update toggle button text and icon
    const icon = this.toggleButton.querySelector('[aria-hidden="true"]');
    const srText = this.toggleButton.querySelector('.sr-only');
    
    if (icon) icon.textContent = this.config.menuIcon;
    if (srText) srText.textContent = this.config.openButtonText;
    
    // Call onToggle callback
    this.config.onToggle(false);
    
    // Restore focus to toggle button
    this.toggleButton.focus();
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    // If above breakpoint, ensure menu is visible regardless of open state
    if (window.innerWidth >= this.config.breakpoint) {
      this.navMenu.classList.remove('hidden');
      
      // If menu was open in mobile view, close it properly
      if (this.state.isOpen) {
        this.state.isOpen = false;
        this.toggleButton.setAttribute('aria-expanded', 'false');
        
        const icon = this.toggleButton.querySelector('[aria-hidden="true"]');
        const srText = this.toggleButton.querySelector('.sr-only');
        
        if (icon) icon.textContent = this.config.menuIcon;
        if (srText) srText.textContent = this.config.openButtonText;
      }
    } else {
      // Below breakpoint, hide menu if it's closed
      if (!this.state.isOpen) {
        this.navMenu.classList.add('hidden');
      }
    }
  }
  
  /**
   * Trap focus within menu when open
   * This ensures keyboard users can't tab outside the menu
   */
  trapFocus() {
    // Get all focusable elements in the menu
    const focusableElements = this.navMenu.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus the first element
    firstElement.focus();
    
    // Handle tab and shift+tab to cycle within the menu
    this.navMenu.addEventListener('keydown', function handleTabKey(e) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift+Tab on first element should go to last element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab on last element should go to first element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
  
  /**
   * Update navigation items
   * @param {Array} items New navigation items
   */
  updateNavigationItems(items) {
    if (!Array.isArray(items)) return;
    
    this.config.navigationItems = items;
    
    // Clear existing items
    this.navList.innerHTML = '';
    
    // Add new items
    items.forEach(item => {
      const listItem = document.createElement('li');
      
      const link = document.createElement('a');
      link.href = item.url || '#';
      link.textContent = item.text || '';
      link.className = 'block px-4 py-2 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-600';
      
      if (item.current) {
        link.className += ' font-bold text-blue-600';
        link.setAttribute('aria-current', 'page');
      }
      
      listItem.appendChild(link);
      this.navList.appendChild(listItem);
    });
    
    // Add search component back if enabled
    if (this.config.includeSearch) {
      const searchItem = document.createElement('li');
      searchItem.className = 'md:ml-4 mt-4 md:mt-0';
      
      const searchContainer = document.createElement('div');
      searchContainer.id = 'nav-search';
      searchContainer.className = 'search-container relative';
      
      searchItem.appendChild(searchContainer);
      this.navList.appendChild(searchItem);
      
      // Reinitialize search
      if (window.EnhancedSearchComponent) {
        setTimeout(() => {
          try {
            new EnhancedSearchComponent({
              selector: '#nav-search',
              debounceTime: 300,
              placeholderText: 'Search PDF tools...'
            });
          } catch (error) {
            console.warn('Failed to reinitialize search component:', error);
          }
        }, 100);
      }
    }
  }
}

// For compatibility with module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibleNavigation;
} else if (typeof window !== 'undefined') {
  window.AccessibleNavigation = AccessibleNavigation;
}
