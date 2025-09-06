/*=============== SHOW HIDDEN - PASSWORD ===============*/
function showHiddenPass(loginPass, loginEye) {
   var input = document.getElementById(loginPass);
   var iconEye = document.getElementById(loginEye);

   if (!input || !iconEye) {
      console.warn("Elements not found: " + loginPass + " or " + loginEye);
      return;
   }

   iconEye.addEventListener('click', function() {
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

// Initialize password toggle for login form
document.addEventListener('DOMContentLoaded', function() {
   showHiddenPass('login-pass', 'login-eye');

   // Handle form validation and submission
   var loginForm = document.querySelector('.login__form');
   if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
         e.preventDefault(); // Prevent default form submission
         
         var emailInput = document.getElementById('login-username');
         var passwordInput = document.getElementById('login-pass');
         var rememberCheckbox = document.getElementById('login-check');
         var submitButton = loginForm.querySelector('button[type="submit"]');
         
         if (!emailInput || !passwordInput) {
            console.error('Required form elements not found');
            return;
         }
         
         // Basic validation
         if (!emailInput.value.trim()) {
            showErrorMessage('Please enter your username or email');
            return;
         }
         
         if (!passwordInput.value) {
            showErrorMessage('Please enter your password');
            return;
         }
         
         // Show loading state
         if (submitButton) {
            submitButton.innerHTML = '<span class="login__button-text">Logging in...</span><div class="spinner" style="display: block;"></div>';
            submitButton.disabled = true;
         }
         
         // Proceed with form submission
         loginForm.submit();
      });
   }
   
   // Initialize other password toggles if present
   var registerEye = document.getElementById('register-eye');
   if (registerEye) {
      showHiddenPass('register-pass', 'register-eye');
   }
   
   // Check for error parameter in URL and display if present
   var urlParams = new URLSearchParams(window.location.search);
   var errorParam = urlParams.get('error');
   if (errorParam) {
      showErrorMessage(decodeURIComponent(errorParam));
   }
});

// Helper function to show error messages
function showErrorMessage(message) {
   var messageElement = document.querySelector('.login__message');
   
   if (!messageElement) {
      // Create message element if it doesn't exist
      messageElement = document.createElement('div');
      messageElement.className = 'login__message login__message-error';
      
      // Insert after the title
      var title = document.querySelector('.login__title');
      if (title && title.parentNode) {
         title.parentNode.insertBefore(messageElement, title.nextSibling);
      } else {
         // Fallback to prepending to the form
         var form = document.querySelector('.login__form');
         if (form) {
            form.prepend(messageElement);
         }
      }
   }
   
   // Set message content and ensure it's visible
   messageElement.textContent = message;
   messageElement.classList.add('login__message-error');
   messageElement.style.display = 'block';
}
