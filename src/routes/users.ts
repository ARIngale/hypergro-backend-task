import express from 'express';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { CacheService } from '../services/cacheService';
import { RequestHandler } from 'express';

const router = express.Router();

// Search users by email (for recommendations)
router.get('/search', authenticate, (async (req: AuthRequest, res, next) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email query parameter is required', 400);
    }

    // Try cache first
    const cachedUsers = await CacheService.getUserSearch(email);
    if (cachedUsers) {
      return res.json(cachedUsers);
    }

    // Search for users with email containing the search term
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      isActive: true,
      _id: { $ne: req.user!._id }, // Exclude current user
    })
    .select('firstName lastName email')
    .limit(10)
    .lean();

    const result = {
      success: true,
      data: {
        users,
      },
    };

    // Cache the search result
    await CacheService.setUserSearch(email, result);

    res.json(result);
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// Get user by email (exact match for recommendations)
router.get('/by-email/:email', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
      _id: { $ne: req.user!._id }, // Exclude current user
    })
    .select('firstName lastName email')
    .lean();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;