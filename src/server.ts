import express from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { connectDB, disconnectDB } from './config/database';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
    try {
      // Connect to databases
      await connectDB();
      logger.info('MongoDB connected successfully');

      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    try {
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  

startServer();

export default app;