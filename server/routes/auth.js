import express from 'express';
import { supabase } from '../config/supabase.js';
import { validateRequest } from '../validation/middleware.js';
import {
  SignupInputSchema,
  LoginInputSchema,
  UpdateProfileInputSchema,
} from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account
 * Body: { email, password, name }
 */
router.post(
  '/signup',
  validateRequest(SignupInputSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    logger.info('Signup attempt', { email, requestId: req.id });

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || 'User',
        },
      },
    });

    if (error) {
      logger.warn('Signup failed', { email, error: error.message, requestId: req.id });

      // Handle specific Supabase errors
      if (error.message.includes('already registered')) {
        throw AppErrors.ALREADY_EXISTS('Email');
      }

      throw new AppError(error.message, 400, 'AUTH_SIGNUP_FAILED');
    }

    logger.info('Signup successful', { userId: data.user?.id, email, requestId: req.id });

    res.status(201).json({
      user: data.user,
      session: data.session,
    });
  })
);

/**
 * POST /api/auth/login
 * Sign in with email and password
 * Body: { email, password }
 */
router.post(
  '/login',
  validateRequest(LoginInputSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('Login attempt', { email, requestId: req.id });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn('Login failed', { email, requestId: req.id });
      throw AppErrors.INVALID_CREDENTIALS();
    }

    logger.info('Login successful', { userId: data.user?.id, email, requestId: req.id });

    res.json({
      user: data.user,
      session: data.session,
    });
  })
);

/**
 * POST /api/auth/logout
 * Sign out the current user
 */
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.info('Logout request', { userId, requestId: req.id });

    // Supabase sign out doesn't actually require the token in newer versions
    // but we can still call it for consistency
    await supabase.auth.signOut();

    logger.info('Logout successful', { userId, requestId: req.id });

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * GET /api/auth/session
 * Get current session info
 */
router.get(
  '/session',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.debug('Session requested', { userId, requestId: req.id });

    res.json({ user: req.user });
  })
);

/**
 * GET /api/auth/profile
 * Get user profile
 */
router.get(
  '/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.debug('Profile requested', { userId, requestId: req.id });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      logger.warn('Profile not found', { userId, requestId: req.id });
      throw AppErrors.NOT_FOUND('Profile');
    }

    res.json({ profile });
  })
);

/**
 * PUT /api/auth/profile
 * Update user profile
 * Body: partial { name?, phone?, avatar?, plan?, connected_apps? }
 */
router.put(
  '/profile',
  authenticateToken,
  validateRequest(UpdateProfileInputSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, phone, avatar, plan, connected_apps } = req.body;

    logger.info('Profile update request', { userId, requestId: req.id });

    // Build only the fields that were provided
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (plan !== undefined) updates.plan = plan;
    if (connected_apps !== undefined) updates.connected_apps = connected_apps;

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Profile update failed', { userId, error: updateError.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Profile updated', { userId, requestId: req.id });

    res.json({ profile });
  })
);

export default router;

