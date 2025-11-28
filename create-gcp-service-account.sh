#!/bin/bash
# Script to create a service account for GitHub Actions

PROJECT_ID="itws-discord-bot"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Creating service account for GitHub Actions..."
echo "Project: ${PROJECT_ID}"
echo "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
echo ""

# Check if service account already exists
if gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project=${PROJECT_ID} 2>/dev/null; then
  echo "Service account already exists. Skipping creation."
else
  echo "Creating service account..."
  gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="GitHub Actions Service Account" \
    --project=${PROJECT_ID}
fi

echo ""
echo "Granting necessary permissions..."

# Grant Cloud Run Admin role (to deploy services)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/run.admin"

# Grant Storage Admin role (to push Docker images)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.admin"

# Grant Cloud Build Editor role (to build images)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Grant Service Usage Consumer role (to use Cloud Build API)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

echo ""
echo "Creating service account key..."
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SERVICE_ACCOUNT_EMAIL} \
  --project=${PROJECT_ID}

echo ""
echo "✅ Service account key created: github-actions-key.json"
echo ""
echo "Next steps:"
echo "1. Copy the contents of github-actions-key.json"
echo "2. Go to your GitHub repository → Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Name: GCP_SA_KEY"
echo "5. Value: Paste the entire contents of github-actions-key.json"
echo "6. Click 'Add secret'"
echo ""
echo "⚠️  Keep github-actions-key.json secure and delete it after adding to GitHub!"
