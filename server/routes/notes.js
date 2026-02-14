import express from 'express';
import { supabase } from '../config/supabase.js';
import { validateRequest } from '../validation/middleware.js';
import {
  CreateNoteInputSchema,
  UpdateNoteInputSchema,
} from '../validation/schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../errors/errorHandler.js';
import { AppErrors } from '../errors/AppError.js';
import logger from '../logger/winston.config.js';

const router = express.Router();

/**
 * GET /api/notes
 * Get all notes for the authenticated user
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    logger.debug('Fetching notes', { userId, requestId: req.id });

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      logger.error('Failed to fetch notes', { userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.debug('Notes fetched', { userId, count: notes?.length || 0, requestId: req.id });

    res.json({ notes: notes || [] });
  })
);

/**
 * GET /api/notes/:id
 * Get a specific note
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    logger.debug('Fetching note', { noteId: id, userId, requestId: req.id });

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.warn('Note not found', { noteId: id, userId, requestId: req.id });
      throw AppErrors.NOT_FOUND('Note');
    }

    logger.debug('Note fetched', { noteId: id, userId, requestId: req.id });

    res.json({ note });
  })
);

/**
 * POST /api/notes
 * Create a new note
 * Body: { title, content, folderId?, is_recording? }
 */
router.post(
  '/',
  authenticateToken,
  validateRequest(CreateNoteInputSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { title, content, folderId, is_recording } = req.body;

    logger.info('Creating note', { title, userId, requestId: req.id });

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title,
        content,
        folder_id: folderId,
        is_recording: is_recording || false,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create note', { title, userId, error: error.message, requestId: req.id });
      throw AppErrors.DATABASE_ERROR();
    }

    logger.info('Note created', { noteId: note?.id, userId, requestId: req.id });

    res.status(201).json({ note });
  })
);

/**
 * PUT /api/notes/:id
 * Update a note
 * Body: partial { title?, content?, folderId?, is_recording? }
 */
router.put(
  '/:id',
  authenticateToken,
  validateRequest(UpdateNoteInputSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, content, folderId, is_recording } = req.body;

    logger.info('Updating note', { noteId: id, userId, requestId: req.id });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (folderId !== undefined) updates.folder_id = folderId;
    if (is_recording !== undefined) updates.is_recording = is_recording;

    const { data: note, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.warn('Failed to update note', { noteId: id, userId, error: error.message, requestId: req.id });
      throw AppErrors.NOT_FOUND('Note');
    }

    logger.info('Note updated', { noteId: id, userId, requestId: req.id });

    res.json({ note });
  })
);

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info('Deleting note', { noteId: id, userId, requestId: req.id });

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.warn('Failed to delete note', { noteId: id, userId, error: error.message, requestId: req.id });
      throw AppErrors.NOT_FOUND('Note');
    }

    logger.info('Note deleted', { noteId: id, userId, requestId: req.id });

    res.json({ message: 'Note deleted successfully' });
  })
);

export default router;

