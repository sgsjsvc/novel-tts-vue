<!-- src/components/ChapterTable.vue -->
<template>
  <el-table :data="chapters" style="width: 100%" height="100%" @selection-change="handleSelectionChange"
    class="genshin-chapter-table" row-key="name">
    <el-table-column type="selection" width="55" />
    <el-table-column label="#" width="60">
      <template #default="{ $index }">
        <span class="chapter-index">#{{ $index + 1 }}</span>
      </template>
    </el-table-column>
    <el-table-column label="章节名称" prop="name" />
    <el-table-column label="状态" width="120">
      <template #default="{ row }">
        <div v-if="row.status === '正在解析'" class="progress-container">
          <el-progress :percentage="row.progress || 0" :stroke-width="18" text-inside striped striped-flow>
            <span>解析中... {{ row.progress?.toFixed(0) || 0 }}%</span>
          </el-progress>
        </div>
        <div v-else class="chapter-status" :class="`status-${getStatusClass(row.status)}`">
          <span class="status-icon">{{ getStatusIcon(row.status) }}</span>
          <span class="status-text">{{ row.status }}</span>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="280">
      <template #default="{ row }">
        <div class="action-buttons">
          <el-button size="small" class="genshin-button" @click.stop="$emit('parse', row)"
            :loading="parsingState[row.name]" :disabled="isAnyChapterParsing">
            {{ row.status === '已解析' ? '重新解析' : '解析' }}
          </el-button>
          <el-button v-if="row.status === '已解析'" size="small" class="genshin-button" @click.stop="$emit('view', row)"
            :disabled="isAnyChapterParsing">
            阅览
          </el-button>
          <el-button v-if="row.status === '已解析'" size="small" class="genshin-button" @click.stop="$emit('play', row)"
            :disabled="isAnyChapterParsing">
            聆听
          </el-button>
        </div>
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

const emit = defineEmits<{
  (e: 'parse', chapter: Chapter): void;
  (e: 'view', chapter: Chapter): void;
  (e: 'play', chapter: Chapter): void;
  (e: 'selection-change', selection: Chapter[]): void;
}>();

const handleSelectionChange = (selection: Chapter[]) => {
  emit('selection-change', selection);
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case '已解析': return '✅';
    case '正在解析': return '✨';
    case '未解析':
    default: return '❔';
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case '已解析': return 'parsed';
    case '正在解析': return 'parsing';
    case '未解析':
    default: return 'unparsed';
  }
};
</script>

<style scoped>
.genshin-chapter-table {
  background: transparent;
  border: none;
}

.genshin-chapter-table :deep(.el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 10;
}

.genshin-chapter-table :deep(th),
.genshin-chapter-table :deep(tr),
.genshin-chapter-table :deep(td) {
  background: transparent !important;
  color: var(--genshin-text) !important;
  border-bottom: 1px solid var(--genshin-border) !important;
}

.genshin-chapter-table :deep(.el-table__header) th {
  color: var(--genshin-gold) !important;
  font-weight: bold;
}

.genshin-chapter-table :deep(.el-table__row):hover {
  background: var(--genshin-highlight-bg) !important;
}

.chapter-index {
  color: var(--genshin-text-light);
}

.chapter-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.8rem;
  clip-path: polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px);
}

.status-parsed {
  background: rgba(0, 242, 255, 0.2);
  color: var(--sr-cyan);
}

.status-parsing {
  background: rgba(240, 230, 140, 0.3);
  color: var(--genshin-gold);
  animation: pulse-bg 2s infinite;
  padding: 0;
  overflow: hidden;
}

.progress-wrapper {
  width: 100%;
}

.status-parsing .el-progress {
  width: 100%;
}

:deep(.el-progress-bar__outer) {
  background-color: transparent !important;
}

:deep(.el-progress-bar__inner) {
  background-color: var(--genshin-gold) !important;
  opacity: 0.6;
}

:deep(.el-progress-bar__innerText) {
  color: #fff !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.status-unparsed {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
}


.progress-container {
  width: 100%;
  padding: 0.3rem 0;
}

.progress-container :deep(.el-progress-bar__outer) {
  background-color: rgba(240, 230, 140, 0.2) !important;
  border-radius: 4px;
}

.progress-container :deep(.el-progress-bar__innerText) {
  color: var(--genshin-gold);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  font-size: 0.8rem;
}

.progress-container :deep(.el-progress-bar__inner) {
  background-image: linear-gradient(45deg,
      rgba(255, 255, 255, 0.25) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.25) 50%,
      rgba(255, 255, 255, 0.25) 75%,
      transparent 75%,
      transparent);
  background-size: 20px 20px;
  border-radius: 4px;
  background-color: var(--genshin-gold-darker);
  animation: progress-bar-stripes 1s linear infinite;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}


.action-buttons .sr-button {
  padding: 5px 10px;
  font-size: 12px;
}

@keyframes pulse-bg {
  50% {
    background-color: rgba(240, 230, 140, 0.5);
  }
}

/* Scrollbar styles */
.genshin-chapter-table :deep(.el-scrollbar__bar.is-vertical .el-scrollbar__thumb) {
  background: var(--genshin-gold);
}
</style>
