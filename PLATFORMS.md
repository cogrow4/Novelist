# Supported Platforms

Novelist is built for multiple operating systems and architectures. Every release includes binaries for all supported platforms.

## Platform Matrix

### macOS
| Architecture | Package Format | Runner | Notes |
|--------------|----------------|--------|-------|
| Universal (x64 + ARM64) | DMG | macos-latest | Works on both Intel and Apple Silicon Macs |

### Windows
| Architecture | Package Format | Runner | Notes |
|--------------|----------------|--------|-------|
| x64 | MSI | windows-latest | Traditional installer for 64-bit Windows |
| ARM64 | NSIS Setup | windows-latest | For Windows on ARM devices (Surface Pro X, etc.) |

### Linux
| Architecture | Package Format | Runner | Notes |
|--------------|----------------|--------|-------|
| x64 | AppImage | ubuntu-latest | Universal Linux binary, runs on most distros |
| ARM64 | AppImage | ubuntu-latest | For 64-bit ARM devices (Raspberry Pi 4, etc.) |
| ARMv7l | AppImage | ubuntu-latest | For 32-bit ARM devices (Raspberry Pi 3, etc.) |
| x64 | DEB | ubuntu-latest | Debian/Ubuntu package |
| ARM64 | DEB | ubuntu-latest | Debian/Ubuntu package for ARM64 |
| ARMv7l | DEB | ubuntu-latest | Debian/Ubuntu package for ARMv7 |
| x64 | RPM | ubuntu-latest | Fedora/RHEL/openSUSE package |
| ARM64 | RPM | ubuntu-latest | Fedora/RHEL/openSUSE package for ARM64 |

## Total Build Outputs

Each release includes **11 different binaries** covering:
- **1** macOS package
- **2** Windows packages
- **8** Linux packages (3 AppImages + 3 DEBs + 2 RPMs)

## Architecture Details

### x64 (x86_64, AMD64)
Standard 64-bit Intel/AMD processors. Most common desktop/laptop architecture.

### ARM64 (aarch64)
64-bit ARM processors:
- **Windows:** Surface Pro X, other Windows ARM devices
- **Linux:** Raspberry Pi 4/5, many modern ARM servers
- **macOS:** Apple Silicon (M1, M2, M3, etc.)

### ARMv7l (armhf)
32-bit ARM processors:
- Raspberry Pi 2/3
- Older ARM single-board computers
- Some embedded devices

### Universal (macOS)
A single binary that contains both x64 and ARM64 code, automatically runs native on Intel or Apple Silicon Macs.

## Package Format Notes

### AppImage
- Self-contained executable for Linux
- No installation required
- Works on most Linux distributions
- Just download, make executable (`chmod +x`), and run

### DEB
- Package manager format for Debian-based distributions
- Ubuntu, Debian, Linux Mint, Pop!_OS, etc.
- Install with: `sudo dpkg -i Novelist-*.deb` or double-click

### RPM
- Package manager format for Red Hat-based distributions
- Fedora, RHEL, CentOS, openSUSE, etc.
- Install with: `sudo rpm -i Novelist-*.rpm` or double-click

### DMG
- macOS disk image
- Double-click to mount, drag app to Applications folder

### MSI
- Windows Installer Package
- Double-click to install with Windows Installer

### NSIS
- Nullsoft Scriptable Install System
- Modern Windows installer with more customization options
- Used for ARM64 builds

## GitHub Actions Runners

All builds use GitHub-hosted runners:
- **macos-latest:** macOS (currently macOS 14 Sonoma)
- **windows-latest:** Windows Server (currently 2022)
- **ubuntu-latest:** Ubuntu Linux (currently 22.04)

## RISC-V Support

**Note:** RISC-V architecture is not currently supported because:
1. Electron (the framework Novelist is built on) does not officially support RISC-V yet
2. GitHub Actions does not provide RISC-V runners
3. Cross-compilation for RISC-V would require significant additional setup

If RISC-V support becomes available in Electron and GitHub Actions in the future, it can be added to the build matrix.

## Adding New Platforms

To add support for additional platforms:

1. **Check Electron support:** Verify that Electron supports the target platform/architecture
2. **Update package.json:** Add the new target to the appropriate section (win/mac/linux)
3. **Add build script:** Create an npm script in `package.json` for the new platform
4. **Update workflows:** Add a new job in `.github/workflows/build.yml` and `.github/workflows/release.yml`
5. **Update release job:** Add artifact download step and update the `files:` section
6. **Test:** Verify the build completes successfully

## Platform Testing

While GitHub Actions builds all platforms automatically, they are cross-compiled and not tested on actual hardware for each architecture. Consider testing on:
- ARM devices (Raspberry Pi, etc.)
- Windows on ARM devices
- Older macOS versions
- Various Linux distributions

## Distribution Recommendations

For maximum compatibility and user convenience:
- **Windows users:** Recommend MSI for x64, NSIS for ARM64
- **macOS users:** DMG works universally
- **Linux users:** 
  - AppImage for maximum compatibility
  - DEB/RPM for users who prefer package managers
  - Provide architecture-appropriate downloads
