import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { validateRequest } from '../validation/middleware.js';
import {
  SignupInputSchema,
  LoginInputSchema,
  UpdateProfileInputSchema,
  ForgotPasswordSchema,
  RefreshTokenSchema,
  ResendVerificationSchema,
} from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

// Auth-specific rate limiters (stricter than global)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many authentication attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: { error: 'Too many password reset requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

/**
 * POST /api/auth/signup
 * Create a new user account
 * Body: { email, password, name }
 */
router.post(
  '/signup',
  authLimiter,
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
  authLimiter,
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

    // Enforce email verification
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      logger.warn('Unverified email login attempt', { email, requestId: req.id });
      throw new AppError('Please verify your email before logging in.', 403, 'AUTH_EMAIL_NOT_VERIFIED');
    }

    logger.info('Login successful', { userId: data.user?.id, email, requestId: req.id });

    res.json({
      user: data.user,
      session: data.session,
    });
  })
);

/**
 * POST /api/auth/forgot-password
 * Send a password reset email
 * Body: { email }
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateRequest(ForgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info('Password reset request', { email, requestId: req.id });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#type=recovery`,
    });

    if (error) {
      logger.warn('Password reset failed', { email, error: error.message, requestId: req.id });
      // Don't reveal whether the email exists or not
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh an expired session token
 * Body: { refresh_token }
 */
router.post(
  '/refresh',
  validateRequest(RefreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    logger.debug('Token refresh request', { requestId: req.id });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      logger.warn('Token refresh failed', { error: error.message, requestId: req.id });
      throw AppErrors.TOKEN_EXPIRED();
    }

    logger.debug('Token refreshed successfully', { userId: data.user?.id, requestId: req.id });

    res.json({
      session: data.session,
      user: data.user,
    });
  })
);

/**
 * POST /api/auth/resend-verification
 * Resend the email verification link
 * Body: { email }
 */
router.post(
  '/resend-verification',
  passwordResetLimiter,
  validateRequest(ResendVerificationSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info('Resend verification request', { email, requestId: req.id });

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      logger.warn('Resend verification failed', { email, error: error.message, requestId: req.id });
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account with that email exists, a verification email has been sent.' });
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
