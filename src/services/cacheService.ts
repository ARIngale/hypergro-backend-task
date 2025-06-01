import { 
  cacheGet, 
  cacheSet, 
  cacheDel, 
  cacheGetMultiple, 
  cacheSetMultiple, 
  cacheDelPattern,
  CacheKeys, 
  CacheTTL 
} from '../config/redis';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';
import { IProperty } from '../models/Property';

export class CacheService {
  // User caching
  static async getUser(userId: string): Promise<IUser | null> {
    try {
      const cached = await cacheGet(CacheKeys.user(userId));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting user from cache:', error);
      return null;
    }
  }

  static async setUser(user: IUser): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.user(user._id.toString()), 
        JSON.stringify(user), 
        CacheTTL.USER_SESSION
      );
    } catch (error) {
      logger.error('Error setting user in cache:', error);
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      await Promise.all([
        cacheDel(CacheKeys.user(userId)),
        cacheDel(CacheKeys.userProfile(userId)),
        cacheDel(CacheKeys.userStats(userId)),
        cacheDelPattern(`user:properties:${userId}:*`),
        cacheDelPattern(`favorites:${userId}:*`),
        cacheDelPattern(`recommendations:*:${userId}:*`),
      ]);
    } catch (error) {
      logger.error('Error deleting user from cache:', error);
    }
  }

  // Property caching with write-through strategy
  static async getProperty(propertyId: string): Promise<IProperty | null> {
    const cacheKey = CacheKeys.property(propertyId);
    try {
      console.log(`[CACHE] Attempting to fetch property with ID: ${propertyId}`);
      console.log(`[CACHE] Using cache key: ${cacheKey}`);
  
      const cached = await cacheGet(cacheKey);
  
      if (cached) {
        console.log(`[CACHE] Cache hit for property ID: ${propertyId}`);
        return JSON.parse(cached);
      } else {
        console.log(`[CACHE] Cache miss for property ID: ${propertyId}`);
        return null;
      }
    } catch (error) {
      console.error('[CACHE] Error getting property from cache:', error);
      return null;
    }
  }
  

  static async setProperty(property: IProperty): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.property(property._id.toString()), 
        JSON.stringify(property), 
        CacheTTL.LONG
      );
    } catch (error) {
      logger.error('Error setting property in cache:', error);
    }
  }

  static async deleteProperty(propertyId: string): Promise<void> {
    try {
      await Promise.all([
        cacheDel(CacheKeys.property(propertyId)),
        cacheDelPattern('properties:*'), // Clear all property listings
        cacheDelPattern('user:properties:*'), // Clear user property lists
        cacheDelPattern('favorites:*'), // Clear favorites (property might be favorited)
        cacheDel(CacheKeys.propertyStats()),
      ]);
    } catch (error) {
      logger.error('Error deleting property from cache:', error);
    }
  }

  // Properties listing with intelligent caching
  static async getProperties(queryHash: string): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.properties(queryHash));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting properties from cache:', error);
      return null;
    }
  }

  static async setProperties(queryHash: string, data: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.properties(queryHash), 
        JSON.stringify(data), 
        CacheTTL.SHORT // Short TTL for search results
      );
    } catch (error) {
      logger.error('Error setting properties in cache:', error);
    }
  }

  static async invalidatePropertiesCache(): Promise<void> {
    try {
      await cacheDelPattern('properties:*');
    } catch (error) {
      logger.error('Error invalidating properties cache:', error);
    }
  }

  // User properties caching
  static async getUserProperties(userId: string, page: number): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.userProperties(userId, page));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting user properties from cache:', error);
      return null;
    }
  }

  static async setUserProperties(userId: string, page: number, data: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.userProperties(userId, page), 
        JSON.stringify(data), 
        CacheTTL.MEDIUM
      );
    } catch (error) {
      logger.error('Error setting user properties in cache:', error);
    }
  }

  static async invalidateUserProperties(userId: string): Promise<void> {
    try {
      await cacheDelPattern(`user:properties:${userId}:*`);
    } catch (error) {
      logger.error('Error invalidating user properties cache:', error);
    }
  }

  // Favorites caching with write-through
  static async getFavorites(userId: string, page: number): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.favorites(userId, page));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting favorites from cache:', error);
      return null;
    }
  }

  static async setFavorites(userId: string, page: number, data: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.favorites(userId, page), 
        JSON.stringify(data), 
        CacheTTL.MEDIUM
      );
    } catch (error) {
      logger.error('Error setting favorites in cache:', error);
    }
  }

  static async getFavoriteCheck(userId: string, propertyId: string): Promise<boolean | null> {
    try {
      const cached = await cacheGet(CacheKeys.favoriteCheck(userId, propertyId));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting favorite check from cache:', error);
      return null;
    }
  }

  static async setFavoriteCheck(userId: string, propertyId: string, isFavorite: boolean): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.favoriteCheck(userId, propertyId), 
        JSON.stringify(isFavorite), 
        CacheTTL.LONG
      );
    } catch (error) {
      logger.error('Error setting favorite check in cache:', error);
    }
  }

  static async invalidateFavorites(userId: string): Promise<void> {
    try {
      await Promise.all([
        cacheDelPattern(`favorites:${userId}:*`),
        cacheDelPattern(`favorite:check:${userId}:*`),
      ]);
    } catch (error) {
      logger.error('Error invalidating favorites cache:', error);
    }
  }

  // Recommendations caching
  static async getRecommendations(userId: string, type: 'sent' | 'received', page: number): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.recommendations(userId, type, page));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting recommendations from cache:', error);
      return null;
    }
  }

  static async setRecommendations(userId: string, type: 'sent' | 'received', page: number, data: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.recommendations(userId, type, page), 
        JSON.stringify(data), 
        CacheTTL.MEDIUM
      );
    } catch (error) {
      logger.error('Error setting recommendations in cache:', error);
    }
  }

  static async getRecommendationStats(userId: string): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.recommendationStats(userId));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting recommendation stats from cache:', error);
      return null;
    }
  }

  static async setRecommendationStats(userId: string, stats: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.recommendationStats(userId), 
        JSON.stringify(stats), 
        CacheTTL.MEDIUM
      );
    } catch (error) {
      logger.error('Error setting recommendation stats in cache:', error);
    }
  }

  static async invalidateRecommendations(userId: string): Promise<void> {
    try {
      await Promise.all([
        cacheDelPattern(`recommendations:sent:${userId}:*`),
        cacheDelPattern(`recommendations:received:${userId}:*`),
        cacheDel(CacheKeys.recommendationStats(userId)),
      ]);
    } catch (error) {
      logger.error('Error invalidating recommendations cache:', error);
    }
  }

  // User search caching
  static async getUserSearch(query: string): Promise<any | null> {
    try {
      const cached = await cacheGet(CacheKeys.userSearch(query));
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting user search from cache:', error);
      return null;
    }
  }

  static async setUserSearch(query: string, users: any): Promise<void> {
    try {
      await cacheSet(
        CacheKeys.userSearch(query), 
        JSON.stringify(users), 
        CacheTTL.SHORT // Short TTL for search results
      );
    } catch (error) {
      logger.error('Error setting user search in cache:', error);
    }
  }

  // Bulk operations for better performance
  static async getMultipleProperties(propertyIds: string[]): Promise<(IProperty | null)[]> {
    try {
      const keys = propertyIds.map(id => CacheKeys.property(id));
      const cached = await cacheGetMultiple(keys);
      return cached.map(item => item ? JSON.parse(item) : null);
    } catch (error) {
      logger.error('Error getting multiple properties from cache:', error);
      return new Array(propertyIds.length).fill(null);
    }
  }

  static async setMultipleProperties(properties: IProperty[]): Promise<void> {
    try {
      const keyValuePairs = properties.map(property => ({
        key: CacheKeys.property(property._id.toString()),
        value: JSON.stringify(property),
        ttl: CacheTTL.LONG,
      }));
      await cacheSetMultiple(keyValuePairs);
    } catch (error) {
      logger.error('Error setting multiple properties in cache:', error);
    }
  }

  // Cache warming strategies
  static async warmUserCache(userId: string): Promise<void> {
    try {
      // This would be called after user login to pre-load their data
      logger.debug(`Warming cache for user: ${userId}`);
      
      // Pre-load user stats, recent favorites, etc.
      // Implementation would depend on your specific use cases
    } catch (error) {
      logger.error('Error warming user cache:', error);
    }
  }

  static async warmPopularProperties(): Promise<void> {
    try {
      // Pre-load most viewed/favorited properties
      logger.debug('Warming popular properties cache');
      
      // Implementation would load popular properties into cache
    } catch (error) {
      logger.error('Error warming popular properties cache:', error);
    }
  }

  // Cache health check
  static async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health:check';
      const testValue = Date.now().toString();
      
      await cacheSet(testKey, testValue, 10);
      const retrieved = await cacheGet(testKey);
      await cacheDel(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }
}