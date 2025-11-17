#!/bin/bash

# Git Workflow Setup Script
# This script helps set up the Git workflow for Second Beat

set -e

echo "🚀 Setting up Git Workflow..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Ensure we're on main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch. Switching to main..."
    git checkout main
fi

# Pull latest changes
echo "📥 Pulling latest changes from main..."
git pull origin main

# Check if develop branch exists
if git show-ref --verify --quiet refs/heads/develop; then
    echo "✅ Develop branch already exists"
    git checkout develop
    git pull origin develop
else
    echo "🌿 Creating develop branch..."
    git checkout -b develop
    git push -u origin develop
    echo "✅ Develop branch created and pushed"
fi

# Create CONTRIBUTING.md if it doesn't exist
if [ ! -f "CONTRIBUTING.md" ]; then
    echo "📝 Creating CONTRIBUTING.md..."
    cat > CONTRIBUTING.md << 'EOF'
# Contributing Guide

## Branch Strategy

We use **GitHub Flow** with the following branches:

- **`main`**: Production-ready code. Always deployable.
- **`develop`**: Integration branch for features. Latest development code.
- **`feature/*`**: New features being developed.
- **`bugfix/*`**: Bug fixes.
- **`hotfix/*`**: Critical production fixes.

## Workflow

### For New Features

1. **Start from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

4. **Push to remote:**
   ```bash
   git push -u origin feature/your-feature-name
   ```

5. **Create Pull Request on GitHub:**
   - Base: `develop`
   - Compare: your feature branch
   - Add description and request review

6. **After review and approval:**
   - Merge PR to `develop`
   - Deploy `develop` to staging for testing

7. **When ready for production:**
   - Create PR from `develop` to `main`
   - After merge, deploy `main` to production

## Commit Message Convention

Use conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: Add user authentication
fix: Resolve login timeout issue
docs: Update API documentation
```
EOF
    echo "✅ CONTRIBUTING.md created"
    
    # Ask if user wants to commit it
    read -p "Commit CONTRIBUTING.md to develop? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add CONTRIBUTING.md
        git commit -m "docs: Add contributing guide with Git workflow"
        git push origin develop
        echo "✅ CONTRIBUTING.md committed and pushed"
    fi
else
    echo "✅ CONTRIBUTING.md already exists"
fi

# Create .github directory if it doesn't exist
if [ ! -d ".github" ]; then
    echo "📁 Creating .github directory..."
    mkdir -p .github
fi

# Create CODEOWNERS if it doesn't exist
if [ ! -f ".github/CODEOWNERS" ]; then
    echo "👥 Creating CODEOWNERS file..."
    cat > .github/CODEOWNERS << 'EOF'
# Default owners for everything in the repo
* @Devsecondbeat

# Configuration files
/src/config/ @Devsecondbeat

# Database related
/src/models/ @Devsecondbeat

# Documentation
/docs/ @Devsecondbeat
*.md @Devsecondbeat
EOF
    echo "✅ CODEOWNERS file created"
    
    # Ask if user wants to commit it
    read -p "Commit CODEOWNERS to develop? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .github/CODEOWNERS
        git commit -m "docs: Add CODEOWNERS file"
        git push origin develop
        echo "✅ CODEOWNERS committed and pushed"
    fi
else
    echo "✅ CODEOWNERS already exists"
fi

echo ""
echo "✅ Git workflow setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to GitHub: https://github.com/Devsecondbeat/server/settings/branches"
echo "2. Set up branch protection rules for 'main' and 'develop'"
echo "3. See GIT_WORKFLOW_SETUP.md for detailed instructions"
echo ""
echo "Current branches:"
git branch -a

