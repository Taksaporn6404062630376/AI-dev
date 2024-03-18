# Use the official Node.js image as base image
FROM node:14 AS backend-builder

# Set the working directory in the container
WORKDIR /app/backend

# Copy package.json and package-lock.json into the container
COPY ./ package*.json ./
# Install Node.js dependencies
RUN npm install

COPY ./ server.js ./

# Run the Node.js application for admin
CMD ["npm", "start"]
