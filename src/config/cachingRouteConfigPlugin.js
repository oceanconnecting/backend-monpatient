// cachingRouteConfigPlugin.js
export default function cachingRouteConfigPlugin(fastify, opts, done) {
  fastify.addHook('preHandler', (request, reply, done) => {
    const routeConfig = request.routeOptions.config || {};
    const cacheConfig = routeConfig.cache;

    if (cacheConfig && typeof cacheConfig.expiresIn === 'number') {
      const maxAgeSeconds = Math.floor(cacheConfig.expiresIn);
      reply.header('Cache-Control', `max-age=${maxAgeSeconds}`);
    }

    done();
  });

  done();
}