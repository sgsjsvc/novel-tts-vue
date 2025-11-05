<!-- src/App.vue -->
<template>
  <div class="app-container">
    <div class="genshin-panel main-panel">
      <!-- App Title -->
      <div class="app-title">
        <h1>星轨 TTS</h1>
        <p>// Star Rail TTS //</p>
      </div>

      <!-- Controls -->
      <div class="controls-grid">
        <el-upload
          :action="`${API_BASE_URL}/upload`"
          :show-file-list="false"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :before-upload="handleBeforeUpload"
          accept=".txt,.epub"
          :disabled="isAnyChapterParsing"
          class="control-item upload-wrapper"
        >
          <el-button class="genshin-button" :loading="isUploading" :disabled="isAnyChapterParsing">
            <el-icon><Upload /></el-icon>
            <span>{{ isUploading ? '上传中...' : '载入数据卷' }}</span>
          </el-button>
        </el-upload>

        <el-select
          v-model="selectedNovel"
          placeholder="选择数据卷"
          class="genshin-select control-item"
          filterable
          clearable
          :disabled="isAnyChapterParsing"
          size="large"
        >
          <el-option v-for="novel in novels" :key="novel" :label="novel" :value="novel" />
        </el-select>

        <el-input
          v-model="searchQuery"
          placeholder="搜索章节..."
          clearable
          class="genshin-input control-item"
          size="large"
        >
          <!-- <template #prepend><el-icon><Search /></el-icon></template> -->
        </el-input>

        <el-select
          v-model="selectedModel"
          placeholder="选择解析模型"
          class="genshin-select control-item"
          :disabled="isAnyChapterParsing"
          size="large"
        >
          <el-option label="Gemini-2.5-Flash" value="gemini-2.5-flash" />
        </el-select>

        <el-button class="genshin-button control-item" @click="handleBatchParse" :disabled="selectedChapters.length === 0 || isAnyChapterParsing">
          <el-icon><Refresh /></el-icon>
          <span>批量解析</span>
        </el-button>

        <el-button class="genshin-button control-item" @click="logDrawerVisible = true" :disabled="isAnyChapterParsing">
          <el-icon><Document /></el-icon>
          <span>查看日志</span>
        </el-button>
      </div>

      <!-- Chapters Table -->
      <div class="table-container">
        <ChapterTable
          ref="chapterTableRef"
          :chapters="filteredChapters"
          :parsingState="parsingState"
          :isAnyChapterParsing="isAnyChapterParsing"
          @parse="handleParseChapter"
          @view="viewChapter"
          @play="playChapter"
          @selection-change="handleSelectionChange"
        />
      </div>

      <!-- Loading / Sentinel -->
      <div class="loading-section">
        <div v-if="isLoading" class="loading-indicator">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-if="!hasMore && chapters.length > 0" class="end-text">
          --- 数据读取完毕 ---
        </div>
        <div ref="sentinel" class="sentinel"></div>
      </div>
    </div>

    <!-- Global Components -->
    <GlobalPlayer
      :visible="playerState.visible"
      :novelName="selectedNovel!"
      :chapterName="playerState.chapterName"
      :chapterLines="playerState.chapterLines"
    />
    <LogDrawer v-model:visible="logDrawerVisible" />
    <el-dialog
      v-model="chapterTextViewer.visible"
      :title="chapterTextViewer.title"
      width="80%"
      top="5vh"
      class="genshin-dialog"
    >
      <div class="dialog-content">
        <pre>{{ chapterTextViewer.content }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, UploadProps } from 'element-plus';
import { Document, Upload, Search, Refresh } from '@element-plus/icons-vue';
import type { Chapter, ChapterLine } from '../types';
import * as api from './services/api';
import { useIntersectionObserver } from './composables/useIntersectionObserver';
import ChapterTable from './components/ChapterTable.vue';
import GlobalPlayer from './components/GlobalPlayer.vue';
import LogDrawer from './components/LogDrawer.vue';

const { API_BASE_URL } = api;

// State remains the same...
const novels = ref<string[]>([]);
const selectedNovel = ref<string | null>(null);
const selectedModel = ref<string>('gemini-2.5-flash');
const chapters = ref<Chapter[]>([]);
const isUploading = ref(false);
const isLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const hasMore = ref(true);
const parsingState = reactive<Record<string, boolean>>({});
const isAnyChapterParsing = ref(false);
const logDrawerVisible = ref(false);

const chapterTextViewer = reactive({
  visible: false,
  title: '',
  content: '',
});

const playerState = reactive({
  visible: false,
  chapterName: '',
  chapterLines: [] as ChapterLine[],
});

const chapterTableRef = ref<InstanceType<typeof ChapterTable> | null>(null);
const selectedChapters = ref<Chapter[]>([]);

const handleSelectionChange = (selection: Chapter[]) => {
  selectedChapters.value = selection;
};

const handleBatchParse = () => {
  if (selectedChapters.value.length === 0) {
    ElMessage.warning('请至少选择一个章节。');
    return;
  }
  const unparsedChapters = selectedChapters.value.filter(c => c.status !== '已解析');
  if (unparsedChapters.length > 0) {
    ElMessageBox.confirm(`即将解析 ${unparsedChapters.length} 个未解析的章节，是否继续？`, '确认批量解析', {
      confirmButtonText: '开始解析',
      cancelButtonText: '取消',
      type: 'info',
    }).then(() => {
      unparsedChapters.forEach(chapter => handleParseChapter(chapter));
    }).catch(() => {});
  } else {
    ElMessageBox.confirm(`选中的 ${selectedChapters.value.length} 个章节都已解析过，是否要全部重新解析？`, '确认重新解析', {
      confirmButtonText: '全部重新解析',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      selectedChapters.value.forEach(chapter => handleParseChapter(chapter));
    }).catch(() => {});
  }
};

const searchQuery = ref('');
const filteredChapters = computed(() => {
  if (!searchQuery.value) return chapters.value;
  return chapters.value.filter(chapter => chapter.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const sentinel = ref<HTMLDivElement | null>(null);
const { startObserver, stopObserver } = useIntersectionObserver(sentinel, () => {
  currentPage.value++;
  loadChapters();
});

const loadNovels = async () => {
  try {
    const res = await api.fetchNovels();
    novels.value = res.data;
    if (novels.value.length > 0 && !selectedNovel.value) {
      selectedNovel.value = novels.value[0];
    }
  } catch { ElMessage.error('加载小说列表失败。'); }
};

const loadChapters = async () => {
  if (isLoading.value || !hasMore.value || !selectedNovel.value) return;
  isLoading.value = true;
  try {
    const res = await api.fetchChapters(selectedNovel.value, currentPage.value, pageSize.value);
    const newChapters = res.data.items;
    if (newChapters.length > 0) {
      chapters.value.push(...newChapters);
      if (newChapters.length < pageSize.value) hasMore.value = false;
    } else {
      hasMore.value = false;
    }
  } catch {
    ElMessage.error('加载章节列表失败。');
  } finally {
    isLoading.value = false;
    if (hasMore.value) startObserver();
    else stopObserver();
  }
};

const resetAndLoadChapters = () => {
  chapters.value = [];
  currentPage.value = 1;
  hasMore.value = true;
  stopObserver();
  loadChapters();
};

const handleUploadSuccess: UploadProps['onSuccess'] = (response: any) => {
  isUploading.value = false;
  ElMessage.success('小说上传成功！');
  loadNovels().then(() => { selectedNovel.value = response.novelName; });
};
const handleUploadError: UploadProps['onError'] = () => { isUploading.value = false; ElMessage.error('上传失败。'); };
const handleBeforeUpload: UploadProps['beforeUpload'] = () => { isUploading.value = true; return true; };

const viewChapter = async (chapter: Chapter) => {
  try {
    const response = await api.fetchChapterText(selectedNovel.value!, chapter.name);
    chapterTextViewer.title = chapter.name;
    chapterTextViewer.content = response.data;
    chapterTextViewer.visible = true;
  } catch { ElMessage.error('获取章节内容失败。'); }
};

const playChapter = async (chapter: Chapter) => {
  if (playerState.chapterName !== chapter.name) {
    try {
      const response = await api.fetchChapterAudioList(selectedNovel.value!, chapter.name);
      playerState.chapterLines = response.data;
      playerState.chapterName = chapter.name;
    } catch {
      ElMessage.error('获取音频列表失败。');
      return;
    }
  }
  playerState.visible = true;
};

const handleParseChapter = async (chapter: Chapter) => {
  const startParsing = async () => {
    isAnyChapterParsing.value = true;
    parsingState[chapter.name] = true;
    const chapterInList = chapters.value.find(c => c.name === chapter.name);
    if (chapterInList) chapterInList.status = '正在解析';
    try {
      await api.parseChapter(selectedNovel.value!, chapter.name, selectedModel.value);
      ElMessage.info(`'${chapter.name}' 已提交后台解析。`);
      const intervalId = setInterval(async () => {
        const res = await api.fetchChapterStatuses(selectedNovel.value!, [chapter.name]);
        const status = res.data[0].status as Chapter["status"];
        if (chapterInList) chapterInList.status = status;
        if (status === "已解析" || status === "未解析") {
          clearInterval(intervalId);
          isAnyChapterParsing.value = false;
        }
      }, 3000);
    } catch (error: any) {
      ElMessage.error('提交解析失败。');
      if (chapterInList) chapterInList.status = '未解析';
      isAnyChapterParsing.value = false;
    } finally {
      parsingState[chapter.name] = false;
    }
  };
  if (chapter.status === '已解析') {
    ElMessageBox.confirm(`'${chapter.name}' 已解析，重新解析？`, '确认', { confirmButtonText: '重新解析', cancelButtonText: '取消', type: 'warning' }).then(startParsing).catch(() => {});
  } else {
    startParsing();
  }
};

onMounted(loadNovels);
watch(selectedNovel, (newVal) => {
  if (newVal) resetAndLoadChapters();
  else chapters.value = [];
});
</script>

<style>
.app-container {
  width: 100vw;
  height: 100vh;
  padding: 2rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}
.main-panel {
  width: 100%;
  height: 100%;
  max-width: 1400px;
  padding: 2rem 3rem;
  display: flex;
  flex-direction: column;
}

.app-title {
  text-align: center;
  margin-bottom: 2rem;
  flex-shrink: 0;
}
.app-title h1 {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  color: var(--genshin-gold);
  text-shadow: 0 0 15px var(--genshin-gold);
}
.app-title p {
  font-size: 1rem;
  opacity: 0.8;
  color: var(--genshin-text-light);
  letter-spacing: 2px;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  flex-shrink: 0;
}
.upload-wrapper, .upload-wrapper .el-upload, .genshin-button {
  width: 100%;
}
.genshin-button span { margin-left: 8px; }

.table-container {
  flex-grow: 1;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--genshin-border);
  clip-path: polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px);
}

.loading-section {
  text-align: center;
  padding: 1rem 0 0;
  flex-shrink: 0;
}
.end-text { color: var(--genshin-text); }
.sentinel { height: 50px; }

.sr-dialog {
  background: var(--genshin-panel-bg) !important;
  border: 1px solid var(--genshin-border) !important;
  backdrop-filter: blur(20px) !important;
}
.sr-dialog .el-dialog__title { color: var(--genshin-gold); }
.dialog-content {
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(0,0,0,0.2);
  padding: 1rem;
}
pre { white-space: pre-wrap; word-wrap: break-word; color: var(--genshin-text); }
</style>
