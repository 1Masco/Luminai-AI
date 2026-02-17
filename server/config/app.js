import logger from './logger/winston.config.js';

// Load environment variables
const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),

  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
  },

  // Gemini provider
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  // AI provider selection
  ai: {
    providerMode: process.env.AI_PROVIDER_MODE || 'balanced',
    providerCooldownMs: parseInt(process.env.AI_PROVIDER_COOLDOWN_MS, 10) || 600000,
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/calendar/callback/google`,
  },

  // Microsoft/Outlook OAuth
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/calendar/callback/outlook`,
    authority: 'https://login.microsoftonline.com/common',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
};

// Validate required configuration
const requiredConfigs = ['supabase.url', 'supabase.serviceRoleKey'];
const missingConfigs = requiredConfigs.filter(configPath => {
  const value = configPath.split('.').reduce((obj, key) => obj?.[key], config);
  return !value;
});

if (!config.openai.apiKey && !config.gemini.apiKey) {
  missingConfigs.push('openai.apiKey|gemini.apiKey');
}

if (missingConfigs.length > 0) {
  logger.warn('Missing configuration values', { missingConfigs });
}

export default config;
