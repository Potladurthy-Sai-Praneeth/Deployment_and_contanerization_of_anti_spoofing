# FROM node:18-alpine

# WORKDIR /app

# # Install curl for health checks
# RUN apk add --no-cache curl

# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy source code
# COPY . .

# # Build the application
# RUN npm run build

# # Install serve to serve the built application
# RUN npm install -g serve

# # Expose port 5000
# EXPOSE 5000

# # Start the application
# CMD ["serve", "-s", "build", "-l", "5000"]



# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build



# Final stage
FROM node:22-alpine AS final

WORKDIR /app

RUN apk add --no-cache curl && \
    npm install -g serve && \
    npm cache clean --force

COPY --from=builder /app/build ./build

EXPOSE 5000
CMD ["serve", "-s", "build", "-l", "5000"]