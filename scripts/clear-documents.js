#!/usr/bin/env node

/**
 * This script clears the documents.json file during a new build
 * It replaces the file with an empty array
 */

const fs = require('fs');
const path = require('path');

const DOCUMENTS_FILE_PATH = path.join(process.cwd(), 'documents.json');

console.log('🧹 Clearing documents.json file...');

try {
  // Write an empty array to the documents.json file
  fs.writeFileSync(DOCUMENTS_FILE_PATH, '[]', 'utf8');
  console.log('✅ Successfully cleared documents.json file');
} catch (error) {
  console.error('❌ Error clearing documents.json file:', error);
  process.exit(1);
} 