// This script is used to optimize the large login background image
// directly using sharp for better control over the optimization process

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the output directory exists
const outputDir = path.join(__dirname, 'dist', 'login', 'img');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Original image location
const originalPath = path.join(__dirname, 'login', 'img', 'login-bg.png');
// Fallback to src structure if defined
const srcPath = path.join(__dirname, 'src', 'assets', 'images', 'login-bg.png');

// Determine which path to use
let inputPath = originalPath;
if (!fs.existsSync(originalPath) && fs.existsSync(srcPath)) {
  inputPath = srcPath;
  console.log(`Using image from src structure: ${srcPath}`);
} else if (!fs.existsSync(originalPath)) {
  console.error(`Error: Login background image not found at either:
- ${originalPath}
- ${srcPath}`);
  process.exit(1);
}

// Optimize the image
console.log(`Optimizing login background image: ${inputPath}`);
sharp(inputPath)
  .resize(1200) // Reduce width to 1200px maximum (smaller)
  .jpeg({ quality: 75, progressive: true }) // Convert to JPEG for better compression
  .toFile(path.join(outputDir, 'login-bg.jpg')) // Save as JPG instead of PNG
  .then((info) => {
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(path.join(outputDir, 'login-bg.jpg')).size;
    const reductionPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Image optimization complete:
- Original size: ${(originalSize / 1024).toFixed(2)} KB
- Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB
- Reduction: ${reductionPercent}%`);
  })
  .catch(err => {
    console.error('Error optimizing login background image:', err);
    process.exit(1);
  });
