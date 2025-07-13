FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to serve the built application
RUN npm install -g serve

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["serve", "-s", "build", "-l", "5000"]
