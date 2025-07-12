/**
 * File Upload Zone Component
 * Drag-and-drop file upload area with file validation
 */

import React, { useCallback, useState } from 'react';
import { validateAudioFile } from '../../utils/audioUtils';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onValidationError: (error: string) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesSelected,
  onValidationError,
  accept = 'audio/*',
  multiple = true,
  maxSize = 100 * 1024 * 1024, // 100MB
  className = '',
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Validate files
  const validateFiles = useCallback(async (files: FileList | File[]): Promise<File[]> => {
    setIsValidating(true);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const validation = await validateAudioFile(file);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      } catch (error) {
        errors.push(`${file.name}: Validation failed`);
      }
    }

    setIsValidating(false);

    if (errors.length > 0) {
      onValidationError(errors.join('\n'));
    }

    return validFiles;
  }, [onValidationError]);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled || files.length === 0) return;

    const validFiles = await validateFiles(files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [disabled, validateFiles, onFilesSelected]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, handleFiles]);

  // Handle file input change
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // Clear input to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
        ${isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {/* Upload icon and text */}
      <div className="space-y-4">
        {isValidating ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-600">Validating files...</p>
          </div>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 text-gray-400">
              {isDragOver ? (
                <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
                </svg>
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragOver ? 'Drop files here' : 'Upload audio files'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {multiple 
                  ? 'Drag and drop files here, or click to browse'
                  : 'Drag and drop a file here, or click to browse'
                }
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Supported formats: MP3, WAV, WebM, OGG, M4A, AAC</p>
              <p>Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB</p>
            </div>
          </>
        )}
      </div>

      {/* Visual feedback for drag state */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-50 border-2 border-blue-400 border-dashed rounded-lg pointer-events-none" />
      )}
    </div>
  );
};