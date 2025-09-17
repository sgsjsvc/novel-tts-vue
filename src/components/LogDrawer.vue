<!-- src/components/LogDrawer.vue -->
<template>
  <el-drawer 
    :model-value="visible" 
    @update:modelValue="$emit('update:visible', $event)" 
    title="运行日志" 
    direction="rtl" 
    size="50%" 
    @opened="loadLogs"
    :body-style="{ padding: '0px', height: '100%' }"
  >
    <el-skeleton :rows="10" animated v-if="isFetchingLogs" class="skeleton-padding" />
    <!-- 1. 添加一个用于flex布局的包装容器 -->
    <div v-else class="log-container">
      <pre class="log-content-box">{{ logContent }}</pre>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
// 删除了 nextTick 和 ref 的导入，因为不再需要它们了
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchLogs } from '../services/api';

defineProps<{ visible: boolean }>();
defineEmits(['update:visible']);

const logContent = ref('');
const isFetchingLogs = ref(false);

// JavaScript 滚动逻辑已完全移除

const loadLogs = async () => {
  isFetchingLogs.value = true;
  try {
    const res = await fetchLogs();
    logContent.value = res.data || "暂无日志内容。";
  } catch {
    ElMessage.error('获取日志失败');
  } finally {
    isFetchingLogs.value = false;
  }
};
</script>

<style scoped>
/* 2. 为新的flex容器添加样式 */
.log-container {
  height: 100%;
  display: flex;
  /* 关键属性：让内容从下向上排列 */
  flex-direction: column-reverse;
  overflow-y: auto;
  background-color: #1c1e21;
}

/* 3. 调整 <pre> 元素的样式 */
.log-content-box {
  /* 不再需要控制高度或滚动，父容器会处理 */
  color: #e4e6eb;
  padding: 15px;
  margin: 0; /* 移除 pre 标签的默认 margin */
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
}

/* 为骨架屏添加一些内边距，使其看起来更好 */
.skeleton-padding {
  padding: 20px;
}
</style>