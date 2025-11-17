# Setting Up Airbnb ESLint

## Quick Setup Instructions

### Step 1: Install Dependencies

Run the following command to install all required ESLint and Prettier packages:

```bash
npm install --save-dev eslint eslint-config-airbnb-base eslint-plugin-import prettier
```

### Step 2: Verify Configuration

The `.eslintrc.json` file is already configured with Airbnb base style guide. It includes:

- ✅ Airbnb base configuration
- ✅ ES2021 and Node.js environment support
- ✅ ES modules support
- ✅ Custom rules for your project

### Step 3: Test ESLint

Run ESLint to check your code:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors (where possible)
npm run lint:fix
```

### Step 4: Format Code with Prettier

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

## What's Configured

### ESLint Rules

The configuration includes these custom rules:

- `no-console`: Warns instead of errors (useful for development)
- `no-unused-vars`: Allows variables starting with `_` (useful for unused parameters)
- `import/extensions`: Requires file extensions in imports (ES modules)
- `max-len`: 120 characters max line length
- `no-underscore-dangle`: Disabled (allows `_private` variables)
- `consistent-return`: Warns instead of errors

### Prettier Configuration

- Single quotes
- Semicolons enabled
- 100 character line width
- 2 space indentation
- Trailing commas (ES5 compatible)

## Common Issues and Solutions

### Issue: "Cannot find module 'eslint-config-airbnb-base'"

**Solution:** Make sure you've installed all dependencies:
```bash
npm install --save-dev eslint eslint-config-airbnb-base eslint-plugin-import
```

### Issue: Import extension errors

**Solution:** The config is set to require extensions. Make sure your imports include `.js`:
```javascript
// ✅ Correct
import express from 'express';
import routes from './routes/apiroutes.js';

// ❌ Incorrect
import routes from './routes/apiroutes';
```

### Issue: ESLint not finding files

**Solution:** Make sure you're running from the project root and the `src/` directory exists.

## Next Steps

1. Run `npm run lint` to see current issues
2. Run `npm run lint:fix` to auto-fix what can be fixed
3. Manually fix remaining issues
4. Set up pre-commit hooks (see Milestone 1 guide)

## Integration with Pre-commit Hooks

Once you set up Husky and lint-staged (see Milestone 1 guide), ESLint will automatically run before each commit.

---

**Note:** The Airbnb style guide is strict but helps maintain consistent, high-quality code. Some rules may need adjustment based on your team's preferences.

