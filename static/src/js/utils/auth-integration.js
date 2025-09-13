/**
 * Authentication Integration Module
 * Links the existing login/register forms with the main application
 */

// Import the AuthenticationManager for user authentication
const authManager = window.AuthenticationManager ? 
                    window.AuthenticationManager.getInstance() : 
                    null;

// Create auth helper functions for the main app
const AuthHelpers = {
    /**
     * Check if user is authenticated
     * @returns {boolean} Whether the user is logged in
     */
    isAuthenticated: function() {
        return authManager ? authManager.isAuthenticated() : false;
    },

    /**
     * Perform login with credentials
     * @param {string} username - Username or email
     * @param {string} password - User password
     * @param {boolean} rememberMe - Whether to remember the user
     * @returns {Promise<Object>} Login result with success status
     */
    login: async function(username, password, rememberMe = false) {
        try {
            if (!authManager) {
                console.error('Authentication manager not available');
                return { success: false, error: 'Authentication system not available' };
            }
            
            const result = await authManager.login(username, password, rememberMe);
            return { success: result, user: authManager.getUser() };
        } catch (error) {
            console.error('Login failed', error);
            return { success: false, error: error.message || 'Login failed' };
        }
    },

    /**
     * Register a new user
     * @param {string} username - Username
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Registration result with success status
     */
    register: async function(username, email, password) {
        try {
            // Use fetch directly since AuthManager might not have register method
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration failed', error);
            return { success: false, error: error.message || 'Registration failed' };
        }
    },

    /**
     * Log out the current user
     * @returns {Promise<boolean>} Whether logout was successful
     */
    logout: async function() {
        try {
            if (!authManager) {
                // Fallback to direct fetch if auth manager not available
                const response = await fetch('/logout', { method: 'GET' });
                return response.ok;
            }
            
            return await authManager.logout();
        } catch (error) {
            console.error('Logout failed', error);
            return false;
        }
    },

    /**
     * Redirect to login page
     */
    redirectToLogin: function() {
        window.location.href = '/login';
    },

    /**
     * Redirect to register page
     */
    redirectToRegister: function() {
        window.location.href = '/register';
    },

    /**
     * Get current user information
     * @returns {Object|null} Current user or null if not authenticated
     */
    getCurrentUser: function() {
        return authManager ? authManager.getUser() : null;
    },

    /**
     * Add authentication header to fetch requests
     * @param {Object} options - Fetch options
     * @returns {Object} Updated fetch options with auth headers
     */
    addAuthHeader: function(options = {}) {
        if (!authManager) return options;
        
        const token = authManager.getAccessToken();
        if (!token) return options;
        
        const headers = options.headers || {};
        return {
            ...options,
            headers: {
                ...headers,
                'Authorization': `Bearer ${token}`
            }
        };
    }
};

// Make auth helpers available globally
window.AuthHelpers = AuthHelpers;

// Add authentication components to the DOM when page loads
document.addEventListener('DOMContentLoaded', function() {
    const appHeader = document.querySelector('header');
    
    if (appHeader) {
        // Create authentication links container
        const authContainer = document.createElement('div');
        authContainer.className = 'auth-links flex items-center ml-auto';
        
        // Check if user is authenticated
        if (AuthHelpers.isAuthenticated()) {
            // User is logged in - show username and logout button
            const user = AuthHelpers.getCurrentUser();
            const username = user ? user.username : 'User';
            
            authContainer.innerHTML = `
                <span class="text-gray-700 mr-4">Welcome, ${username}</span>
                <button id="logout-btn" class="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                    Logout
                </button>
            `;
            
            // Add logout event listener after a small delay
            setTimeout(() => {
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async () => {
                        const success = await AuthHelpers.logout();
                        if (success) {
                            window.location.reload();
                        }
                    });
                }
            }, 0);
        } else {
            // User is not logged in - show login and register links
            authContainer.innerHTML = `
                <a href="/login" class="text-gray-700 mr-4 hover:text-red-500 transition-colors">Login</a>
                <a href="/register" class="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                    Register
                </a>
            `;
        }
        
        // Add auth container to header
        appHeader.appendChild(authContainer);
    }
    
    // Add event listeners to login and register forms if on those pages
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-pass');
            const rememberInput = document.getElementById('login-check');
            
            if (!emailInput || !passwordInput) return;
            
            const result = await AuthHelpers.login(
                emailInput.value,
                passwordInput.value,
                rememberInput ? rememberInput.checked : false
            );
            
            if (result.success) {
                // Create success message
                const successMessage = document.createElement('div');
                successMessage.className = 'login__message login__message-success';
                successMessage.textContent = 'Login successful! Redirecting...';
                
                // Insert before the login button
                const loginButton = document.querySelector('.login__button');
                if (loginButton) {
                    loginButton.parentNode.insertBefore(successMessage, loginButton);
                }
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                // Create error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'login__message login__message-error';
                errorMessage.textContent = result.error || 'Login failed';
                
                // Insert before the login button
                const loginButton = document.querySelector('.login__button');
                if (loginButton) {
                    loginButton.parentNode.insertBefore(errorMessage, loginButton);
                }
            }
        });
    }
    
    const registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const usernameInput = document.getElementById('register-username');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-pass');
            
            if (!usernameInput || !emailInput || !passwordInput) return;
            
            const result = await AuthHelpers.register(
                usernameInput.value,
                emailInput.value,
                passwordInput.value
            );
            
            if (result.success) {
                // Create success message
                const successMessage = document.createElement('div');
                successMessage.className = 'login__message login__message-success';
                successMessage.textContent = 'Registration successful! Redirecting to login...';
                
                // Insert after the title
                const title = document.querySelector('.login__title');
                if (title) {
                    title.parentNode.insertBefore(successMessage, title.nextSibling);
                }
                
                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                // Create error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'login__message login__message-error';
                errorMessage.textContent = result.error || 'Registration failed';
                
                // Insert after the title
                const title = document.querySelector('.login__title');
                if (title) {
                    title.parentNode.insertBefore(errorMessage, title.nextSibling);
                }
            }
        });
    }
    
    // Protect restricted pages
    const restrictedPages = [
        '/profile',
        '/admin',
        '/dashboard'
    ];
    
    const currentPath = window.location.pathname;
    if (restrictedPages.includes(currentPath) && !AuthHelpers.isAuthenticated()) {
        // Redirect to login if accessing restricted page without authentication
        AuthHelpers.redirectToLogin();
    }
});
