import { JiraClient } from '../jiraClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('JiraClient', () => {
  let jiraClient: JiraClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_EMAIL;

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn()
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize as not configured when environment variables are missing', () => {
      jiraClient = new JiraClient();
      expect(jiraClient.isJiraConfigured()).toBe(false);
    });

    it('should initialize as configured when all environment variables are present', () => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';

      jiraClient = new JiraClient();
      expect(jiraClient.isJiraConfigured()).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.atlassian.net/rest/api/3',
        headers: {
          'Authorization': expect.stringContaining('Basic '),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    });
  });

  describe('getSprints', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';
      jiraClient = new JiraClient();
    });

    it('should throw error when Jira is not configured', async () => {
      // Clear environment variables
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      const unconfiguredClient = new JiraClient();
      await expect(unconfiguredClient.getSprints(123)).rejects.toThrow('Jira is not configured');
    });

    it('should fetch sprints successfully', async () => {
      const mockSprintData = {
        values: [
          {
            id: 1,
            name: 'Sprint 1',
            state: 'active',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
            goal: 'Complete feature X'
          },
          {
            id: 2,
            name: 'Sprint 2',
            state: 'future',
            startDate: '2024-01-15',
            endDate: '2024-01-28',
            goal: 'Implement feature Y'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockSprintData });

      const result = await jiraClient.getSprints(123);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/board/123/sprint', {
        params: {
          maxResults: 50,
          startAt: 0
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Sprint 1',
        state: 'active',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
        goal: 'Complete feature X'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(jiraClient.getSprints(123)).rejects.toThrow('Failed to fetch sprints from Jira');
    });
  });

  describe('getBoards', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';
      jiraClient = new JiraClient();
    });

    it('should throw error when Jira is not configured', async () => {
      // Clear environment variables
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      const unconfiguredClient = new JiraClient();
      await expect(unconfiguredClient.getBoards()).rejects.toThrow('Jira is not configured');
    });

    it('should fetch boards successfully', async () => {
      const mockBoardData = {
        values: [
          {
            id: 1,
            name: 'Test Board 1',
            type: 'scrum'
          },
          {
            id: 2,
            name: 'Test Board 2',
            type: 'kanban'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockBoardData });

      const result = await jiraClient.getBoards();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/board', {
        params: {
          maxResults: 50,
          startAt: 0
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Test Board 1',
        type: 'scrum'
      });
    });
  });

  describe('getSprintIssues', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';
      jiraClient = new JiraClient();
    });

    it('should fetch sprint issues successfully', async () => {
      const mockIssueData = {
        issues: [
          {
            id: '10001',
            key: 'TEST-1',
            fields: {
              summary: 'Test Issue 1',
              description: '<p>Test description with <strong>HTML</strong></p>',
              issuetype: {
                name: 'Story',
                iconUrl: 'https://example.com/story.png'
              },
              status: {
                name: 'In Progress',
                statusCategory: {
                  name: 'In Progress'
                }
              },
              assignee: {
                displayName: 'John Doe',
                emailAddress: 'john@example.com'
              },
              priority: {
                name: 'High'
              },
              customfield_10016: 8 // Story points
            }
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockIssueData });

      const result = await jiraClient.getSprintIssues(123);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: {
          jql: 'sprint = 123',
          fields: 'summary,description,issuetype,status,assignee,priority,customfield_10016',
          maxResults: 100
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '10001',
        key: 'TEST-1',
        summary: 'Test Issue 1',
        description: 'Test description with HTML', // HTML stripped
        issueType: {
          name: 'Story',
          iconUrl: 'https://example.com/story.png'
        },
        status: {
          name: 'In Progress',
          statusCategory: {
            name: 'In Progress'
          }
        },
        assignee: {
          displayName: 'John Doe',
          emailAddress: 'john@example.com'
        },
        priority: {
          name: 'High'
        },
        storyPoints: 8
      });
    });

    it('should handle issues without optional fields', async () => {
      const mockIssueData = {
        issues: [
          {
            id: '10002',
            key: 'TEST-2',
            fields: {
              summary: 'Test Issue 2',
              description: null,
              issuetype: {
                name: 'Bug',
                iconUrl: 'https://example.com/bug.png'
              },
              status: {
                name: 'Open',
                statusCategory: {
                  name: 'To Do'
                }
              },
              assignee: null,
              priority: null,
              customfield_10016: null
            }
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockIssueData });

      const result = await jiraClient.getSprintIssues(123);

      expect(result[0]).toEqual({
        id: '10002',
        key: 'TEST-2',
        summary: 'Test Issue 2',
        description: '',
        issueType: {
          name: 'Bug',
          iconUrl: 'https://example.com/bug.png'
        },
        status: {
          name: 'Open',
          statusCategory: {
            name: 'To Do'
          }
        },
        assignee: undefined,
        priority: undefined,
        storyPoints: undefined
      });
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';
      jiraClient = new JiraClient();
    });

    it('should return false when Jira is not configured', async () => {
      // Clear environment variables
      delete process.env.JIRA_BASE_URL;
      delete process.env.JIRA_API_TOKEN;
      delete process.env.JIRA_EMAIL;
      const unconfiguredClient = new JiraClient();
      const result = await unconfiguredClient.testConnection();
      expect(result).toBe(false);
    });

    it('should return true when connection is successful', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { accountId: 'test-account' } });

      const result = await jiraClient.testConnection();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/myself');
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await jiraClient.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('HTML stripping', () => {
    beforeEach(() => {
      process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
      process.env.JIRA_API_TOKEN = 'test-token';
      process.env.JIRA_EMAIL = 'test@example.com';
      jiraClient = new JiraClient();
    });

    it('should strip HTML tags and entities from description', async () => {
      const mockIssueData = {
        issues: [
          {
            id: '10003',
            key: 'TEST-3',
            fields: {
              summary: 'HTML Test',
              description: '<h1>Title</h1><p>Paragraph with &nbsp; spaces &amp; entities &lt;tag&gt;</p>',
              issuetype: { name: 'Story', iconUrl: '' },
              status: { name: 'Open', statusCategory: { name: 'To Do' } }
            }
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockIssueData });

      const result = await jiraClient.getSprintIssues(123);

      expect(result[0].description).toBe('TitleParagraph with   spaces & entities <tag>');
    });
  });
});