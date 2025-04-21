// config/errorHandlers.js

export async function configureErrorHandlers(fastify) {
    // Global error handler
    fastify.setErrorHandler((error, request, reply) => {
      // Log error with appropriate level based on status code
      if (error.statusCode >= 500) {
        request.log.error(error);
      } else if (error.statusCode >= 400) {
        request.log.warn({ err: error }, `Client error: ${error.message}`);
      } else {
        request.log.info({ err: error }, error.message);
      }
  
      // Custom error responses based on error type
      if (error.validation) {
        // Validation errors
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Validation failed',
          details: error.validation
        });
      } else if (error.statusCode === 401) {
        // Authentication errors
        return reply.status(401).send({
          error: 'AuthenticationError',
          message: 'Authentication required'
        });
      } else if (error.statusCode === 403) {
        // Authorization errors
        return reply.status(403).send({
          error: 'ForbiddenError',
          message: 'Insufficient permissions'
        });
      } else if (error.statusCode === 404) {
        // Not found errors
        return reply.status(404).send({
          error: 'NotFoundError',
          message: 'Resource not found'
        });
      } else if (error.statusCode === 429) {
        // Rate limit errors
        return reply.status(429).send({
          error: 'RateLimitError',
          message: 'Too many requests',
          retryAfter: error.retryAfter || 60
        });
      }
  
      // Default error response
      const statusCode = error.statusCode || 500;
      reply.status(statusCode).send({
        error: error.name || 'InternalServerError',
        message: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'An internal server error occurred'
          : error.message,
        requestId: request.id
      });
    });
  
    // Not found handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: 'NotFoundError',
        message: `Route ${request.method}:${request.url} not found`,
        requestId: request.id
      });
    });
  }