# Chrome Web Store CI/CD Setup Guide

This guide covers everything you need to set up automated publishing to the Chrome Web Store using GitHub Actions.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Detailed Setup](#detailed-setup)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Testing & Deployment](#testing--deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

✅ **Required:**
- Chrome Web Store developer account ($5 one-time fee)
- GitHub repository with admin access
- Extension uploaded manually once (to get Extension ID)

## Quick Setup

### 1️⃣ Get Extension ID
Upload your extension manually first:
```bash
pnpm run build:zip
# Upload pronunciation-helper.zip to Chrome Web Store
# Copy the Extension ID from dashboard
```

### 2️⃣ Create Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: `chrome-extension-publisher`
3. Enable [Chrome Web Store API](https://console.cloud.google.com/apis/library)
4. Create OAuth2 credentials:
   - Type: **Desktop app** (NOT Chrome Extension!)
   - Name: `GitHub Actions Publisher`
   - Download JSON with CLIENT_ID and CLIENT_SECRET

### 3️⃣ Get Refresh Token

```bash
# Set your credentials
export CLIENT_ID="your-client-id.apps.googleusercontent.com"
export CLIENT_SECRET="GOCSPX-your-secret"

# Run helper script
node scripts/get-refresh-token.js

# Follow the prompts to authorize and get REFRESH_TOKEN
```

### 4️⃣ Add GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → Secrets**

| Secret Name | Value |
|------------|--------|
| `EXTENSION_ID` | From Chrome Web Store dashboard |
| `CLIENT_ID` | From Google Cloud OAuth2 |
| `CLIENT_SECRET` | From Google Cloud OAuth2 |
| `REFRESH_TOKEN` | From the script above |

### 5️⃣ Configure Repository Permissions

Go to: **Settings → Actions → General → Workflow permissions**
- Select: **Read and write permissions**

## Detailed Setup

### Step 1: Initial Extension Upload

You must upload your extension manually at least once:

1. Build the extension:
   ```bash
   pnpm run build:zip
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

3. Click **"New Item"** and upload `pronunciation-helper.zip`

4. Fill out the listing:
   - **Title**: English Pronunciation Helper
   - **Category**: Education or Accessibility
   - **Screenshots**: Use files in `screenshots/` directory
   - **Privacy Policy**: Link to `PRIVACY.md` in your repo

5. After upload, save the **Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz`)

### Step 2: Google Cloud OAuth2 Setup

#### Create Project and Enable API

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Chrome Web Store API:
   ```
   APIs & Services → Library → Search "Chrome Web Store API" → Enable
   ```

#### Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `Chrome Extension Publisher`
   - User support email: Your email
   - Developer contact: Your email
4. Add your email as a test user
5. Keep status as **Testing** (no need to publish)

#### Create OAuth2 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **Desktop app** ⚠️ (NOT Chrome Extension!)
4. Name: `GitHub Actions Publisher`
5. Download JSON or copy CLIENT_ID and CLIENT_SECRET

### Step 3: Generate Refresh Token

Use the provided script:

```bash
cd /Users/julius/dev/pronunciation-helper

# Set environment variables
export CLIENT_ID="123456789-xxx.apps.googleusercontent.com"
export CLIENT_SECRET="GOCSPX-xxxxxxxxxxxx"

# Run the script
node scripts/get-refresh-token.js
```

Process:
1. Open the URL shown in your browser
2. Sign in with your Google account (same as Chrome Web Store account)
3. Authorize the application
4. Copy the authorization code
5. Paste it back in terminal
6. Save the REFRESH_TOKEN

### Step 4: Configure GitHub Repository

#### Add Secrets
Navigate to: `https://github.com/[your-username]/[repo-name]/settings/secrets/actions`

Add these repository secrets (NOT environment variables!):
- `EXTENSION_ID` - Your extension's ID
- `CLIENT_ID` - OAuth2 Client ID
- `CLIENT_SECRET` - OAuth2 Client Secret
- `REFRESH_TOKEN` - Token from script

#### Set Workflow Permissions
Navigate to: `Settings → Actions → General`

Under "Workflow permissions":
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests (optional)

## GitHub Actions Workflows

### Available Workflows

| Workflow | File | Purpose | Trigger |
|----------|------|---------|---------|
| **Release Extension** | `.github/workflows/release.yml` | All-in-one: bump version, build, publish | Manual |
| **Publish to Chrome Web Store** | `.github/workflows/publish.yml` | Build and publish only | Git tags (v*) |
| **Bump Version** | `.github/workflows/bump-version.yml` | Update version in manifest.json and package.json | Manual |

### Workflow Features

- **Uses official GitHub Actions:**
  - `mnao305/chrome-extension-upload@v6.0.0` - Most popular Chrome Web Store upload action
  - `actions/checkout@v4` - Check out code
  - `actions/setup-node@v4` - Set up Node.js
  - `pnpm/action-setup@v3` - Set up pnpm

- **Automatic features:**
  - Type checking before publish
  - ZIP file creation
  - GitHub release creation
  - Version synchronization (manifest.json & package.json)

## Testing & Deployment

### Local Testing

Test the build locally before deploying:

```bash
# Type check
pnpm run type-check

# Build extension
pnpm run build

# Create ZIP
pnpm run build:zip

# Test in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked from 'dist' directory
```

### Deployment Options

#### Option 1: Quick Release (Recommended)
Use the all-in-one Release workflow:

1. Go to **Actions** tab
2. Select **"Release Extension"**
3. Click **"Run workflow"**
4. Choose:
   - Version: `patch` / `minor` / `major`
   - Publish: `true` (or `false` for dry run)

#### Option 2: Version Bump + Auto Publish
1. Run **"Bump Version"** workflow
2. This creates a tag
3. Tag automatically triggers **"Publish"** workflow

#### Option 3: Manual Tag
```bash
# Create tag locally
git tag v1.0.2
git push origin v1.0.2

# This triggers publish workflow automatically
```

### Version Management

Update versions locally:
```bash
# Patch version (1.0.0 → 1.0.1)
pnpm run version:patch

# Minor version (1.0.0 → 1.1.0)
pnpm run version:minor

# Major version (1.0.0 → 2.0.0)
pnpm run version:major

# Then commit and tag
git add .
git commit -m "chore: bump version"
git tag v1.0.1
git push && git push --tags
```

## Troubleshooting

### Common Issues and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| **403: access_denied** | Not added as test user | Add your email to OAuth consent screen test users |
| **401: Unauthorized** | Wrong credentials | Check CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN |
| **403: Forbidden (GitHub)** | No write permissions | Enable write permissions in Actions settings |
| **Invalid grant** | Expired refresh token | Regenerate refresh token using the script |
| **Extension ID not found** | Wrong ID or not uploaded | Verify Extension ID from Chrome Web Store |
| **Build failures** | Missing dependencies | Ensure pnpm-lock.yaml is committed |
| **Push denied** | Wrong branch name | Check if repo uses `master` or `main` |

### Verify Setup

Check your configuration:

```bash
# Check if secrets are set (you won't see values)
gh secret list

# Test build locally
pnpm run build:zip

# Check workflow syntax
act --list  # requires act tool
```

### Security Best Practices

- ⚠️ **Never commit secrets** to repository
- ✅ Use GitHub Secrets (not environment variables)
- ✅ Keep OAuth app in "Testing" mode
- ✅ Rotate tokens if compromised
- ✅ Use minimal required permissions

## Quick Commands Reference

```bash
# Local development
pnpm install              # Install dependencies
pnpm run dev             # Watch mode
pnpm run build           # Build extension
pnpm run build:zip       # Create distribution ZIP
pnpm run type-check      # Check TypeScript

# Version management
pnpm run version:patch   # Bump patch version
pnpm run version:minor   # Bump minor version
pnpm run version:major   # Bump major version

# Manual deployment
git tag v1.0.1          # Create version tag
git push origin v1.0.1  # Push tag (triggers workflow)

# Check GitHub Actions
gh run list             # List recent workflow runs
gh run view            # View workflow details
```

## Links & Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Chrome Web Store API Documentation](https://developer.chrome.com/docs/webstore/using_webstore_api/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [mnao305/chrome-extension-upload](https://github.com/mnao305/chrome-extension-upload)

---

**Need help?** Check the workflow logs in the Actions tab for detailed error messages.