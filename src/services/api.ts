// src/services/api.ts

import axios from 'axios';
import type { Chapter } from '../../types';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8080/api',
});

export const fetchNovels = () => {
  return apiClient.get<string[]>('/novels');
};

export const fetchChapters = (novelName: string, page: number, pageSize: number) => {
  return apiClient.get<{ items: Chapter[] }>(`/novels/${novelName}/chapters`, {
    params: { page, page_size: pageSize },
  });
};

export const fetchLogs = () => {
  return apiClient.get<string>('/logs', { responseType: 'text' });
};

export const fetchChapterAudioList = (novelName: string, chapterName: string) => {
  return apiClient.get(`/novels/${novelName}/chapters/${chapterName}/audio_list_with_text`);
};

export const parseChapter = (novelName: string, chapterName: string, model: string) => {
  return apiClient.post(`/novels/${novelName}/chapters/${chapterName}/parse`, null, {
    params: { model },
  });
};

export const fetchChapterStatuses = (novelName: string, chapterNames: string[]) => {
  return apiClient.post(`/novels/${novelName}/chapters/statuses`, chapterNames);
};

// 暴露基础 URL 以便在播放器组件中构建音频源 URL
export const API_BASE_URL = apiClient.defaults.baseURL;