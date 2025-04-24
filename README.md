# Backend Monopation

A backend service built with Fastify and Prisma.

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Configure your database:
- Create a PostgreSQL database
- Update the DATABASE_URL in `.env` file with your database credentials

3. Run Prisma migrations:
```bash
yarn prisma migrate dev
```

4. Start the development server:
```bash
yarn run dev
```

The server will start on http://localhost:3000

## Deployment to Vercel

1. Install Vercel CLI:
```bash
yarn i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy to Vercel:
```bash
vercel
```

4. Add your environment variables in the Vercel dashboard:
   - Go to your project settings
   - Add DATABASE_URL with your production database connection string

## Available Endpoints

- GET /health - Health check endpoint

## Technologies Used

- Fastify - Fast and low overhead web framework
- Prisma - Next-generation ORM
- PostgreSQL - Database
