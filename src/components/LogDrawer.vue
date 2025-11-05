<!-- src/components/LogDrawer.vue -->
<template>
  <el-drawer :model-value="visible" @update:modelValue="$emit('update:visible', $event)" title="📋 运行日志" direction="rtl"
    size="60%" @opened="onOpened" :custom-class="'genshin-drawer'" :body-style="{ padding: '0px', height: '100%' }">
    <div class="log-drawer-container">
      <!-- 头部 -->
      <div class="log-header">
        <div>
          <div>🔍</div>
          <div>
            <h3>系统日志</h3>
            <div style="display: inline-flex; align-items: center; gap: 4px;">
              <span>运行状态:</span>
              <el-tag :type="getLogStatusType()" size="small" >
                {{ getLogStatusText() }}
              </el-tag>
            </div>

          </div>
        </div>

        <div>
          <el-button size="small" @click="loadLogs" :loading="isFetchingLogs">
            <el-icon>
              <Refresh />
            </el-icon> 刷新
          </el-button>
          <el-button size="small" @click="clearLogs">
            <el-icon>
              <Delete />
            </el-icon> 清空
          </el-button>
        </div>
      </div>

      <!-- 加载占位 -->
      <div v-if="isFetchingLogs" >
        <el-skeleton :rows="6" animated  />
        <div>
          <el-icon>
            <Loading />
          </el-icon>
          正在加载日志...
        </div>
      </div>

      <!-- 日志主体 -->
      <div v-else class="log-content-wrapper">
        <div v-if="!logContent.trim()">
          <div >📭</div>
          <div >暂无日志内容</div>
          <div >系统运行正常</div>
        </div>

        <div v-else ref="logContainer" class="log-container">
          <pre class="log-content-box">{{ logContent }}</pre>
        </div>
      </div>

      <!-- 底部状态 -->
      <div class="log-footer">
        <div class="log-stats">
          <span class="stat-item">
            <span class="stat-label">行数:</span>
            <span class="stat-value" style="padding-right: 10px;">{{ logLineCount }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">最后更新:</span>
            <span class="stat-value">{{ lastUpdateTime }}</span>
          </span>
        </div>
        <div class="log-status">
          <el-tag :type="getConnectionStatusType()" size="small" >
            {{ getConnectionStatusText() }}
          </el-tag>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Delete, Loading } from '@element-plus/icons-vue'

const API_LOGS_RECENT = '/ws/logs/recent'  // GET 历史日志
const WS_LOGS = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/logs' // WebSocket 地址

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible'])

const logContent = ref('')
const isFetchingLogs = ref(false)
const lastUpdateTime = ref('')
const websocket = ref<WebSocket | null>(null)
const isConnected = ref(false)
const isConnecting = ref(false)
const logContainer = ref<HTMLElement | null>(null)

const logLineCount = computed(() => {
  if (!logContent.value) return 0
  return logContent.value.split('\n').length
})

const getConnectionStatusText = () => isConnecting.value ? '连接中...' : isConnected.value ? '已连接' : '未连接'
const getConnectionStatusType = () => isConnecting.value ? 'warning' : isConnected.value ? 'success' : 'info'
const getLogStatusType = () => {
  if (!logContent.value.trim()) return 'info'
  if (logContent.value.match(/error|exception|failed/i)) return 'danger'
  if (logContent.value.match(/warn/i)) return 'warning'
  return 'success'
}
const getLogStatusText = () => {
  if (!logContent.value.trim()) return '无日志'
  if (logContent.value.match(/error|exception|failed/i)) return '包含错误'
  if (logContent.value.match(/warn/i)) return '包含警告'
  return '正常'
}

// 始终滚动到底部
function scrollToBottom() {
  const el = logContainer.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}
// 加载历史日志
async function loadLogs() {
  isFetchingLogs.value = true
  try {
    const res = await fetch(API_LOGS_RECENT)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const body = await res.json()
    logContent.value = Array.isArray(body) ? body.join('\n') : String(body || '')
    lastUpdateTime.value = new Date().toLocaleString()
    scrollToBottom()
  } catch (e) {
    console.error('loadLogs error', e)
    ElMessage.error('获取日志失败')
  } finally {
    isFetchingLogs.value = false
  }
}

// WebSocket 连接
function connectWebSocket() {
  if (websocket.value && (websocket.value.readyState === WebSocket.OPEN || websocket.value.readyState === WebSocket.CONNECTING)) return

  isConnecting.value = true
  try {
    websocket.value = new WebSocket(WS_LOGS)
    websocket.value.onopen = () => {
      isConnecting.value = false
      isConnected.value = true
      ElMessage.success('日志实时连接已建立')
      scrollToBottom()
    }

    websocket.value.onmessage = (ev) => {
      const line = String(ev.data)
      logContent.value += (logContent.value ? '\n' : '') + line
      lastUpdateTime.value = new Date().toLocaleTimeString()
      nextTick(() => requestAnimationFrame(scrollToBottom))
    }

    websocket.value.onclose = () => {
      isConnecting.value = false
      isConnected.value = false
      if (props.visible) setTimeout(connectWebSocket, 3000)
    }

    websocket.value.onerror = (err) => {
      console.error('WebSocket error', err)
      isConnecting.value = false
      isConnected.value = false
    }
  } catch (err) {
    console.error('connectWebSocket failed', err)
    isConnecting.value = false
    isConnected.value = false
  }
}

function disconnectWebSocket() {
  try { websocket.value?.close() } catch { }
  websocket.value = null
  isConnected.value = false
  isConnecting.value = false
}

function clearLogs() {
  logContent.value = ''
  lastUpdateTime.value = ''
  ElMessage.success('日志已清空')
}

function onOpened() {
  loadLogs()
  setTimeout(connectWebSocket, 150)
}

watch(() => props.visible, (v) => {
  if (!v) disconnectWebSocket()
})
</script>

<style scoped>
.log-drawer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  color: #e4e6eb;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.log-actions {
  display: flex;
  gap: 8px;
}

.loading-section {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.log-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-container {
  flex: 1;
  overflow: auto;
  margin: 12px;
  border-radius: 6px;
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.log-content-box {
  margin: 0;
  padding: 16px;
  white-space: pre-wrap;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: #e4e6eb;
}

.log-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-label {
  color: #b0b3b8;
  margin-right: 6px;
}

.stat-value {
  color: #667eea;
  font-weight: 600;
}
</style>
