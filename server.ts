import { createServer } from 'http';
import { parse } from 'url';
import path from 'path';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app with explicit directory path to resolve custom server path mismatch
const app = next({ dev, hostname, port, dir: path.resolve(__dirname) });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // Optional: Redis Pub/Sub for multi-instance Socket.io scaling
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    (async () => {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { Redis } = await import('ioredis');
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.io] Redis adapter enabled for horizontal scaling');
    })();
  }

  io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Join a specific route room
    socket.on('join_route', (routeId) => {
      socket.join(`route_${routeId}`);
      console.log(`Client ${socket.id} joined route_${routeId}`);
    });

    // Leave a specific route room
    socket.on('leave_route', (routeId) => {
      socket.leave(`route_${routeId}`);
      console.log(`Client ${socket.id} left route_${routeId}`);
    });

    // Receive GPS update from a bus/driver
    socket.on('update_location', (data) => {
      const { routeId, lat, lng } = data;
      // Broadcast to all clients in this route's room
      io.to(`route_${routeId}`).emit('location_update', { routeId, lat, lng });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
