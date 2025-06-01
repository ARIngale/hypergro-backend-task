import express from 'express';
import mongoose from 'mongoose';
import { Recommendation } from '../models/Recommendation';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { recommendationSchema } from '../utils/validation';
import { CacheService } from '../services/cacheService';

const router = express.Router();

// GET received recommendations
router.get('/received', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    // Try cache first
    const cachedResult = await CacheService.getRecommendations(req.user!._id.toString(), 'received', pageNum);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const skip = (pageNum - 1) * limitNum;
    const filter: any = { toUserId: req.user!._id };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [recommendations, total] = await Promise.all([
      Recommendation.find(filter)
        .populate([
          {
            path: 'fromUserId',
            select: 'firstName lastName email',
          },
          {
            path: 'propertyId',
            populate: {
              path: 'createdBy',
              select: 'firstName lastName email',
            },
          },
        ])
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Recommendation.countDocuments(filter),
    ]);

    // Filter out recommendations where property might have been deleted
    const validRecommendations = recommendations.filter(rec => rec.propertyId);

    const result = {
      success: true,
      data: {
        recommendations: validRecommendations,
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
    await CacheService.setRecommendations(req.user!._id.toString(), 'received', pageNum, result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET sent recommendations
router.get('/sent', authenticate, async (req: AuthRequest, res, next) => {
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
    const cachedResult = await CacheService.getRecommendations(req.user!._id.toString(), 'sent', pageNum);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const skip = (pageNum - 1) * limitNum;
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [recommendations, total] = await Promise.all([
      Recommendation.find({ fromUserId: req.user!._id })
        .populate([
          {
            path: 'toUserId',
            select: 'firstName lastName email',
          },
          {
            path: 'propertyId',
            populate: {
              path: 'createdBy',
              select: 'firstName lastName email',
            },
          },
        ])
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Recommendation.countDocuments({ fromUserId: req.user!._id }),
    ]);

    // Filter out recommendations where property might have been deleted
    const validRecommendations = recommendations.filter(rec => rec.propertyId);

    const result = {
      success: true,
      data: {
        recommendations: validRecommendations,
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
    await CacheService.setRecommendations(req.user!._id.toString(), 'sent', pageNum, result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET recommendation statistics
router.get('/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Try cache first
    const cachedStats = await CacheService.getRecommendationStats(req.user!._id.toString());
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const [sentCount, receivedCount, unreadCount] = await Promise.all([
      Recommendation.countDocuments({ fromUserId: req.user!._id }),
      Recommendation.countDocuments({ toUserId: req.user!._id }),
      Recommendation.countDocuments({ toUserId: req.user!._id, isRead: false }),
    ]);

    const result = {
      success: true,
      data: {
        sentRecommendations: sentCount,
        receivedRecommendations: receivedCount,
        unreadRecommendations: unreadCount,
      },
    };

    // Cache the stats
    await CacheService.setRecommendationStats(req.user!._id.toString(), result);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// CREATE recommendation
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = recommendationSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { toUserEmail, propertyId, message } = value;

    // Check if property exists (try cache first)
    let property = await CacheService.getProperty(propertyId);
    if (!property) {
      property = await Property.findById(propertyId);
      if (!property) {
        throw new AppError('Property not found', 404);
      }
      await CacheService.setProperty(property);
    }

    // Find recipient user by email
    const toUser = await User.findOne({ email: toUserEmail, isActive: true });
    if (!toUser) {
      throw new AppError('Recipient user not found', 404);
    }

    // Check if user is trying to recommend to themselves
    if (toUser._id.toString() === req.user!._id.toString()) {
      throw new AppError('You cannot recommend a property to yourself', 400);
    }

    // Check if recommendation already exists
    const existingRecommendation = await Recommendation.findOne({
      fromUserId: req.user!._id,
      toUserId: toUser._id,
      propertyId,
    });

    if (existingRecommendation) {
      throw new AppError('You have already recommended this property to this user', 400);
    }

    // Create recommendation
    const recommendation = new Recommendation({
      fromUserId: req.user!._id,
      toUserId: toUser._id,
      propertyId,
      message,
    });

    await recommendation.save();
    await recommendation.populate([
      {
        path: 'fromUserId',
        select: 'firstName lastName email',
      },
      {
        path: 'toUserId',
        select: 'firstName lastName email',
      },
      {
        path: 'propertyId',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName email',
        },
      },
    ]);

    // Invalidate related caches
    await Promise.all([
      CacheService.invalidateRecommendations(req.user!._id.toString()),
      CacheService.invalidateRecommendations(toUser._id.toString()),
    ]);

    res.status(201).json({
      success: true,
      message: 'Property recommendation sent successfully',
      data: {
        recommendation,
      },
    });
  } catch (error) {
    next(error);
  }
});

// MARK as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid recommendation ID', 400);
    }

    const recommendation = await Recommendation.findOneAndUpdate(
      {
        _id: id,
        toUserId: req.user!._id,
      },
      { isRead: true },
      { new: true }
    ).populate([
      {
        path: 'fromUserId',
        select: 'firstName lastName email',
      },
      {
        path: 'propertyId',
        populate: {
          path: 'createdBy',
          select: 'firstName lastName email',
        },
      },
    ]);

    if (!recommendation) {
      throw new AppError('Recommendation not found', 404);
    }

    // Invalidate related caches
    await CacheService.invalidateRecommendations(req.user!._id.toString());

    res.json({
      success: true,
      message: 'Recommendation marked as read',
      data: {
        recommendation,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;