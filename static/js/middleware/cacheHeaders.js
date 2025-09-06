/**
 * Configure proper caching headers based on content type
 * Implements best practices for security and performance
 */
const setCacheHeaders = (req, res, next) => {
  // Read configurable values from environment variables with defaults
  const maxAgeStatic = process.env.CACHE_MAX_AGE_STATIC || '604800';  // 1 week default
  const maxAgeHtml = process.env.CACHE_MAX_AGE_HTML || '3600';       // 1 hour default
  const maxAgeApi = process.env.CACHE_MAX_AGE_API || '60';           // 1 minute default
  
  // PDF files that users upload - no caching for security
  if (req.path.includes('/uploads/') || req.path.includes('/user-data/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  } 
  // Processed PDF files - limited caching with validation
  else if (req.path.includes('/processed/') && req.path.endsWith('.pdf')) {
    res.setHeader('Cache-Control', `private, max-age=${maxAgeHtml}, must-revalidate`);
    res.setHeader('ETag', 'true');
  }
  // Static assets like JS/CSS with hash-based names - aggressive caching
  else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
    // Check if filename contains a content hash (e.g. main.a1b2c3d4.js)
    if (req.path.match(/\.[a-f0-9]{8,}\./i)) {
      // Strong caching for fingerprinted files
      res.setHeader('Cache-Control', `public, max-age=${maxAgeStatic}, immutable`);
    } else {
      // For non-fingerprinted static files, use validation
      res.setHeader('Cache-Control', `public, max-age=${maxAgeHtml}, must-revalidate`);
      res.setHeader('ETag', 'true');
    }
  }
  // HTML pages - light caching with validation
  else if (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeHtml}, must-revalidate`);
    res.setHeader('ETag', 'true');
  }
  // API endpoints - minimal caching
  else if (req.path.startsWith('/api/')) {
    // Different cache settings for different API operations
    if (req.method === 'GET' && !req.path.includes('/user/')) {
      // Read-only, non-personal API can have short cache
      res.setHeader('Cache-Control', `private, max-age=${maxAgeApi}, must-revalidate`);
    } else {
      // No caching for mutation operations or personal data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
  }
  
  // Remove any existing Expires header to avoid conflicts
  res.removeHeader('Expires');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
};

module.exports = setCacheHeaders;
