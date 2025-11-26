# Quick Start - Deploy to Google Cloud Run

## Prerequisites Checklist

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed (`brew install google-cloud-sdk` on Mac)
- [ ] Discord bot application created at https://discord.com/developers/applications
- [ ] PostgreSQL database (Cloud SQL or external)

## Quick Deployment (5 Steps)

### 1. Set Up Google Cloud

```bash
# Login
gcloud auth login

# Create/select project
gcloud projects create itws-discord-bot
gcloud config set project itws-discord-bot

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 2. Get Discord Credentials

From Discord Developer Portal (https://discord.com/developers/applications):

- **Bot Token**: Bot → Token → Copy
- **Client ID**: General Information → Application ID
- **Server ID**: Enable Developer Mode → Right-click server → Copy ID

### 3. Set Up Database

**Option A: Cloud SQL (Recommended)**
```bash
gcloud sql instances create itws-discord-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create itws_bot --instance=itws-discord-db
gcloud sql users create botuser --instance=itws-discord-db --password=YOUR_PASSWORD
```

**Option B: Use existing database**
- Use your existing PostgreSQL connection string

### 4. Deploy to Cloud Run

**Quick method (using script):**
```bash
./deploy.sh YOUR_PROJECT_ID us-central1
```

**Manual method:**
```bash
# Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/itws-discord-bot

# Deploy (replace YOUR_* values)
gcloud run deploy itws-discord-bot \
  --image gcr.io/YOUR_PROJECT_ID/itws-discord-bot \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 1 \
  --min-instances 1 \
  --set-env-vars="DISCORD_BOT_TOKEN=YOUR_TOKEN,DISCORD_CLIENT_ID=YOUR_CLIENT_ID,DISCORD_SERVER_ID=YOUR_SERVER_ID,DATABASE_URL=YOUR_DATABASE_URL,DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID=YOUR_ROLE_ID,DISCORD_ACCEPTED_STUDENTS_ROLE_ID=YOUR_ROLE_ID"
```

### 5. Connect Discord

**A. Deploy Slash Commands:**
```bash
export DISCORD_BOT_TOKEN="YOUR_TOKEN"
export DISCORD_CLIENT_ID="YOUR_CLIENT_ID"
export DISCORD_SERVER_ID="YOUR_SERVER_ID"
npm run deploy-commands
```

**B. Invite Bot to Server:**
1. Go to Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Administrator` (or specific permissions)
4. Copy URL and open in browser
5. Select your server and authorize

## Verify It Works

1. **Check logs:**
   ```bash
   gcloud run services logs read itws-discord-bot --region us-central1 --limit 20
   ```

2. **Check Discord:**
   - Bot should appear online in your server
   - Try `/test` command

## Environment Variables Needed

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `DISCORD_BOT_TOKEN` | Bot authentication token | Discord Dev Portal → Bot → Token |
| `DISCORD_CLIENT_ID` | Application ID | Discord Dev Portal → General → Application ID |
| `DISCORD_SERVER_ID` | Your Discord server ID | Right-click server → Copy ID |
| `DATABASE_URL` | PostgreSQL connection string | Your database provider |
| `DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID` | Role ID for prospective students | Right-click role → Copy ID |
| `DISCORD_ACCEPTED_STUDENTS_ROLE_ID` | Role ID for accepted students | Right-click role → Copy ID |

## Troubleshooting

**Bot not responding?**
- Check Cloud Run logs for errors
- Verify environment variables are set
- Ensure bot is invited with correct permissions
- Run `npm run deploy-commands` again

**Can't connect to database?**
- Verify `DATABASE_URL` is correct
- If using Cloud SQL, ensure Cloud Run has access:
  ```bash
  gcloud run services update itws-discord-bot \
    --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
    --region=us-central1
  ```

## Updating the Bot

```bash
# Make your changes, then:
git add .
git commit -m "Update bot"
git push

# Rebuild and redeploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/itws-discord-bot
gcloud run deploy itws-discord-bot \
  --image gcr.io/YOUR_PROJECT_ID/itws-discord-bot \
  --region us-central1
```

## Full Documentation

See `DEPLOYMENT.md` for detailed instructions and advanced configuration.

