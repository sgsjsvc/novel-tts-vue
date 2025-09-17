<!-- src/components/ChapterTable.vue -->
<template>
  <el-table :data="chapters" style="width: 100%; margin-top: 20px;" border>
    <el-table-column type="index" label="序号" width="80" align="center" />
    <el-table-column prop="name" label="章节" min-width="300" />
    <el-table-column prop="status" label="状态" width="120" align="center">
      <template #default="{ row }">
        <el-tag :type="row.status === '已解析' ? 'success' : (row.status === '正在解析' ? 'primary' : 'info')" :effect="row.status === '正在解析' ? 'dark' : 'light'">
          {{ row.status }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="300" align="center">
      <template #default="{ row }">
        <el-button size="small" type="primary" @click="$emit('parse', row)" :loading="parsingState[row.name]" :disabled="isAnyChapterParsing">
          {{ row.status === '已解析' ? '重新解析' : '解析' }}
        </el-button>
        <el-button v-if="row.status === '已解析'" size="small" type="info" @click="$emit('view', row)">查看</el-button>
        <el-button v-if="row.status === '已解析'" size="small" type="success" @click="$emit('play', row)">播放</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import type { Chapter } from '../../types';

defineProps<{
  chapters: Chapter[];
  parsingState: Record<string, boolean>;
  isAnyChapterParsing: boolean;
}>();

defineEmits<{
  (e: 'parse', chapter: Chapter): void;
  (e: 'view', chapter: Chapter): void;
  (e: 'play', chapter: Chapter): void;
}>();
</script>