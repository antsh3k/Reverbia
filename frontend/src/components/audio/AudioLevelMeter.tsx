/**
 * Audio Level Meter Component
 * Displays real-time audio level visualization during recording
 */

import React from 'react';

interface AudioLevelMeterProps {
  level: number; // 0-1 normalized audio level
  isRecording: boolean;
  className?: string;
}

export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({
  level,
  isRecording,
  className = '',
}) => {
  // Create bars for visualization (10 bars)
  const barCount = 10;
  const bars = Array.from({ length: barCount }, (_, index) => {
    const barThreshold = (index + 1) / barCount;
    const isActive = level >= barThreshold;
    
    // Color based on level (green -> yellow -> red)
    let barColor = 'bg-green-500';
    if (barThreshold > 0.7) {
      barColor = 'bg-red-500';
    } else if (barThreshold > 0.5) {
      barColor = 'bg-yellow-500';
    }

    return (
      <div
        key={index}
        className={`
          flex-1 mx-px transition-all duration-100 ease-out
          ${isActive && isRecording ? barColor : 'bg-gray-300'}
          ${isActive && isRecording ? 'opacity-100' : 'opacity-30'}
        `}
        style={{
          height: `${20 + (index * 3)}px`, // Graduated height
        }}
      />
    );
  });

  return (
    <div className={`flex items-end h-8 ${className}`}>
      {bars}
    </div>
  );
};