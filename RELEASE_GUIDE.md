# Release Guide

This document explains how automatic releases work in this project and how to create new releases.

## Automatic Release System

This project uses GitHub Actions to automatically build and release your application. There are two types of releases:

### 1. Latest Development Build (Automatic)

**Trigger:** Every push to the `main` branch

**What happens:**
- Builds macOS (DMG), Windows (MSI), and Linux (AppImage) packages
- Creates/updates a release tagged as "latest"
- Uploads all build artifacts to the release
- Perfect for providing users with the latest development version

**Workflow file:** `.github/workflows/build.yml`

### 2. Versioned Release (Tagged)

**Trigger:** Pushing a version tag (e.g., `v1.0.1`)

**What happens:**
- Builds all platform packages
- Creates a new versioned release (e.g., "Release v1.0.1")
- Uploads all build artifacts
- Perfect for stable releases with version numbers

**Workflow file:** `.github/workflows/release.yml`

## Creating a New Versioned Release

### Method 1: Using the Automated Script (Recommended)

The project includes a script that automates the entire release process:

```bash
# Check if everything is ready for a release
npm run release:check

# Prepare a new release (e.g., version 1.0.1)
npm run release:prepare 1.0.1
```

**What the script does:**
1. ✅ Validates version format
2. ✅ Checks that git working directory is clean
3. ✅ Updates `package.json` with the new version
4. ✅ Generates release notes from git commits
5. ✅ Commits the version change
6. ✅ Creates a git tag
7. ✅ Provides instructions for pushing

After running the script, push your changes:

```bash
git push origin main
git push origin v1.0.1
```

The GitHub Action will automatically build and create the release!

### Method 2: Manual Process

If you prefer to do it manually:

1. **Update version in package.json**
   ```bash
   # Edit package.json and change the version field
   ```

2. **Commit the version change**
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.0.1"
   ```

3. **Create and push a tag**
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin main
   git push origin v1.0.1
   ```

4. **Wait for GitHub Actions**
   - The workflow will automatically build all platforms
   - A new release will be created with all binaries attached

## Release Notes

When using the automated script, release notes are generated from your git commit messages. To make this work well:

- Use conventional commit messages:
  - `feat:` or `feature:` for new features
  - `fix:` for bug fixes
  - Other commit messages will be listed under "Other Changes"

Example:
```bash
git commit -m "feat: add dark mode support"
git commit -m "fix: resolve save dialog crash"
git commit -m "docs: update README"
```

## Requirements

Before creating a release, ensure:

- ✅ All changes are committed
- ✅ Dependencies are installed (`npm install`)
- ✅ Build icons exist (`npm run icons:all` if needed)
- ✅ You have pushed to GitHub

Use `npm run release:check` to verify all requirements.

## GitHub Token Setup

The build process requires a GitHub token for signing packages. Make sure you have:

1. A GitHub Personal Access Token with appropriate permissions
2. Added it as a secret named `GH_TOKEN` in your repository settings
   - Go to: Repository Settings → Secrets and variables → Actions
   - Create new repository secret: `GH_TOKEN`

## Workflow Configuration

### build.yml
- Triggers on every push to `main`
- Creates/updates "latest" release
- Uses: `marvinpinto/action-automatic-releases@v1.2.1`

### release.yml
- Triggers on version tags (v*.*.*)
- Creates versioned releases
- Uses: `marvinpinto/action-automatic-releases@v1.2.1`

Both workflows build for multiple platforms and architectures:

**macOS:**
- Universal DMG (Intel + Apple Silicon)

**Windows:**
- x64 MSI installer
- ARM64 NSIS installer

**Linux:**
- x64 AppImage
- ARM64 AppImage
- ARMv7l AppImage (Raspberry Pi, etc.)
- x64/ARM64/ARMv7l DEB packages (Debian, Ubuntu)
- x64/ARM64 RPM packages (Fedora, RHEL, openSUSE)

All artifacts are automatically uploaded to the release.

## Troubleshooting

### Build fails with "GH_TOKEN is NOT set"
- Add your GitHub Personal Access Token as a repository secret named `GH_TOKEN`

### Icons missing error
- Run: `npm run icons:all` to generate icons

### Tag already exists
- Delete the tag locally and remotely:
  ```bash
  git tag -d v1.0.1
  git push origin :refs/tags/v1.0.1
  ```

### Release not appearing
- Check the Actions tab in GitHub to see workflow status
- Ensure you pushed both the commit AND the tag

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Check Release Readiness | `npm run release:check` | Verifies everything is ready for a release |
| Prepare Release | `npm run release:prepare <version>` | Automates the entire release process |

## Example Workflow

Here's a complete example of creating version 1.0.1:

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull

# 2. Make your changes and commit them
git add .
git commit -m "feat: add new export feature"

# 3. Check if ready for release
npm run release:check

# 4. Prepare the release
npm run release:prepare 1.0.1

# 5. Push everything
git push origin main
git push origin v1.0.1

# 6. Check GitHub Actions tab to watch the build
# 7. Release will appear under Releases when complete!
```

## Supported Platforms

This project builds for **11 different platform/architecture combinations**:
- 1 macOS (Universal)
- 2 Windows (x64 MSI + ARM64 NSIS)
- 8 Linux (AppImage/DEB/RPM for x64/ARM64/ARMv7l)

For detailed platform information, see [PLATFORMS.md](PLATFORMS.md).

## Questions?

- Review the workflow files in `.github/workflows/`
- Check the scripts in `scripts/` directory
- See GitHub Actions logs for build details
- Read [PLATFORMS.md](PLATFORMS.md) for platform-specific details
