import express from 'express';
import mongoose from 'mongoose';
import { Favorite } from '../models/Favorite';
import { Property } from '../models/Property';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { CacheService } from '../services/cacheService';

const router = express.Router();

// Get user's favorites
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    // Try cache first
    const cachedResult = await CacheService.getFavorites(req.user!._id.toString(), pageNum);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const skip = (pageNum - 1) * limitNum;
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [favorites, total] = await Promise.all([
      Favorite.find({ userId: req.user!._id })
        .populate({
          path: 'propertyId',
          populate: {
            path: 'createdBy',
            select: 'firstName lastName email',
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Favorite.countDocuments({ userId: req.user!._id }),
    ]);

    // Filter out favorites where property might have been deleted
    const validFavorites = favorites.filter(fav => fav.propertyId);

    const result = {
      success: true,
      data: {
        favorites: validFavorites,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    };

    // Cache the result
    await CacheService.setFavorites(req.user!._id.toString(), pageNum, result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add property to favorites
router.post('/:propertyId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid property ID', 400);
    }

    // Check if property exists (try cache first)
    let property = await CacheService.getProperty(propertyId);
    if (!property) {
      property = await Property.findById(propertyId);
      if (!property) {
        throw new AppError('Property not found', 404);
      }
      await CacheService.setProperty(property);
    }

    // Check if already favorited (try cache first)
    let isFavorited = await CacheService.getFavoriteCheck(req.user!._id.toString(), propertyId);
    if (isFavorited === null) {
      const existingFavorite = await Favorite.findOne({
        userId: req.user!._id,
        propertyId,
      });
      isFavorited = !!existingFavorite;
    }

    if (isFavorited) {
      throw new AppError('Property already in favorites', 400);
    }

    // Create favorite
    const favorite = new Favorite({
      userId: req.user!._id,
      propertyId,
    });

    await favorite.save();
    await favorite.populate({
      path: 'propertyId',
      populate: {
        path: 'createdBy',
        select: 'firstName lastName email',
      },
    });

    // Update caches
    await Promise.all([
      CacheService.setFavoriteCheck(req.user!._id.toString(), propertyId, true),
      CacheService.invalidateFavorites(req.user!._id.toString()),
    ]);

    res.status(201).json({
      success: true,
      message: 'Property added to favorites',
      data: {
        favorite,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Remove property from favorites
router.delete('/:propertyId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid property ID', 400);
    }

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user!._id,
      propertyId,
    });

    if (!favorite) {
      throw new AppError('Favorite not found', 404);
    }

    // Update caches
    await Promise.all([
      CacheService.setFavoriteCheck(req.user!._id.toString(), propertyId, false),
      CacheService.invalidateFavorites(req.user!._id.toString()),
    ]);

    res.json({
      success: true,
      message: 'Property removed from favorites',
    });
  } catch (error) {
    next(error);
  }
});

// Check if property is favorited
router.get('/check/:propertyId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid property ID', 400);
    }

    // Try cache first
    let isFavorite = await CacheService.getFavoriteCheck(req.user!._id.toString(), propertyId);
    
    if (isFavorite === null) {
      const favorite = await Favorite.findOne({
        userId: req.user!._id,
        propertyId,
      });
      isFavorite = !!favorite;
      
      // Cache the result
      await CacheService.setFavoriteCheck(req.user!._id.toString(), propertyId, isFavorite);
    }

    res.json({
      success: true,
      data: {
        isFavorite,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;