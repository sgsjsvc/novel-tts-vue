<!-- src/App.vue -->
<template>
  <el-container style="height: 100vh;">
    <!-- 顶部 Header -->
    <el-header class="header">
      <h1>小说处理与分析工具</h1>
      <el-button type="info" plain @click="logDrawerVisible = true" :disabled="isAnyChapterParsing">查看日志</el-button>
    </el-header>

    <el-main>
      <el-card>
        <!-- 上传和选择小说 -->
        <el-row :gutter="20" align="middle">
          <el-col :span="4">
            <el-upload :action="`${API_BASE_URL}/upload`" :show-file-list="false" :on-success="handleUploadSuccess" :on-error="handleUploadError" :before-upload="handleBeforeUpload" accept=".txt,.epub" :disabled="isAnyChapterParsing">
              <el-button type="success" :loading="isUploading" :disabled="isAnyChapterParsing">上传小说文件</el-button>
            </el-upload>
          </el-col>
          <el-col :span="14">
            <el-select v-model="selectedNovel" placeholder="请选择一本小说" style="width: 100%;" filterable clearable :disabled="isAnyChapterParsing">
              <el-option v-for="novel in novels" :key="novel" :label="novel" :value="novel" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedModel" placeholder="选择解析模型" :disabled="isAnyChapterParsing">
              <el-option label="GLM-4.5-Flash" value="glm-4.5-flash" />
            </el-select>
          </el-col>
        </el-row>

        <!-- 章节表格 -->
        <ChapterTable :chapters="chapters" :parsingState="parsingState" :isAnyChapterParsing="isAnyChapterParsing" @parse="handleParseChapter" @view="viewChapter" @play="playChapter" />

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-indicator"><el-skeleton :rows="3" animated /></div>
        <div v-if="!hasMore && chapters.length>0" class="loading-indicator"><el-divider>没有更多了</el-divider></div>
        <div ref="sentinel" style="height:50px"></div>
      </el-card>
    </el-main>

    <!-- 全局播放器 -->
    <GlobalPlayer :visible="playerState.visible" :novelName="selectedNovel!" :chapterName="playerState.chapterName" :chapterLines="playerState.chapterLines" />

    <!-- 日志抽屉 -->
    <LogDrawer v-model:visible="logDrawerVisible" />
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox, UploadProps } from 'element-plus';
import type { Chapter, ChapterLine } from '../types';
import * as api from './services/api';
import { useIntersectionObserver } from './composables/useIntersectionObserver';
import ChapterTable from './components/ChapterTable.vue';
import GlobalPlayer from './components/GlobalPlayer.vue';
import LogDrawer from './components/LogDrawer.vue';

const { API_BASE_URL } = api;

// State
const novels = ref<string[]>([]);
const selectedNovel = ref<string | null>(null);
const selectedModel = ref<string>('glm-4.5-flash');
const chapters = ref<Chapter[]>([]);
const isUploading = ref(false);
const isLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const hasMore = ref(true);
const parsingState = reactive<Record<string, boolean>>({});
const isAnyChapterParsing = ref(false);
const logDrawerVisible = ref(false);

const playerState = reactive({
  visible: false,
  chapterName: '',
  chapterLines: [] as ChapterLine[],
});

// Infinite Scroll
const sentinel = ref<HTMLDivElement | null>(null);
const { startObserver, stopObserver } = useIntersectionObserver(sentinel, () => {
  currentPage.value++;
  loadChapters();
});

// Methods
const loadNovels = async () => {
  try {
    const res = await api.fetchNovels();
    novels.value = res.data;
    if (novels.value.length > 0 && !selectedNovel.value) {
      selectedNovel.value = novels.value[0];
    }
  } catch {
    ElMessage.error('加载小说列表失败');
  }
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
    ElMessage.error('加载章节列表失败');
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
  loadNovels().then(() => {
    selectedNovel.value = response.novelName;
  });
};
const handleUploadError: UploadProps['onError'] = () => { isUploading.value = false; ElMessage.error('上传失败'); };
const handleBeforeUpload: UploadProps['beforeUpload'] = () => { isUploading.value = true; return true; };

const viewChapter = async (chapter: Chapter) => {
  try {
    const response = await api.fetchChapterAudioList(selectedNovel.value!, chapter.name);
    // For viewing, we can just log it or show it in a dialog.
    // Here we'll just prep the player data without showing it.
    playerState.chapterLines = response.data;
    playerState.chapterName = chapter.name;
    ElMessage.info(`'${chapter.name}' 的内容已加载，可点击播放。`);
  } catch {
    ElMessage.error('查看章节失败');
  }
};

const playChapter = async (chapter: Chapter) => {
  if (playerState.chapterName !== chapter.name) {
      await viewChapter(chapter);
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
      ElMessage.info(`'${chapter.name}' 已提交后台解析`);
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
      ElMessage.error('提交解析失败');
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

// Lifecycle
onMounted(loadNovels);
watch(selectedNovel, (newVal) => {
  if (newVal) resetAndLoadChapters();
  else chapters.value = [];
});
</script>

<style>
/* Global styles */
body { font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; margin: 0; background-color: #f4f5f7; }
.header { background-color: #409EFF; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.loading-indicator { padding: 20px; text-align: center; color: #888; }
</style>