/**
 * Login form handling with loading indicators, CSRF protection,
 * client-side validation and enhanced error handling
 */
document.addEventListener('DOMContentLoaded', function() {
    // Show/hide password functionality
    const showHiddenPass = (loginPass, loginEye) => {
        const input = document.getElementById(loginPass),
              iconEye = document.getElementById(loginEye);
        
        if (iconEye && input) {
            iconEye.addEventListener('click', () => {
                console.log('Password eye clicked', input.type);
                // Change password to text
                if(input.type === 'password') {
                    // Switch to text
                    input.type = 'text';
                    // Icon change
                    iconEye.classList.add('ri-eye-line');
                    iconEye.classList.remove('ri-eye-off-line');
                } else {
                    // Change to password
                    input.type = 'password';
                    // Icon change
                    iconEye.classList.remove('ri-eye-line');
                    iconEye.classList.add('ri-eye-off-line');
                }
            });
        } else {
            console.warn('Password toggle elements not found:', loginPass, loginEye);
        }
    };
    
    showHiddenPass('login-pass', 'login-eye');
    
    // Toast notification system
    const createToast = (type, message) => {
        const toastContainer = document.querySelector('.toast-container') || (() => {
            const container = document.createElement('div');
            container.classList.add('toast-container');
            document.body.appendChild(container);
            return container;
        })();
        
        const toast = document.createElement('div');
        toast.classList.add('toast', `toast-${type}`);
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = 'ri-checkbox-circle-line';
                break;
            case 'error':
                icon = 'ri-error-warning-line';
                break;
            default:
                icon = 'ri-information-line';
        }
        
        toast.innerHTML = `
            <i class="toast-icon ${icon}"></i>
            <div class="toast-message">${message}</div>
            <i class="toast-close ri-close-line"></i>
        `;
        
        toastContainer.appendChild(toast);
        
        // Add show class after a small delay to trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove toast after 5 seconds
        const hideTimeout = setTimeout(() => {
            removeToast(toast);
        }, 5000);
        
        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(hideTimeout);
            removeToast(toast);
        });
        
        return toast;
    };
    
    const removeToast = (toast) => {
        toast.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    };
    
    // Form validation
    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };
    
    const showFieldError = (field, message) => {
        const box = field.closest('.login__box');
        
        // Add error class to the box
        box.classList.add('error');
        box.classList.remove('success');
        
        // Check if error message element exists, if not create it
        let errorEl = box.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.classList.add('field-error');
            box.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
    };
    
    const clearFieldError = (field) => {
        const box = field.closest('.login__box');
        box.classList.remove('error');
    };
    
    const showFieldSuccess = (field) => {
        const box = field.closest('.login__box');
        box.classList.remove('error');
        box.classList.add('success');
    };
    
    // Form submission with loading indicator
    const loginForm = document.querySelector('.login__form');
    const messageElement = document.getElementById('login-message');
    
    if (loginForm) {
        // Add CSRF token if not present
        if (!loginForm.querySelector('input[name="csrf_token"]')) {
            // First check if there's a meta tag with csrf-token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = csrfToken;
                loginForm.appendChild(csrfInput);
            }
        }
        
        const usernameField = document.getElementById('login-username');
        const passwordField = document.getElementById('login-pass');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        
        // Add spinner to button
        if (submitButton && !submitButton.querySelector('.spinner')) {
            // Wrap text in span
            const buttonText = submitButton.textContent;
            submitButton.innerHTML = `
                <span class="login__button-text">${buttonText}</span>
                <div class="spinner"></div>
            `;
        }
        
        // Client-side validation on blur
        if (usernameField) {
            usernameField.addEventListener('blur', function() {
                if (!this.value.trim()) {
                    showFieldError(this, 'Username or email is required');
                } else {
                    clearFieldError(this);
                    // Check if it's an email
                    if (this.value.includes('@') && !validateEmail(this.value)) {
                        showFieldError(this, 'Please enter a valid email address');
                    } else {
                        showFieldSuccess(this);
                    }
                }
            });
            
            usernameField.addEventListener('input', function() {
                if (this.value.trim()) {
                    clearFieldError(this);
                }
            });
        }
        
        if (passwordField) {
            passwordField.addEventListener('blur', function() {
                if (!this.value) {
                    showFieldError(this, 'Password is required');
                } else {
                    clearFieldError(this);
                    showFieldSuccess(this);
                }
            });
            
            passwordField.addEventListener('input', function() {
                if (this.value) {
                    clearFieldError(this);
                }
            });
        }
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;
            
            // Validate username/email
            if (!usernameField.value.trim()) {
                showFieldError(usernameField, 'Username or email is required');
                isValid = false;
            } else if (usernameField.value.includes('@') && !validateEmail(usernameField.value)) {
                showFieldError(usernameField, 'Please enter a valid email address');
                isValid = false;
            }
            
            // Validate password
            if (!passwordField.value) {
                showFieldError(passwordField, 'Password is required');
                isValid = false;
            }
            
            if (!isValid) {
                return;
            }
            
            // Show loading indicator
            loginForm.classList.add('form-loading');
            submitButton.disabled = true;
            
            // Submit the form
            fetch(loginForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    username: usernameField.value,
                    password: passwordField.value,
                    remember_me: document.getElementById('login-check')?.checked || false,
                    csrf_token: document.querySelector('input[name="csrf_token"]')?.value
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Login failed');
                    });
                }
                return response.json();
            })
            .then(data => {
                createToast('success', data.message || 'Logged in successfully');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = data.redirect || '/';
                }, 1000);
            })
            .catch(error => {
                console.error('Login error:', error);
                
                // Show error message
                if (messageElement) {
                    messageElement.textContent = error.message || 'Invalid username or password';
                    messageElement.className = 'login__message login__message-error';
                    messageElement.style.display = 'block';
                } else {
                    createToast('error', error.message || 'Invalid username or password');
                }
                
                // Make password field empty for security
                passwordField.value = '';
            })
            .finally(() => {
                // Hide loading indicator
                loginForm.classList.remove('form-loading');
                submitButton.disabled = false;
            });
        });
    }
    
    // Show message helper function
    function showMessage(type, text) {
        if (messageElement) {
            messageElement.textContent = text;
            messageElement.className = 'login__message';
            messageElement.classList.add(`login__message-${type}`);
            messageElement.style.display = 'block';
            
            // Automatically hide after 5 seconds
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        } else {
            createToast(type, text);
        }
    }
    
    // Check for error parameter in URL and display if present
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const successParam = urlParams.get('success');
    
    if (errorParam) {
        showMessage('error', decodeURIComponent(errorParam));
    } else if (successParam) {
        showMessage('success', decodeURIComponent(successParam));
    }
});
