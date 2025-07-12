/**
 * Audio Device Selector Component
 * Allows users to select their preferred microphone/audio input device
 */

import React from 'react';
import { AudioDevice } from '../../hooks/useAudioRecording';

interface AudioDeviceSelectorProps {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string) => void;
  isRecording: boolean;
  className?: string;
}

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  isRecording,
  className = '',
}) => {
  if (devices.length <= 1) {
    return null; // Don't show selector if only one or no devices
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label htmlFor="audio-device-select" className="text-sm font-medium text-gray-700">
        Microphone
      </label>
      <select
        id="audio-device-select"
        value={selectedDeviceId || ''}
        onChange={(e) => onDeviceSelect(e.target.value)}
        disabled={isRecording}
        className="
          block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-sm
        "
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
      {isRecording && (
        <p className="text-xs text-gray-500">
          Cannot change microphone during recording
        </p>
      )}
    </div>
  );
};