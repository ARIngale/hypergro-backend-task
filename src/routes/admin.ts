import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CacheService } from '../services/cacheService';
import { getCacheStats } from '../config/redis';

const router = express.Router();

// Cache health check endpoint
router.get('/cache/health', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const isHealthy = await CacheService.healthCheck();
    
    res.json({
      success: true,
      data: {
        cacheHealthy: isHealthy,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cache statistics endpoint
router.get('/cache/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stats = await getCacheStats();
    
    res.json({
      success: true,
      data: {
        cacheStats: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cache warming endpoint
router.post('/cache/warm', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Only allow admin users to warm cache
    // You might want to add role-based access control here
    
    await Promise.all([
      CacheService.warmUserCache(req.user!._id.toString()),
      CacheService.warmPopularProperties(),
    ]);
    
    res.json({
      success: true,
      message: 'Cache warming initiated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;