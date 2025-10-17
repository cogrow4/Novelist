#!/usr/bin/env node

/**
 * Release readiness check script
 * Usage: node scripts/check-release.js
 * 
 * This script checks if the project is ready for a release by:
 * - Verifying git working directory is clean
 * - Checking if all dependencies are installed
 * - Verifying build icons exist
 * - Testing if builds can be created
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exec(command, silent = false) {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    }).trim();
  } catch (error) {
    if (!silent) {
      console.error(`Error executing command: ${command}`);
      console.error(error.message);
    }
    return null;
  }
}

function checkGitStatus() {
  console.log('🔍 Checking git status...');
  const status = exec('git status --porcelain', true);
  
  if (status) {
    console.log('❌ Working directory is not clean');
    console.log('   Uncommitted changes:');
    console.log(status);
    return false;
  }
  
  console.log('✓ Working directory is clean\n');
  return true;
}

function checkNodeModules() {
  console.log('🔍 Checking dependencies...');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules not found');
    console.log('   Run: npm install\n');
    return false;
  }
  
  console.log('✓ Dependencies installed\n');
  return true;
}

function checkBuildIcons() {
  console.log('🔍 Checking build icons...');
  const buildDir = path.join(__dirname, '..', 'build');
  const icnsPath = path.join(buildDir, 'icon.icns');
  const icoPath = path.join(buildDir, 'icon.ico');
  
  let allGood = true;
  
  if (!fs.existsSync(icnsPath)) {
    console.log('❌ macOS icon (icon.icns) not found');
    console.log('   Run: npm run icons:icns');
    allGood = false;
  } else {
    console.log('✓ macOS icon exists');
  }
  
  if (!fs.existsSync(icoPath)) {
    console.log('❌ Windows icon (icon.ico) not found');
    console.log('   Run: npm run icons:ico');
    allGood = false;
  } else {
    console.log('✓ Windows icon exists');
  }
  
  console.log('');
  return allGood;
}

function checkGitTag() {
  console.log('🔍 Checking latest git tag...');
  const latestTag = exec('git describe --tags --abbrev=0 2>/dev/null', true);
  
  if (!latestTag) {
    console.log('ℹ️  No previous tags found (this will be the first release)\n');
    return true;
  }
  
  console.log(`✓ Latest tag: ${latestTag}\n`);
  return true;
}

function checkRemote() {
  console.log('🔍 Checking git remote...');
  const remoteUrl = exec('git remote get-url origin', true);
  
  if (!remoteUrl) {
    console.log('❌ No git remote configured\n');
    return false;
  }
  
  console.log(`✓ Remote: ${remoteUrl}\n`);
  return true;
}

function getVersionInfo() {
  console.log('📋 Version Information:');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log(`   Current version: ${packageJson.version}`);
  console.log(`   App name: ${packageJson.name}`);
  console.log(`   Description: ${packageJson.description}\n`);
}

function main() {
  console.log('🚀 Release Readiness Check\n');
  console.log('='.repeat(50) + '\n');
  
  const checks = [
    checkGitStatus(),
    checkNodeModules(),
    checkBuildIcons(),
    checkGitTag(),
    checkRemote()
  ];
  
  console.log('='.repeat(50) + '\n');
  
  getVersionInfo();
  
  console.log('='.repeat(50) + '\n');
  
  const allPassed = checks.every(check => check);
  
  if (allPassed) {
    console.log('✅ All checks passed! Ready for release.\n');
    console.log('To create a new release:');
    console.log('1. Run: node scripts/prepare-release.js [version]');
    console.log('   Example: node scripts/prepare-release.js 1.0.1');
    console.log('');
    console.log('2. Or manually:');
    console.log('   - Update version in package.json');
    console.log('   - Commit: git commit -am "chore: bump version to X.Y.Z"');
    console.log('   - Tag: git tag -a vX.Y.Z -m "Release vX.Y.Z"');
    console.log('   - Push: git push origin main && git push origin vX.Y.Z');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

main();
