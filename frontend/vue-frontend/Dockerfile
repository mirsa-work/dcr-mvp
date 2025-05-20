

# Production stage
FROM nginx:1.25-alpine

# Copy built files from build stage
COPY ./dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
