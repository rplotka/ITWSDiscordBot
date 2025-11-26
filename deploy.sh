#!/bin/bash

# Quick deployment script for Google Cloud Run
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

set -e

PROJECT_ID=${1:-${GCP_PROJECT:-"your-project-id"}}
REGION=${2:-"us-central1"}
SERVICE_NAME="itws-discord-bot"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying ITWS Discord Bot to Google Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Not logged in to gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Build the container
echo "🔨 Building container image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --max-instances 1 \
  --min-instances 1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Set environment variables in Cloud Run console"
echo "   2. Run 'npm run deploy-commands' to register slash commands"
echo "   3. Invite the bot to your Discord server"
echo ""
echo "View logs: gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"

