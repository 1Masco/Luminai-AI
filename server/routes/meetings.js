import express from 'express';
import { supabase } from '../config/supabase.js';
import { validateRequest } from '../validation/middleware.js';
import {
  CreateMeetingInputSchema,
  UpdateMeetingInputSchema,
} from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

/**
 * GET /api/meetings
 * Get all meetings for the authenticated user
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.debug('Fetching meetings', { userId, requestId: req.id });

    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      logger.error('Failed to fetch meetings', { userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.debug('Meetings fetched', { userId, count: meetings?.length || 0, requestId: req.id });

    res.json({ meetings: meetings || [] });
  })
);

/**
 * GET /api/meetings/:id
 * Get a specific meeting
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    logger.debug('Fetching meeting', { meetingId: id, userId, requestId: req.id });

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.warn('Meeting not found', { meetingId: id, userId, requestId: req.id });
      throw AppErrors.NOT_FOUND('Meeting');
    }

    logger.debug('Meeting fetched', { meetingId: id, userId, requestId: req.id });

    res.json({ meeting });
  })
);

/**
 * POST /api/meetings
 * Create a new meeting
 * Body: { title, date, duration?, transcript?, summary?, actionItems?, sentiment? }
 */
router.post(
  '/',
  authenticateToken,
  validateRequest(CreateMeetingInputSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { title, date, duration, transcript, summary, actionItems, sentiment, meetingAnalytics, followUpData } = req.body;

    logger.info('Creating meeting', { title, userId, requestId: req.id });

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        user_id: userId,
        title,
        date,
        duration: duration || 0,
        transcript: transcript || [],
        summary,
        action_items: actionItems, // Use action_items for DB column
        sentiment,
        meeting_analytics: meetingAnalytics || null,
        follow_up_data: followUpData || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create meeting', { title, userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Meeting created', { meetingId: meeting?.id, userId, requestId: req.id });

    res.status(201).json({ meeting });
  })
);

/**
 * PUT /api/meetings/:id
 * Update a meeting
 * Body: partial { title?, date?, duration?, transcript?, summary?, actionItems?, sentiment? }
 */
router.put(
  '/:id',
  authenticateToken,
  validateRequest(UpdateMeetingInputSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, date, duration, transcript, summary, actionItems, sentiment, meetingAnalytics, followUpData } = req.body;

    logger.info('Updating meeting', { meetingId: id, userId, requestId: req.id });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (date !== undefined) updates.date = date;
    if (duration !== undefined) updates.duration = duration;
    if (transcript !== undefined) updates.transcript = transcript;
    if (summary !== undefined) updates.summary = summary;
    if (actionItems !== undefined) updates.action_items = actionItems; // Use action_items for DB column
    if (sentiment !== undefined) updates.sentiment = sentiment;
    if (meetingAnalytics !== undefined) updates.meeting_analytics = meetingAnalytics;
    if (followUpData !== undefined) updates.follow_up_data = followUpData;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.warn('Failed to update meeting', { meetingId: id, userId, error: error.message, requestId: req.id });
      throw AppErrors.NOT_FOUND('Meeting');
    }

    logger.info('Meeting updated', { meetingId: id, userId, requestId: req.id });

    res.json({ meeting });
  })
);

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info('Deleting meeting', { meetingId: id, userId, requestId: req.id });

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.warn('Failed to delete meeting', { meetingId: id, userId, error: error.message, requestId: req.id });
      throw AppErrors.NOT_FOUND('Meeting');
    }

    logger.info('Meeting deleted', { meetingId: id, userId, requestId: req.id });

    res.json({ message: 'Meeting deleted successfully' });
  })
);

export default router;

