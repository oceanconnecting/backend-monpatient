// config/performance.js
import fastifyCompress from "@fastify/compress";

export async function configurePerformanceOptimizations(fastify) {
  // Adjust server timeouts for long-running requests
  fastify.server.keepAliveTimeout = 65000; // Increase from Node.js default (5s)
  fastify.server.headersTimeout = 66000;   // Should be > keepAliveTimeout
  
  // Enable response compression with better settings for large responses
  await fastify.register(fastifyCompress, {
    threshold: 1024, // Only compress responses larger than 1KB
    encodings: ['gzip', 'deflate'],
    global: false,    // Don't compress everything automatically
  
  });
  
  // Adjust body size limits for larger requests/responses
  fastify.register(import('@fastify/formbody'), {
    bodyLimit: 10 * 1024 * 1024 // 10MB limit
  });
  
  // Cache control headers for static assets
  fastify.addHook('onSend', (request, reply, payload, done) => {
    // Set appropriate cache headers based on route type
    const path = request.routerPath || request.url;
    if (path.includes('/static/') || path.endsWith('.js') || path.endsWith('.css')) {
      // Static assets - cache for longer periods
      reply.header('Cache-Control', 'public, max-age=86400, immutable'); // 24 hours
    } else if (request.method === 'GET' && !path.includes('/api/')) {
      // Other GET requests that are not API calls - modest caching
      reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else {
      // Dynamic API responses - no caching
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    
    // For API endpoints that return large data
    if (path.includes('/api/pharmacy/medicines')) {
      // Set chunked transfer encoding for potentially large responses
      reply.header('Transfer-Encoding', 'chunked');
    }
    
    done(null, payload);
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
  fastify.addHook('onResponse', (request, reply, done) => {
    const responseTime = reply.getResponseTime();
    if (responseTime > 1000) { // Log requests taking more than 1 second
      request.log.warn({
        url: request.url,
        method: request.method,
        responseTime: `${responseTime.toFixed(2)}ms`,
        msg: 'Slow request detected'
      });
    }
    done();
  });
}