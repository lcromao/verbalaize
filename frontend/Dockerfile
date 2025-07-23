# Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies (using npm for compatibility)
RUN npm install

# Copy source code
COPY . .

# Copy Docker-specific environment file
COPY .env.docker .env

# Expose port
EXPOSE 3000

# Set environment variable for development
ENV NODE_ENV=development

# Start development server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
