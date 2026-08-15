import fs from 'node:fs';
import path from 'node:path';

// Directories and files to ignore
const IGNORED = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vite',
  '.cloudflare',
  '.DS_Store',
];

function printTree(dirPath, prefix = '') {
  const items = fs.readdirSync(dirPath)
    .filter(item => !IGNORED.includes(item))
    .sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
      // Directories first, then files
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const fullPath = path.join(dirPath, item);
    const isDirectory = fs.statSync(fullPath).isDirectory();

    const connector = isLast ? '└── ' : '├── ';
    console.log(`${prefix}${connector}${item}${isDirectory ? '/' : ''}`);

    if (isDirectory) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      printTree(fullPath, childPrefix);
    }
  });
}

console.log(`\n📁 ${path.basename(process.cwd())}/`);
printTree(process.cwd());
console.log('');