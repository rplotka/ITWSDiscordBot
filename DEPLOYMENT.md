# Deployment Guide - Google Cloud Run

This guide explains how to deploy the ITWS Discord Bot to Google Cloud Run and connect it to your Discord server.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Discord Bot Application** created in Discord Developer Portal
4. **PostgreSQL Database** (can use Cloud SQL or external database)

## Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create itws-discord-bot --name="ITWS Discord Bot"

# Set the project as active
gcloud config set project itws-discord-bot

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 2: Get Discord Bot Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application (or create a new one)
3. Go to **Bot** section:
   - Copy the **Token** → This is `DISCORD_BOT_TOKEN`
   - Copy the **Application ID** → This is `DISCORD_CLIENT_ID`
4. Go to **OAuth2** → **URL Generator**:
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Administrator` (or specific permissions)
   - Copy the generated URL
5. Get your Discord Server ID:
   - Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
   - Right-click your server → Copy Server ID → This is `DISCORD_SERVER_ID`
6. Get Role IDs (if needed):
   - Right-click roles → Copy ID → These are `DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID` and `DISCORD_ACCEPTED_STUDENTS_ROLE_ID`

## Step 3: Set Up Database

### Option A: Use Cloud SQL (Recommended)

```bash
# Create Cloud SQL instance
gcloud sql instances create itws-discord-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create itws_bot --instance=itws-discord-db

# Create user
gcloud sql users create botuser --instance=itws-discord-db --password=YOUR_SECURE_PASSWORD

# Get connection name
gcloud sql instances describe itws-discord-db --format="value(connectionName)"
# Save this for later: PROJECT_ID:REGION:INSTANCE_NAME
```

Your `DATABASE_URL` will be:

```
postgresql://botuser:YOUR_SECURE_PASSWORD@/itws_bot?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

### Option B: Use External Database

If you have an existing PostgreSQL database, use its connection string:

```
postgresql://user:password@host:port/database
```

## Step 4: Store Secrets in Google Cloud

For security, store sensitive values as Secret Manager secrets:

```bash
# Create secrets
echo -n "YOUR_DISCORD_BOT_TOKEN" | gcloud secrets create discord-bot-token --data-file=-
echo -n "YOUR_DISCORD_CLIENT_ID" | gcloud secrets create discord-client-id --data-file=-
echo -n "YOUR_DISCORD_SERVER_ID" | gcloud secrets create discord-server-id --data-file=-
echo -n "YOUR_DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "YOUR_PROSPECTIVE_ROLE_ID" | gcloud secrets create discord-prospective-role-id --data-file=-
echo -n "YOUR_ACCEPTED_ROLE_ID" | gcloud secrets create discord-accepted-role-id --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding discord-bot-token \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
# Repeat for other secrets...
```

## Step 5: Build and Deploy

### Option A: Deploy via gcloud CLI

```bash
# Build the container image
gcloud builds submit --tag gcr.io/PROJECT_ID/itws-discord-bot

# Deploy to Cloud Run
gcloud run deploy itws-discord-bot \
  --image gcr.io/PROJECT_ID/itws-discord-bot \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 1 \
  --min-instances 1 \
  --set-secrets="DISCORD_BOT_TOKEN=discord-bot-token:latest,DISCORD_CLIENT_ID=discord-client-id:latest,DISCORD_SERVER_ID=discord-server-id:latest,DATABASE_URL=database-url:latest,DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID=discord-prospective-role-id:latest,DISCORD_ACCEPTED_STUDENTS_ROLE_ID=discord-accepted-role-id:latest"
```

### Option B: Deploy via Environment Variables (Simpler, less secure)

```bash
# Build the container image
gcloud builds submit --tag gcr.io/PROJECT_ID/itws-discord-bot

# Deploy to Cloud Run with environment variables
gcloud run deploy itws-discord-bot \
  --image gcr.io/PROJECT_ID/itws-discord-bot \
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

### Option C: Automated Deployment via Cloud Build

```bash
# Set substitution variables
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_DISCORD_BOT_TOKEN="YOUR_TOKEN",_DISCORD_CLIENT_ID="YOUR_CLIENT_ID",_DISCORD_SERVER_ID="YOUR_SERVER_ID",_DATABASE_URL="YOUR_DATABASE_URL",_DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID="YOUR_ROLE_ID",_DISCORD_ACCEPTED_STUDENTS_ROLE_ID="YOUR_ROLE_ID"
```

## Step 6: Deploy Discord Slash Commands

Before the bot can respond to commands, you need to register them with Discord:

```bash
# Set environment variables locally
export DISCORD_BOT_TOKEN="YOUR_TOKEN"
export DISCORD_CLIENT_ID="YOUR_CLIENT_ID"
export DISCORD_SERVER_ID="YOUR_SERVER_ID"

# Deploy commands
npm run deploy-commands
```

## Step 7: Invite Bot to Discord Server

1. Use the OAuth2 URL you generated earlier, or create one:
   - Go to Discord Developer Portal → OAuth2 → URL Generator
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or specific permissions needed)
   - Copy the generated URL
2. Open the URL in your browser
3. Select your Discord server
4. Authorize the bot

## Step 8: Verify Deployment

1. Check Cloud Run logs:

   ```bash
   gcloud run services logs read itws-discord-bot --region us-central1 --limit 50
   ```

2. Check if bot is online in Discord:

   - The bot should appear in your server's member list
   - Status should show as "Online"

3. Test a command:
   - Type `/test` in a Discord channel
   - The bot should respond

## Step 9: Set Up Continuous Deployment (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'

      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'

      - name: 'Build and Deploy'
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT }}/itws-discord-bot
          gcloud run deploy itws-discord-bot \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/itws-discord-bot \
            --region us-central1 \
            --platform managed
```

## Troubleshooting

### Bot Not Responding

1. Check Cloud Run logs for errors
2. Verify environment variables are set correctly
3. Ensure bot is invited to server with correct permissions
4. Verify slash commands are deployed: `npm run deploy-commands`

### Database Connection Issues

1. If using Cloud SQL, ensure Cloud Run has access:
   ```bash
   gcloud run services update itws-discord-bot \
     --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
     --region=us-central1
   ```
2. Check database credentials
3. Verify database exists and is accessible

### High Costs

- Cloud Run charges for:
  - CPU/Memory usage
  - Requests
  - Minimum instances (if set)
- To reduce costs:
  - Remove `--min-instances 1` (allows scaling to zero)
  - Reduce memory allocation
  - Use smaller CPU allocation

## Updating the Bot

```bash
# After making code changes
git add .
git commit -m "Update bot"
git push

# Rebuild and redeploy
gcloud builds submit --tag gcr.io/PROJECT_ID/itws-discord-bot
gcloud run deploy itws-discord-bot \
  --image gcr.io/PROJECT_ID/itws-discord-bot \
  --region us-central1
```

## Useful Commands

```bash
# View logs
gcloud run services logs read itws-discord-bot --region us-central1

# Update environment variables
gcloud run services update itws-discord-bot \
  --update-env-vars="KEY=VALUE" \
  --region us-central1

# View service details
gcloud run services describe itws-discord-bot --region us-central1

# Delete service
gcloud run services delete itws-discord-bot --region us-central1
```
