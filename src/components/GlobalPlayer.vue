<!-- src/components/GlobalPlayer.vue -->
<template>
  <transition name="player-slide-up">
    <div v-if="visible" class="genshin-player-container genshin-panel" :class="{ 'is-expanded': expanded }">
      <!-- Header / Compact View -->
      <div class="player-header">
        <div class="chapter-info">
          <span class="novel-title">{{ novelName }}</span>
          <span class="chapter-title">{{ chapterName }}</span>
        </div>
        <div class="main-controls">
          <el-button class="genshin-button control-button" @click="togglePlay" :disabled="!chapterLines.length" circle>
            <el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon>
          </el-button>
          <el-button class="genshin-button control-button" @click="toggleGlobalExpand" circle>
            <el-icon><ArrowUp v-if="!expanded" /><ArrowDown v-else /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-section">
        <div class="current-line-text">{{ currentLineText }}</div>
        <el-slider
          v-model="sliderValue"
          :min="0"
          :max="chapterLines.length > 0 ? chapterLines.length - 1 : 0"
          @change="onSliderChange"
          class="genshin-slider"
          :show-tooltip="false"
          :disabled="!chapterLines.length"
        />
      </div>

      <!-- Expanded Lyrics -->
      <transition name="fade">
        <div v-if="expanded" class="lyrics-container" ref="chapterContentContainer">
          <p
            v-for="(line, index) in chapterLines"
            :key="index"
            :class="{ 'is-active': index === currentLineIndex, 'line-text': true }"
            @click="jumpToLine(index)"
            :ref="el => { if (el) lineRefs[index] = el as HTMLElement }"
          >
            {{ line.text }}
          </p>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { VideoPlay, VideoPause, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import { API_BASE_URL } from '../services/api';
import type { ChapterLine } from '../../types';

const props = defineProps<{
  visible: boolean;
  chapterName: string;
  chapterLines: ChapterLine[];
  novelName: string;
}>();

const expanded = ref(false);
const isPlaying = ref(false);
const currentLineIndex = ref(-1);
const lineQueueIndex = ref(0);
const sliderValue = ref(0);
const playbackRate = ref(1.0); // Keep for potential future use
const audioObj = ref<HTMLAudioElement | null>(null);

const lineRefs = reactive<HTMLElement[]>([]);
const chapterContentContainer = ref<HTMLDivElement | null>(null);

const currentLineText = computed(() => {
    if (currentLineIndex.value >= 0 && props.chapterLines[currentLineIndex.value]) {
        return props.chapterLines[currentLineIndex.value].text;
    }
    return '...';
});

watch(currentLineIndex, (newIndex) => { if (newIndex >= 0) sliderValue.value = newIndex; });
watch(() => props.chapterLines, (newLines) => {
  if (newLines?.length > 0) {
    stopAudio();
    currentLineIndex.value = -1;
    lineQueueIndex.value = 0;
    playNextLine();
  }
}, { deep: true });

const stopAudio = () => {
  if (audioObj.value) {
    audioObj.value.pause();
    audioObj.value.onended = null;
    audioObj.value = null;
  }
  isPlaying.value = false;
};

const playNextLine = () => {
  if (lineQueueIndex.value >= props.chapterLines.length) {
    currentLineIndex.value = -1;
    isPlaying.value = false;
    return;
  }
  currentLineIndex.value = lineQueueIndex.value;
  scrollToCurrentLine();

  const line = props.chapterLines[lineQueueIndex.value];
  stopAudio();

  const audioUrl = `${API_BASE_URL}/novels/${encodeURIComponent(props.novelName)}/chapters/${encodeURIComponent(props.chapterName)}/audio/${encodeURIComponent(line.file)}`;
  audioObj.value = new Audio(audioUrl);
  audioObj.value.playbackRate = playbackRate.value;
  audioObj.value.play();
  isPlaying.value = true;
  audioObj.value.onended = () => {
    lineQueueIndex.value++;
    playNextLine();
  };
};

const togglePlay = () => {
  if (!audioObj.value) {
    if (props.chapterLines.length) playNextLine();
    return;
  }
  if (isPlaying.value) audioObj.value.pause();
  else audioObj.value.play();
  isPlaying.value = !isPlaying.value;
};

const jumpToLine = (index: number) => {
  lineQueueIndex.value = index;
  playNextLine();
};
const onSliderChange = (val: number | number[]) => jumpToLine(val as number);
const toggleGlobalExpand = () => expanded.value = !expanded.value;

const handleKeydown = (event: KeyboardEvent) => {
  if (event.code === 'Space' && props.visible) {
    event.preventDefault();
    togglePlay();
  }
};
onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

const scrollToCurrentLine = () => {
  nextTick(() => {
    if (!expanded.value) return;
    const container = chapterContentContainer.value;
    const currentLineEl = lineRefs[currentLineIndex.value];
    if (!container || !currentLineEl) return;
    container.scrollTop = currentLineEl.offsetTop - container.clientHeight / 2 + currentLineEl.clientHeight / 2;
  });
};
</script>

<style scoped>
.genshin-player-container {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  padding: 1.2rem 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  max-height: 150px;
}
.genshin-player-container.is-expanded {
  max-height: 50vh;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.chapter-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}
.novel-title { font-size: 0.8rem; opacity: 0.7; color: var(--genshin-text-light); }
.chapter-title { text-overflow: ellipsis; overflow: hidden; font-weight: 600; font-size: 1.1rem; color: var(--genshin-gold); }
.main-controls { display: flex; gap: 0.8rem; }
.control-button {
  width: 44px;
  height: 44px;
  font-size: 1.2rem;
}

.progress-section { flex-shrink: 0; }
.current-line-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--genshin-gold);
  opacity: 0.8;
  margin-bottom: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 0 5px var(--genshin-gold);
}

.lyrics-container {
  overflow-y: auto;
  flex-grow: 1;
  text-align: center;
  font-size: 1.1rem;
  scroll-behavior: smooth;
  padding-right: 1rem; /* for scrollbar */
}
.line-text {
  padding: 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.7;
  color: var(--genshin-text-light);
}
.line-text.is-active {
  font-weight: 600;
  opacity: 1;
  transform: scale(1.05);
  color: var(--genshin-gold);
  text-shadow: 0 0 10px var(--genshin-gold);
}

/* Slider */
.genshin-slider {
  --el-slider-main-bg-color: var(--genshin-gold);
  --el-slider-runway-bg-color: var(--genshin-highlight-bg);
  --el-slider-button-size: 14px;
  --el-slider-button-color: var(--genshin-gold);
  --el-slider-border-color: var(--genshin-gold);
}
.genshin-slider :deep(.el-slider__button-wrapper) {
  box-shadow: 0 0 10px var(--genshin-gold);
}


/* Transitions */
.player-slide-up-enter-active, .player-slide-up-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.player-slide-up-enter-from, .player-slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.95);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
