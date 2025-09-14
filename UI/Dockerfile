# Build stage
FROM node:22-alpine AS builder


ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

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