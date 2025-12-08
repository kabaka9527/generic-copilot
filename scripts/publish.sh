#!/bin/bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Check for git
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed."
    exit 1
fi

# Read current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Prompt for new version
read -p "Enter new version (e.g., 0.0.1): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo "Error: Version cannot be empty"
    exit 1
fi

echo "Preparing release v$NEW_VERSION..."

# Update version in package.json and package-lock.json without creating a git tag yet
npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version

# Compile and package (Local build for verification)
echo "Building extension package locally..."
npm run package

VSIX_FILE="generic-copilot.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo "Error: $VSIX_FILE not found after build."
    exit 1
fi

echo "Local VSIX built successfully: $VSIX_FILE"

# Git operations
echo "--------------------------------------------------"
echo "Committing changes and creating git tag v$NEW_VERSION..."
git add package.json package-lock.json
git commit -m "chore: release version $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo "Pushing changes and tags to GitHub..."
git push origin HEAD --follow-tags

echo "--------------------------------------------------"
echo "Release v$NEW_VERSION tag pushed!"
echo "GitHub Actions will now:"
echo "1. Build the release again in CI"
echo "2. Publish to VS Code Marketplace"
echo "3. Create a GitHub Release"
