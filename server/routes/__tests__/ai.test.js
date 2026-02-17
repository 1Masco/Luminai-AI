import request from 'supertest';
import express from 'express';

// Mock auth middleware
const mockAuth = jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
});

// Create a minimal test app for AI routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);

  // Mock transcription route
  app.post('/api/ai/transcribe-audio', (req, res) => {
    const { audioData, mimeType } = req.body;

    if (!audioData || !mimeType) {
      return res.status(400).json({ error: 'Missing audio data or mime type' });
    }

    return res.status(200).json({
      transcript: 'This is a test transcription of the meeting content',
      duration: 120,
      mimeType,
    });
  });

  // Mock summary generation route
  app.post('/api/ai/generate-summary', (req, res) => {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    return res.status(200).json({
      summary: 'Meeting summary with key points',
      actionItems: [
        { task: 'Follow up with team', assignee: 'John' },
        { task: 'Review documentation', assignee: 'Jane' },
      ],
      sentiment: 'positive',
    });
  });

  // Mock chat route
  app.post('/api/ai/chat', (req, res) => {
    const { transcript, question } = req.body;

    if (!transcript || !question) {
      return res.status(400).json({ error: 'Missing transcript or question' });
    }

    if (question.trim().length === 0) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    return res.status(200).json({
      answer:
        'Based on the meeting transcript, the answer to your question is...',
      followUpQuestions: [
        'What happened next?',
        'Can you clarify that point?',
      ],
    });
  });

  return app;
};

describe('AI Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/ai/transcribe-audio', () => {
    test('transcribes audio with valid data', async () => {
      const res = await request(app)
        .post('/api/ai/transcribe-audio')
        .send({
          audioData: 'data:audio/mp3;base64,SGVsbG8gd29ybGQ=',
          mimeType: 'audio/mp3',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('transcript');
      expect(res.body).toHaveProperty('duration');
      expect(typeof res.body.transcript).toBe('string');
    });

    test('returns 400 for missing audio data', async () => {
      const res = await request(app)
        .post('/api/ai/transcribe-audio')
        .send({
          mimeType: 'audio/mp3',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('audio data');
    });

    test('returns 400 for missing mime type', async () => {
      const res = await request(app)
        .post('/api/ai/transcribe-audio')
        .send({
          audioData: 'data:audio/mp3;base64,SGVsbG8gd29ybGQ=',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mime type');
    });
  });

  describe('POST /api/ai/generate-summary', () => {
    test('generates summary from transcript', async () => {
      const transcript = 'The team discussed the new feature implementation...';

      const res = await request(app)
        .post('/api/ai/generate-summary')
        .send({ transcript });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('actionItems');
      expect(res.body).toHaveProperty('sentiment');
      expect(Array.isArray(res.body.actionItems)).toBe(true);
    });

    test('returns 400 for missing transcript', async () => {
      const res = await request(app)
        .post('/api/ai/generate-summary')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('transcript');
    });
  });

  describe('POST /api/ai/chat', () => {
    test('answers question about transcript', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          transcript: 'The meeting discussed quarterly goals...',
          question: 'What were the main topics discussed?',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('answer');
      expect(typeof res.body.answer).toBe('string');
    });

    test('returns 400 for missing transcript', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          question: 'What was discussed?',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('transcript');
    });

    test('returns 400 for missing question', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          transcript: 'The meeting content...',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('question');
    });

    test('returns 400 for empty question', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          transcript: 'The meeting content...',
          question: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('empty');
    });

    test('includes follow-up questions in response', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({
          transcript: 'The meeting discussed new features...',
          question: 'What features were mentioned?',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('followUpQuestions');
      expect(Array.isArray(res.body.followUpQuestions)).toBe(true);
    });
  });
});
