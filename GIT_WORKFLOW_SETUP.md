# Git Workflow & Branch Protection Setup Guide

## Overview
This guide will help you set up a professional Git workflow with branch protection rules. We'll use the **GitHub Flow** strategy, which is simple and effective for most projects.

**Estimated Time:** 30-45 minutes

---

## Part 1: Git Workflow Setup

### Step 1: Verify Current Git Status

1. **Check current branch:**
   ```bash
   git branch
   ```

2. **Check if you have a remote repository:**
   ```bash
   git remote -v
   ```

3. **Check current status:**
   ```bash
   git status
   ```

### Step 2: Ensure You're on Main Branch

1. **If you're not on main/master, switch to it:**
   ```bash
   # Check what your default branch is called
   git branch -a
   
   # If it's called 'master', rename it to 'main' (optional but recommended)
   git branch -m master main
   git push -u origin main
   ```

2. **If you're already on main, make sure it's up to date:**
   ```bash
   git checkout main
   git pull origin main
   ```

### Step 3: Create Development Branch

1. **Create and switch to develop branch:**
   ```bash
   git checkout -b develop
   ```

2. **Push develop branch to remote:**
   ```bash
   git push -u origin develop
   ```

3. **Verify branches:**
   ```bash
   git branch -a
   ```
   You should see:
   - `main` (or `master`)
   - `develop`
   - Both should have `origin/main` and `origin/develop` remotes

### Step 4: Create Branch Naming Convention

**Standard branch naming:**
- **Features:** `feature/description` (e.g., `feature/user-profile`)
- **Bug fixes:** `bugfix/description` (e.g., `bugfix/login-error`)
- **Hotfixes:** `hotfix/description` (e.g., `hotfix/security-patch`)
- **Documentation:** `docs/description` (e.g., `docs/api-documentation`)

**Example - Create a feature branch:**
```bash
# From develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/eslint-setup

# Make changes, commit
git add .
git commit -m "Add ESLint and Prettier configuration"

# Push feature branch
git push -u origin feature/eslint-setup
```

### Step 5: Document Workflow

1. **Create `CONTRIBUTING.md` in project root:**
   ```bash
   touch CONTRIBUTING.md
   ```

2. **Add workflow documentation:**
   ```markdown
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

   5. **Create Pull Request:**
      - Go to GitHub repository
      - Click "New Pull Request"
      - Select `develop` as base branch
      - Select your feature branch
      - Add description and reviewers
      - Submit PR

   6. **After review and approval:**
      - Merge PR to `develop`
      - Delete feature branch (optional)
      - Deploy `develop` to staging for testing

   7. **When ready for production:**
      - Create PR from `develop` to `main`
      - After merge, deploy `main` to production

   ### For Bug Fixes

   Same as features, but use `bugfix/` prefix:
   ```bash
   git checkout -b bugfix/fix-login-error
   ```

   ### For Hotfixes (Critical Production Issues)

   1. **Create from main:**
      ```bash
      git checkout main
      git pull origin main
      git checkout -b hotfix/critical-fix
      ```

   2. **Fix and commit:**
      ```bash
      git add .
      git commit -m "hotfix: Fix critical production issue"
      git push -u origin hotfix/critical-fix
      ```

   3. **Create PRs:**
      - PR to `main` (for immediate production fix)
      - PR to `develop` (to keep develop in sync)

   4. **Merge both PRs**

   ## Commit Message Convention

   Use conventional commits format:

   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

   Examples:
   ```
   feat: Add user authentication
   fix: Resolve login timeout issue
   docs: Update API documentation
   style: Format code with Prettier
   ```

   ## Pull Request Guidelines

   - Write clear, descriptive PR titles
   - Include detailed description of changes
   - Reference related issues (e.g., "Fixes #123")
   - Ensure all tests pass
   - Ensure code is linted and formatted
   - Request review from at least one team member

   ## Code Review Checklist

   - [ ] Code follows project style guide
   - [ ] No console.log statements (use proper logging)
   - [ ] Error handling is appropriate
   - [ ] Security considerations addressed
   - [ ] Tests added/updated if needed
   - [ ] Documentation updated if needed
   ```

3. **Commit the contributing guide:**
   ```bash
   git add CONTRIBUTING.md
   git commit -m "docs: Add contributing guide with Git workflow"
   git push origin develop
   ```

---

## Part 2: Branch Protection Rules (GitHub)

### Step 1: Access Repository Settings

1. **Go to your GitHub repository**
2. **Click on "Settings"** (top right of repository page)
3. **Click on "Branches"** in the left sidebar

### Step 2: Protect Main Branch

1. **Click "Add branch protection rule"** or **"Add rule"**

2. **Branch name pattern:** Enter `main` (or `master` if that's your default)

3. **Configure protection settings:**

   ✅ **Require a pull request before merging**
   - ✅ Require approvals: **1** (or more based on team size)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (if you have CODEOWNERS file)

   ✅ **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Add status checks (if you have CI/CD):
     - `lint` (after setting up CI)
     - `test` (after setting up CI)

   ✅ **Require conversation resolution before merging**
   - Ensures all PR comments are addressed

   ✅ **Require signed commits** (optional but recommended)
   - Ensures commits are signed

   ✅ **Require linear history** (optional)
   - Prevents merge commits, requires rebase

   ✅ **Include administrators**
   - Even admins must follow these rules

   ✅ **Restrict who can push to matching branches**
   - No one can push directly (must use PR)

   ✅ **Allow force pushes** - ❌ **UNCHECKED**
   - Prevents force pushes

   ✅ **Allow deletions** - ❌ **UNCHECKED**
   - Prevents branch deletion

4. **Click "Create" or "Save changes"**

### Step 3: Protect Develop Branch

1. **Click "Add branch protection rule"** again

2. **Branch name pattern:** Enter `develop`

3. **Configure protection settings:**

   ✅ **Require a pull request before merging**
   - ✅ Require approvals: **1**
   - ✅ Dismiss stale pull request approvals when new commits are pushed

   ✅ **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging
   - Add status checks (if available):
     - `lint`
     - `test`

   ✅ **Require conversation resolution before merging**

   ✅ **Include administrators**

   ✅ **Restrict who can push to matching branches**

   ✅ **Allow force pushes** - ❌ **UNCHECKED**

   ✅ **Allow deletions** - ❌ **UNCHECKED**

4. **Click "Create" or "Save changes"**

### Step 4: Verify Protection Rules

1. **Go back to repository main page**
2. **Try to push directly to main:**
   ```bash
   git checkout main
   # Make a small change
   echo "# test" >> README.md
   git add README.md
   git commit -m "test: Direct push test"
   git push origin main
   ```
   
   **Expected result:** You should get an error like:
   ```
   ! [remote rejected] main -> main (protected branch hook declined)
   ```

3. **This confirms protection is working!**

---

## Part 3: Create CODEOWNERS File (Optional but Recommended)

### Step 1: Create CODEOWNERS File

1. **Create `.github/CODEOWNERS` file:**
   ```bash
   mkdir -p .github
   touch .github/CODEOWNERS
   ```

2. **Add code owners:**
   ```markdown
   # Default owners for everything in the repo
   * @your-github-username

   # Specific file/directory owners
   /src/config/ @your-github-username
   /src/database/ @your-github-username
   /docs/ @your-github-username
   ```

3. **Commit and push:**
   ```bash
   git add .github/CODEOWNERS
   git commit -m "docs: Add CODEOWNERS file"
   git push origin develop
   ```

---

## Part 4: Test the Workflow

### Test 1: Create Feature Branch and PR

1. **Create a test feature branch:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/test-workflow
   ```

2. **Make a small change:**
   ```bash
   echo "# Test Workflow" >> TEST.md
   git add TEST.md
   git commit -m "feat: Test workflow setup"
   git push -u origin feature/test-workflow
   ```

3. **Create Pull Request on GitHub:**
   - Go to GitHub repository
   - Click "Pull requests" → "New pull request"
   - Base: `develop`, Compare: `feature/test-workflow`
   - Add description
   - Create pull request

4. **Verify PR requirements:**
   - Should show that approvals are required
   - Should show that status checks must pass

5. **Merge the PR** (after review)

6. **Delete the feature branch** (optional, can be done on GitHub)

### Test 2: Verify Direct Push is Blocked

1. **Try to push directly to main:**
   ```bash
   git checkout main
   git pull origin main
   echo "# Direct push test" >> DIRECT_PUSH_TEST.md
   git add DIRECT_PUSH_TEST.md
   git commit -m "test: Direct push"
   git push origin main
   ```

2. **Should fail with protection error**

---

## Part 5: Summary Checklist

After completing all steps, verify:

- [ ] `main` branch exists and is protected
- [ ] `develop` branch exists and is protected
- [ ] `CONTRIBUTING.md` file created with workflow documentation
- [ ] Branch protection rules configured for `main`
- [ ] Branch protection rules configured for `develop`
- [ ] Direct push to `main` is blocked (tested)
- [ ] Direct push to `develop` is blocked (tested)
- [ ] Pull requests are required for merging
- [ ] CODEOWNERS file created (optional)

---

## Troubleshooting

### Issue: "Branch protection rule not working"

**Solution:**
- Ensure you're the repository owner or have admin access
- Check that the branch name pattern matches exactly (case-sensitive)
- Verify you're trying to push to the correct branch

### Issue: "Can't create PR"

**Solution:**
- Ensure feature branch is pushed to remote
- Check that base branch (develop/main) exists
- Verify you have write access to repository

### Issue: "Can't merge PR"

**Solution:**
- Check that all required approvals are given
- Verify status checks are passing
- Ensure all conversations are resolved
- Check that branch is up to date

---

## Next Steps

After completing Git workflow setup:

1. ✅ Share `CONTRIBUTING.md` with your team
2. ✅ Set up CI/CD to add status checks (Milestone 4)
3. ✅ Continue with Milestone 1 tasks:
   - Pre-commit hooks
   - Environment management
   - Database migrations

---

**Document Version:** 1.0  
**Last Updated:** 2024

