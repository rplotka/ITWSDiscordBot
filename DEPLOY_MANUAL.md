# Manual Deployment Instructions

If GitHub Actions deployment fails due to missing secrets, you can deploy manually:

## Option 1: Deploy using gcloud CLI (Recommended)

```bash
# Make sure you're authenticated
gcloud auth login
gcloud config set project itws-discord-bot

# Build and deploy
gcloud builds submit --tag gcr.io/itws-discord-bot/itws-discord-bot
gcloud run deploy itws-discord-bot \
  --image gcr.io/itws-discord-bot/itws-discord-bot \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 1 \
  --min-instances 1
```

## Option 2: Set up GitHub Secrets for Automated Deployment

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Create a service account key in Google Cloud:

   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions Service Account"

   gcloud projects add-iam-policy-binding itws-discord-bot \
     --member="serviceAccount:github-actions@itws-discord-bot.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding itws-discord-bot \
     --member="serviceAccount:github-actions@itws-discord-bot.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@itws-discord-bot.iam.gserviceaccount.com
   ```

3. Copy the contents of `key.json` and add it as `GCP_SA_KEY` secret in GitHub
4. Add other required secrets:
   - `GCP_PROJECT_ID`: `itws-discord-bot`
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `DISCORD_CLIENT_ID`: Your Discord client ID
   - `DISCORD_SERVER_ID`: Your Discord server ID
   - `DATABASE_URL`: Your database connection string
   - `DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID`: Role ID (if needed)
   - `DISCORD_ACCEPTED_STUDENTS_ROLE_ID`: Role ID (if needed)
