import express from 'express';
import { supabase } from '../config/supabase.js';
import { validateRequest, validateParams } from '../validation/middleware.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  ShareMeetingInputSchema,
  UnshareParamsSchema,
  MarkViewedParamsSchema,
  SharesListParamsSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppError, AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

/**
 * GET /api/sharing/shared-with-me
 * Get all meetings shared with the current user
 */
router.get(
  '/shared-with-me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.debug('Fetching shared meetings', { userId, requestId: req.id });

    const { data: sharedItems, error } = await supabase
      .from('shared_meetings')
      .select(`
        id,
        permission,
        viewed_at,
        created_at,
        shared_by_name,
        shared_by_email,
        meeting:meetings (
          id,
          title,
          date,
          duration,
          summary,
          sentiment,
          transcript
        )
      `)
      .eq('shared_with_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch shared meetings', { userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    // Flatten the response
    const items = (sharedItems || []).map(item => ({
      shareId: item.id,
      permission: item.permission,
      viewedAt: item.viewed_at,
      sharedAt: item.created_at,
      sharedBy: item.shared_by_name,
      sharedByEmail: item.shared_by_email,
      meeting: item.meeting
    }));

    logger.info('Shared meetings fetched', { userId, count: items.length, requestId: req.id });

    res.json({ sharedItems: items });
  })
);

/**
 * POST /api/sharing/share
 * Share a meeting with another user by email
 * Body: { meetingId, email, permission? }
 */
router.post(
  '/share',
  authenticateToken,
  validateRequest(ShareMeetingInputSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { meetingId, email, permission = 'view' } = req.body;

    logger.info('Share meeting request', { meetingId, email, userId, requestId: req.id });

    // Verify the current user owns the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title')
      .eq('id', meetingId)
      .eq('user_id', userId)
      .single();

    if (meetingError || !meeting) {
      logger.warn('Meeting not found or not owned by user', { meetingId, userId, requestId: req.id });
      throw AppErrors.NOT_FOUND('Meeting');
    }

    // Find the recipient user by email
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users) {
      logger.error('Failed to list users', { error: usersError?.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    const recipientUser = users.find(u => u.email === email);

    if (!recipientUser) {
      logger.warn('User not found by email', { email, requestId: req.id });
      throw new AppError('User with that email not found. They need a Lumina account.', 404, 'USER_NOT_FOUND');
    }

    const recipientId = recipientUser.id;

    // Prevent sharing with yourself
    if (recipientId === userId) {
      logger.warn('Attempted self-share', { userId, requestId: req.id });
      throw new AppError('You cannot share a meeting with yourself', 400, 'INVALID_SHARE_TARGET');
    }

    // Get sharer's profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('shared_meetings')
      .upsert({
        meeting_id: meetingId,
        owner_id: userId,
        shared_with_id: recipientId,
        shared_by_name: profile?.name || req.user.email || 'Unknown',
        shared_by_email: req.user.email,
        permission
      }, {
        onConflict: 'meeting_id,shared_with_id'
      })
      .select()
      .single();

    if (shareError) {
      logger.error('Failed to share meeting', { meetingId, email, error: shareError.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Meeting shared', { meetingId, email, userId, shareId: share?.id, requestId: req.id });

    res.status(201).json({ share, message: `Meeting shared with ${email}` });
  })
);

/**
 * DELETE /api/sharing/unshare/:shareId
 * Remove a share (owner) or remove from shared list (recipient)
 */
router.delete(
  '/unshare/:shareId',
  authenticateToken,
  validateParams(UnshareParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { shareId } = req.params;

    logger.info('Unshare request', { shareId, userId, requestId: req.id });

    const { error } = await supabase
      .from('shared_meetings')
      .delete()
      .eq('id', shareId)
      .or(`owner_id.eq.${userId},shared_with_id.eq.${userId}`);

    if (error) {
      logger.error('Failed to remove share', { shareId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Share removed', { shareId, userId, requestId: req.id });

    res.json({ message: 'Share removed successfully' });
  })
);

/**
 * PUT /api/sharing/mark-viewed/:shareId
 * Mark a shared meeting as viewed
 */
router.put(
  '/mark-viewed/:shareId',
  authenticateToken,
  validateParams(MarkViewedParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { shareId } = req.params;

    logger.debug('Mark viewed request', { shareId, userId, requestId: req.id });

    const { data, error } = await supabase
      .from('shared_meetings')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('shared_with_id', userId)
      .select()
      .single();

    if (error) {
      logger.warn('Failed to mark viewed', { shareId, error: error.message, requestId: req.id });
      throw AppErrors.NOT_FOUND('Share');
    }

    logger.info('Marked as viewed', { shareId, userId, requestId: req.id });

    res.json({ share: data });
  })
);

/**
 * GET /api/sharing/shares/:meetingId
 * Get all shares for a specific meeting (owner only)
 */
router.get(
  '/shares/:meetingId',
  authenticateToken,
  validateParams(SharesListParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { meetingId } = req.params;

    logger.debug('Fetching shares for meeting', { meetingId, userId, requestId: req.id });

    // Verify owner
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', meetingId)
      .eq('user_id', userId)
      .single();

    if (meetingError || !meeting) {
      logger.warn('Meeting not found or not owned', { meetingId, userId, requestId: req.id });
      throw AppErrors.PERMISSION_DENIED();
    }

    const { data: shares, error } = await supabase
      .from('shared_meetings')
      .select('id, shared_by_name, shared_by_email, permission, created_at')
      .eq('meeting_id', meetingId)
      .eq('owner_id', userId);

    if (error) {
      logger.error('Failed to fetch shares', { meetingId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Shares fetched', { meetingId, count: (shares || []).length, requestId: req.id });

    res.json({ shares: shares || [] });
  })
);

export default router;
