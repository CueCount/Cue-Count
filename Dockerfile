# Use the official Node image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (for caching efficiency)
COPY package.json package-lock.json ./

# Install dependencies inside the container
RUN npm install

# Copy the rest of your project
COPY . .

# Expose the dev server port
EXPOSE 3000

# Start the Next.js dev server
CMD ["npm", "run", "dev"]