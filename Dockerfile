# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (Cloud Run requires a port, but Discord bot doesn't use HTTP)
EXPOSE 8080

# Start the bot
CMD ["node", "index.js"]

