# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
RUN npm install

# Copy source files
COPY ./src ./src
COPY ./public ./public
COPY ./index.html ./

# Set API base URL for production (will be proxied via nginx)
ENV VITE_API_BASE_URL=/api

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy public assets
COPY --from=builder /app/public /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -sf http://localhost:3000 >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
