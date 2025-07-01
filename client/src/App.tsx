import { Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { RoomProvider } from '@/contexts/RoomContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { Toaster } from '@/components/ui/toaster';
import { HomePage } from '@/pages/HomePage';
import { RoomPage } from '@/pages/RoomPage';

function App() {
  return (
    <WebSocketProvider>
      <RoomProvider>
        <LayoutProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/:roomId" element={<RoomPage />} />
          </Routes>
          <Toaster />
        </LayoutProvider>
      </RoomProvider>
    </WebSocketProvider>
  );
}

export default App;