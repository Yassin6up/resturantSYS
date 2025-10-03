import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import knexConfig from '../../server/knexfile.js';
import knex from 'knex';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('db', db);
app.set('io', io);

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`POSQ server running on ${PORT}`));