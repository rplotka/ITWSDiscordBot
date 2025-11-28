# Setting up GCP Service Account Key for GitHub Actions

Since you don't have permission to create service accounts via CLI, here are your options:

## Option 1: Use Cloud Console (Recommended)

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=itws-discord-bot
2. Click "Create Service Account"
3. Name: `github-actions`
4. Click "Create and Continue"
5. Grant these roles:
   - Cloud Run Admin
   - Storage Admin
   - Cloud Build Editor
   - Service Usage Consumer
6. Click "Continue" then "Done"
7. Click on the service account you just created
8. Go to "Keys" tab → "Add Key" → "Create new key"
9. Choose "JSON" format
10. Download the key file
11. Copy the entire contents of the downloaded JSON file
12. Go to: https://github.com/rplotka/ITWSDiscordBot/settings/secrets/actions
13. Click "New repository secret"
14. Name: `GCP_SA_KEY`
15. Value: Paste the entire JSON content
16. Click "Add secret"

## Option 2: Ask Project Admin

Ask someone with project admin permissions to:

1. Create the service account
2. Grant the necessary roles
3. Create a key and share it with you (securely)

## Option 3: Use Existing Service Account

If a service account already exists, you can:

1. Go to the service account in Cloud Console
2. Create a new key for it
3. Add it to GitHub secrets as `GCP_SA_KEY`

## Required Roles for the Service Account

- `roles/run.admin` - Deploy to Cloud Run
- `roles/storage.admin` - Push Docker images
- `roles/cloudbuild.builds.editor` - Build Docker images
- `roles/serviceusage.serviceUsageConsumer` - Use Cloud Build API
