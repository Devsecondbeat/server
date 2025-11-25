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
