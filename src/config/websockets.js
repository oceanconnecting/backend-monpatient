// config/websockets.js

export async function configureWebsockets(fastify, connectedClients) {
    // Helper to broadcast messages to specific users
    fastify.decorate("broadcastToUser", (userId, event, data) => {
      let delivered = 0;
      connectedClients.forEach((client, connection) => {
        if (client.userId === userId && connection.socket.readyState === 1) {
          connection.socket.send(JSON.stringify({ event, data }));
          delivered++;
        }
      });
      fastify.log.debug(`Broadcast to user ${userId}: ${delivered} clients received`);
    });
    
    // Broadcast to all connected clients
    fastify.decorate("broadcastToAll", (event, data) => {
      let delivered = 0;
      connectedClients.forEach((client, connection) => {
        if (connection.socket.readyState === 1) {
          connection.socket.send(JSON.stringify({ event, data }));
          delivered++;
        }
      });
      fastify.log.debug(`Broadcast to all: ${delivered} clients received`);
    });
    
    // Broadcast to clients matching filter criteria
    fastify.decorate("broadcastFiltered", (filterFn, event, data) => {
      let delivered = 0;
      connectedClients.forEach((client, connection) => {
        if (filterFn(client) && connection.socket.readyState === 1) {
          connection.socket.send(JSON.stringify({ event, data }));
          delivered++;
        }
      });
      fastify.log.debug(`Filtered broadcast: ${delivered} clients received`);
    });
    
    // Handle client disconnection
    fastify.decorate("removeClient", (connection) => {
      if (connectedClients.has(connection)) {
        const client = connectedClients.get(connection);
        fastify.log.debug(`Client disconnected: ${client.userId}`);
        connectedClients.delete(connection);
      }
    });
  }