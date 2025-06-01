import express from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
    try {

      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

startServer();

export default app;