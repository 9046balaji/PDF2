/**
 * Middleware to set proper content headers
 * Ensures consistent UTF-8 encoding across the application
 */
const setContentHeaders = (req, res, next) => {
  // For request logging and debugging
  const logRequest = process.env.LOG_HEADERS === 'true';
  
  // Set UTF-8 encoding for all HTML responses
  if (!res.getHeader('Content-Type') && 
      (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.'))) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (logRequest) {
      console.log(`Set Content-Type to UTF-8 for ${req.path}`);
    }
  }
  // Handle PDF files specifically for downloads
  else if (req.path.match(/\.(pdf)$/i)) {
    res.setHeader('Content-Type', 'application/pdf');
    if (!req.path.includes('/process/')) {
      // For downloaded files, set Content-Disposition
      const filename = req.path.split('/').pop();
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
  }
  // Handle JSON for API endpoints
  else if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  // Proceed to next middleware
  next();
};

module.exports = setContentHeaders;
