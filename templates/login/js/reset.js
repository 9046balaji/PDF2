// Minimal reset.js - show toast, validate email, submit reset form via fetch
function showToast(message, type = 'error') {
   const toastContainer = document.querySelector('.toast-container') || (function () {
      const c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
   })();

   const toast = document.createElement('div');
   toast.className = `toast toast-${type}`;
   toast.innerHTML = `
      <div class="toast-content">
         <i class="${type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} toast-icon"></i>
         <div class="toast-message">${message}</div>
      </div>
      <i class="ri-close-line toast-close" role="button" aria-label="Close"></i>
   `;

   toastContainer.appendChild(toast);

   const closeBtn = toast.querySelector('.toast-close');
   if (closeBtn) {
      closeBtn.addEventListener('click', () => {
         toast.classList.add('toast-hiding');
         setTimeout(() => toast.remove(), 300);
      });
   }

   setTimeout(() => {
      if (toast.parentNode) {
         toast.classList.add('toast-hiding');
         setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
      }
   }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
   const resetForm = document.querySelector('.login__form');
   if (!resetForm) return;

   resetForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const emailInput = document.getElementById('reset-email');
      if (!emailInput) {
         console.error('Email input element not found');
         showToast('Email input element not found', 'error');
         return;
      }

      const email = emailInput.value.trim();
      if (!email) {
         showToast('Email is required', 'error');
         return;
      }

      // very basic email sanity check
      if (!email.includes('@') || !email.includes('.')) {
         showToast('Please enter a valid email address', 'error');
         return;
      }

      const button = resetForm.querySelector('.login__button');
      const buttonText = button ? button.querySelector('.login__button-text') : null;
      const spinner = button ? button.querySelector('.spinner') : null;

      if (button) button.disabled = true;
      if (buttonText) buttonText.style.opacity = '0';
      if (spinner) spinner.style.display = 'block';

      const formData = new FormData(resetForm);

      fetch('/reset-password', {
         method: 'POST',
         body: formData,
         headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      .then(response => {
         if (response.redirected) {
            window.location.href = response.url;
            return null;
         }
         return response.json().catch(() => ({}));
      })
      .then(data => {
         if (!data) return;
         if (data.error) showToast(data.error, 'error');
         else if (data.message) {
            showToast(data.message, 'success');
            emailInput.value = '';
         }
      })
      .catch(err => {
         console.error('Reset password error:', err);
         showToast('An error occurred. Please try again later.', 'error');
      })
      .finally(() => {
         if (button) button.disabled = false;
         if (buttonText) buttonText.style.opacity = '1';
         if (spinner) spinner.style.display = 'none';
      });
   });

   // Show success toast if URL contains ?success
   const urlParams = new URLSearchParams(window.location.search);
   if (urlParams.has('success')) {
      showToast('If your email exists in our system, you will receive a password reset link shortly.', 'success');
   }
});
