export async function websocketRoutes(fastify) {
  // Basic WebSocket connection handler
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    // Store the connection
    const clientId = req.headers["sec-websocket-key"];
    fastify.connectedClients.set(clientId, connection);

    // Handle incoming messages
    connection.socket.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        // Handle different types of messages here
        // You can add your own message handling logic
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    // Handle connection close
    connection.socket.on("close", () => {
      fastify.connectedClients.delete(clientId);
    });
  });
}
