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
        this.isConfigured = !!(this.baseUrl && apiToken && email);
        if (this.isConfigured) {
            this.client = axios_1.default.create({
                baseURL: `${this.baseUrl}/rest/api/3`,
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
            const response = await this.client.get('/search', {
                params: {
                    jql: `sprint = ${sprintId}`,
                    fields: 'summary,description,issuetype,status,assignee,priority,customfield_10016', // customfield_10016 is usually story points
                    maxResults: 100
                }
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
     * @param html HTML string
     * @returns Plain text string
     */
    stripHtml(html) {
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
            await this.client.get('/myself');
            return true;
        }
        catch (error) {
            console.error('Jira connection test failed:', error);
            return false;
        }
    }
}
exports.JiraClient = JiraClient;
// Create singleton instance
exports.jiraClient = new JiraClient();
//# sourceMappingURL=jiraClient.js.map