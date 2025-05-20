# Use Node.js 20 as the base image (aligns with your engines requirement)
FROM node:20-alpine

# Install necessary packages for Prisma
RUN apk add --no-cache openssl

# Create app directory
WORKDIR /usr/src/app

# Copy package files first
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN yarn install --frozen-lockfile || npm install

# Copy prisma files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port your app runs on
EXPOSE ${PORT:-3000}

# Set command to run the application
CMD ["yarn", "start"]