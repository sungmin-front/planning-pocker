"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jiraClient = exports.JiraClient = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
class JiraClient {
    constructor() {
        this.baseUrl = process.env.JIRA_BASE_URL || '';
        const apiToken = process.env.JIRA_API_TOKEN || '';
        const email = process.env.JIRA_EMAIL || '';
        this.defaultProjectKey = process.env.JIRA_DEFAULT_PROJECT_KEY || '';
        this.isConfigured = !!(this.baseUrl && apiToken && email);
        if (this.isConfigured) {
            this.client = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/agile/1.0`,
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000, // 10 seconds timeout
            });
        }
        else {
            // Create a dummy client for when Jira is not configured
            this.client = axios_1.default.create();
        }
    }
    isJiraConfigured() {
        return this.isConfigured;
    }
    getDefaultProjectKey() {
        return this.defaultProjectKey;
    }
    hasDefaultProject() {
        return !!this.defaultProjectKey;
    }
    /**
     * Get all sprints for a board
     * @param boardId The board ID to get sprints from
     * @returns Promise<JiraSprint[]>
     */
    async getSprints(boardId) {
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
            return response.data.values.map((sprint) => ({
                id: sprint.id,
                name: sprint.name,
                state: sprint.state,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                goal: sprint.goal
            }));
        }
        catch (error) {
            console.error('Error fetching sprints:', error);
            throw new Error('Failed to fetch sprints from Jira');
        }
    }
    /**
     * Get all boards accessible to the user
     * @returns Promise<{ id: number, name: string }[]>
     */
    async getBoards() {
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
            return response.data.values.map((board) => ({
                id: board.id,
                name: board.name,
                type: board.type
            }));
        }
        catch (error) {
            console.error('Error fetching boards:', error);
            throw new Error('Failed to fetch boards from Jira');
        }
    }
    /**
     * Get issues for a specific sprint
     * @param sprintId The sprint ID
     * @returns Promise<JiraIssue[]>
     */
    async getSprintIssues(sprintId) {
        if (!this.isConfigured) {
            throw new Error('Jira is not configured');
        }
        try {
            // Use regular API for search
            const regularApiClient = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
                headers: {
                    'Authorization': this.client.defaults.headers['Authorization'],
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
            });
            const response = await regularApiClient.post('/search', {
                jql: `sprint = ${sprintId} AND issuetype != "하위 작업" AND issuetype != "Sub-task" ORDER BY created ASC`,
                fields: [
                    'id', 'key', 'summary', 'description', 'issuetype', 'status',
                    'assignee', 'priority', 'customfield_10016' // Story Points field
                ],
                maxResults: 100,
                startAt: 0
            });
            return response.data.issues.map((issue) => ({
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
        }
        catch (error) {
            console.error('Error fetching sprint issues:', error);
            throw new Error('Failed to fetch sprint issues from Jira');
        }
    }
    /**
     * Strip HTML tags from Jira description
     * @param html HTML string or any value
     * @returns Plain text string
     */
    stripHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }
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
    async testConnection() {
        if (!this.isConfigured) {
            return false;
        }
        try {
            // Create a separate client for regular API calls (like user info)
            const regularApiClient = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
                headers: {
                    'Authorization': this.client.defaults.headers['Authorization'],
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
            });
            await regularApiClient.get('/myself');
            return true;
        }
        catch (error) {
            console.error('Jira connection test failed:', error);
            return false;
        }
    }
    /**
     * Get all projects accessible to the user
     * @returns Promise<{ id: string, key: string, name: string }[]>
     */
    async getProjects() {
        if (!this.isConfigured) {
            throw new Error('Jira is not configured');
        }
        try {
            // Use regular API for projects
            const regularApiClient = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
                headers: {
                    'Authorization': this.client.defaults.headers['Authorization'],
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
            });
            const response = await regularApiClient.get('/project', {
                params: {
                    maxResults: 50,
                    startAt: 0
                }
            });
            return response.data.values.map((project) => ({
                id: project.id,
                key: project.key,
                name: project.name
            }));
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            throw new Error('Failed to fetch projects from Jira');
        }
    }
    /**
     * Get issues for a specific project
     * @param projectKey The project key (e.g., 'PROJ')
     * @param maxResults Maximum number of results to return
     * @returns Promise<JiraIssue[]>
     */
    async getProjectIssues(projectKey, maxResults = 50) {
        if (!this.isConfigured) {
            throw new Error('Jira is not configured. Please set JIRA_BASE_URL, JIRA_API_TOKEN, and JIRA_EMAIL environment variables.');
        }
        try {
            // Use regular API for JQL search
            const regularApiClient = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
                headers: {
                    'Authorization': this.client.defaults.headers['Authorization'],
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
            });
            const response = await regularApiClient.post('/search', {
                jql: `project = ${projectKey} ORDER BY created DESC`,
                maxResults: maxResults,
                startAt: 0,
                fields: [
                    'id', 'key', 'summary', 'description', 'issuetype', 'status',
                    'assignee', 'priority', 'customfield_10016' // Story Points field
                ]
            });
            return response.data.issues.map((issue) => ({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                description: issue.fields.description ? this.stripHtml(issue.fields.description) : undefined,
                issueType: {
                    name: issue.fields.issuetype.name,
                    iconUrl: issue.fields.issuetype.iconUrl || ''
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
        }
        catch (error) {
            console.error('Error fetching project issues:', error);
            throw new Error('Failed to fetch issues from Jira project');
        }
    }
    /**
     * Get all sprints for the default project
     * @returns Promise<JiraSprint[]>
     */
    async getDefaultProjectSprints() {
        if (!this.isConfigured) {
            throw new Error('Jira is not configured');
        }
        if (!this.defaultProjectKey) {
            throw new Error('Default project key is not configured. Please set JIRA_DEFAULT_PROJECT_KEY environment variable.');
        }
        try {
            // Use regular API for JQL search to find boards for the project
            const regularApiClient = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
                headers: {
                    'Authorization': this.client.defaults.headers['Authorization'],
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
            });
            // First, get boards for the project
            const boardsResponse = await this.client.get('/board', {
                params: {
                    projectKeyOrId: this.defaultProjectKey,
                    maxResults: 50,
                    startAt: 0
                }
            });
            if (!boardsResponse.data.values || boardsResponse.data.values.length === 0) {
                throw new Error(`No boards found for project ${this.defaultProjectKey}`);
            }
            // Get sprints from all boards of the project
            const allSprints = [];
            for (const board of boardsResponse.data.values) {
                try {
                    const sprintsResponse = await this.client.get(`/board/${board.id}/sprint`, {
                        params: {
                            maxResults: 50,
                            startAt: 0
                        }
                    });
                    const sprints = sprintsResponse.data.values.map((sprint) => ({
                        id: sprint.id,
                        name: sprint.name,
                        state: sprint.state,
                        startDate: sprint.startDate,
                        endDate: sprint.endDate,
                        goal: sprint.goal
                    }));
                    allSprints.push(...sprints);
                }
                catch (sprintError) {
                    console.warn(`Failed to fetch sprints for board ${board.id}:`, sprintError);
                }
            }
            // Remove duplicates, filter for active/future sprints, and sort by ID
            const uniqueSprints = allSprints.filter((sprint, index, self) => index === self.findIndex(s => s.id === sprint.id)).filter(sprint => sprint.state === 'active' || sprint.state === 'future').sort((a, b) => b.id - a.id);
            return uniqueSprints;
        }
        catch (error) {
            console.error('Error fetching default project sprints:', error);
            throw new Error(`Failed to fetch sprints for project ${this.defaultProjectKey}`);
        }
    }
    /**
     * Get issues for the default project (non-sprint issues or all issues)
     * @param maxResults Maximum number of results to return
     * @returns Promise<JiraIssue[]>
     */
    async getDefaultProjectIssues(maxResults = 50) {
        if (!this.defaultProjectKey) {
            throw new Error('Default project key is not configured. Please set JIRA_DEFAULT_PROJECT_KEY environment variable.');
        }
        return this.getProjectIssues(this.defaultProjectKey, maxResults);
    }
}
exports.JiraClient = JiraClient;
// Create singleton instance
exports.jiraClient = new JiraClient();
//# sourceMappingURL=jiraClient.js.map