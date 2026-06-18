<template>
  <div class="merger-container">
    <div class="content-wrapper">
      <div class="left-panel">
        <div class="panel-header">
          <h2>📚 待合并文件</h2>
          <button class="btn btn-primary" @click="handleImportFiles">
            <span>📂</span>
            <span>添加PDF</span>
          </button>
        </div>

        <div
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <div v-if="mergeList.length === 0" class="empty-state">
            <div class="empty-icon">📎</div>
            <p class="empty-text">拖拽多个 PDF 文件到此处</p>
            <p class="empty-hint">或点击上方按钮选择文件</p>
            <p class="empty-support">支持 .pdf 格式文件，可拖拽调整顺序</p>
          </div>

          <div v-else class="merge-list" ref="mergeListRef">
            <div
              v-for="(item, index) in mergeList"
              :key="item.id"
              class="merge-item"
              :data-id="item.id"
            >
              <div class="item-drag-handle">⋮⋮</div>
              
              <div class="item-thumbnail">
                <div v-if="item.thumbnailLoading" class="thumb-loading">
                  <div class="spinner small"></div>
                </div>
                <canvas
                  v-show="!item.thumbnailLoading && item.thumbWidth > 0"
                  :ref="el => setThumbnailRef(el, index)"
                  :width="item.thumbWidth"
                  :height="item.thumbHeight"
                ></canvas>
                <div v-show="!item.thumbnailLoading && item.thumbWidth === 0" class="thumb-placeholder">
                  📄
                </div>
              </div>

              <div class="item-info">
                <div class="item-name" :title="item.fileName">
                  {{ item.fileName }}
                </div>
                <div class="item-meta">
                  <span class="badge badge-primary">{{ item.pageCount }} 页</span>
                  <span class="item-size">{{ formatFileSize(item.fileSize) }}</span>
                </div>
              </div>

              <div class="item-order">
                <span class="order-badge">{{ index + 1 }}</span>
              </div>

              <button
                class="btn btn-default btn-small btn-remove"
                @click="removeFile(index)"
                title="移除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div v-if="mergeList.length > 0" class="merge-actions">
          <div class="merge-summary">
            <span class="summary-text">
              共 <strong>{{ mergeList.length }}</strong> 个文件，
              <strong>{{ totalPages }}</strong> 页
            </span>
          </div>
          
          <div class="action-buttons">
            <button
              class="btn btn-default"
              @click="clearAll"
            >
              🗑️ 清空列表
            </button>
            <button
              class="btn btn-success merge-btn"
              :disabled="isMerging"
              @click="handleMerge"
            >
              <span v-if="isMerging" class="spinner"></span>
              <span v-else>🔗</span>
              <span>{{ isMerging ? '合并中...' : '开始合并' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-header">
          <h2>👁️ 文件预览</h2>
          <div v-if="selectedFile" class="preview-info">
            <span class="badge badge-primary">{{ selectedFile.pageCount }} 页</span>
          </div>
        </div>

        <div class="preview-container">
          <div v-if="!selectedFile" class="preview-empty">
            <div class="preview-icon">👈</div>
            <p>点击左侧文件可预览缩略图</p>
          </div>

          <div v-else class="file-preview">
            <div class="preview-header">
              <h3 class="preview-title">{{ selectedFile.fileName }}</h3>
              <div class="preview-pages">
                共 {{ selectedFile.pageCount }} 页
              </div>
            </div>

            <div class="preview-thumbnails" ref="previewContainer">
              <div
                v-for="(page, index) in selectedFilePages"
                :key="index"
                class="preview-thumbnail-item"
              >
                <div v-if="page.loading" class="thumb-loading">
                  <div class="spinner"></div>
                </div>
                <canvas
                  v-else
                  :ref="el => setPreviewCanvasRef(el, index)"
                  :width="page.width"
                  :height="page.height"
                ></canvas>
                <div class="preview-page-number">
                  {{ index + 1 }}
                </div>
              </div>
            </div>

            <div v-if="isLoadingPreview" class="loading-overlay">
              <div class="spinner large"></div>
              <p>正在加载预览...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mergeResult" class="result-panel">
      <div class="result-header">
        <h3>✅ 合并完成</h3>
        <button class="btn btn-default btn-small" @click="mergeResult = null">
          ✕
        </button>
      </div>
      <div class="result-content">
        <div class="result-info">
          <div class="result-item">
            <span class="result-label">输出文件：</span>
            <span class="result-value">{{ mergeResult.fileName }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">合并文件：</span>
            <span class="result-value">{{ mergeResult.fileCount }} 个文件</span>
          </div>
          <div class="result-item">
            <span class="result-label">总页数：</span>
            <span class="result-value">{{ mergeResult.pageCount }} 页</span>
          </div>
          <div class="result-item">
            <span class="result-label">文件大小：</span>
            <span class="result-value">{{ formatFileSize(mergeResult.fileSize) }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">保存路径：</span>
            <span class="result-value path">{{ mergeResult.filePath }}</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" @click="openMergedFile">
            📂 打开文件
          </button>
          <button class="btn btn-default" @click="mergeResult = null">
            继续操作
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, nextTick, watch } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import Sortable from 'sortablejs'

const showToast = inject('showToast')

const initPdfJs = () => {
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  } else if (pdfjsLib.default && pdfjsLib.default.GlobalWorkerOptions) {
    pdfjsLib.default.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }
}

const getPdfLib = () => {
  return pdfjsLib.default || pdfjsLib
}

initPdfJs()

const isDragOver = ref(false)
const isMerging = ref(false)
const isLoadingPreview = ref(false)
const mergeList = ref([])
const selectedFile = ref(null)
const selectedFilePages = ref([])
const mergeResult = ref(null)
const mergeListRef = ref(null)
const previewContainer = ref(null)
const thumbnailRefs = ref([])
const previewCanvasRefs = ref([])

let sortable = null
let fileIdCounter = 0

const totalPages = computed(() => {
  return mergeList.value.reduce((sum, item) => sum + item.pageCount, 0)
})

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const setThumbnailRef = (el, index) => {
  if (el) {
    thumbnailRefs.value[index] = el
  }
}

const setPreviewCanvasRef = (el, index) => {
  if (el) {
    previewCanvasRefs.value[index] = el
  }
}

const handleImportFiles = async () => {
  if (!window.electronAPI) {
    showToast('请在Electron环境中运行', 'warning')
    return
  }

  const result = await window.electronAPI.openFileDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    for (const filePath of result.filePaths) {
      await addFile(filePath)
    }
  }
}

const handleDrop = async (e) => {
  isDragOver.value = false
  const files = e.dataTransfer.files
  const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))

  if (pdfFiles.length === 0) {
    showToast('请拖入PDF文件', 'warning')
    return
  }

  for (const file of pdfFiles) {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    await addFileFromData(uint8Array, file.name, file.size)
  }
}

const addFile = async (filePath) => {
  try {
    const result = await window.electronAPI.readFile(filePath)
    if (!result.success) {
      showToast('读取文件失败: ' + result.error, 'error')
      return
    }
    await addFileFromData(new Uint8Array(result.data), result.fileName, result.size)
  } catch (error) {
    showToast('加载PDF失败: ' + error.message, 'error')
  }
}

const addFileFromData = async (data, fileName, fileSize) => {
  try {
    const pdfDoc = await PDFDocument.load(data)
    const pageCount = pdfDoc.getPageCount()
    
    const fileItem = {
      id: ++fileIdCounter,
      data,
      fileName,
      fileSize,
      pageCount,
      pdfDoc,
      pdfjsDoc: null,
      thumbWidth: 0,
      thumbHeight: 0,
      thumbnailLoading: true
    }

    mergeList.value.push(fileItem)
    const currentIndex = mergeList.value.length - 1

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('缩略图加载超时')), 10000)
    })

    try {
      await nextTick()
      await Promise.race([
        loadFileThumbnail(fileItem, currentIndex),
        timeoutPromise
      ])
    } catch (thumbError) {
      console.warn('缩略图加载失败，文件仍可合并:', thumbError.message)
      fileItem.thumbnailLoading = false
      fileItem.thumbWidth = 0
      fileItem.thumbHeight = 0
    }

    showToast(`已添加 ${fileName} (${pageCount}页)`, 'success')
  } catch (error) {
    showToast('解析PDF失败: ' + error.message, 'error')
  }
}

const loadFileThumbnail = async (fileItem, index) => {
  try {
    const pdfjsDoc = await getPdfLib().getDocument({ data: fileItem.data }).promise
    fileItem.pdfjsDoc = pdfjsDoc

    const page = await pdfjsDoc.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = 80 / viewport.width
    const scaledViewport = page.getViewport({ scale })

    const width = scaledViewport.width
    const height = scaledViewport.height

    await nextTick()
    const canvas = thumbnailRefs.value[index]
    
    if (canvas) {
      const context = canvas.getContext('2d')
      canvas.width = width
      canvas.height = height
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise
    }

    fileItem.thumbWidth = width
    fileItem.thumbHeight = height
    fileItem.thumbnailLoading = false
  } catch (error) {
    console.error('加载缩略图失败:', error)
    fileItem.thumbnailLoading = false
    fileItem.thumbWidth = 0
    fileItem.thumbHeight = 0
    throw error
  }
}

const removeFile = (index) => {
  const removed = mergeList.value.splice(index, 1)[0]
  if (removed.pdfjsDoc) {
    removed.pdfjsDoc.destroy()
  }
  if (selectedFile.value && selectedFile.value.id === removed.id) {
    selectedFile.value = null
    selectedFilePages.value = []
  }
  thumbnailRefs.value.splice(index, 1)
  showToast(`已移除 ${removed.fileName}`, 'info')
}

const clearAll = () => {
  mergeList.value.forEach(item => {
    if (item.pdfjsDoc) {
      item.pdfjsDoc.destroy()
    }
  })
  mergeList.value = []
  selectedFile.value = null
  selectedFilePages.value = []
  thumbnailRefs.value = []
  showToast('已清空列表', 'info')
}

const selectFile = async (fileItem) => {
  if (selectedFile.value?.id === fileItem.id) return

  selectedFile.value = fileItem
  isLoadingPreview.value = true
  selectedFilePages.value = []
  previewCanvasRefs.value = []

  try {
    if (!fileItem.pdfjsDoc) {
      fileItem.pdfjsDoc = await getPdfLib().getDocument({ data: fileItem.data }).promise
    }

    const pageCount = fileItem.pageCount
    for (let i = 0; i < pageCount; i++) {
      selectedFilePages.value.push({
        loading: true,
        width: 0,
        height: 0
      })
    }

    await nextTick()

    for (let i = 0; i < pageCount; i++) {
      await renderPreviewPage(fileItem.pdfjsDoc, i)
    }

    isLoadingPreview.value = false
  } catch (error) {
    isLoadingPreview.value = false
    showToast('加载预览失败: ' + error.message, 'error')
  }
}

const renderPreviewPage = async (pdfjsDoc, pageIndex) => {
  try {
    const page = await pdfjsDoc.getPage(pageIndex + 1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = 150 / viewport.width
    const scaledViewport = page.getViewport({ scale })

    selectedFilePages.value[pageIndex] = {
      loading: false,
      width: scaledViewport.width,
      height: scaledViewport.height
    }

    await nextTick()

    const canvas = previewCanvasRefs.value[pageIndex]
    if (canvas) {
      const context = canvas.getContext('2d')
      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise
    }
  } catch (error) {
    console.error('渲染预览页失败:', error)
    selectedFilePages.value[pageIndex] = {
      loading: false,
      width: 150,
      height: 210
    }
  }
}

const initSortable = () => {
  if (!mergeListRef.value || sortable) return

  sortable = new Sortable(mergeListRef.value, {
    animation: 200,
    handle: '.item-drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return

      const item = mergeList.value.splice(oldIndex, 1)[0]
      mergeList.value.splice(newIndex, 0, item)

      const canvas = thumbnailRefs.value.splice(oldIndex, 1)[0]
      thumbnailRefs.value.splice(newIndex, 0, canvas)
    }
  })
}

const handleMerge = async () => {
  if (mergeList.value.length < 2) {
    showToast('至少需要2个文件才能合并', 'warning')
    return
  }

  try {
    isMerging.value = true

    const mergedPdf = await PDFDocument.create()

    for (const fileItem of mergeList.value) {
      const sourcePdf = fileItem.pdfDoc
      const pageCount = sourcePdf.getPageCount()
      
      for (let i = 0; i < pageCount; i++) {
        const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [i])
        mergedPdf.addPage(copiedPage)
      }
    }

    const pdfBytes = await mergedPdf.save()

    const defaultName = '合并文件_' + mergeList.value.length + '个_' + totalPages.value + '页.pdf'
    const saveResult = await window.electronAPI.saveFileDialog({
      defaultPath: defaultName
    })

    if (saveResult.canceled) {
      isMerging.value = false
      return
    }

    const writeResult = await window.electronAPI.writeFile(
      saveResult.filePath,
      Array.from(pdfBytes)
    )

    if (!writeResult.success) {
      showToast('保存文件失败: ' + writeResult.error, 'error')
      isMerging.value = false
      return
    }

    mergeResult.value = {
      fileName: defaultName,
      fileCount: mergeList.value.length,
      pageCount: totalPages.value,
      fileSize: pdfBytes.length,
      filePath: saveResult.filePath
    }

    showToast(`合并成功！共 ${totalPages.value} 页`, 'success')
    isMerging.value = false
  } catch (error) {
    isMerging.value = false
    showToast('合并失败: ' + error.message, 'error')
  }
}

const openMergedFile = async () => {
  if (mergeResult.value) {
    await window.electronAPI.openExternal(mergeResult.value.filePath)
  }
}

const handleMenuImport = () => {
  handleImportFiles()
}

watch(mergeListRef, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initSortable()
    })
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('menu-import-merge', handleMenuImport)
  nextTick(() => {
    initSortable()
  })

  if (mergeListRef.value) {
    mergeListRef.value.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.merge-item')
      if (itemEl && !e.target.closest('.btn-remove') && !e.target.closest('.item-drag-handle')) {
        const id = parseInt(itemEl.dataset.id)
        const item = mergeList.value.find(f => f.id === id)
        if (item) {
          selectFile(item)
        }
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('menu-import-merge', handleMenuImport)
  if (sortable) {
    sortable.destroy()
  }
  mergeList.value.forEach(item => {
    if (item.pdfjsDoc) {
      item.pdfjsDoc.destroy()
    }
  })
})
</script>

<style scoped>
.merger-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
}

.content-wrapper {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
}

.left-panel {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drop-zone {
  flex: 1;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  background-color: white;
  overflow-y: auto;
  min-height: 200px;
}

.drop-zone.drag-over {
  border-color: var(--primary-color);
  background-color: #ecf5ff;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-placeholder);
  margin-bottom: 4px;
}

.empty-support {
  font-size: 12px;
  color: var(--text-placeholder);
}

.merge-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.merge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.merge-item:hover {
  background: #f0f7ff;
  border-color: var(--primary-color);
}

.item-drag-handle {
  cursor: grab;
  color: var(--text-placeholder);
  font-size: 16px;
  padding: 4px;
  user-select: none;
}

.item-drag-handle:active {
  cursor: grabbing;
}

.item-thumbnail {
  width: 60px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-thumbnail canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.thumb-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.thumb-placeholder {
  font-size: 24px;
  color: var(--text-placeholder);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.item-order {
  flex-shrink: 0;
}

.order-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-remove {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.merge-item:hover .btn-remove {
  opacity: 1;
}

.merge-actions {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.merge-summary {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.summary-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.summary-text strong {
  color: var(--primary-color);
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.merge-btn {
  flex: 1;
  padding: 12px;
  font-size: 15px;
}

.preview-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
}

.preview-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-placeholder);
}

.preview-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.file-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.preview-pages {
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-thumbnails {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-content: flex-start;
}

.preview-thumbnail-item {
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  background: white;
}

.preview-thumbnail-item canvas {
  display: block;
  width: 150px;
}

.preview-page-number {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
}

.spinner.large {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.loading-overlay p {
  color: var(--text-secondary);
  font-size: 14px;
}

.result-panel {
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.result-content {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.result-info {
  flex: 1;
}

.result-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-label {
  font-size: 13px;
  color: var(--text-secondary);
  width: 80px;
  flex-shrink: 0;
}

.result-value {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.result-value.path {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.result-actions {
  display: flex;
  gap: 12px;
}
</style>
