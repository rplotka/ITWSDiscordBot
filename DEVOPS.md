# DevOps & Quality Assurance Guide

This document outlines the DevOps tools and practices implemented to ensure code quality, security, and safe deployments.

## 🛠️ Tools & Technologies

### Code Quality

- **ESLint** - JavaScript linting with Airbnb base config
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit/pre-push checks
- **lint-staged** - Run linters on staged files only

### Security

- **npm audit** - Dependency vulnerability scanning
- **Dependabot** - Automated dependency updates
- **Trivy** - Docker image security scanning (in CI)
- **GitHub Secret Scanning** - Automatic secret detection

### CI/CD

- **GitHub Actions** - Continuous Integration and Deployment
- **Google Cloud Build** - Container builds with quality gates
- **Cloud Run** - Serverless deployment platform

## 📋 Pre-Commit Hooks

Pre-commit hooks automatically run before each commit to ensure code quality:

1. **lint-staged** - Runs ESLint and Prettier on staged files
2. **npm audit** - Checks for known vulnerabilities (non-blocking)

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## 🚀 GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every PR and push to master/main:

1. **Code Quality Checks**

   - ESLint validation
   - Prettier formatting check
   - Test execution
   - Security audit

2. **Security Scanning**

   - npm audit for dependencies
   - Outdated package detection
   - Vulnerability reporting

3. **Docker Security**
   - Docker image build
   - Trivy vulnerability scanning
   - SARIF report upload to GitHub Security

### Deploy Workflow (`.github/workflows/deploy.yml`)

Runs on pushes to master or version tags:

1. Quality checks (lint, format)
2. Google Cloud authentication
3. Docker image build and push
4. Cloud Run deployment
5. Deployment verification

**Required Secrets:**

- `GCP_PROJECT_ID` - Google Cloud project ID
- `GCP_SA_KEY` - Google Cloud service account JSON key
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application ID
- `DISCORD_SERVER_ID` - Discord server ID
- `DATABASE_URL` - PostgreSQL connection string
- `DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID` - Role ID
- `DISCORD_ACCEPTED_STUDENTS_ROLE_ID` - Role ID

## 🔄 Dependabot

Automated dependency updates configured in `.github/dependabot.yml`:

- **Weekly updates** for npm packages (Mondays at 9 AM)
- **Weekly updates** for GitHub Actions
- Groups minor/patch updates together
- Opens PRs with labels and reviewers

## 📦 NPM Scripts

### Quality Checks

```bash
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues automatically
npm run format            # Format code with Prettier
npm run format:check      # Check formatting without fixing
npm run quality:check     # Run all quality checks (lint + format + test)
```

### Security

```bash
npm run security:audit    # Run npm audit (moderate+ severity)
npm run security:check    # Audit + check for outdated packages
```

### Testing

```bash
npm test                  # Run tests with Ava
```

## 🔒 Security Best Practices

### 1. Dependency Management

- Regular security audits via `npm audit`
- Automated updates via Dependabot
- Review all dependency updates before merging

### 2. Secrets Management

- **Never commit secrets** to the repository
- Use GitHub Secrets for CI/CD
- Use Google Secret Manager for production
- `.env` files are gitignored

### 3. Docker Security

- Base images are scanned in CI
- Minimal base images (Node.js official)
- No secrets in Docker images
- Regular base image updates

### 4. Code Security

- ESLint catches common security issues
- Pre-commit hooks prevent bad code from being committed
- Code reviews required for all changes

## 🏗️ Cloud Build Quality Gates

The `cloudbuild.yaml` includes quality checks before deployment:

1. Install dependencies (`npm ci`)
2. Run ESLint
3. Check Prettier formatting
4. Run security audit (non-blocking)
5. Build Docker image
6. Deploy to Cloud Run

## 📊 Monitoring & Alerts

### GitHub Security Tab

- View security advisories
- Dependency vulnerabilities
- Secret scanning results
- Code scanning alerts

### Cloud Run Logs

```bash
gcloud run services logs read itws-discord-bot --region us-central1
```

## 🐛 Troubleshooting

### Pre-commit hook not running

```bash
npm install  # Installs husky
npm run prepare  # Sets up git hooks
```

### CI failing on formatting

```bash
npm run format  # Fix formatting locally
git add .
git commit --amend --no-edit
```

### Security audit failing

```bash
npm audit fix  # Attempt automatic fixes
npm audit --audit-level=high  # Check severity
```

### Docker build failing in CI

- Check Dockerfile syntax
- Verify base image exists
- Check Cloud Build logs in GCP console

## 📝 Adding New Quality Checks

1. **Add ESLint rules**: Edit `.eslintrc.js`
2. **Add Prettier config**: Edit `prettier.config.js`
3. **Add new npm script**: Add to `package.json` scripts
4. **Add to CI**: Update `.github/workflows/ci.yml`
5. **Add to pre-commit**: Update `.husky/pre-commit`

## ✅ Quality Checklist

Before pushing code:

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes (if tests exist)
- [ ] `npm run security:audit` shows no critical issues
- [ ] No secrets in code
- [ ] Code is reviewed (if working in team)

## 🔗 Resources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
