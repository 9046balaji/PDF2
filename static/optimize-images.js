const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'login/img/login-bg.png');
const outputPath = path.join(__dirname, 'dist/login/img/login-bg.png');

// Make sure the output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Optimize the image
sharp(inputPath)
  .resize(1200) // Reduce resolution even more
  .jpeg({ quality: 80 }) // Convert to JPEG for better compression
  .toBuffer()
  .then(data => {
    fs.writeFileSync(outputPath.replace('.png', '.jpg'), data);
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = data.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Optimized login-bg: ${(originalSize/1024).toFixed(2)}KB → ${(optimizedSize/1024).toFixed(2)}KB (${savings}% smaller)`);
  })
  .catch(err => {
    console.error('Error optimizing image:', err);
  });
