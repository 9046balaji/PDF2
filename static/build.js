// Create a simple build script to run webpack + image optimization
const { exec } = require('child_process');
const path = require('path');

console.log('=== PDF Tool Frontend Build Process ===');
console.log('Building frontend with webpack...');

// Run webpack build
exec('webpack --mode production', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during webpack build: ${error.message}`);
    return;
  }
  
  console.log(stdout);
  
  if (stderr) {
    console.error(`Webpack stderr: ${stderr}`);
  }
  
  console.log('Optimizing images...');
  
  // Run our image optimization script
  require('./optimize-images.js');
  
  console.log('Build process completed successfully!');
});
