// websocket.plugin.js
export async function websocketPlugin(fastify, options) {
  const connectedUsers = new Map();

 function sendToUser(userId, message) {
  console.log('\n--- Attempting to send to user ---');
  console.log('Target userId:', userId);
  console.log('All connected users:', Array.from(connectedUsers.keys()));
  
  const ws = connectedUsers.get(userId);
  if (!ws) {
    console.error('❌ No WebSocket found for user');
    return false;
  }

  console.log('WebSocket state:', ws.readyState); // 1 = OPEN, 3 = CLOSED
  console.log('Message to send:', message);

  if (ws.readyState === 1) {
    try {
      ws.send(JSON.stringify(message));
      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Send error:', error);
      connectedUsers.delete(userId);
      return false;
    }
  }
  
  console.error(`❌ WebSocket not open (state: ${ws.readyState})`);
  return false;
}

  function broadcast(message) {
    let successCount = 0;
    connectedUsers.forEach((ws, userId) => {
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify(message));
          successCount++;
        } catch (error) {
          connectedUsers.delete(userId);
        }
      }
    });
    return successCount;
  }

  fastify.decorate('websocket', {
    connectedUsers,
    sendToUser,
    broadcast
  });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // Your existing connection handling code
    try {
      const token = req.query.token;
      if (!token) {
        connection.close(1008, 'Unauthorized');
        return;
      }
      
      const decoded = fastify.jwt.verify(token);
      const userId = decoded.id;
      
      connectedUsers.set(userId, connection);
      
      connection.send(JSON.stringify({ 
        type: "connected", 
        userId,
        message: 'WebSocket connection established' 
      }));
      
      connection.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'PING') {
            connection.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch (error) {
          console.error("Error handling message:", error);
        }
      });
      
      connection.on('error', (error) => {
        console.error(`WebSocket error for user: ${userId}`, error);
        connectedUsers.delete(userId);
      });
      
      connection.on('close', () => {
        connectedUsers.delete(userId);
      });
    } catch (error) {
      connection.close(1008, 'Authentication failed');
    }
  });
}