import axios from 'axios';
import type { AxiosResponse, AxiosProgressEvent } from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export interface UploadResponse {
  message: string;
  job_id: string;
}

export interface SceneCapture {
  path: string;
  timestamp: string;
  frame: number;
}

export interface SceneDetectionSettings {
  threshold: number;
}

interface JobProcessing {
  status: 'processing';
  filename: string;
  settings?: SceneDetectionSettings;
}

interface JobCompleted {
  status: 'completed';
  images: SceneCapture[];
  settings?: SceneDetectionSettings;
}

interface JobFailed {
  status: 'failed';
  error: string;
  settings?: SceneDetectionSettings;
}

export type JobStatusResponse = JobProcessing | JobCompleted | JobFailed;

export interface UploadConfig {
  threshold?: number;
}

export const uploadVideo = (
  file: File,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void,
  config?: UploadConfig
): Promise<AxiosResponse<UploadResponse>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (config?.threshold !== undefined) {
    formData.append('threshold', config.threshold.toString());
  }

  return axios.post<UploadResponse>(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

export const getJobStatus = (jobId: string): Promise<AxiosResponse<JobStatusResponse>> => {
  return axios.get<JobStatusResponse>(`${API_URL}/status/${jobId}`);
};