import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes/index';
import path from 'path/win32';

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
// Serve static files from uploads directory
app.use('/api/upload/image', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, 'uploads')));

if (process.env.SWAGGER_ENABLED !== 'false') {
  const swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'POSQ API', version: '0.1.0' }
    },
    apis: ['src/controllers/**/*.ts', 'src/routes/**/*.ts']
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use('/api', routes);

export function createHttpAndIo() {
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: true } });
  app.set('io', io);
  io.on('connection', (socket) => {
    socket.on('join', (room: string) => socket.join(room));
  });
  return { app, httpServer, io };
}

export default app;
