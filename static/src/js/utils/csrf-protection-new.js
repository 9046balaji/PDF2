/**
 * CSRF Protection for PDF Tool Application
 * This script adds CSRF token handling to all form submissions and API requests
 * to protect against Cross-Site Request Forgery attacks.
 */

// Utility to get CSRF token from meta tag, form field, or cookie
function getCSRFToken() {
    // Try to get the token from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Fall back to checking for the hidden input field
    const hiddenInput = document.querySelector('input[name="csrf_token"]');
    if (hiddenInput) {
        return hiddenInput.value;
    }
    
    // If neither is found, try to get it from the cookie
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
    
    if (cookieValue) {
        return cookieValue;
    }
    
    console.warn('CSRF token not found. API calls requiring CSRF protection may fail.');
    return null;
}

// Function to fetch a fresh CSRF token from the server
async function fetchCSRFToken() {
    try {
        const response = await fetch('/get-csrf-token');
        if (response.ok) {
            const data = await response.json();
            if (data.csrf_token) {
                // Store token in cookie for future use
                document.cookie = `csrf_token=${data.csrf_token}; path=/; SameSite=Strict`;
                return data.csrf_token;
            }
        }
        console.error('Failed to fetch CSRF token');
        return null;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        return null;
    }
}

// Get or create a CSRF token, ensuring one is available
async function ensureCSRFToken() {
    let token = getCSRFToken();
    if (!token) {
        token = await fetchCSRFToken();
    }
    // Add stronger error reporting to aid debugging
    if (!token) {
        console.error('CSRF token could not be obtained after fetch attempt. Check server logs for /get-csrf-token endpoint issues');
        // Optionally: surface a lightweight UI banner for developers if desired
    }
    return token;
}

// Patch all form submissions to include CSRF token
document.addEventListener('submit', function(e) {
    // Only process POST forms
    if (!e.target.method || e.target.method.toLowerCase() !== 'post') {
        return;
    }
    
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
        return;
    }
    
    // Check if form already has a CSRF token field
    let hasCSRFField = false;
    for (const element of e.target.elements) {
        if (element.name === 'csrf_token') {
            element.value = csrfToken;
            hasCSRFField = true;
            break;
        }
    }
    
    // Add CSRF token field if not already present
    if (!hasCSRFField) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = csrfToken;
        e.target.appendChild(input);
    }
});

// Utility to append CSRF token to all fetch requests
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    // Clone the options to avoid modifying the original
    const newOptions = { ...options };

    // Only add CSRF token to POST, PUT, DELETE requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        // IMPORTANT: Await the token to prevent race conditions
        const csrfToken = await ensureCSRFToken();

        if (csrfToken) {
            // Add token to headers
            newOptions.headers = newOptions.headers || {};
            if (typeof newOptions.headers === 'object' && !(newOptions.headers instanceof Headers)) {
                newOptions.headers = { ...newOptions.headers, 'X-CSRFToken': csrfToken };
            } else if (newOptions.headers instanceof Headers) {
                // Create a new Headers object
                const newHeaders = new Headers(newOptions.headers);
                newHeaders.set('X-CSRFToken', csrfToken);
                newOptions.headers = newHeaders;
            }

            // If it's a FormData body, add the token there too
            if (options.body instanceof FormData) {
                // Check if the FormData already has the token
                let hasToken = false;
                try {
                    for (const [key] of options.body.entries()) {
                        if (key === 'csrf_token') {
                            hasToken = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.warn('Could not check FormData for csrf_token', e);
                }

                if (!hasToken) {
                    // Create a new FormData to avoid modifying the original
                    const newFormData = new FormData();

                    // Clone the FormData
                    try {
                        for (const [key, value] of options.body.entries()) {
                            newFormData.append(key, value);
                        }

                        // Add CSRF token
                        newFormData.append('csrf_token', csrfToken);
                        newOptions.body = newFormData;
                    } catch (e) {
                        console.warn('Could not clone FormData, using original', e);
                        // If we can't clone, just modify the original
                        options.body.append('csrf_token', csrfToken);
                        newOptions.body = options.body;
                    }
                } else {
                    // Use the original body if it already has the token
                    newOptions.body = options.body;
                }
            }

            // If it's a JSON body, add the token there too
            if (options.body &&
                ((newOptions.headers['Content-Type'] && String(newOptions.headers['Content-Type']).includes('application/json')) ||
                 (typeof options.body === 'string' && options.body.trim().startsWith('{')))) {
                try {
                    const jsonBody = typeof options.body === 'string' ?
                        JSON.parse(options.body) : options.body;

                    // Only add if not already present
                    if (!jsonBody.csrf_token) {
                        jsonBody.csrf_token = csrfToken;
                        newOptions.body = JSON.stringify(jsonBody);
                    }
                } catch (e) {
                    console.warn('Failed to parse JSON body to add CSRF token', e);
                }
            }
        } else {
            console.warn('Making request without CSRF token - may be rejected by server:', url);
        }
    }

    // Use modified options with CSRF token
    return originalFetch(url, newOptions);
};

// Initialize CSRF token on XHR requests (for legacy code using XMLHttpRequest)
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
    const xhr = this;
    const originalMethod = method.toUpperCase();
    
    // Call the original open method
    originalXhrOpen.apply(xhr, arguments);
    
    // Only intercept non-GET requests
    if (originalMethod !== 'GET') {
        const csrfToken = getCSRFToken();
        if (csrfToken) {
            xhr.setRequestHeader('X-CSRFToken', csrfToken);
            
            // Store original send method
            const originalSend = xhr.send;
            
            // Override send to inject CSRF token
            xhr.send = function(body) {
                // Add token to FormData
                if (body instanceof FormData) {
                    // Check if token is already present
                    let hasToken = false;
                    try {
                        for (const [key] of body.entries()) {
                            if (key === 'csrf_token') {
                                hasToken = true;
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn('Could not check FormData for csrf_token', e);
                    }
                    
                    // Add token if not present
                    if (!hasToken) {
                        body.append('csrf_token', csrfToken);
                    }
                }
                
                // Call original send
                return originalSend.call(xhr, body);
            };
        }
    }
};

// Apply CSRF protection to any existing file upload functions
if (typeof window.handleSubmit === 'function') {
    console.log('Patching handleSubmit function with CSRF protection');
    const originalHandleSubmit = window.handleSubmit;
    window.handleSubmit = async function() {
        // Actually add CSRF token handling for file uploads
        const csrfToken = getCSRFToken();
        
        // Check if first argument is a FormData or event with target
        if (arguments[0] && arguments[0].target && arguments[0].target.tagName === 'FORM') {
            // It's a form submission event
            const form = arguments[0].target;
            let hasToken = false;
            
            // Check if form already has CSRF token
            for (const element of form.elements) {
                if (element.name === 'csrf_token') {
                    element.value = csrfToken;
                    hasToken = true;
                    break;
                }
            }
            
            // Add token if missing
            if (!hasToken && csrfToken) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'csrf_token';
                input.value = csrfToken;
                form.appendChild(input);
            }
        } else if (arguments[0] instanceof FormData) {
            // It's a FormData object
            if (csrfToken && !arguments[0].has('csrf_token')) {
                arguments[0].append('csrf_token', csrfToken);
            }
        }
        
        // Now call the original function with potentially modified arguments
        return originalHandleSubmit.apply(this, arguments);
    };
}

// Directly attach CSRF token to the upload endpoint
document.addEventListener('DOMContentLoaded', function() {
    // Find all file inputs and handle their change events
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        const originalOnChange = input.onchange;
        input.onchange = function(e) {
            // Make sure our handlers run first before any existing handlers
            const csrfToken = getCSRFToken();
            
            // Store token in a data attribute on the input for later use
            if (csrfToken) {
                input.dataset.csrfToken = csrfToken;
            }
            
            // Call original handler if it exists
            if (typeof originalOnChange === 'function') {
                return originalOnChange.call(this, e);
            }
        };
    });
    
    // Add CSRF token to any FormData objects created for uploads
    const originalFormData = window.FormData;
    window.FormData = function() {
        const formData = new originalFormData(...arguments);
        const csrfToken = getCSRFToken();
        
        // Add append method that checks for file uploads and adds CSRF token
        const originalAppend = formData.append;
        formData.append = function(name, value, filename) {
            // Call original append
            originalAppend.apply(this, arguments);
            
            // If this is a file being appended and we have a token, add it
            if (value instanceof File && csrfToken && !this.has('csrf_token')) {
                originalAppend.call(this, 'csrf_token', csrfToken);
                console.log('Added CSRF token to FormData with file upload');
            }
        };
        
        return formData;
    };
});

// Add a simple client-side diagnosis function to help debug CSRF issues
function diagnoseCSRFIssues() {
    console.group('CSRF Protection Diagnosis');

    // Check if token exists in any form
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const inputToken = document.querySelector('input[name="csrf_token"]')?.value;
    const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

    console.log('Token in meta tag:', metaToken || 'MISSING');
    console.log('Token in form input:', inputToken || 'MISSING');
    console.log('Token in cookie:', cookieToken || 'MISSING');

    // Check endpoint
    fetch('/get-csrf-token')
        .then(response => {
            console.log('/get-csrf-token endpoint:',
                response.ok ? 'WORKING' : `ERROR (${response.status})`);
            return response.ok ? response.json() : null;
        })
        .then(data => {
            if (data) console.log('Received new token:', data.csrf_token ? 'YES' : 'NO');
        })
        .catch(err => {
            console.error('/get-csrf-token fetch failed:', err);
        })
        .finally(() => {
            console.groupEnd();
        });
}

// Expose diagnosis helper in the console for developers
window.diagnoseCSRFIssues = diagnoseCSRFIssues;

// Initialize CSRF protection immediately
(async function() {
    console.log('Initializing CSRF protection...');
    const token = await ensureCSRFToken();
    if (token) {
        console.log('CSRF token obtained successfully');
    } else {
        console.warn('Failed to obtain CSRF token. Some requests may fail.');
    }
})();

console.log('Enhanced CSRF protection initialized for all AJAX requests including file uploads');
