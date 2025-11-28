# Grant Cloud Build Permissions to GitHub Actions Service Account

The GitHub Actions service account needs permission to use Cloud Build. Run these commands in Google Cloud:

```bash
PROJECT_ID="itws-discord-bot"
SERVICE_ACCOUNT="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant Service Account User role so it can use Cloud Build service account
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"

# Also grant Cloud Build Service Account role
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.editor"
```

Or do it via Cloud Console:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=itws-discord-bot
2. Find the `github-actions@itws-discord-bot.iam.gserviceaccount.com` service account
3. Click "Edit" (pencil icon)
4. Add these roles:
   - Service Account User
   - Cloud Build Service Account
5. Save
