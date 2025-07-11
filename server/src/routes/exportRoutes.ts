import express from 'express';
import StoryResultService from '../services/StoryResultService';
import RoomSessionService from '../services/RoomSessionService';

const router: express.Router = express.Router();

/**
 * GET /api/export/room/:roomId/json
 * 방별 스토리 결과를 JSON 형태로 Export
 */
router.get('/room/:roomId/json', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const exportData = await StoryResultService.exportRoomResultsAsJson(roomId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-results.json"`);
    res.json(exportData);
    
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export room results as JSON' });
  }
});

/**
 * GET /api/export/room/:roomId/csv
 * 방별 스토리 결과를 CSV 형태로 Export
 */
router.get('/room/:roomId/csv', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const csvData = await StoryResultService.exportRoomResultsAsCsv(roomId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-results.csv"`);
    res.send(csvData);
    
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export room results as CSV' });
  }
});

/**
 * GET /api/export/room/:roomId/results
 * 방별 스토리 결과 목록 조회 (페이지네이션 지원)
 */
router.get('/room/:roomId/results', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const results = await StoryResultService.getStoryResultsByRoom(roomId, limit, offset);
    
    res.json({
      roomId,
      results,
      pagination: {
        limit,
        offset,
        total: results.length
      }
    });
    
  } catch (error) {
    console.error('Get room results error:', error);
    res.status(500).json({ error: 'Failed to get room results' });
  }
});

/**
 * GET /api/export/story/:storyId
 * 특정 스토리 결과 조회
 */
router.get('/story/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const result = await StoryResultService.getStoryResult(storyId);
    
    if (!result) {
      return res.status(404).json({ error: 'Story result not found' });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Get story result error:', error);
    res.status(500).json({ error: 'Failed to get story result' });
  }
});

/**
 * GET /api/export/room/:roomId/session/csv
 * 새로운 RoomSession 형태로 룸 데이터를 CSV로 Export
 */
router.get('/room/:roomId/session/csv', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const csvData = await RoomSessionService.exportSessionDataAsCsv(roomId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-session.csv"`);
    res.send(csvData);
    
  } catch (error) {
    console.error('Export session CSV error:', error);
    res.status(500).json({ error: 'Failed to export room session data as CSV' });
  }
});

/**
 * GET /api/export/room/:roomId/session/stats
 * 룸 세션 통계 정보 조회
 */
router.get('/room/:roomId/session/stats', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const stats = await RoomSessionService.getSessionStats(roomId);
    
    res.json({
      roomId,
      stats
    });
    
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

/**
 * GET /api/export/room/:roomId/session/history
 * 룸의 모든 세션 히스토리 조회
 */
router.get('/room/:roomId/session/history', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const history = await RoomSessionService.getSessionHistory(roomId);
    
    res.json({
      roomId,
      sessions: history.map(session => ({
        sessionId: session._id,
        sessionStartedAt: session.sessionStartedAt,
        sessionEndedAt: session.sessionEndedAt,
        isActive: session.isActive,
        totalStories: session.totalStories,
        completedStories: session.completedStories,
        totalVotingSessions: session.totalVotingSessions,
        participantCount: session.participants.length
      }))
    });
    
  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

/**
 * GET /api/export/room/:roomId/session/html
 * 새로운 RoomSession 형태로 룸 데이터를 HTML 리포트로 Export
 */
router.get('/room/:roomId/session/html', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const htmlData = await RoomSessionService.exportSessionDataAsHtml(roomId);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-session-report.html"`);
    res.send(htmlData);
    
  } catch (error) {
    console.error('Export session HTML error:', error);
    res.status(500).json({ error: 'Failed to export room session data as HTML' });
  }
});

/**
 * GET /api/export/room/:roomId/session
 * 새로운 RoomSession 형태로 룸 데이터 Export (백로그 + 투표 세션들) - JSON 형태
 */
router.get('/room/:roomId/session', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const sessionData = await RoomSessionService.exportSessionData(roomId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="room-${roomId}-session.json"`);
    res.json(sessionData);
    
  } catch (error) {
    console.error('Export session error:', error);
    res.status(500).json({ error: 'Failed to export room session data' });
  }
});

/**
 * POST /api/export/room/:roomId/test-votes
 * 테스트용 다양한 투표 분포 데이터 생성 (현재 진행중인 투표에 추가)
 */
router.post('/room/:roomId/test-votes', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    await RoomSessionService.createTestVoteDistribution(roomId);
    
    res.json({ success: true, message: 'Test vote distribution created' });
    
  } catch (error) {
    console.error('Create test votes error:', error);
    res.status(500).json({ error: 'Failed to create test vote distribution' });
  }
});

export { router as exportRouter };