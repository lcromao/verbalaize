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

# Expose port
EXPOSE 3000

# Set environment variable for the API
ENV VITE_API_URL=http://backend:8000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
