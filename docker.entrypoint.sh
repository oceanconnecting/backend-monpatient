#!/bin/sh

# Wait for database to be ready (uncomment and modify if needed)
# echo "Waiting for database to be ready..."
# /app/wait-for-it.sh db:5432 -t 60

# Run database migrations if needed
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@"