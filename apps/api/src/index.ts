import './config.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes.js';
import { startReconcileLoop } from './reconcile.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '127.0.0.1';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

await registerRoutes(app);

startReconcileLoop();

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n  agentOS API  →  http://localhost:${PORT}`);
  console.log(`  Health       →  http://localhost:${PORT}/health\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
