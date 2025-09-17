<!-- src/components/GlobalPlayer.vue -->
<template>
  <transition name="slide-up">
    <div v-if="visible" class="global-player">
      <div class="player-header">
        <el-button size="small" @click="toggleGlobalExpand">{{ expanded ? '收起' : '展开' }}</el-button>
        <span class="chapter-name">{{ chapterName }}</span>
        <el-button type="primary" size="small" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</el-button>
      </div>

      <!-- 收缩模式 -->
      <div v-if="!expanded" class="marquee">
        <transition name="fade" mode="out-in">
          <span :key="currentLineIndex">{{ currentLineText }}</span>
        </transition>
      </div>

      <!-- 展开模式 -->
      <div v-else class="expanded-box">
        <div ref="chapterContentContainer" class="content-box">
          <div v-for="(line, index) in chapterLines" :key="index" :class="{'highlight': currentLineIndex===index}" class="line-text" @click="jumpToLine(index)" :ref="el => lineRefs[index]=el">
            {{ line.text }}
          </div>
        </div>
        <div class="audio-controls" v-if="chapterLines.length">
          <el-button size="mini" @click="togglePlay">{{ isPlaying?'暂停':'播放' }}</el-button>
          <span>{{ currentLineIndex + 1 }} / {{ chapterLines.length }}</span>
          <el-slider v-model="sliderValue" :min="0" :max="chapterLines.length-1" :step="1" @change="onSliderChange" style="flex:1; margin:0 10px;"></el-slider>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue';
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
const audioObj = ref<HTMLAudioElement | null>(null);

const lineRefs = reactive<HTMLElement[]>([]);
const chapterContentContainer = ref<HTMLDivElement | null>(null);

const currentLineText = computed(() => props.chapterLines[currentLineIndex.value]?.text || '');

watch(currentLineIndex, (newIndex) => { sliderValue.value = newIndex; });

watch(() => props.chapterLines, (newLines) => {
  if (newLines && newLines.length > 0) {
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
  if (isPlaying.value) {
    audioObj.value.pause();
    isPlaying.value = false;
  } else {
    audioObj.value.play();
    isPlaying.value = true;
  }
};

const jumpToLine = (index: number) => {
  lineQueueIndex.value = index;
  playNextLine();
};

const onSliderChange = (val: number | number[]) => jumpToLine(val as number);

const toggleGlobalExpand = () => { expanded.value = !expanded.value; };

const scrollToCurrentLine = () => {
  nextTick(() => {
    const container = chapterContentContainer.value;
    const currentLineEl = lineRefs[currentLineIndex.value];
    if (!container || !currentLineEl) return;
    const containerHeight = container.clientHeight;
    const lineOffsetTop = currentLineEl.offsetTop;
    const lineHeight = currentLineEl.clientHeight;
    container.scrollTop = lineOffsetTop - containerHeight / 2 + lineHeight / 2;
  });
};
</script>

<style scoped>
.global-player { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; box-shadow: 0 -2px 8px rgba(0,0,0,.15); padding: 10px; z-index: 1000; }
.player-header { display: flex; justify-content: space-between; align-items: center; }
.chapter-name { font-weight: bold; margin: 0 10px; }
.marquee { overflow: hidden; white-space: nowrap; display: flex; justify-content: center; align-items: center; height: 30px; font-size: 16px; }
.expanded-box { margin-top: 10px; }
.content-box { background-color: #f5f5f5; padding: 15px; border-radius: 4px; max-height: 50vh; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
.line-text { padding: 4px 6px; transition: background-color 0.3s; cursor: pointer; }
.highlight { background-color: #ffe58f; font-weight: bold; }
.audio-controls { display: flex; align-items: center; margin-top: 10px; }
.slide-up-enter-active, .slide-up-leave-active { transition: all .3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.6s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; }
</style>