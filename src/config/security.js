// config/security.js

export async function configureSecurityFeatures(fastify) {
    // Set appropriate security headers based on environment
    fastify.addHook("onRequest", (request, reply, done) => {
      // Configure Content Security Policy
      const csp = process.env.NODE_ENV === "production"
        ? `default-src 'self'; connect-src 'self' ${process.env.ALLOWED_ORIGINS || "*"}; img-src 'self' data:; style-src 'self' 'unsafe-inline';`
        : "default-src 'self'; connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:*; img-src 'self' data:; style-src 'self' 'unsafe-inline';";
  
      reply.header("Content-Security-Policy", csp);
      
      // Additional security headers
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("X-Frame-Options", "DENY");
      reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
      
      if (process.env.NODE_ENV === "production") {
        reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      }
      
      done();
    });
  }