#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
const destDir = path.join(__dirname, '../public');
const destFile = path.join(destDir, 'sql-wasm.wasm');

// Create public directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the WASM file
try {
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`✓ Copied sql-wasm.wasm to public folder`);
  } else {
    console.warn(`⚠ sql-wasm.wasm not found at ${srcFile} (will be available after npm install)`);
  }
} catch (err) {
  console.error(`✗ Failed to copy sql-wasm.wasm:`, err.message);
  process.exit(1);
}
