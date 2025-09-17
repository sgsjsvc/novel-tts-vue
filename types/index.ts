// src/types/index.ts

export interface Chapter {
  name: string;
  status: '已解析' | '未解析' | '正在解析';
}

export interface ChapterLine {
  text: string;
  file: string;
}