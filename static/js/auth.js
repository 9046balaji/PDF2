/**
 * Authentication management for PDF Tool
 * Handles login, registration, and session management
 */

const Auth = {
    // Check if user is authenticated
    async isAuthenticated() {
        try {
            const response = await fetch('/api/auth/status');
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Login user
    async login(username, password, rememberMe = false) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    remember_me: rememberMe
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error occurred' };
        }
    },
    
    // Register user
    async register(username, email, password) {
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error occurred' };
        }
    },
    
    // Logout user
    async logout() {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            return null;
        }
    }
};

// Setup authentication for login page
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        setupLoginForm(loginForm);
    }
    
    const registerForm = document.querySelector('form[action="/register"]');
    if (registerForm) {
        setupRegisterForm(registerForm);
    }
});

function setupLoginForm(form) {
    const usernameInput = form.querySelector('#login-username');
    const passwordInput = form.querySelector('#login-pass');
    const rememberInput = form.querySelector('#login-check');
    const submitButton = form.querySelector('button[type="submit"]');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        if (submitButton) {
            submitButton.disabled = true;
            const buttonText = submitButton.querySelector('.login__button-text');
            const spinner = submitButton.querySelector('.spinner');
            
            if (buttonText) buttonText.style.opacity = '0';
            if (spinner) spinner.style.display = 'block';
        }
        
        try {
            const result = await Auth.login(
                usernameInput.value,
                passwordInput.value,
                rememberInput ? rememberInput.checked : false
            );
            
            if (result.success) {
                showLoginMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                showLoginMessage(result.error, 'error');
                passwordInput.value = '';
            }
        } catch (error) {
            showLoginMessage('An error occurred. Please try again.', 'error');
        } finally {
            // Reset button state
            if (submitButton) {
                submitButton.disabled = false;
                const buttonText = submitButton.querySelector('.login__button-text');
                const spinner = submitButton.querySelector('.spinner');
                
                if (buttonText) buttonText.style.opacity = '1';
                if (spinner) spinner.style.display = 'none';
            }
        }
    });
}

function setupRegisterForm(form) {
    const usernameInput = form.querySelector('#register-username');
    const emailInput = form.querySelector('#register-email');
    const passwordInput = form.querySelector('#register-pass');
    const submitButton = form.querySelector('button[type="submit"]');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        if (submitButton) {
            submitButton.disabled = true;
            const buttonText = submitButton.querySelector('.login__button-text');
            const spinner = submitButton.querySelector('.spinner');
            
            if (buttonText) buttonText.style.opacity = '0';
            if (spinner) spinner.style.display = 'block';
        }
        
        try {
            const result = await Auth.register(
                usernameInput.value,
                emailInput.value,
                passwordInput.value
            );
            
            if (result.success) {
                showLoginMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showLoginMessage(result.error, 'error');
            }
        } catch (error) {
            showLoginMessage('An error occurred. Please try again.', 'error');
        } finally {
            // Reset button state
            if (submitButton) {
                submitButton.disabled = false;
                const buttonText = submitButton.querySelector('.login__button-text');
                const spinner = submitButton.querySelector('.spinner');
                
                if (buttonText) buttonText.style.opacity = '1';
                if (spinner) spinner.style.display = 'none';
            }
        }
    });
}

function showLoginMessage(message, type) {
    let messageElement = document.querySelector('.login__message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'login__message';
        
        const title = document.querySelector('.login__title');
        if (title) {
            title.parentNode.insertBefore(messageElement, title.nextSibling);
        }
    }
    
    messageElement.textContent = message;
    messageElement.className = `login__message login__message-${type}`;
    messageElement.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Make Auth available globally
window.Auth = Auth;