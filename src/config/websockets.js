// config/websockets.js
export async function configureWebsockets(fastify) {
    // Initialize connected clients map
    fastify.decorate('connectedClients', new Map());
    
    // No need for additional decorators since we'll handle everything in routes
}