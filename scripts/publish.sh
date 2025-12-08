#!/bin/bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it to create GitHub releases."
    exit 1
fi

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

# Compile and package
echo "Building extension package..."
npm run package

VSIX_FILE="generic-copilot.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo "Error: $VSIX_FILE not found after build."
    exit 1
fi

# Publish to VS Code Marketplace
echo "--------------------------------------------------"
echo "Ready to publish version $NEW_VERSION to VS Code Marketplace."
read -p "Continue with publish? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx vsce publish --packagePath "$VSIX_FILE" --allow-all-proposed-apis --skip-duplicate
else
    echo "Skipping Marketplace publication."
fi

# Git operations
echo "--------------------------------------------------"
echo "Committing changes and creating git tag v$NEW_VERSION..."
git add package.json package-lock.json
git commit -m "chore: release version $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo "Pushing changes and tags to GitHub..."
git push origin HEAD --follow-tags

# GitHub Release
echo "--------------------------------------------------"
echo "Creating GitHub release v$NEW_VERSION..."
if gh release create "v$NEW_VERSION" "$VSIX_FILE" --title "v$NEW_VERSION" --generate-notes; then
    echo "GitHub release created successfully."
else
    echo "Error creating GitHub release."
    # Don't exit here, as the critical parts (publish, push) are done
fi

echo "--------------------------------------------------"
echo "Release v$NEW_VERSION completed successfully!"
