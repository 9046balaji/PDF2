/**
 * File upload validation utilities
 */

// File size validation
function validateFileSize(file, maxSizeMB = 2048) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${maxSizeMB}MB.`
    };
  }
  return { valid: true };
}

// Format file size for display
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Comprehensive file validation
function validateFile(file, options = {}) {
  const {
    maxSizeMB = 2048,
    allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  } = options;
  
  // Check file size
  const sizeCheck = validateFileSize(file, maxSizeMB);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }
  
  // Check file type if specified
  if (allowedTypes && allowedTypes.length > 0) {
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} is not supported. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
  }
  
  return { valid: true };
}

// Export functions for module use
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    validateFileSize,
    formatFileSize,
    validateFile
  };
}
