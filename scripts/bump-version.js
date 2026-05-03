#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const versionType = process.argv[2];

if (!['major', 'minor', 'patch'].includes(versionType)) {
  console.error('Usage: node bump-version.js [major|minor|patch]');
  process.exit(1);
}

// Read current version from manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
const packagePath = path.join(rootDir, 'package.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const currentVersion = manifest.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newMajor = major;
let newMinor = minor;
let newPatch = patch;

switch (versionType) {
  case 'major':
    newMajor++;
    newMinor = 0;
    newPatch = 0;
    break;
  case 'minor':
    newMinor++;
    newPatch = 0;
    break;
  case 'patch':
    newPatch++;
    break;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

// Update manifest.json
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
console.log('\nNext steps:');
console.log(`1. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`);
console.log(`2. Tag: git tag v${newVersion}`);
console.log(`3. Push: git push && git push --tags`);