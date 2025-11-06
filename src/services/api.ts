// src/services/api.ts

import axios from 'axios';
import type { Chapter } from '../../types';

const apiClient = axios.create({
  baseURL: '/api',
});

export const fetchNovels = () => {
  return apiClient.get<string[]>('/novels');
};

// ✅ 非分页版本：一次性获取所有章节
export const fetchChapters = (novelName: string) => {
  // 请求时不再传分页参数
  return apiClient.get<{ items: Chapter[] }>(`/novels/${novelName}/chapters`);
};


// 获取日志数据（支持过滤）
export const fetchLogs = (filters?: {
  level?: 'all' | 'error' | 'warning' | 'info' | 'debug';
  taskId?: string;
  limit?: number;
  offset?: number;
}) => {
  return apiClient.get<string>('/logs', {
    params: {
      level: filters?.level,
      task_id: filters?.taskId,
      limit: filters?.limit,
      offset: filters?.offset,
    },
    responseType: 'text',
  });
};

export const fetchChapterAudioList = (novelName: string, chapterName: string) => {
  return apiClient.get(`/novels/${novelName}/chapters/${chapterName}/audio_list_with_text`);
};

export const fetchChapterText = (novelName: string, chapterName: string) => {
  return apiClient.get<string>(`/novels/${novelName}/chapters/${chapterName}/view`, {
    responseType: 'text',
  });
};

export const parseChapter = (novelName: string, chapterName: string, model: string) => {
  return apiClient.post(`/novels/${novelName}/chapters/${chapterName}/parse`, null, {
    params: { model },
  });
};

export const fetchChapterStatuses = (novelName: string, chapterNames: string[]) => {
  return apiClient.post(`/novels/${novelName}/chapters/statuses`, chapterNames);
};

// WebSocket URL for real-time logs
export const WS_BASE_URL = '';

// 日志导出功能
export const exportLogs = (filters?: {
  level?: 'all' | 'error' | 'warning' | 'info' | 'debug';
  taskId?: string;
  format?: 'txt' | 'json';
}) => {
  return apiClient.get<string>('/logs/export', {
    params: {
      level: filters?.level,
      task_id: filters?.taskId,
      format: filters?.format,
    },
    responseType: 'blob',
  });
};

// 获取日志统计信息
export const fetchLogStats = () => {
  return apiClient.get<{
    total: number;
    byLevel: Record<string, number>;
    recent: Array<{
      timestamp: string;
      level: string;
      message: string;
    }>;
  }>('/logs/stats');
};

// 暴露基础 URL 以便在播放器组件中构建音频源 URL
export const API_BASE_URL = apiClient.defaults.baseURL;


 // 新增：轮询章节状态的函数
  export const pollChapterStatuses = (
    novelName: string,
    chapterNames: string[],
    callback: (updatedChapters: Chapter[]) => void,
    onError: () => void
  ) => {
    const intervalId = setInterval(async () => {
      if (chapterNames.length === 0) {
        clearInterval(intervalId);
        return;
      }
      try {
        const { data: updatedChapters } = await fetchChapterStatuses(novelName, chapterNames);
        callback(updatedChapters);
      } catch (error) {
        console.error('Error polling chapter statuses:', error);
        onError();
        clearInterval(intervalId);
      }
    }, 2000); // 每 2 秒轮询一次

    return () => {
      clearInterval(intervalId);
    };
  };
