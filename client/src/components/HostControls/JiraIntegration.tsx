import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Checkbox } from '@/components/ui/shadcn/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  goal?: string;
}

interface JiraIssue {
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

interface JiraIntegrationProps {
  roomId: string;
  onStoriesImported: () => void;
}

export const JiraIntegration: React.FC<JiraIntegrationProps> = ({ roomId, onStoriesImported }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [hasDefaultProject, setHasDefaultProject] = useState(false);
  const [defaultProjectKey, setDefaultProjectKey] = useState<string>('');
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Check Jira status on component mount
  useEffect(() => {
    checkJiraStatus();
  }, []);

  const checkJiraStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await fetch(`${API_BASE_URL}/jira/status`);
      const data = await response.json();
      setIsConfigured(data.configured);
      setIsConnected(data.connected);
      setHasDefaultProject(data.hasDefaultProject);
      setDefaultProjectKey(data.defaultProjectKey || '');
      
      if (data.configured && data.connected && data.hasDefaultProject) {
        fetchDefaultProjectSprints();
      } else if (!data.hasDefaultProject) {
        toast({
          title: 'Jira 기본 프로젝트 설정 필요',
          description: '서버 환경변수에 JIRA_DEFAULT_PROJECT_KEY를 설정해주세요.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Jira 설정 필요',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error checking Jira status:', error);
      toast({
        title: 'Jira 연결 실패',
        description: 'Jira 서버에 연결할 수 없습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchDefaultProjectSprints = async () => {
    try {
      setLoadingSprints(true);
      const response = await fetch(`${API_BASE_URL}/jira/default-project/sprints`);
      const data = await response.json();
      setSprints(data.sprints || []);
      setSelectedSprint('');
      setIssues([]);
      setSelectedIssues(new Set());
    } catch (error) {
      console.error('Error fetching default project sprints:', error);
      toast({
        title: '스프린트 목록 로드 실패',
        description: '기본 프로젝트 스프린트 목록을 불러올 수 없습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingSprints(false);
    }
  };

  const fetchSprintIssues = async (sprintId: string) => {
    try {
      setLoadingIssues(true);
      const response = await fetch(`${API_BASE_URL}/jira/sprints/${sprintId}/issues`);
      const data = await response.json();
      // 에픽 제외 필터링
      const filteredIssues = (data.issues || []).filter((issue: JiraIssue) => 
        issue.issueType.name.toLowerCase() !== 'epic' && 
        issue.issueType.name !== '에픽'
      );
      setIssues(filteredIssues);
      setSelectedIssues(new Set());
    } catch (error) {
      console.error('Error fetching sprint issues:', error);
      toast({
        title: '이슈 목록 로드 실패',
        description: '스프린트 이슈를 불러올 수 없습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleSprintChange = (sprintId: string) => {
    setSelectedSprint(sprintId);
    fetchSprintIssues(sprintId);
  };

  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllIssues = () => {
    if (selectedIssues.size === issues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(issues.map(issue => issue.id)));
    }
  };

  const importSelectedIssues = async () => {
    if (selectedIssues.size === 0) {
      toast({
        title: '이슈 선택 필요',
        description: '가져올 이슈를 선택해주세요.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoadingImport(true);
      const selectedIssueObjects = issues.filter(issue => selectedIssues.has(issue.id));
      
      const response = await fetch(`${API_BASE_URL}/jira/issues/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          issues: selectedIssueObjects
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Jira 이슈 가져오기 성공',
          description: `${data.stories.length}개의 스토리가 생성되었습니다.`
        });
        onStoriesImported();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing issues:', error);
      toast({
        title: '가져오기 실패',
        description: 'Jira 이슈를 가져오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoadingImport(false);
    }
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jira 연동</CardTitle>
          <CardDescription>
            Jira가 설정되지 않았습니다. 서버 환경변수를 확인해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkJiraStatus} disabled={loadingStatus}>
            {loadingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            다시 확인
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jira 연동</CardTitle>
          <CardDescription>
            Jira에 연결할 수 없습니다. 인증 정보를 확인해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkJiraStatus} disabled={loadingStatus}>
            {loadingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            연결 재시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasDefaultProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jira 연동</CardTitle>
          <CardDescription>
            기본 프로젝트가 설정되지 않았습니다. 서버 환경변수에 JIRA_DEFAULT_PROJECT_KEY를 설정해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkJiraStatus} disabled={loadingStatus}>
            {loadingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            다시 확인
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Jira 스프린트에서 스토리 가져오기
            <Badge variant="outline" className="text-green-600">연결됨</Badge>
          </CardTitle>
          <CardDescription>
            프로젝트 {defaultProjectKey}의 스프린트를 선택하여 이슈를 Planning Poker 스토리로 가져올 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sprint Selection */}
          {sprints.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">스프린트 선택</label>
              <Select value={selectedSprint} onValueChange={handleSprintChange}>
                <SelectTrigger>
                  <SelectValue placeholder="스프린트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(sprint => (
                    <SelectItem key={sprint.id} value={sprint.id.toString()}>
                      <div className="flex items-center gap-2">
                        {sprint.name}
                        <Badge variant={sprint.state === 'active' ? 'default' : 'secondary'}>
                          {sprint.state}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Issues List */}
          {selectedSprint && issues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">이슈 선택 ({selectedIssues.size}/{issues.length})</label>
                <Button variant="outline" size="sm" onClick={selectAllIssues}>
                  {selectedIssues.size === issues.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                {issues.map(issue => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md"
                  >
                    <Checkbox
                      checked={selectedIssues.has(issue.id)}
                      onCheckedChange={() => toggleIssueSelection(issue.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{issue.key}</span>
                        <Badge variant="outline" className="text-xs">
                          {issue.issueType.name}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {issue.status.name}
                        </Badge>
                        {issue.storyPoints && (
                          <Badge variant="outline" className="text-xs">
                            {issue.storyPoints}SP
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate" title={issue.summary}>
                        {issue.summary}
                      </p>
                      {issue.assignee && (
                        <p className="text-xs text-gray-500 mt-1">
                          담당자: {issue.assignee.displayName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button
                  onClick={importSelectedIssues}
                  disabled={loadingImport || selectedIssues.size === 0}
                  className="w-full"
                >
                  {loadingImport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  선택한 이슈를 스토리로 가져오기 ({selectedIssues.size}개)
                </Button>
              </div>
            </div>
          )}

          {sprints.length === 0 && !loadingSprints && (
            <p className="text-sm text-gray-500 text-center py-4">
              프로젝트 {defaultProjectKey}에 활성/예정 스프린트가 없습니다.
            </p>
          )}

          {sprints.length === 0 && loadingSprints && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-gray-500">스프린트를 불러오는 중...</span>
            </div>
          )}

          {selectedSprint && issues.length === 0 && !loadingIssues && (
            <p className="text-sm text-gray-500 text-center py-4">
              선택한 스프린트에 이슈가 없습니다.
            </p>
          )}

          {selectedSprint && loadingIssues && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-gray-500">이슈를 불러오는 중...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};