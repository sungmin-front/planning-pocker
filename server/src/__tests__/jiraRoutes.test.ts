import request from 'supertest';
import express from 'express';
import { jiraRouter } from '../routes/jiraRoutes';
import { jiraClient } from '../jiraClient';

// Mock the jiraClient
jest.mock('../jiraClient');
const mockedJiraClient = jiraClient as jest.Mocked<typeof jiraClient>;

describe('Jira Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/jira', jiraRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/jira/status', () => {
    it('should return not configured when Jira is not set up', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/jira/status')
        .expect(200);

      expect(response.body).toEqual({
        configured: false,
        connected: false,
        message: 'Jira is not configured. Please set environment variables.'
      });
    });

    it('should return connection status when Jira is configured', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.testConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/jira/status')
        .expect(200);

      expect(response.body).toEqual({
        configured: true,
        connected: true,
        message: 'Jira connection successful'
      });
    });

    it('should handle connection test failure', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.testConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/jira/status')
        .expect(200);

      expect(response.body).toEqual({
        configured: true,
        connected: false,
        message: 'Jira connection failed'
      });
    });

    it('should handle errors gracefully', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.testConnection.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/jira/status')
        .expect(500);

      expect(response.body).toEqual({
        configured: false,
        connected: false,
        message: 'Error checking Jira status'
      });
    });
  });

  describe('GET /api/jira/boards', () => {
    it('should return error when Jira is not configured', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/jira/boards')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Jira is not configured'
      });
    });

    it('should return boards when Jira is configured', async () => {
      const mockBoards = [
        { id: 1, name: 'Test Board 1', type: 'scrum' },
        { id: 2, name: 'Test Board 2', type: 'kanban' }
      ];

      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.getBoards.mockResolvedValue(mockBoards);

      const response = await request(app)
        .get('/api/jira/boards')
        .expect(200);

      expect(response.body).toEqual({
        boards: mockBoards
      });
      expect(mockedJiraClient.getBoards).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.getBoards.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .get('/api/jira/boards')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch boards from Jira'
      });
    });
  });

  describe('GET /api/jira/boards/:boardId/sprints', () => {
    it('should return error for invalid board ID', async () => {
      const response = await request(app)
        .get('/api/jira/boards/invalid/sprints')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid board ID'
      });
    });

    it('should return error when Jira is not configured', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/jira/boards/123/sprints')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Jira is not configured'
      });
    });

    it('should return sprints for valid board ID', async () => {
      const mockSprints = [
        { id: 1, name: 'Sprint 1', state: 'active' as const },
        { id: 2, name: 'Sprint 2', state: 'future' as const }
      ];

      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.getSprints.mockResolvedValue(mockSprints);

      const response = await request(app)
        .get('/api/jira/boards/123/sprints')
        .expect(200);

      expect(response.body).toEqual({
        sprints: mockSprints
      });
      expect(mockedJiraClient.getSprints).toHaveBeenCalledWith(123);
    });

    it('should handle fetch errors', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.getSprints.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .get('/api/jira/boards/123/sprints')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch sprints from Jira'
      });
    });
  });

  describe('GET /api/jira/sprints/:sprintId/issues', () => {
    it('should return error for invalid sprint ID', async () => {
      const response = await request(app)
        .get('/api/jira/sprints/invalid/issues')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid sprint ID'
      });
    });

    it('should return error when Jira is not configured', async () => {
      mockedJiraClient.isJiraConfigured.mockReturnValue(false);

      const response = await request(app)
        .get('/api/jira/sprints/123/issues')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Jira is not configured'
      });
    });

    it('should return issues for valid sprint ID', async () => {
      const mockIssues = [
        {
          id: '10001',
          key: 'TEST-1',
          summary: 'Test Issue',
          issueType: { name: 'Story', iconUrl: '' },
          status: { name: 'Open', statusCategory: { name: 'To Do' } }
        }
      ];

      mockedJiraClient.isJiraConfigured.mockReturnValue(true);
      mockedJiraClient.getSprintIssues.mockResolvedValue(mockIssues as any);

      const response = await request(app)
        .get('/api/jira/sprints/123/issues')
        .expect(200);

      expect(response.body).toEqual({
        issues: mockIssues
      });
      expect(mockedJiraClient.getSprintIssues).toHaveBeenCalledWith(123);
    });
  });

  describe('POST /api/jira/issues/import', () => {
    it('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/jira/issues/import')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'roomId and issues array are required'
      });
    });

    it('should return error when issues is not an array', async () => {
      const response = await request(app)
        .post('/api/jira/issues/import')
        .send({
          roomId: 'TEST123',
          issues: 'not-an-array'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'roomId and issues array are required'
      });
    });

    it('should convert Jira issues to stories successfully', async () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      
      const mockIssues = [
        {
          key: 'TEST-1',
          summary: 'Test Issue 1',
          description: 'Test description',
          issueType: { name: 'Story' },
          status: { name: 'Open' },
          assignee: { displayName: 'John Doe' },
          priority: { name: 'High' },
          storyPoints: 8
        },
        {
          key: 'TEST-2',
          summary: 'Test Issue 2',
          description: '',
          issueType: { name: 'Bug' },
          status: { name: 'In Progress' },
          assignee: null,
          priority: null,
          storyPoints: null
        }
      ];

      const response = await request(app)
        .post('/api/jira/issues/import')
        .send({
          roomId: 'TEST123',
          issues: mockIssues
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stories).toHaveLength(2);
      expect(response.body.stories[0]).toEqual({
        title: '[TEST-1] Test Issue 1',
        description: expect.stringContaining('Test description')
      });
      expect(response.body.stories[0].description).toContain('**Issue Type:** Story');
      expect(response.body.stories[0].description).toContain('**Status:** Open');
      expect(response.body.stories[0].description).toContain('**Assignee:** John Doe');
      expect(response.body.stories[0].description).toContain('**Priority:** High');
      expect(response.body.stories[0].description).toContain('**Story Points:** 8');
      expect(response.body.stories[0].description).toContain('**Jira Link:** https://test.atlassian.net/browse/TEST-1');
    });

    it('should handle conversion errors', async () => {
      const response = await request(app)
        .post('/api/jira/issues/import')
        .send({
          roomId: 'TEST123',
          issues: [{ invalidStructure: true }]
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to import Jira issues'
      });
    });
  });
});