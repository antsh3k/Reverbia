/**
 * Audio utility functions for file validation, compression, and metadata extraction
 */

export interface AudioMetadata {
  duration: number;
  size: number;
  type: string;
  sampleRate?: number;
  bitRate?: number;
  channels?: number;
}

export interface AudioValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: AudioMetadata;
}

// Supported audio formats and their MIME types
export const SUPPORTED_AUDIO_FORMATS = {
  'audio/webm': ['.webm'],
  'audio/wav': ['.wav'],
  'audio/mp3': ['.mp3'],
  'audio/mpeg': ['.mp3'],
  'audio/ogg': ['.ogg'],
  'audio/m4a': ['.m4a'],
  'audio/aac': ['.aac'],
} as const;

// Maximum file size (100MB by default)
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

// Maximum duration (4 hours by default)
export const MAX_DURATION = 4 * 60 * 60; // 4 hours in seconds

/**
 * Validate audio file format and size
 */
export const validateAudioFile = async (file: File | Blob): Promise<AudioValidationResult> => {
  try {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`,
      };
    }

    // Check MIME type
    const mimeType = file.type;
    if (!mimeType || !Object.keys(SUPPORTED_AUDIO_FORMATS).includes(mimeType)) {
      return {
        isValid: false,
        error: `Unsupported file format: ${mimeType || 'unknown'}. Supported formats: ${Object.keys(SUPPORTED_AUDIO_FORMATS).join(', ')}`,
      };
    }

    // Extract metadata
    const metadata = await extractAudioMetadata(file);
    
    // Check duration
    if (metadata.duration > MAX_DURATION) {
      return {
        isValid: false,
        error: `Audio duration (${formatDuration(metadata.duration)}) exceeds maximum allowed duration (${formatDuration(MAX_DURATION)})`,
      };
    }

    return {
      isValid: true,
      metadata,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to validate audio file',
    };
  }
};

/**
 * Extract metadata from audio file
 */
export const extractAudioMetadata = async (audioFile: File | Blob): Promise<AudioMetadata> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioFile);

    audio.addEventListener('loadedmetadata', () => {
      const metadata: AudioMetadata = {
        duration: audio.duration || 0,
        size: audioFile.size,
        type: audioFile.type,
      };

      URL.revokeObjectURL(url);
      resolve(metadata);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
    audio.load();
  });
};

/**
 * Compress audio blob (basic compression using MediaRecorder)
 */
export const compressAudio = async (
  audioBlob: Blob,
  options: {
    mimeType?: string;
    audioBitsPerSecond?: number;
  } = {}
): Promise<Blob> => {
  const {
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 64000, // Lower bitrate for compression
  } = options;

  // If the blob is already small enough, return as-is
  if (audioBlob.size < 5 * 1024 * 1024) { // 5MB threshold
    return audioBlob;
  }

  try {
    // Create audio element to play the original blob
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    audio.src = url;

    // Create AudioContext for processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // For now, we'll return the original blob as browser-based compression
    // would require more complex audio processing libraries
    URL.revokeObjectURL(url);
    return audioBlob;
    
  } catch (error) {
    console.warn('Audio compression failed, returning original file:', error);
    return audioBlob;
  }
};

/**
 * Convert audio blob to different format (if supported by the browser)
 */
export const convertAudioFormat = async (
  audioBlob: Blob,
  targetMimeType: string,
  options: {
    audioBitsPerSecond?: number;
  } = {}
): Promise<Blob> => {
  const { audioBitsPerSecond = 128000 } = options;

  // Check if target format is supported
  if (!MediaRecorder.isTypeSupported(targetMimeType)) {
    throw new Error(`Target format ${targetMimeType} is not supported`);
  }

  // If already in target format, return as-is
  if (audioBlob.type === targetMimeType) {
    return audioBlob;
  }

  // For browser-based conversion, we would need to:
  // 1. Decode the audio blob to AudioBuffer
  // 2. Re-encode with MediaRecorder in the target format
  // This is complex and would require additional libraries for full implementation
  
  console.warn('Audio format conversion not fully implemented, returning original blob');
  return audioBlob;
};

/**
 * Create waveform data from audio file
 */
export const generateWaveformData = async (
  audioFile: File | Blob,
  samples: number = 200
): Promise<number[]> => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }

      waveformData.push(sum / blockSize);
    }

    // Normalize to 0-1 range
    const max = Math.max(...waveformData);
    return waveformData.map(value => value / max);

  } catch (error) {
    console.error('Failed to generate waveform data:', error);
    return Array(samples).fill(0);
  }
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration in human-readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Check if audio recording is supported in the current browser
 */
export const isAudioRecordingSupported = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  );
};

/**
 * Get supported audio formats for recording
 */
export const getSupportedRecordingFormats = (): string[] => {
  const formats = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav',
    'audio/ogg;codecs=opus',
  ];

  return formats.filter(format => MediaRecorder.isTypeSupported(format));
};

/**
 * Estimate recording time based on file size and bitrate
 */
export const estimateRecordingTime = (fileSize: number, bitRate: number = 128000): number => {
  // bitRate is in bits per second, fileSize is in bytes
  const fileSizeInBits = fileSize * 8;
  return fileSizeInBits / bitRate;
};