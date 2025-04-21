// config/performance.js

import fastifyCompress from "@fastify/compress";

export async function configurePerformanceOptimizations(fastify) {
  // Enable response compression
  await fastify.register(fastifyCompress, {
    threshold: 1024, // Only compress responses larger than 1KB
    encodings: ['gzip', 'deflate']
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
  
  // Enable keep-alive connections
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('Connection', 'keep-alive');
    reply.header('Keep-Alive', 'timeout=5, max=1000');
    done();
  });
}

// Cluster mode for multi-core servers
