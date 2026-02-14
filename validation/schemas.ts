import { z } from 'zod';
import { Meeting } from '../types';

/**
 * Frontend validation schemas
 * Can be used for form validation before sending to backend
 */

// Auth
export const AuthFormSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  name: z.string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .optional(),
});

// Meeting
export const MeetingFormSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title is too long'),
  summary: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
});

// Chat
export const ChatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message is too long'),
});

// Note
export const NoteFormSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title is too long'),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content is too long'),
});

// Share
export const ShareMeetingFormSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
  permission: z.enum(['view', 'comment']).default('view'),
});

// Export types
export type AuthForm = z.infer<typeof AuthFormSchema>;
export type MeetingForm = z.infer<typeof MeetingFormSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type NoteForm = z.infer<typeof NoteFormSchema>;
export type ShareMeetingForm = z.infer<typeof ShareMeetingFormSchema>;

/**
 * Validate form data
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

/**
 * Get error message for a specific field
 */
export function getFieldError(errors: Record<string, string>, field: string): string | undefined {
  return errors[field];
}
