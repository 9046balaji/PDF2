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

// Path to the login background image
const inputPath = path.join(__dirname, 'login', 'img', 'login-bg.png');
const outputPath = path.join(outputDir, 'login-bg.png');

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
- Reduction: ${reductionPercent}%
- Dimensions: ${info.width}x${info.height}
- Output path: ${path.join(outputDir, 'login-bg.jpg')}`);
  })
  .catch((err) => {
    console.error('Error optimizing image:', err);
    process.exit(1);
  });
