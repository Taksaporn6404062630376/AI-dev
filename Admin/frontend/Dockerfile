# Use the official Node.js image as base image for building frontend
FROM node:14 AS frontend-builder

# Set the working directory in the container
WORKDIR /app/frontend

# Copy package.json and package-lock.json into the container
COPY ./ package*.json ./

# Install Node.js dependencies
RUN npm install

COPY . ./

# Expose the Node.js port for admin
EXPOSE 3000

# Run the Node.js application for admin
CMD ["npm", "run", "dev"]
