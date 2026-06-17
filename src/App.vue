<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <div class="logo">📄</div>
        <div class="title">
          <h1>PDF工具箱</h1>
          <p>页面提取与合并工具</p>
        </div>
      </div>
      <div class="header-right">
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'extract' }"
            @click="activeTab = 'extract'"
          >
            <span>✂️</span>
            <span>页面提取</span>
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'merge' }"
            @click="activeTab = 'merge'"
          >
            <span>🔗</span>
            <span>文件合并</span>
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <PdfExtractor v-if="activeTab === 'extract'" />
      <PdfMerger v-else />
    </main>

    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon">{{ toast.icon }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue'
import PdfExtractor from './components/PdfExtractor.vue'
import PdfMerger from './components/PdfMerger.vue'

const activeTab = ref('extract')
const toast = ref({
  show: false,
  type: 'success',
  message: '',
  icon: '✓'
})

let toastTimer = null

const showToast = (message, type = 'success') => {
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  
  toast.value = {
    show: true,
    type,
    message,
    icon: icons[type] || 'ℹ'
  }
  
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

provide('showToast', showToast)

let removeImportListener = null
let removeMergeListener = null

onMounted(() => {
  if (window.electronAPI) {
    removeImportListener = window.electronAPI.onMenuImportPdf(() => {
      activeTab.value = 'extract'
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menu-import-pdf'))
      }, 100)
    })
    
    removeMergeListener = window.electronAPI.onMenuImportMerge(() => {
      activeTab.value = 'merge'
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menu-import-merge'))
      }, 100)
    })
  }
})

onUnmounted(() => {
  if (removeImportListener) removeImportListener()
  if (removeMergeListener) removeMergeListener()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 36px;
  line-height: 1;
}

.title h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.title p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.tabs {
  display: flex;
  gap: 8px;
  background-color: var(--bg-color);
  padding: 4px;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background-color: rgba(64, 158, 255, 0.1);
  color: var(--primary-color);
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.toast.success {
  background-color: var(--success-color);
}

.toast.error {
  background-color: var(--danger-color);
}

.toast.warning {
  background-color: var(--warning-color);
}

.toast.info {
  background-color: var(--info-color);
}

.toast-icon {
  font-size: 16px;
  font-weight: bold;
}
</style>
