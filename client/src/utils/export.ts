const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000/api';

export const exportUtils = {
  async downloadJson(roomId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/export/room/${roomId}/session`);
      if (!response.ok) {
        throw new Error('Failed to export JSON');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-${roomId}-session.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      throw error;
    }
  },

  async downloadCsv(roomId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/export/room/${roomId}/session/csv`);
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-${roomId}-session.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  },

  async downloadHtml(roomId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/export/room/${roomId}/session/html`);
      if (!response.ok) {
        throw new Error('Failed to export HTML');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-${roomId}-session-report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading HTML:', error);
      throw error;
    }
  },

  openHtmlInNewTab(roomId: string) {
    const url = `${API_BASE_URL}/export/room/${roomId}/session/html`;
    window.open(url, '_blank');
  }
};