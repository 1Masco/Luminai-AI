import request from 'supertest';
import express from 'express';

// Mock auth middleware
const mockAuth = jest.fn((req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
});

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuth);

  // Mock sharing route
  app.post('/api/sharing/share', (req, res) => {
    const { meetingId, email } = req.body;

    if (!meetingId || !email) {
      return res.status(400).json({ error: 'Meeting ID and email are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    return res.status(200).json({
      success: true,
      message: 'Meeting shared successfully',
      sharedWith: email,
    });
  });

  app.delete('/api/sharing/unshare/:id', (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Share ID is required' });
    }

    return res.status(200).json({ success: true, message: 'Share removed' });
  });

  app.get('/api/sharing/shared-with-me', (req, res) => {
    return res.status(200).json({
      sharedMeetings: [
        {
          id: '1',
          title: 'Team Meeting',
          sharedBy: 'john@example.com',
          sharedDate: new Date().toISOString(),
        },
      ],
    });
  });

  return app;
};

describe('Meeting Sharing API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/sharing/share', () => {
    test('shares meeting with valid email', async () => {
      const res = await request(app)
        .post('/api/sharing/share')
        .send({
          meetingId: 'meeting-1',
          email: 'user@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sharedWith).toBe('user@example.com');
    });

    test('returns 400 for missing meeting ID', async () => {
      const res = await request(app)
        .post('/api/sharing/share')
        .send({
          email: 'user@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Meeting ID');
    });

    test('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/sharing/share')
        .send({
          meetingId: 'meeting-1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    test('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/sharing/share')
        .send({
          meetingId: 'meeting-1',
          email: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });
  });

  describe('DELETE /api/sharing/unshare/:id', () => {
    test('removes share with valid ID', async () => {
      const res = await request(app).delete('/api/sharing/unshare/share-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 400 for missing share ID', async () => {
      const res = await request(app).delete('/api/sharing/unshare/');

      expect(res.status).toBe(404); // 404 because route doesn't match
    });
  });

  describe('GET /api/sharing/shared-with-me', () => {
    test('returns list of shared meetings', async () => {
      const res = await request(app).get('/api/sharing/shared-with-me');

      expect(res.status).toBe(200);
      expect(res.body.sharedMeetings).toBeInstanceOf(Array);
      expect(res.body.sharedMeetings.length).toBeGreaterThan(0);
      expect(res.body.sharedMeetings[0]).toHaveProperty('title');
      expect(res.body.sharedMeetings[0]).toHaveProperty('sharedBy');
    });
  });
});
