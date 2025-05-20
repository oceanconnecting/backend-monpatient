// config/performance.js
import fastifyCompress from "@fastify/compress";
import fastifyCaching from "@fastify/caching";

export async function configurePerformanceOptimizations(fastify) {
  // Adjust server timeouts for long-running requests
  fastify.server.keepAliveTimeout = 65000; // Increase from Node.js default (5s)
  fastify.server.headersTimeout = 66000; // Should be > keepAliveTimeout

  // Enable response compression with better settings for large responses
  await fastify.register(fastifyCompress, {
    threshold: 1024, // Only compress responses larger than 1KB
    encodings: ['gzip', 'deflate'],
    global: false, // Don't compress everything automatically
  });

  // Add caching to improve response times and reduce server load
  await fastify.register(fastifyCaching, {
    privacy: 'public',
    expiresIn: 3000, // Cache responses for 5 minutes by default
    cache: {
      // Optional: configure a custom cache store (default is in-memory)
      size: 1000, // Maximum number of items in cache
      ttl: 300000, // TTL in milliseconds (5 minutes)
    },
    // Don't cache everything automatically - routes will need to opt-in
    // by setting a Cache-Control header in their responses
    global: false
  });

  // Adjust body size limits for larger requests/responses
  fastify.register(import('@fastify/formbody'), {
    bodyLimit: 10 * 1024 * 1024 // 10MB limit
  });

  // Disable extensive logging in production
  if (process.env.NODE_ENV === 'production') {
    fastify.addHook('onRequest', (request, reply, done) => {
      // Only log errors and critical paths in production
      if (!request.url.includes('/health') && !request.url.includes('/metrics')) {
        request.log.level = 'error';
      }
      done();
    });
  }

  // Configure keep-alive connections with more appropriate values
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('Connection', 'keep-alive');
    reply.header('Keep-Alive', 'timeout=60, max=1000'); // Increased timeout to 60s
    done();
  });

  // Add hook for monitoring potentially slow routes
  // fastify.addHook('onResponse', (request, reply, done) => {
  //   const responseTime = reply.getResponseTime();
  //   if (responseTime > 1000) { // Log requests taking more than 1 second
  //     request.log.warn({
  //       url: request.url,
  //       method: request.method,
  //       responseTime: `${responseTime.toFixed(2)}ms`,
  //       msg: 'Slow request detected'
  //     });
  //   }
  //   done();
  // });
}