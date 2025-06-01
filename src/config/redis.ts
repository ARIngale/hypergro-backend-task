import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.disconnect();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};

// Enhanced cache utility functions with better error handling and logging
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    const start = Date.now();
    const result = await redisClient.get(key);
    const duration = Date.now() - start;
    
    if (result) {
      logger.debug(`Cache HIT for key: ${key} (${duration}ms)`);
    } else {
      logger.debug(`Cache MISS for key: ${key} (${duration}ms)`);
    }
    
    return result;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string, 
  value: string, 
  expireInSeconds: number = 3600
): Promise<void> => {
  try {
    const start = Date.now();
    await redisClient.setEx(key, expireInSeconds, value);
    const duration = Date.now() - start;
    logger.debug(`Cache SET for key: ${key} (${duration}ms, TTL: ${expireInSeconds}s)`);
  } catch (error) {
    logger.error('Cache set error:', error);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    const start = Date.now();
    const result = await redisClient.del(key);
    const duration = Date.now() - start;
    logger.debug(`Cache DEL for key: ${key} (${duration}ms, deleted: ${result})`);
  } catch (error) {
    logger.error('Cache delete error:', error);
  }
};

// Enhanced cache operations for better performance
export const cacheGetMultiple = async (keys: string[]): Promise<(string | null)[]> => {
  try {
    if (keys.length === 0) return [];
    const start = Date.now();
    const results = await redisClient.mGet(keys);
    const duration = Date.now() - start;
    logger.debug(`Cache MGET for ${keys.length} keys (${duration}ms)`);
    return results;
  } catch (error) {
    logger.error('Cache mget error:', error);
    return new Array(keys.length).fill(null);
  }
};

export const cacheSetMultiple = async (
  keyValuePairs: Array<{ key: string; value: string; ttl?: number }>
): Promise<void> => {
  try {
    const start = Date.now();
    const pipeline = redisClient.multi();
    
    keyValuePairs.forEach(({ key, value, ttl = 3600 }) => {
      pipeline.setEx(key, ttl, value);
    });
    
    await pipeline.exec();
    const duration = Date.now() - start;
    logger.debug(`Cache MSET for ${keyValuePairs.length} keys (${duration}ms)`);
  } catch (error) {
    logger.error('Cache mset error:', error);
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  try {
    const start = Date.now();
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    const duration = Date.now() - start;
    logger.debug(`Cache DEL pattern: ${pattern} (${duration}ms, deleted: ${keys.length})`);
  } catch (error) {
    logger.error('Cache delete pattern error:', error);
  }
};

// Cache key generators for consistency
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  property: (propertyId: string) => `property:${propertyId}`,
  properties: (queryHash: string) => `properties:${queryHash}`,
  userProperties: (userId: string, page: number) => `user:properties:${userId}:${page}`,
  favorites: (userId: string, page: number) => `favorites:${userId}:${page}`,
  favoriteCheck: (userId: string, propertyId: string) => `favorite:check:${userId}:${propertyId}`,
  recommendations: (userId: string, type: 'sent' | 'received', page: number) => 
    `recommendations:${type}:${userId}:${page}`,
  recommendationStats: (userId: string) => `recommendations:stats:${userId}`,
  userSearch: (query: string) => `users:search:${query}`,
  propertyStats: () => 'stats:properties',
  userStats: (userId: string) => `stats:user:${userId}`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_SESSION: 7200, // 2 hours
};

// Cache warming functions
export const warmCache = async () => {
  try {
    logger.info('Starting cache warming...');
    
    // Warm up popular properties (most recent)
    // This would be called during application startup
    
    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Cache warming failed:', error);
  }
};

// Cache statistics
export const getCacheStats = async () => {
  try {
    const info = await redisClient.info('memory');
    const keyspace = await redisClient.info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return null;
  }
};