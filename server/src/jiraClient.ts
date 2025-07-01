import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  issueType: {
    name: string;
    iconUrl: string;
  };
  status: {
    name: string;
    statusCategory: {
      name: string;
    };
  };
  assignee?: {
    displayName: string;
    emailAddress: string;
  };
  priority?: {
    name: string;
  };
  storyPoints?: number;
}

export class JiraClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const email = process.env.JIRA_EMAIL || '';

    this.isConfigured = !!(this.baseUrl && apiToken && email);

    if (this.isConfigured) {
      this.client = axios.create({
        baseURL: `${this.baseUrl}/rest/api/3`,
        headers: {
          'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10 seconds timeout
      });
    } else {
      // Create a dummy client for when Jira is not configured
      this.client = axios.create();
    }
  }

  public isJiraConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get all sprints for a board
   * @param boardId The board ID to get sprints from
   * @returns Promise<JiraSprint[]>
   */
  async getSprints(boardId: number): Promise<JiraSprint[]> {
    if (!this.isConfigured) {
      throw new Error('Jira is not configured. Please set JIRA_BASE_URL, JIRA_API_TOKEN, and JIRA_EMAIL environment variables.');
    }

    try {
      const response = await this.client.get(`/board/${boardId}/sprint`, {
        params: {
          maxResults: 50, // Get up to 50 sprints
          startAt: 0
        }
      });

      return response.data.values.map((sprint: any) => ({
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        goal: sprint.goal
      }));
    } catch (error) {
      console.error('Error fetching sprints:', error);
      throw new Error('Failed to fetch sprints from Jira');
    }
  }

  /**
   * Get all boards accessible to the user
   * @returns Promise<{ id: number, name: string }[]>
   */
  async getBoards(): Promise<{ id: number; name: string; type: string }[]> {
    if (!this.isConfigured) {
      throw new Error('Jira is not configured');
    }

    try {
      const response = await this.client.get('/board', {
        params: {
          maxResults: 50,
          startAt: 0
        }
      });

      return response.data.values.map((board: any) => ({
        id: board.id,
        name: board.name,
        type: board.type
      }));
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw new Error('Failed to fetch boards from Jira');
    }
  }

  /**
   * Get issues for a specific sprint
   * @param sprintId The sprint ID
   * @returns Promise<JiraIssue[]>
   */
  async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
    if (!this.isConfigured) {
      throw new Error('Jira is not configured');
    }

    try {
      const response = await this.client.get('/search', {
        params: {
          jql: `sprint = ${sprintId}`,
          fields: 'summary,description,issuetype,status,assignee,priority,customfield_10016', // customfield_10016 is usually story points
          maxResults: 100
        }
      });

      return response.data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: this.stripHtml(issue.fields.description || ''),
        issueType: {
          name: issue.fields.issuetype.name,
          iconUrl: issue.fields.issuetype.iconUrl
        },
        status: {
          name: issue.fields.status.name,
          statusCategory: {
            name: issue.fields.status.statusCategory.name
          }
        },
        assignee: issue.fields.assignee ? {
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress
        } : undefined,
        priority: issue.fields.priority ? {
          name: issue.fields.priority.name
        } : undefined,
        storyPoints: issue.fields.customfield_10016 || undefined
      }));
    } catch (error) {
      console.error('Error fetching sprint issues:', error);
      throw new Error('Failed to fetch sprint issues from Jira');
    }
  }

  /**
   * Strip HTML tags from Jira description
   * @param html HTML string
   * @returns Plain text string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .trim();
  }

  /**
   * Test Jira connection
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.client.get('/myself');
      return true;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const jiraClient = new JiraClient();