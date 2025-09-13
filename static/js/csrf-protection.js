// Simplified CSRF Protection for PDF Tool

function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    const hiddenInput = document.querySelector('input[name="csrf_token"]');
    if (hiddenInput) {
        return hiddenInput.value;
    }
    
    return null;
}

async function fetchCSRFToken() {
    try {
        const response = await fetch('/get-csrf-token');
        if (response.ok) {
            const data = await response.json();
            return data.csrf_token;
        }
        return null;
    } catch (error) {
        console.warn('Error fetching CSRF token:', error);
        return null;
    }
}

async function ensureCSRFToken() {
    let token = getCSRFToken();
    if (!token) {
        token = await fetchCSRFToken();
    }
    return token;
}

// Add CSRF token to form submissions
document.addEventListener('submit', function(e) {
    if (!e.target.method || e.target.method.toLowerCase() !== 'post') {
        return;
    }
    
    const csrfToken = getCSRFToken();
    if (!csrfToken) return;
    
    let hasCSRFField = false;
    for (const element of e.target.elements) {
        if (element.name === 'csrf_token') {
            element.value = csrfToken;
            hasCSRFField = true;
            break;
        }
    }
    
    if (!hasCSRFField) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = csrfToken;
        e.target.appendChild(input);
    }
});

// Add CSRF token to fetch requests
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    const newOptions = { ...options };
    const method = (options.method || 'GET').toUpperCase();
    
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        const csrfToken = await ensureCSRFToken();
        
        if (csrfToken) {
            newOptions.headers = newOptions.headers || {};
            newOptions.headers['X-CSRFToken'] = csrfToken;
            
            if (options.body instanceof FormData) {
                if (!options.body.has('csrf_token')) {
                    options.body.append('csrf_token', csrfToken);
                }
            }
        }
    }
    
    return originalFetch(url, newOptions);
};

console.log('CSRF protection initialized');
