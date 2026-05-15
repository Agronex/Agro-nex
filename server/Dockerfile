# Use Node.js 20 slim as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the server code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the Node.js server
CMD ["node", "index.js"]
