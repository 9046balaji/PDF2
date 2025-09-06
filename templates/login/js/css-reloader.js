// Force-reload the page to clear cache
window.onload = function() {
  console.log('Page loaded. CSS version:', Date.now());
  
  // Force reload CSS immediately to apply changes
  const timestamp = Date.now();
  const styleSheet = document.querySelector('link[rel="stylesheet"][href*="/static/login/css/styles.css"]');
  if (styleSheet) {
    const newHref = styleSheet.href.split('?')[0] + '?' + timestamp;
    styleSheet.href = newHref;
    console.log('CSS reloaded on page load:', newHref);
  }
};

// Add a button to force reload
document.addEventListener('DOMContentLoaded', function() {
  const button = document.createElement('button');
  button.textContent = 'Force Reload CSS';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.background = 'rgba(0,0,0,0.7)';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.padding = '10px';
  button.style.borderRadius = '5px';
  button.onclick = function() {
    const timestamp = Date.now();
    const styleSheet = document.querySelector('link[rel="stylesheet"][href*="/static/login/css/styles.css"]');
    if (styleSheet) {
      const newHref = styleSheet.href.split('?')[0] + '?' + timestamp;
      styleSheet.href = newHref;
      console.log('CSS reloaded:', newHref);
    }
  };
  document.body.appendChild(button);
});
