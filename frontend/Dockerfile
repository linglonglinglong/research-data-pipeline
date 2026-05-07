# /frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (caching optimization)
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application
COPY . .

# Next.js default port
EXPOSE 3000

# Run in development mode for the live demo
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]