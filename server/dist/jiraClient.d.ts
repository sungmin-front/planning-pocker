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
export declare class JiraClient {
    private client;
    private baseUrl;
    private isConfigured;
    private defaultProjectKey;
    constructor();
    isJiraConfigured(): boolean;
    getDefaultProjectKey(): string;
    hasDefaultProject(): boolean;
    /**
     * Get all sprints for a board
     * @param boardId The board ID to get sprints from
     * @returns Promise<JiraSprint[]>
     */
    getSprints(boardId: number): Promise<JiraSprint[]>;
    /**
     * Get all boards accessible to the user
     * @returns Promise<{ id: number, name: string }[]>
     */
    getBoards(): Promise<{
        id: number;
        name: string;
        type: string;
    }[]>;
    /**
     * Get issues for a specific sprint
     * @param sprintId The sprint ID
     * @returns Promise<JiraIssue[]>
     */
    getSprintIssues(sprintId: number): Promise<JiraIssue[]>;
    /**
     * Strip HTML tags from Jira description
     * @param html HTML string or any value
     * @returns Plain text string
     */
    private stripHtml;
    /**
     * Test Jira connection
     * @returns Promise<boolean>
     */
    testConnection(): Promise<boolean>;
    /**
     * Get all projects accessible to the user
     * @returns Promise<{ id: string, key: string, name: string }[]>
     */
    getProjects(): Promise<{
        id: string;
        key: string;
        name: string;
    }[]>;
    /**
     * Get issues for a specific project
     * @param projectKey The project key (e.g., 'PROJ')
     * @param maxResults Maximum number of results to return
     * @returns Promise<JiraIssue[]>
     */
    getProjectIssues(projectKey: string, maxResults?: number): Promise<JiraIssue[]>;
    /**
     * Get all sprints for the default project
     * @returns Promise<JiraSprint[]>
     */
    getDefaultProjectSprints(): Promise<JiraSprint[]>;
    /**
     * Get issues for the default project (non-sprint issues or all issues)
     * @param maxResults Maximum number of results to return
     * @returns Promise<JiraIssue[]>
     */
    getDefaultProjectIssues(maxResults?: number): Promise<JiraIssue[]>;
}
export declare const jiraClient: JiraClient;
