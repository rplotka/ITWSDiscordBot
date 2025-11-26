# ITWS Bot Setup Guide

## Your Bot Information

- **Application Name**: itws-bot
- **Application ID**: 1442370940058079232
- **Client ID**: 1442370940058079232
- **Install Link**: https://discord.com/oauth2/authorize?client_id=1442370940058079232

## Quick Setup

### 1. Create .env File

Create a `.env` file in the project root with your credentials:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=1442370940058079232
DISCORD_SERVER_ID=YOUR_SERVER_ID_HERE

# Discord Role IDs (get these by right-clicking roles in Discord with Developer Mode enabled)
DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID=YOUR_ROLE_ID
DISCORD_ACCEPTED_STUDENTS_ROLE_ID=YOUR_ROLE_ID

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
```

**To get your Server ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your Discord server → Copy Server ID

**To get Role IDs:**
1. With Developer Mode enabled, right-click the role → Copy ID

### 2. Test Locally

```bash
# Install dependencies
npm install

# Run the bot locally
npm run dev
```

You should see: `Bot is ready! Invite URL is...`

### 3. Deploy Slash Commands

Before the bot can respond to commands, register them with Discord:

```bash
npm run deploy-commands
```

You should see: `Successfully registered application commands.`

### 4. Invite Bot to Your Server

Use this URL to invite the bot with proper permissions:

**Full Permissions (Administrator):**
```
https://discord.com/oauth2/authorize?client_id=1442370940058079232&scope=bot%20applications.commands&permissions=8
```

**Or customize permissions:**
- Go to https://discord.com/developers/applications/1442370940058079232/oauth2/url-generator
- Select scopes: `bot`, `applications.commands`
- Select permissions you need (or `Administrator` for full access)
- Copy the generated URL

### 5. Verify Bot is Working

1. Check Discord - bot should appear online in your server
2. Try a command: `/test` or `/join course`
3. Check logs if there are issues

## Deploy to Google Cloud Run

### Quick Deploy

```bash
# Set your project ID
export GCP_PROJECT="your-gcp-project-id"

# Deploy
./deploy.sh $GCP_PROJECT us-central1
```

### Set Environment Variables in Cloud Run

After deployment, set environment variables:

```bash
gcloud run services update itws-discord-bot \
  --region us-central1 \
  --set-env-vars="DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE,DISCORD_CLIENT_ID=1442370940058079232,DISCORD_SERVER_ID=YOUR_SERVER_ID,DATABASE_URL=YOUR_DATABASE_URL,DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID=YOUR_ROLE_ID,DISCORD_ACCEPTED_STUDENTS_ROLE_ID=YOUR_ROLE_ID"
```

**Or use Secret Manager (more secure):**

```bash
# Create secrets
echo -n "YOUR_DISCORD_BOT_TOKEN_HERE" | gcloud secrets create discord-bot-token --data-file=-
echo -n "1442370940058079232" | gcloud secrets create discord-client-id --data-file=-
# ... etc

# Deploy with secrets
gcloud run services update itws-discord-bot \
  --region us-central1 \
  --set-secrets="DISCORD_BOT_TOKEN=discord-bot-token:latest,DISCORD_CLIENT_ID=discord-client-id:latest,..."
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Never share your bot token publicly
- If your token is compromised, regenerate it in Discord Developer Portal
- Use Secret Manager for production deployments

## Troubleshooting

**Bot not responding?**
- Check if bot is online in Discord
- Verify environment variables are set correctly
- Check Cloud Run logs: `gcloud run services logs read itws-discord-bot --region us-central1`
- Re-run `npm run deploy-commands`

**Commands not showing?**
- Run `npm run deploy-commands` again
- Wait a few minutes for Discord to update
- Check bot has `applications.commands` scope

**Database connection issues?**
- Verify `DATABASE_URL` is correct
- Check database is accessible from Cloud Run
- If using Cloud SQL, ensure Cloud Run has access

