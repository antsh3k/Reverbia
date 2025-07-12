/**
 * Recording Controls Component
 * Main recording button with play, pause, stop functionality
 */

import React from 'react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  hasPermission: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onRequestPermission: () => void;
  className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  isProcessing,
  hasPermission,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onRequestPermission,
  className = '',
}) => {
  // Permission request button
  if (!hasPermission) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <button
          onClick={onRequestPermission}
          disabled={isProcessing}
          className="
            flex items-center justify-center w-16 h-16 rounded-full
            bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400
            text-white transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-blue-300
          "
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        <span className="text-sm text-gray-600">
          Allow microphone access to start recording
        </span>
      </div>
    );
  }

  // Main recording controls
  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {/* Primary Record/Stop Button */}
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          disabled={isProcessing}
          className="
            flex items-center justify-center w-16 h-16 rounded-full
            bg-red-500 hover:bg-red-600 disabled:bg-gray-400
            text-white transition-all duration-200 transform hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-red-300
            shadow-lg
          "
          aria-label="Start recording"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white" />
          )}
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          className="
            flex items-center justify-center w-16 h-16 rounded-full
            bg-gray-700 hover:bg-gray-800
            text-white transition-all duration-200 transform hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-gray-300
            shadow-lg
          "
          aria-label="Stop recording"
        >
          <div className="w-6 h-6 bg-white rounded-sm" />
        </button>
      )}

      {/* Pause/Resume Button (only shown when recording) */}
      {isRecording && (
        <button
          onClick={isPaused ? onResumeRecording : onPauseRecording}
          className="
            flex items-center justify-center w-12 h-12 rounded-full
            bg-yellow-500 hover:bg-yellow-600
            text-white transition-all duration-200 transform hover:scale-105
            focus:outline-none focus:ring-4 focus:ring-yellow-300
            shadow-lg
          "
          aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
        >
          {isPaused ? (
            // Play icon
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            // Pause icon
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};