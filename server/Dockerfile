# Use Node.js 20 slim as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the server code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Expose port 5000
EXPOSE 5000

# Health check — Docker/orchestrator can detect unhealthy containers
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

# Start the Node.js server
CMD ["node", "index.js"]
