import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { Server as SocketIOServer } from 'socket.io';
import { initDb, runMigrations } from './utils/db.js';
import authRouter from './controllers/auth.js';
import menuRouter from './controllers/menu.js';
import ordersRouter from './controllers/orders.js';
import tablesRouter from './controllers/tables.js';
import paymentsRouter from './controllers/payments.js';
import settingsRouter from './controllers/settings.js';
import usersRouter from './controllers/users.js';
import stockRouter from './controllers/stock.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });
app.set('io', io);

app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routers
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 3001;

(async () => {
  await initDb();
  await runMigrations();
  server.listen(Number(process.env.EXPLICIT_PORT || process.env.PORT) || 3001, () => {
    console.log(`API listening on :${Number(process.env.EXPLICIT_PORT || process.env.PORT) || 3001}`);
  });
})();
