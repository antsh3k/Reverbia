/**
 * Main Audio Recorder Component
 * Combines all recording functionality into a single component
 */

import React from 'react';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { RecordingControls } from './RecordingControls';
import { RecordingTimer } from './RecordingTimer';
import { AudioLevelMeter } from './AudioLevelMeter';
import { AudioDeviceSelector } from './AudioDeviceSelector';

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
  className?: string;
  showDeviceSelector?: boolean;
  showAudioLevelMeter?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onError,
  className = '',
  showDeviceSelector = true,
  showAudioLevelMeter = true,
}) => {
  const {
    state,
    audioDevices,
    selectedDevice,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    selectDevice,
    requestPermission,
  } = useAudioRecording();

  // Handle recording start
  const handleStartRecording = async () => {
    try {
      await startRecording();
      onRecordingStart?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      onError?.(errorMessage);
    }
  };

  // Handle recording stop
  const handleStopRecording = () => {
    stopRecording();
    onRecordingStop?.();
  };

  // Handle recording completion
  React.useEffect(() => {
    if (audioBlob && !state.isRecording) {
      onRecordingComplete?.(audioBlob);
    }
  }, [audioBlob, state.isRecording, onRecordingComplete]);

  // Handle errors
  React.useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  return (
    <div className={`flex flex-col items-center space-y-6 p-6 ${className}`}>
      {/* Device Selector */}
      {showDeviceSelector && state.hasPermission && (
        <div className="w-full max-w-sm">
          <AudioDeviceSelector
            devices={audioDevices}
            selectedDeviceId={selectedDevice}
            onDeviceSelect={selectDevice}
            isRecording={state.isRecording}
          />
        </div>
      )}

      {/* Recording Timer */}
      <RecordingTimer
        duration={state.duration}
        isRecording={state.isRecording}
        isPaused={state.isPaused}
      />

      {/* Audio Level Meter */}
      {showAudioLevelMeter && state.hasPermission && (
        <div className="w-full max-w-xs">
          <AudioLevelMeter
            level={state.audioLevel}
            isRecording={state.isRecording}
          />
        </div>
      )}

      {/* Recording Controls */}
      <RecordingControls
        isRecording={state.isRecording}
        isPaused={state.isPaused}
        isProcessing={state.isProcessing}
        hasPermission={state.hasPermission}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        onRequestPermission={requestPermission}
      />

      {/* Error Display */}
      {state.error && (
        <div className="w-full max-w-sm p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Recording Status */}
      {state.isRecording && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {state.isPaused ? 'Recording paused' : 'Recording in progress...'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click the square button to stop recording
          </p>
        </div>
      )}
    </div>
  );
};