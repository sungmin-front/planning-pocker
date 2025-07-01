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
    constructor();
    isJiraConfigured(): boolean;
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
     * @param html HTML string
     * @returns Plain text string
     */
    private stripHtml;
    /**
     * Test Jira connection
     * @returns Promise<boolean>
     */
    testConnection(): Promise<boolean>;
}
export declare const jiraClient: JiraClient;
