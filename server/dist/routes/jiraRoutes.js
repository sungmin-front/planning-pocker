"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jiraRouter = void 0;
const express_1 = require("express");
const jiraClient_1 = require("../jiraClient");
exports.jiraRouter = (0, express_1.Router)();
/**
 * GET /api/jira/status
 * Check if Jira is configured and connection is working
 */
exports.jiraRouter.get('/status', async (req, res) => {
    try {
        const isConfigured = jiraClient_1.jiraClient.isJiraConfigured();
        if (!isConfigured) {
            return res.json({
                configured: false,
                connected: false,
                message: 'Jira is not configured. Please set environment variables.'
            });
        }
        const isConnected = await jiraClient_1.jiraClient.testConnection();
        res.json({
            configured: true,
            connected: isConnected,
            message: isConnected ? 'Jira connection successful' : 'Jira connection failed'
        });
    }
    catch (error) {
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
exports.jiraRouter.get('/boards', async (req, res) => {
    try {
        if (!jiraClient_1.jiraClient.isJiraConfigured()) {
            return res.status(400).json({
                error: 'Jira is not configured'
            });
        }
        const boards = await jiraClient_1.jiraClient.getBoards();
        res.json({ boards });
    }
    catch (error) {
        console.error('Error fetching boards:', error);
        res.status(500).json({
            error: 'Failed to fetch boards from Jira'
        });
    }
});
/**
 * GET /api/jira/boards/:boardId/sprints
 * Get sprints for a specific board
 */
exports.jiraRouter.get('/boards/:boardId/sprints', async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        if (isNaN(boardId)) {
            return res.status(400).json({
                error: 'Invalid board ID'
            });
        }
        if (!jiraClient_1.jiraClient.isJiraConfigured()) {
            return res.status(400).json({
                error: 'Jira is not configured'
            });
        }
        const sprints = await jiraClient_1.jiraClient.getSprints(boardId);
        res.json({ sprints });
    }
    catch (error) {
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
exports.jiraRouter.get('/sprints/:sprintId/issues', async (req, res) => {
    try {
        const sprintId = parseInt(req.params.sprintId);
        if (isNaN(sprintId)) {
            return res.status(400).json({
                error: 'Invalid sprint ID'
            });
        }
        if (!jiraClient_1.jiraClient.isJiraConfigured()) {
            return res.status(400).json({
                error: 'Jira is not configured'
            });
        }
        const issues = await jiraClient_1.jiraClient.getSprintIssues(sprintId);
        res.json({ issues });
    }
    catch (error) {
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
exports.jiraRouter.post('/issues/import', async (req, res) => {
    try {
        const { roomId, issues } = req.body;
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
    }
    catch (error) {
        console.error('Error importing Jira issues:', error);
        res.status(500).json({
            error: 'Failed to import Jira issues'
        });
    }
});
//# sourceMappingURL=jiraRoutes.js.map