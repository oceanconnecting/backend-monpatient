import fastifyIO from 'fastify-socket.io';

// Register Socket.IO as a Fastify plugin
export async function socketIOPlugin(fastify, options) {
  await fastify.register(fastifyIO, {
    // Socket.IO options
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"]
    }
  });
}