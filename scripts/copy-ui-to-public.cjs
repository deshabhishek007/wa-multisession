const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'ui', 'dist');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(distDir)) {
  console.error('Missing ui/dist. Run build:ui first (e.g. pnpm run build:ui).');
  process.exit(1);
}

if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true });
}
fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(distDir, publicDir, { recursive: true });

console.log('Copied ui/dist to public/');
