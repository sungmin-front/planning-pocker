import { Request, Response, Router } from 'express';
import { jiraClient, JiraIssue } from '../jiraClient';

export const jiraRouter: Router = Router();

/**
 * GET /api/jira/status
 * Check if Jira is configured and connection is working
 */
jiraRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const isConfigured = jiraClient.isJiraConfigured();
    
    if (!isConfigured) {
      return res.json({
        configured: false,
        connected: false,
        message: 'Jira is not configured. Please set environment variables.'
      });
    }

    const isConnected = await jiraClient.testConnection();
    
    const hasDefaultProject = jiraClient.hasDefaultProject();
    const defaultProjectKey = jiraClient.getDefaultProjectKey();
    
    res.json({
      configured: true,
      connected: isConnected,
      hasDefaultProject,
      defaultProjectKey,
      message: isConnected ? 'Jira connection successful' : 'Jira connection failed'
    });
  } catch (error) {
    console.error('Error checking Jira status:', error);
    res.status(500).json({
      configured: false,
      connected: false,
      message: 'Error checking Jira status'
    });
  }
});

/**
 * GET /api/jira/boards
 * Get all accessible boards
 */
jiraRouter.get('/boards', async (req: Request, res: Response) => {
  try {
    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    const boards = await jiraClient.getBoards();
    res.json({ boards });
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({
      error: 'Failed to fetch boards from Jira'
    });
  }
});

/**
 * GET /api/jira/projects
 * Get all accessible projects
 */
jiraRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    const projects = await jiraClient.getProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects from Jira'
    });
  }
});

/**
 * GET /api/jira/default-project/sprints
 * Get sprints for the default project
 */
jiraRouter.get('/default-project/sprints', async (req: Request, res: Response) => {
  try {
    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    if (!jiraClient.hasDefaultProject()) {
      return res.status(400).json({
        error: 'Default project is not configured. Please set JIRA_DEFAULT_PROJECT_KEY environment variable.'
      });
    }

    const sprints = await jiraClient.getDefaultProjectSprints();
    res.json({ 
      sprints,
      projectKey: jiraClient.getDefaultProjectKey()
    });
  } catch (error) {
    console.error('Error fetching default project sprints:', error);
    res.status(500).json({
      error: 'Failed to fetch sprints for default project'
    });
  }
});

/**
 * GET /api/jira/default-project/issues
 * Get issues for the default project
 */
jiraRouter.get('/default-project/issues', async (req: Request, res: Response) => {
  try {
    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    if (!jiraClient.hasDefaultProject()) {
      return res.status(400).json({
        error: 'Default project is not configured. Please set JIRA_DEFAULT_PROJECT_KEY environment variable.'
      });
    }

    const maxResults = parseInt(req.query.maxResults as string) || 50;
    const issues = await jiraClient.getDefaultProjectIssues(maxResults);
    res.json({ 
      issues,
      projectKey: jiraClient.getDefaultProjectKey()
    });
  } catch (error) {
    console.error('Error fetching default project issues:', error);
    res.status(500).json({
      error: 'Failed to fetch issues for default project'
    });
  }
});

/**
 * GET /api/jira/boards/:boardId/sprints
 * Get sprints for a specific board
 */
jiraRouter.get('/boards/:boardId/sprints', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.boardId);
    
    if (isNaN(boardId)) {
      return res.status(400).json({
        error: 'Invalid board ID'
      });
    }

    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    const sprints = await jiraClient.getSprints(boardId);
    res.json({ sprints });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({
      error: 'Failed to fetch sprints from Jira'
    });
  }
});

/**
 * GET /api/jira/sprints/:sprintId/issues
 * Get issues for a specific sprint
 */
jiraRouter.get('/sprints/:sprintId/issues', async (req: Request, res: Response) => {
  try {
    const sprintId = parseInt(req.params.sprintId);
    
    if (isNaN(sprintId)) {
      return res.status(400).json({
        error: 'Invalid sprint ID'
      });
    }

    if (!jiraClient.isJiraConfigured()) {
      return res.status(400).json({
        error: 'Jira is not configured'
      });
    }

    const issues = await jiraClient.getSprintIssues(sprintId);
    res.json({ issues });
  } catch (error) {
    console.error('Error fetching sprint issues:', error);
    res.status(500).json({
      error: 'Failed to fetch sprint issues from Jira'
    });
  }
});

/**
 * POST /api/jira/issues/import
 * Convert selected Jira issues to stories and add them to a room
 */
jiraRouter.post('/issues/import', async (req: Request, res: Response) => {
  try {
    const { roomId, issues }: { roomId: string; issues: JiraIssue[] } = req.body;
    
    if (!roomId || !issues || !Array.isArray(issues)) {
      return res.status(400).json({
        error: 'roomId and issues array are required'
      });
    }

    // Convert Jira issues to story format
    const stories = issues.map(issue => ({
      title: `[${issue.key}] ${issue.summary}`,
      description: [
        issue.description || '',
        '',
        `**Issue Type:** ${issue.issueType.name}`,
        `**Status:** ${issue.status.name}`,
        issue.assignee ? `**Assignee:** ${issue.assignee.displayName}` : '',
        issue.priority ? `**Priority:** ${issue.priority.name}` : '',
        issue.storyPoints ? `**Story Points:** ${issue.storyPoints}` : '',
        `**Jira Link:** ${process.env.JIRA_BASE_URL}/browse/${issue.key}`
      ].filter(line => line !== '').join('\n')
    }));

    res.json({
      success: true,
      stories,
      message: `Converted ${stories.length} Jira issues to stories`
    });
  } catch (error) {
    console.error('Error importing Jira issues:', error);
    res.status(500).json({
      error: 'Failed to import Jira issues'
    });
  }
});