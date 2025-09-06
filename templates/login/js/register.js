/*=============== SHOW HIDDEN - PASSWORD ===============*/
function showHiddenPass(registerPass, registerEye) {
   var input = document.getElementById(registerPass);
   var iconEye = document.getElementById(registerEye);

   if (!input || !iconEye) {
      console.warn("Elements not found: " + registerPass + " or " + registerEye);
      return;
   }

   iconEye.addEventListener('click', function() {
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
}

// Show a toast notification
function showToast(message, type = 'error') {
   const toastContainer = document.querySelector('.toast-container');
   if (!toastContainer) return;

   const toast = document.createElement('div');
   toast.className = `toast toast-${type}`;
   toast.innerHTML = `
      <div class="toast-content">
         <i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} toast-icon"></i>
         <div class="toast-message">${message}</div>
      </div>
      <i class="ri-close-line toast-close"></i>
   `;

   toastContainer.appendChild(toast);

   // Add close functionality
   const closeBtn = toast.querySelector('.toast-close');
   if (closeBtn) {
      closeBtn.addEventListener('click', () => {
         toast.classList.add('toast-hiding');
         setTimeout(() => {
            toast.remove();
         }, 300);
      });
   }

   // Auto remove after 5 seconds
   setTimeout(() => {
      if (toast.parentNode) {
         toast.classList.add('toast-hiding');
         setTimeout(() => {
            if (toast.parentNode) toast.remove();
         }, 300);
      }
   }, 5000);
}

// Create a password strength meter
function createPasswordStrengthMeter(passwordInput) {
   // Create meter element if it doesn't exist
   let meterContainer = document.querySelector('.password-strength-meter');
   
   if (!meterContainer) {
      meterContainer = document.createElement('div');
      meterContainer.className = 'password-strength-meter';
      
      const meter = document.createElement('div');
      meter.className = 'strength-meter';
      
      const text = document.createElement('div');
      text.className = 'strength-text';
      
      meterContainer.appendChild(meter);
      meterContainer.appendChild(text);
      
      // Insert after the password field's parent div
      const passwordBox = passwordInput.closest('.login__box-input');
      passwordBox.appendChild(meterContainer);
   }
   
   return meterContainer;
}

// Update password strength
function updatePasswordStrength(password) {
   const passwordInput = document.getElementById('register-pass');
   const meterContainer = createPasswordStrengthMeter(passwordInput);
   const meter = meterContainer.querySelector('.strength-meter');
   const text = meterContainer.querySelector('.strength-text');
   
   // Calculate strength
   let strength = 0;
   if (password.length >= 8) strength += 1;
   if (password.match(/[a-z]+/)) strength += 1;
   if (password.match(/[A-Z]+/)) strength += 1;
   if (password.match(/[0-9]+/)) strength += 1;
   if (password.match(/[^a-zA-Z0-9]+/)) strength += 1;
   
   // Update UI
   const strengthClass = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'][Math.min(strength, 4)];
   const strengthText = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'][Math.min(strength, 4)];
   
   meter.className = 'strength-meter ' + strengthClass;
   text.textContent = strengthText;
   text.className = 'strength-text ' + strengthClass;
   
   // Show/hide the meter based on whether password field has content
   meterContainer.style.display = password.length > 0 ? 'block' : 'none';
   
   return strength;
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
   // Init password toggle
   showHiddenPass('register-pass', 'register-eye');
   
   // Initialize password strength meter
   const passwordInput = document.getElementById('register-pass');
   if (passwordInput) {
      passwordInput.addEventListener('input', function() {
         updatePasswordStrength(this.value);
      });
   }

   // Perform client-side validation
   var registerForm = document.querySelector('.login__form');
   if (registerForm) {
      registerForm.addEventListener('submit', function(e) {
         e.preventDefault(); // Always prevent default submission
         
         var passwordInput = document.getElementById('register-pass');
         var usernameInput = document.getElementById('register-username');
         var emailInput = document.getElementById('register-email');
         
         if (!passwordInput || !usernameInput || !emailInput) {
            console.error('Required form elements not found');
            showToast('Form elements not found', 'error');
            return;
         }
         
         // Get form data
         const username = usernameInput.value.trim();
         const email = emailInput.value.trim();
         const password = passwordInput.value;
         
         // Validate inputs
         if (!username) {
            showToast('Username is required', 'error');
            return;
         }
         
         if (!email) {
            showToast('Email is required', 'error');
            return;
         }
         
         if (!email.includes('@') || !email.includes('.')) {
            showToast('Please enter a valid email address', 'error');
            return;
         }
         
         // Validate password length
         if (password.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            return;
         }
         
         // Show loading state
         const button = registerForm.querySelector('.login__button');
         const buttonText = button.querySelector('.login__button-text');
         const spinner = button.querySelector('.spinner');
         
         button.disabled = true;
         buttonText.style.opacity = "0";
         spinner.style.display = "block";
         
         // Prepare data for submission
         const formData = new FormData(registerForm);
         
         // Get CSRF token from meta tag or hidden input
         const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                          document.querySelector('input[name="csrf_token"]')?.value;
         
         // Submit the form
         fetch('/register', {
            method: 'POST',
            body: formData,
            headers: {
               'X-Requested-With': 'XMLHttpRequest',
               'X-CSRFToken': csrfToken
            }
         })
         .then(response => {
            if (response.redirected) {
               // If registration was successful and redirected
               window.location.href = response.url;
            } else {
               // Process the response
               return response.text();
            }
         })
         .then(html => {
            if (html) {
               // Check if there's an error message
               const parser = new DOMParser();
               const doc = parser.parseFromString(html, 'text/html');
               const errorElement = doc.querySelector('.login__message-error');
               
               if (errorElement) {
                  // Show error message
                  showToast(errorElement.textContent.trim(), 'error');
                  
                  // Fill in the form with values from the response if available
                  const usernameValue = doc.querySelector('#register-username')?.value;
                  const emailValue = doc.querySelector('#register-email')?.value;
                  
                  if (usernameValue) usernameInput.value = usernameValue;
                  if (emailValue) emailInput.value = emailValue;
               }
            }
         })
         .catch(error => {
            console.error('Registration error:', error);
            showToast('An error occurred during registration. Please try again.', 'error');
         })
         .finally(() => {
            // Reset button state
            button.disabled = false;
            buttonText.style.opacity = "1";
            spinner.style.display = "none";
         });
      });
   }
});
