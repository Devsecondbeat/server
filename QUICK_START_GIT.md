# Quick Start: Git Workflow Setup

## Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./setup-git-workflow.sh
```

This script will:
- ✅ Ensure you're on main branch
- ✅ Create develop branch (if it doesn't exist)
- ✅ Create CONTRIBUTING.md with workflow documentation
- ✅ Create CODEOWNERS file
- ✅ Guide you through committing the files

## Option 2: Manual Setup

### Step 1: Create Develop Branch

```bash
# Make sure you're on main
git checkout main
git pull origin main

# Create and switch to develop
git checkout -b develop
git push -u origin develop
```

### Step 2: Set Up Branch Protection (GitHub)

1. **Go to:** https://github.com/Devsecondbeat/server/settings/branches

2. **For `main` branch:**
   - Click "Add branch protection rule"
   - Branch name: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Include administrators
   - ✅ Restrict who can push
   - ❌ Don't allow force pushes
   - ❌ Don't allow deletions
   - Click "Create"

3. **For `develop` branch:**
   - Click "Add branch protection rule" again
   - Branch name: `develop`
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass
   - ✅ Include administrators
   - ✅ Restrict who can push
   - Click "Create"

### Step 3: Verify Protection

Try to push directly to main (should fail):

```bash
git checkout main
echo "# test" >> TEST.md
git add TEST.md
git commit -m "test: Direct push"
git push origin main
```

**Expected:** Error message about protected branch ✅

## Current Status

Based on your repository:
- ✅ Remote is configured: `origin` → `https://github.com/Devsecondbeat/server.git`
- ✅ You're on `main` branch
- ✅ Feature branches exist (good!)

## What You Need to Do

1. **Run the setup script** (Option 1) OR **follow manual steps** (Option 2)
2. **Set up branch protection rules on GitHub** (see detailed guide)
3. **Test the workflow** by creating a test PR

## Detailed Instructions

For complete step-by-step instructions, see:
- **`GIT_WORKFLOW_SETUP.md`** - Complete guide with all details

## Quick Reference

### Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Create Pull Request
1. Push your feature branch
2. Go to GitHub → Pull Requests → New PR
3. Base: `develop`, Compare: your branch
4. Add description and create PR

### Commit Message Format
```
feat: Add new feature
fix: Fix bug description
docs: Update documentation
```

---

**Need help?** See `GIT_WORKFLOW_SETUP.md` for detailed instructions.

