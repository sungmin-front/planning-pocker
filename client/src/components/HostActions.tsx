import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { VotingControls } from '@/components/HostControls/VotingControls';

export const HostActions: React.FC = () => {
  const { room, isHost } = useRoom();

  // Only render for hosts
  if (!isHost || !room) {
    return null;
  }

  return (
    <>
      {/* Host Actions Bar - Only visible on larger screens */}
      <div className="hidden lg:block">
        <VotingControls />
      </div>

      {/* Mobile Host Actions - Shown in sidebar for mobile */}
      <div className="lg:hidden">
        <VotingControls />
      </div>
    </>
  );
};