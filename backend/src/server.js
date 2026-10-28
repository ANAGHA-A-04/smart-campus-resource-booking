import { validateEnv, config } from './config/environment.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

// Validate env before anything
validateEnv();

async function startServer() {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`\n🚀 CUSAT Resource Booking API`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Frontend: ${config.frontendUrl}`);
    console.log(`   Health: http://localhost:${config.port}/api/health\n`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
}

startServer();
