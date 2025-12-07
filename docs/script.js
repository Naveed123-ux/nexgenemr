// Import necessary Node.js modules for file system and path manipulation
const fs = require('fs').promises;
const path = require('path');

// --- CONFIGURATION ---
// Adjust these paths if your folder names are different.
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
const BACKEND_DIR = path.resolve(__dirname, '../backend');
const OUTPUT_DIR = path.resolve(__dirname); // Output files will be in the 'docs' folder

const FRONTEND_OUTPUT_FILE = path.join(OUTPUT_DIR, 'frontend-code.txt');
const BACKEND_OUTPUT_FILE = path.join(OUTPUT_DIR, 'backend-code.txt');

// --- IGNORE PATTERNS ---
// List of files, directories, and extensions to ignore.
// This is the most important part to keep the output clean.
const IGNORE_PATTERNS = [
  // Directories
  'node_modules',
  'venv',
  '.venv',
  '__pycache__',
  '.next',
  '.git',
  '.vscode',
  'dist',
  'build',
  'public', // Often contains static assets, not source code for Next.js

  // Files
  'package-lock.json',
  'yarn.lock',
  '.env',
  '.env.local',
  '.gitignore',
  'next-env.d.ts',

  // File Extensions (add any other non-code file types)
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  "pnpm-lock.yaml",
  "services.zip",
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.map',
  '.db',
  '.sqlite3',
];

/**
 * Recursively reads a directory and aggregates the content of all relevant files.
 * @param {string} dirPath - The absolute path to the directory to process.
 * @param {string} projectRoot - The root path of the project section (frontend/backend).
 * @returns {Promise<string>} A string containing the concatenated content of all files.
 */
async function aggregateCode(dirPath, projectRoot) {
  let aggregatedContent = '';
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Check if the current entry name should be ignored
    if (IGNORE_PATTERNS.includes(entry.name) || IGNORE_PATTERNS.includes(path.extname(entry.name))) {
      continue;
    }

    if (entry.isDirectory()) {
      // If it's a directory, recursively call this function
      aggregatedContent += await aggregateCode(fullPath, projectRoot);
    } else if (entry.isFile()) {
      // If it's a file, read its content and append it
      const relativePath = path.relative(projectRoot, fullPath);
      const fileContent = await fs.readFile(fullPath, 'utf8');

      aggregatedContent += `
========================================
--- FILE: ${relativePath.replace(/\\/g, '/')} ---
========================================

${fileContent}
`;
    }
  }
  return aggregatedContent;
}

/**
 * Main function to run the script.
 */
async function main() {
  try {
    console.log('🚀 Starting code aggregation...');

    // Process Frontend
    console.log('Processing Next.js frontend...');
    const frontendCode = await aggregateCode(FRONTEND_DIR, FRONTEND_DIR);
    await fs.writeFile(FRONTEND_OUTPUT_FILE, frontendCode);
    console.log(`✅ Frontend code successfully written to: ${FRONTEND_OUTPUT_FILE}`);

    // Process Backend
    console.log('Processing FastAPI backend...');
    const backendCode = await aggregateCode(BACKEND_DIR, BACKEND_DIR);
    await fs.writeFile(BACKEND_OUTPUT_FILE, backendCode);
    console.log(`✅ Backend code successfully written to: ${BACKEND_OUTPUT_FILE}`);

    console.log('\n✨ All done!');
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

// Run the main function
main();