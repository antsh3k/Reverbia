/**
 * Custom hook for file upload functionality with chunked upload support
 * Handles progress tracking, retry logic, and queue management
 */

import { useState, useCallback, useRef } from 'react';

export interface UploadProgress {
  uploadId: string;
  fileName: string;
  fileSize: number;
  bytesUploaded: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
}

export interface FileUploadHook {
  uploads: UploadProgress[];
  isUploading: boolean;
  uploadFile: (file: File, options?: UploadOptions) => Promise<string>;
  pauseUpload: (uploadId: string) => void;
  resumeUpload: (uploadId: string) => void;
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  clearCompleted: () => void;
}

export interface UploadOptions {
  useChunkedUpload?: boolean;
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (fileId: string) => void;
  onError?: (error: string) => void;
}

interface UploadSession {
  uploadId: string;
  file: File;
  options: UploadOptions;
  abortController?: AbortController;
  retryCount: number;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_RETRIES = 3;

export const useFileUpload = (apiBaseUrl: string = '/api/upload'): FileUploadHook => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const uploadSessionsRef = useRef<Map<string, UploadSession>>(new Map());

  // Generate unique upload ID
  const generateUploadId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Update upload progress
  const updateProgress = useCallback((uploadId: string, updates: Partial<UploadProgress>) => {
    setUploads(prev => prev.map(upload => 
      upload.uploadId === uploadId ? { ...upload, ...updates } : upload
    ));
  }, []);

  // Add new upload to queue
  const addUpload = useCallback((uploadId: string, file: File): void => {
    const newUpload: UploadProgress = {
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      bytesUploaded: 0,
      percentage: 0,
      status: 'pending',
    };

    setUploads(prev => [...prev, newUpload]);
  }, []);

  // Remove upload from queue
  const removeUpload = useCallback((uploadId: string): void => {
    setUploads(prev => prev.filter(upload => upload.uploadId !== uploadId));
    uploadSessionsRef.current.delete(uploadId);
  }, []);

  // Get auth token (you'll need to implement this based on your auth system)
  const getAuthToken = (): string | null => {
    // This should get the JWT token from your auth context/storage
    return localStorage.getItem('access_token');
  };

  // Single file upload (for small files)
  const uploadSingleFile = async (session: UploadSession): Promise<string> => {
    const { uploadId, file, options } = session;
    
    updateProgress(uploadId, { status: 'uploading' });

    const formData = new FormData();
    formData.append('file', file);

    const authToken = getAuthToken();
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/audio`, {
        method: 'POST',
        headers,
        body: formData,
        signal: session.abortController?.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const result = await response.json();
      
      updateProgress(uploadId, {
        status: 'completed',
        bytesUploaded: file.size,
        percentage: 100,
      });

      options.onComplete?.(result.file_id);
      return result.file_id;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateProgress(uploadId, { status: 'paused' });
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateProgress(uploadId, { status: 'error', error: errorMessage });
      options.onError?.(errorMessage);
      throw error;
    }
  };

  // Chunked file upload (for large files)
  const uploadChunkedFile = async (session: UploadSession): Promise<string> => {
    const { uploadId, file, options } = session;
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    
    updateProgress(uploadId, { status: 'uploading' });

    const authToken = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      // Start chunked upload session
      const startResponse = await fetch(`${apiBaseUrl}/audio/chunked/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          chunk_size: chunkSize,
        }),
        signal: session.abortController?.signal,
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start chunked upload');
      }

      const startResult = await startResponse.json();
      const { upload_id: serverUploadId, total_chunks } = startResult;

      // Upload chunks
      let uploadedBytes = 0;
      
      for (let chunkNumber = 1; chunkNumber <= total_chunks; chunkNumber++) {
        if (session.abortController?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = (chunkNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);

        const chunkHeaders: Record<string, string> = {};
        if (authToken) {
          chunkHeaders['Authorization'] = `Bearer ${authToken}`;
        }

        const chunkResponse = await fetch(
          `${apiBaseUrl}/audio/chunked/upload/${serverUploadId}?chunk_number=${chunkNumber}`,
          {
            method: 'POST',
            headers: chunkHeaders,
            body: chunkFormData,
            signal: session.abortController?.signal,
          }
        );

        if (!chunkResponse.ok) {
          throw new Error(`Failed to upload chunk ${chunkNumber}`);
        }

        uploadedBytes += chunk.size;
        const percentage = Math.round((uploadedBytes / file.size) * 100);
        
        updateProgress(uploadId, {
          bytesUploaded: uploadedBytes,
          percentage,
        });

        options.onProgress?.(uploads.find(u => u.uploadId === uploadId)!);
      }

      // Complete chunked upload
      const completeResponse = await fetch(`${apiBaseUrl}/audio/chunked/complete/${serverUploadId}`, {
        method: 'POST',
        headers,
        signal: session.abortController?.signal,
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete chunked upload');
      }

      const completeResult = await completeResponse.json();
      
      updateProgress(uploadId, {
        status: 'completed',
        bytesUploaded: file.size,
        percentage: 100,
      });

      options.onComplete?.(completeResult.file_id);
      return completeResult.file_id;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateProgress(uploadId, { status: 'paused' });
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Chunked upload failed';
      updateProgress(uploadId, { status: 'error', error: errorMessage });
      options.onError?.(errorMessage);
      throw error;
    }
  };

  // Main upload function
  const uploadFile = useCallback(async (file: File, options: UploadOptions = {}): Promise<string> => {
    const uploadId = generateUploadId();
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    const useChunkedUpload = options.useChunkedUpload ?? (file.size > chunkSize);

    // Create upload session
    const session: UploadSession = {
      uploadId,
      file,
      options,
      abortController: new AbortController(),
      retryCount: 0,
    };

    uploadSessionsRef.current.set(uploadId, session);
    addUpload(uploadId, file);

    try {
      const fileId = useChunkedUpload 
        ? await uploadChunkedFile(session)
        : await uploadSingleFile(session);
      
      return fileId;
    } catch (error) {
      // Don't throw if it was paused/cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        return '';
      }
      throw error;
    }
  }, [apiBaseUrl, addUpload, updateProgress]);

  // Pause upload
  const pauseUpload = useCallback((uploadId: string): void => {
    const session = uploadSessionsRef.current.get(uploadId);
    if (session) {
      session.abortController?.abort();
      updateProgress(uploadId, { status: 'paused' });
    }
  }, [updateProgress]);

  // Resume upload
  const resumeUpload = useCallback(async (uploadId: string): Promise<void> => {
    const session = uploadSessionsRef.current.get(uploadId);
    if (session) {
      // Create new abort controller
      session.abortController = new AbortController();
      
      try {
        const chunkSize = session.options.chunkSize || DEFAULT_CHUNK_SIZE;
        const useChunkedUpload = session.options.useChunkedUpload ?? (session.file.size > chunkSize);
        
        const fileId = useChunkedUpload 
          ? await uploadChunkedFile(session)
          : await uploadSingleFile(session);
          
        session.options.onComplete?.(fileId);
      } catch (error) {
        // Handle error
        console.error('Resume upload failed:', error);
      }
    }
  }, []);

  // Cancel upload
  const cancelUpload = useCallback((uploadId: string): void => {
    const session = uploadSessionsRef.current.get(uploadId);
    if (session) {
      session.abortController?.abort();
    }
    removeUpload(uploadId);
  }, [removeUpload]);

  // Retry upload
  const retryUpload = useCallback(async (uploadId: string): Promise<void> => {
    const session = uploadSessionsRef.current.get(uploadId);
    if (session && session.retryCount < (session.options.maxRetries || DEFAULT_MAX_RETRIES)) {
      session.retryCount++;
      session.abortController = new AbortController();
      
      updateProgress(uploadId, { 
        status: 'uploading', 
        error: undefined,
        bytesUploaded: 0,
        percentage: 0,
      });

      try {
        const chunkSize = session.options.chunkSize || DEFAULT_CHUNK_SIZE;
        const useChunkedUpload = session.options.useChunkedUpload ?? (session.file.size > chunkSize);
        
        const fileId = useChunkedUpload 
          ? await uploadChunkedFile(session)
          : await uploadSingleFile(session);
          
        session.options.onComplete?.(fileId);
      } catch (error) {
        console.error('Retry upload failed:', error);
      }
    }
  }, [updateProgress]);

  // Clear completed uploads
  const clearCompleted = useCallback((): void => {
    setUploads(prev => prev.filter(upload => 
      upload.status !== 'completed' && upload.status !== 'error'
    ));
    
    // Clean up sessions for completed/error uploads
    uploads.forEach(upload => {
      if (upload.status === 'completed' || upload.status === 'error') {
        uploadSessionsRef.current.delete(upload.uploadId);
      }
    });
  }, [uploads]);

  // Check if any upload is in progress
  const isUploading = uploads.some(upload => 
    upload.status === 'uploading' || upload.status === 'pending'
  );

  return {
    uploads,
    isUploading,
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
  };
};