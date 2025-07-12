/**
 * Recording Timer Component
 * Displays formatted recording duration with pulsing indicator
 */

import React from 'react';

interface RecordingTimerProps {
  duration: number; // Duration in seconds
  isRecording: boolean;
  isPaused: boolean;
  className?: string;
}

export const RecordingTimer: React.FC<RecordingTimerProps> = ({
  duration,
  isRecording,
  isPaused,
  className = '',
}) => {
  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Determine status indicator
  const getStatusIndicator = () => {
    if (!isRecording) {
      return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
    
    if (isPaused) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
    }
    
    return (
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
    );
  };

  // Get status text
  const getStatusText = () => {
    if (!isRecording) return 'Ready';
    if (isPaused) return 'Paused';
    return 'Recording';
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {getStatusIndicator()}
      <div className="flex flex-col">
        <span className="text-2xl font-mono font-bold text-gray-900">
          {formatDuration(duration)}
        </span>
        <span className="text-sm text-gray-500">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};