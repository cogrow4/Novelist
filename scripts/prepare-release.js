#!/usr/bin/env node

/**
 * Release preparation script
 * Usage: node scripts/prepare-release.js [version]
 * Example: node scripts/prepare-release.js 1.0.1
 * 
 * This script helps prepare a release by:
 * - Updating version in package.json
 * - Generating release notes from git commits
 * - Creating a git tag
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const newVersion = args[0];

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function updatePackageVersion(version) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${version}`);
}

function generateReleaseNotes(fromVersion, toVersion) {
  console.log('\n📝 Generating release notes...\n');
  
  const gitLog = exec(`git log v${fromVersion}..HEAD --pretty=format:"%s" --no-merges`);
  
  if (!gitLog) {
    console.log('No commits found since last version.');
    return '';
  }

  const commits = gitLog.split('\n').filter(line => line.trim());
  
  const features = [];
  const fixes = [];
  const other = [];

  commits.forEach(commit => {
    if (commit.match(/^(feat|feature):/i)) {
      features.push(commit.replace(/^(feat|feature):\s*/i, ''));
    } else if (commit.match(/^fix:/i)) {
      fixes.push(commit.replace(/^fix:\s*/i, ''));
    } else {
      other.push(commit);
    }
  });

  let releaseNotes = `# Release v${toVersion}\n\n`;
  
  if (features.length > 0) {
    releaseNotes += '## ✨ Features\n\n';
    features.forEach(feature => {
      releaseNotes += `- ${feature}\n`;
    });
    releaseNotes += '\n';
  }

  if (fixes.length > 0) {
    releaseNotes += '## 🐛 Bug Fixes\n\n';
    fixes.forEach(fix => {
      releaseNotes += `- ${fix}\n`;
    });
    releaseNotes += '\n';
  }

  if (other.length > 0) {
    releaseNotes += '## 🔧 Other Changes\n\n';
    other.forEach(change => {
      releaseNotes += `- ${change}\n`;
    });
    releaseNotes += '\n';
  }

  return releaseNotes;
}

function createTag(version, notes) {
  console.log(`\n🏷️  Creating git tag v${version}...`);
  
  // Create annotated tag
  const tagMessage = `Release v${version}\n\n${notes}`;
  exec(`git tag -a v${version} -m "${tagMessage.replace(/"/g, '\\"')}"`);
  
  console.log(`✓ Created tag v${version}`);
  console.log('\nTo push the tag to GitHub, run:');
  console.log(`  git push origin v${version}`);
}

function main() {
  console.log('🚀 Release Preparation Script\n');

  if (!newVersion) {
    console.error('❌ Error: Version number required');
    console.log('\nUsage: node scripts/prepare-release.js [version]');
    console.log('Example: node scripts/prepare-release.js 1.0.1');
    process.exit(1);
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('❌ Error: Version must be in format X.Y.Z (e.g., 1.0.0)');
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion}\n`);

  // Check if git working directory is clean
  const gitStatus = exec('git status --porcelain');
  if (gitStatus) {
    console.error('❌ Error: Git working directory is not clean');
    console.error('Please commit or stash your changes first.');
    process.exit(1);
  }

  // Update version
  updatePackageVersion(newVersion);

  // Generate release notes
  const releaseNotes = generateReleaseNotes(currentVersion, newVersion);
  console.log('\n' + releaseNotes);

  // Save release notes to file
  const releaseNotesPath = path.join(__dirname, '..', `RELEASE_NOTES_v${newVersion}.md`);
  fs.writeFileSync(releaseNotesPath, releaseNotes);
  console.log(`✓ Release notes saved to ${releaseNotesPath}`);

  // Commit version change
  exec('git add package.json');
  exec(`git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`✓ Committed version change`);

  // Create tag
  createTag(newVersion, releaseNotes);

  console.log('\n✅ Release preparation complete!\n');
  console.log('Next steps:');
  console.log('1. Review the changes');
  console.log('2. Push to GitHub:');
  console.log('   git push origin main');
  console.log(`   git push origin v${newVersion}`);
  console.log('\n3. The GitHub Action will automatically create a release with binaries');
}

main();
