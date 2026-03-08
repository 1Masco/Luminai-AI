import { z } from 'zod';

export const SignupInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const PhoneOTPSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
});

export const CreateMeetingInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  date: z.string().datetime('Invalid date format'),
  duration: z.number().int().nonnegative('Duration must be non-negative').optional().default(0),
  transcript: z.array(
    z.object({
      id: z.string(),
      speaker: z.string(),
      text: z.string(),
      timestamp: z.number().nonnegative(),
    })
  ).optional().default([]),
  summary: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  notes: z.string().optional(),
  meetingAnalytics: z.any().optional(),
  followUpData: z.any().optional(),
});

export const UpdateMeetingInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().datetime().optional(),
  duration: z.number().int().nonnegative().optional(),
  transcript: z.array(
    z.object({
      id: z.string(),
      speaker: z.string(),
      text: z.string(),
      timestamp: z.number().nonnegative(),
    })
  ).optional(),
  summary: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  meetingAnalytics: z.any().optional(),
  followUpData: z.any().optional(),
});

export const CreateNoteInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  folderId: z.string().optional(),
});

export const UpdateNoteInputSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  folderId: z.string().optional(),
});

export const ShareMeetingInputSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  email: z.string().email('Invalid email address'),
  permission: z.enum(['view', 'comment']).default('view'),
});

export const TranscribeAudioInputSchema = z.object({
  audioData: z.string().min(1, 'Audio data is required'),
  mimeType: z.string().regex(/^audio\//, 'Invalid audio mime type'),
  fileName: z.string().optional(),
  language: z.string().optional().default('en'), // BCP-47 language code, e.g. 'en', 'es', 'fr', 'auto'
});

export const GenerateSummaryInputSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
});

export const AnalyzeMeetingInputSchema = z.object({
  transcript: z.array(
    z.object({
      id: z.string().optional(),
      speaker: z.string(),
      text: z.string(),
      timestamp: z.number().nonnegative(),
    })
  ).min(1, 'Transcript is required'),
  duration: z.number().int().nonnegative().optional().default(0),
});

export const GenerateFollowUpInputSchema = z.object({
  transcript: z.array(
    z.object({
      id: z.string().optional(),
      speaker: z.string(),
      text: z.string(),
      timestamp: z.number().nonnegative(),
    })
  ).min(1, 'Transcript is required'),
  title: z.string().optional().default('Meeting'),
});

export const ChatInputSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  question: z.string().min(1, 'Question cannot be empty').max(1000, 'Question too long'),
});

export const RefineNoteInputSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content is too long'),
});

export const ProcessPDFInputSchema = z.object({
  fileData: z.string().min(1, 'File data is required'),
  fileName: z.string().min(1, 'File name is required'),
});

export const CloudDownloadInputSchema = z.object({
  url: z.string().url('Invalid URL'),
  source: z.enum(['google_drive', 'dropbox'], { errorMap: () => ({ message: 'Source must be google_drive or dropbox' }) }),
  fileName: z.string().min(1, 'File name is required').optional(),
});

export const MarkViewedParamsSchema = z.object({
  shareId: z.string().uuid('Invalid share ID'),
});

export const UnshareParamsSchema = z.object({
  shareId: z.string().uuid('Invalid share ID'),
});

export const SharesListParamsSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID'),
});

export const CallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'User ID is required'),
});

export const ConnectCalendarInputSchema = z.object({
  provider: z.enum(['google', 'outlook']),
  code: z.string().min(1, 'Authorization code is required'),
});

export const DisconnectCalendarInputSchema = z.object({
  provider: z.enum(['google', 'outlook']),
});

export const DisconnectCalendarParamsSchema = z.object({
  provider: z.enum(['google', 'outlook']),
});

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  phone: z.string().optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  plan: z.string().optional(),
  connected_apps: z.record(z.boolean()).optional(),
});
