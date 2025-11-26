#!/bin/bash

# Setup script for ITWS Discord Bot
# This helps you set up environment variables securely

echo "🤖 ITWS Discord Bot Setup"
echo "=========================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

echo "Enter your Discord bot credentials:"
echo ""

# Bot Token
read -p "Discord Bot Token: " DISCORD_BOT_TOKEN
if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo "❌ Bot token is required!"
    exit 1
fi

# Client ID
read -p "Discord Client ID [1442370940058079232]: " DISCORD_CLIENT_ID
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID:-1442370940058079232}

# Server ID
read -p "Discord Server ID: " DISCORD_SERVER_ID
if [ -z "$DISCORD_SERVER_ID" ]; then
    echo "⚠️  Server ID not provided. You'll need to set this later."
fi

# Role IDs (optional)
read -p "Prospective Students Role ID (optional): " DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID
read -p "Accepted Students Role ID (optional): " DISCORD_ACCEPTED_STUDENTS_ROLE_ID

# Database URL
read -p "Database URL (postgresql://...): " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Database URL not provided. You'll need to set this later."
fi

# Create .env file
cat > .env << EOF
# Discord Bot Configuration
DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
DISCORD_SERVER_ID=${DISCORD_SERVER_ID}

# Discord Role IDs
DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID=${DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID}
DISCORD_ACCEPTED_STUDENTS_ROLE_ID=${DISCORD_ACCEPTED_STUDENTS_ROLE_ID}

# Database Configuration
DATABASE_URL=${DATABASE_URL}
EOF

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "⚠️  IMPORTANT: .env is in .gitignore - never commit your token!"
echo ""
echo "Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Deploy commands: npm run deploy-commands"
echo "3. Invite bot: https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&scope=bot%20applications.commands&permissions=8"

