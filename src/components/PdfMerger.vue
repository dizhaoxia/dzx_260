<template>
  <div class="merger-container">
    <div class="content-wrapper">
      <div class="left-panel">
        <div class="left-panel-header">
          <div class="panel-header">
            <h2>📚 待合并文件</h2>
            <div class="header-actions">
              <div class="view-toggle">
                <button 
                  class="view-btn" 
                  :class="{ active: viewMode === 'file' }"
                  @click="viewMode = 'file'"
                >
                  📁 文件视图
                </button>
                <button 
                  class="view-btn" 
                  :class="{ active: viewMode === 'page' }"
                  @click="viewMode = 'page'"
                >
                  📄 页面视图
                </button>
              </div>
              <button class="btn btn-primary" @click="handleImportFiles">
                <span>📂</span>
                <span>添加PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div class="left-panel-scroll" @click="handleLeftPanelClick">
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
            <p class="empty-support">切换到「页面视图」可拖拽单个页面</p>
          </div>

          <div v-else-if="viewMode === 'file'" class="merge-list" ref="mergeListRef">
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

          <div v-else class="page-list" ref="pageListRef">
            <div class="page-list-header">
              <span class="page-list-title">共 {{ allPages.length }} 个页面</span>
              <span class="page-list-hint">拖拽页面调整顺序，可跨文件移动</span>
            </div>
            <div class="page-grid" ref="pageGridRef">
              <div
                v-for="(page, index) in allPages"
                :key="`${page.fileId}-${page.pageIndex}`"
                class="page-item"
                :data-file-id="page.fileId"
                :data-page-index="page.pageIndex"
              >
                <div class="page-item-header">
                  <span class="page-item-badge">{{ page.fileName }}</span>
                  <span class="page-item-number">第 {{ page.pageIndex + 1 }} 页</span>
                </div>
                <div class="page-item-thumb">
                  <div v-if="page.loading" class="thumb-loading">
                    <div class="spinner small"></div>
                  </div>
                  <canvas
                    v-show="!page.loading && page.width > 0"
                    :ref="el => setPageCanvasRef(el, index)"
                    :width="page.width"
                    :height="page.height"
                  ></canvas>
                  <div v-show="!page.loading && page.width === 0" class="thumb-placeholder">
                    📄
                  </div>
                </div>
                <div class="page-item-footer">
                  <span class="page-item-order">{{ index + 1 }}</span>
                  <button
                    class="btn btn-default btn-small"
                    @click="removePage(index)"
                    title="移除页面"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="mergeList.length > 0" class="merge-settings">
          <div class="setting-item">
            <label>自动命名</label>
            <div class="auto-name-toggle">
              <label class="switch">
                <input v-model="autoNamingEnabled" type="checkbox" />
                <span class="slider"></span>
              </label>
              <span class="toggle-label">{{ autoNamingEnabled ? '已启用' : '已禁用' }}</span>
            </div>
            <div v-if="autoNamingEnabled" class="naming-patterns">
              <div class="pattern-group">
                <label class="pattern-label">选择命名规则：</label>
                <div class="pattern-options">
                  <label 
                    v-for="pattern in namingPatterns" 
                    :key="pattern.value"
                    class="pattern-option"
                  >
                    <input 
                      type="radio" 
                      v-model="selectedNamingPattern" 
                      :value="pattern.value" 
                    />
                    <span class="pattern-text">{{ pattern.label }}</span>
                    <span class="pattern-example">例如: {{ pattern.example }}</span>
                  </label>
                </div>
              </div>
              <div v-if="selectedNamingPattern === 'custom'" class="custom-pattern">
                <label>自定义规则：</label>
                <input 
                  v-model="customNamingPattern" 
                  type="text" 
                  class="input"
                  placeholder="{files} = 文件数, {pages} = 页数, {date} = 日期"
                />
                <p class="hint">可用变量: {'{'}files{'}'}, {'{'}pages{'}'}, {'{'}date{'}'}</p>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <label>历史记录</label>
            <div class="history-section">
              <div v-if="historyList.length === 0" class="no-history">
                暂无历史记录
              </div>
              <div v-else class="history-list">
                <div 
                  v-for="(item, idx) in historyList" 
                  :key="idx"
                  class="history-item"
                  @click="loadFromHistory(item)"
                >
                  <span class="history-files">{{ item.fileCount }}个文件</span>
                  <span class="history-pages">{{ item.pageCount }}页</span>
                  <span class="history-date">{{ formatDate(item.timestamp) }}</span>
                </div>
              </div>
              <button 
                v-if="historyList.length > 0"
                class="btn btn-default btn-small clear-history" 
                @click.stop="clearHistory"
              >
                清空历史
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
const pageListRef = ref(null)
const pageGridRef = ref(null)
const previewContainer = ref(null)
const thumbnailRefs = ref([])
const pageCanvasRefs = ref([])
const previewCanvasRefs = ref([])

const viewMode = ref('file')
const autoNamingEnabled = ref(true)
const selectedNamingPattern = ref('files_pages')
const customNamingPattern = ref('合并文件_{files}个_{pages}页')
const historyList = ref([])

const namingPatterns = [
  { value: 'files_pages', label: '文件数_页数', example: '合并文件_3个_10页.pdf' },
  { value: 'date_files', label: '日期_文件数', example: '20260618_合并_3个文件.pdf' },
  { value: 'simple', label: '简洁命名', example: '合并文档.pdf' },
  { value: 'custom', label: '自定义规则', example: '自定义...' }
]

let sortable = null
let pageSortable = null
let fileIdCounter = 0

const totalPages = computed(() => {
  return mergeList.value.reduce((sum, item) => sum + item.pageCount, 0)
})

const allPages = computed(() => {
  const pages = []
  mergeList.value.forEach((fileItem, fileIdx) => {
    for (let i = 0; i < fileItem.pageCount; i++) {
      pages.push({
        fileId: fileItem.id,
        fileIndex: fileIdx,
        pageIndex: i,
        fileName: fileItem.fileName,
        loading: !fileItem.pageThumbnails || !fileItem.pageThumbnails[i],
        width: fileItem.pageThumbnails && fileItem.pageThumbnails[i] ? fileItem.pageThumbnails[i].width : 0,
        height: fileItem.pageThumbnails && fileItem.pageThumbnails[i] ? fileItem.pageThumbnails[i].height : 0
      })
    }
  })
  return pages
})

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatDate = (timestamp) => {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const generateFileName = () => {
  if (!autoNamingEnabled.value) {
    return '合并文件_' + mergeList.value.length + '个_' + totalPages.value + '页.pdf'
  }
  
  const fileCount = mergeList.value.length
  const pageCount = totalPages.value
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  let pattern = selectedNamingPattern.value
  if (pattern === 'custom') {
    pattern = customNamingPattern.value || '合并文件_{files}个_{pages}页'
  }
  
  const templates = {
    'files_pages': '合并文件_{files}个_{pages}页',
    'date_files': '{date}_合并_{files}个文件',
    'simple': '合并文档'
  }
  
  const template = templates[pattern] || '合并文件_{files}个_{pages}页'
  
  let result = template
    .replace(/{files}/g, fileCount)
    .replace(/{pages}/g, pageCount)
    .replace(/{date}/g, dateStr)
  
  if (!result.endsWith('.pdf')) {
    result += '.pdf'
  }
  
  return result
}

const loadHistory = () => {
  try {
    const saved = localStorage.getItem('pdf_merge_history')
    if (saved) {
      historyList.value = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('加载历史记录失败', e)
  }
}

const saveToHistory = () => {
  const item = {
    fileCount: mergeList.value.length,
    pageCount: totalPages.value,
    files: mergeList.value.map(f => ({ fileName: f.fileName, filePath: f.filePath || '' })),
    timestamp: Date.now()
  }
  
  historyList.value.unshift(item)
  if (historyList.value.length > 10) {
    historyList.value = historyList.value.slice(0, 10)
  }
  
  try {
    localStorage.setItem('pdf_merge_history', JSON.stringify(historyList.value))
  } catch (e) {
    console.warn('保存历史记录失败', e)
  }
}

const loadFromHistory = async (item) => {
  if (!item.files || item.files.length === 0) {
    showToast('历史记录不含文件路径', 'warning')
    return
  }
  
  const validPaths = item.files.filter(f => f.filePath)
  if (validPaths.length === 0) {
    showToast('历史记录不含文件路径，请重新选择文件', 'warning')
    return
  }
  
  clearAll()
  
  let loadedCount = 0
  for (const file of validPaths) {
    try {
      await addFile(file.filePath)
      loadedCount++
    } catch (e) {
      console.warn('加载历史文件失败:', file.fileName)
    }
  }
  
  if (loadedCount > 0) {
    showToast(`已加载 ${loadedCount}/${validPaths.length} 个文件`, 'success')
  } else {
    showToast('未能加载任何文件', 'error')
  }
}

const clearHistory = () => {
  historyList.value = []
  localStorage.removeItem('pdf_merge_history')
  showToast('已清空历史记录', 'info')
}

const setThumbnailRef = (el, index) => {
  if (el) {
    thumbnailRefs.value[index] = el
  }
}

const setPageCanvasRef = (el, index) => {
  if (el) {
    pageCanvasRefs.value[index] = el
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
    await addFileFromData(new Uint8Array(result.data), result.fileName, result.size, filePath)
  } catch (error) {
    showToast('加载PDF失败: ' + error.message, 'error')
  }
}

const addFileFromData = async (data, fileName, fileSize, filePath = '') => {
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
      thumbnailLoading: true,
      pageThumbnails: [],
      filePath
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

    loadAllPageThumbnails(fileItem)

    showToast(`已添加 ${fileName} (${pageCount}页)`, 'success')
  } catch (error) {
    showToast('解析PDF失败: ' + error.message, 'error')
  }
}

const loadAllPageThumbnails = async (fileItem) => {
  try {
    if (!fileItem.pdfjsDoc) {
      fileItem.pdfjsDoc = await getPdfLib().getDocument({ data: fileItem.data }).promise
    }

    const pageCount = fileItem.pageCount
    fileItem.pageThumbnails = []
    for (let i = 0; i < pageCount; i++) {
      fileItem.pageThumbnails.push({ loading: true, width: 0, height: 0 })
    }

    for (let i = 0; i < pageCount; i++) {
      try {
        const page = await fileItem.pdfjsDoc.getPage(i + 1)
        const viewport = page.getViewport({ scale: 1 })
        const scale = 100 / viewport.width
        const scaledViewport = page.getViewport({ scale })

        fileItem.pageThumbnails[i] = {
          loading: false,
          width: scaledViewport.width,
          height: scaledViewport.height
        }
      } catch (e) {
        fileItem.pageThumbnails[i] = {
          loading: false,
          width: 100,
          height: 140
        }
      }
    }
  } catch (e) {
    console.warn('加载页面缩略图失败:', e)
  }
}

const removePage = (globalIndex) => {
  const page = allPages.value[globalIndex]
  if (!page) return

  const fileItem = mergeList.value[page.fileIndex]
  if (!fileItem) return

  const pages = fileItem.pdfDoc.getPages()
  fileItem.pdfDoc.removePage(page.pageIndex)
  fileItem.pageCount--

  if (fileItem.pageCount === 0) {
    removeFile(page.fileIndex)
  } else {
    fileItem.pageThumbnails.splice(page.pageIndex, 1)
    if (fileItem.pdfjsDoc) {
      fileItem.pdfjsDoc.destroy()
      fileItem.pdfjsDoc = null
    }
    loadAllPageThumbnails(fileItem)
  }

  showToast(`已移除 ${fileItem.fileName} 第 ${page.pageIndex + 1} 页`, 'info')
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

const renderPageThumbnails = async () => {
  await nextTick()
  
  for (let i = 0; i < allPages.value.length; i++) {
    const page = allPages.value[i]
    const fileItem = mergeList.value.find(f => f.id === page.fileId)
    if (!fileItem || !fileItem.pdfjsDoc) continue

    try {
      const pdfPage = await fileItem.pdfjsDoc.getPage(page.pageIndex + 1)
      const viewport = pdfPage.getViewport({ scale: 1 })
      const scale = 100 / viewport.width
      const scaledViewport = pdfPage.getViewport({ scale })

      await nextTick()
      const canvas = pageCanvasRefs.value[i]
      if (canvas) {
        const context = canvas.getContext('2d')
        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        await pdfPage.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise
      }
    } catch (e) {
      console.warn('渲染页面缩略图失败:', e)
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

const initPageSortable = () => {
  if (!pageGridRef.value || pageSortable) return

  pageSortable = new Sortable(pageGridRef.value, {
    animation: 200,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: async (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return

      const pageToMove = allPages.value[oldIndex]
      const targetPage = allPages.value[newIndex]
      
      const sourceFile = mergeList.value.find(f => f.id === pageToMove.fileId)
      const targetFile = mergeList.value.find(f => f.id === targetPage.fileId)
      
      if (!sourceFile || !targetFile) return

      try {
        const [copiedPage] = await targetFile.pdfDoc.copyPages(sourceFile.pdfDoc, [pageToMove.pageIndex])
        
        let insertIndex = targetPage.pageIndex
        if (oldIndex > newIndex) {
          insertIndex = targetPage.pageIndex
        } else {
          insertIndex = targetPage.pageIndex + 1
        }
        
        targetFile.pdfDoc.insertPage(insertIndex, copiedPage)
        targetFile.pageCount++
        
        sourceFile.pdfDoc.removePage(pageToMove.pageIndex)
        sourceFile.pageCount--
        
        if (sourceFile.pageCount === 0) {
          const sourceIndex = mergeList.value.findIndex(f => f.id === sourceFile.id)
          if (sourceIndex > -1) {
            removeFile(sourceIndex)
          }
        } else {
          sourceFile.pageThumbnails.splice(pageToMove.pageIndex, 1)
          if (sourceFile.pdfjsDoc) {
            sourceFile.pdfjsDoc.destroy()
            sourceFile.pdfjsDoc = null
          }
          loadAllPageThumbnails(sourceFile)
        }
        
        targetFile.pageThumbnails.splice(insertIndex, 0, { loading: false, width: 100, height: 140 })
        if (targetFile.pdfjsDoc) {
          targetFile.pdfjsDoc.destroy()
          targetFile.pdfjsDoc = null
        }
        loadAllPageThumbnails(targetFile)
        
        await nextTick()
        setTimeout(() => renderPageThumbnails(), 100)
        
        showToast(`已移动 ${sourceFile.fileName} 第 ${pageToMove.pageIndex + 1} 页到 ${targetFile.fileName}`, 'success')
      } catch (e) {
        showToast('移动页面失败: ' + e.message, 'error')
        console.error(e)
      }
    }
  })
}

const handleMerge = async () => {
  if (allPages.value.length < 2) {
    showToast('至少需要2个页面才能合并', 'warning')
    return
  }

  try {
    isMerging.value = true

    const mergedPdf = await PDFDocument.create()

    for (const page of allPages.value) {
      const fileItem = mergeList.value.find(f => f.id === page.fileId)
      if (!fileItem) continue
      
      const [copiedPage] = await mergedPdf.copyPages(fileItem.pdfDoc, [page.pageIndex])
      mergedPdf.addPage(copiedPage)
    }

    const pdfBytes = await mergedPdf.save()

    const defaultName = generateFileName()
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

    saveToHistory()

    mergeResult.value = {
      fileName: defaultName,
      fileCount: mergeList.value.length,
      pageCount: allPages.value.length,
      fileSize: pdfBytes.length,
      filePath: saveResult.filePath
    }

    showToast(`合并成功！共 ${allPages.value.length} 页`, 'success')
    isMerging.value = false
  } catch (error) {
    isMerging.value = false
    showToast('合并失败: ' + error.message, 'error')
    console.error(error)
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
  if (newVal && viewMode.value === 'file') {
    nextTick(() => {
      initSortable()
    })
  }
}, { immediate: true })

watch(pageGridRef, (newVal) => {
  if (newVal && viewMode.value === 'page') {
    nextTick(() => {
      initPageSortable()
      renderPageThumbnails()
    })
  }
}, { immediate: true })

watch(viewMode, (newMode) => {
  if (sortable) {
    sortable.destroy()
    sortable = null
  }
  if (pageSortable) {
    pageSortable.destroy()
    pageSortable = null
  }
  
  nextTick(() => {
    if (newMode === 'file' && mergeListRef.value) {
      initSortable()
    } else if (newMode === 'page' && pageGridRef.value) {
      initPageSortable()
      renderPageThumbnails()
    }
  })
})

const handleLeftPanelClick = (e) => {
  const itemEl = e.target.closest('.merge-item')
  if (itemEl && !e.target.closest('.btn-remove') && !e.target.closest('.item-drag-handle')) {
    const id = parseInt(itemEl.dataset.id)
    const item = mergeList.value.find(f => f.id === id)
    if (item) {
      selectFile(item)
      return
    }
  }
  
  const pageItemEl = e.target.closest('.page-item')
  if (pageItemEl && !e.target.closest('button')) {
    const fileId = parseInt(pageItemEl.dataset.fileId)
    const item = mergeList.value.find(f => f.id === fileId)
    if (item) {
      selectFile(item)
    }
  }
}

onMounted(() => {
  window.addEventListener('menu-import-merge', handleMenuImport)
  loadHistory()
  nextTick(() => {
    initSortable()
  })
})

onUnmounted(() => {
  window.removeEventListener('menu-import-merge', handleMenuImport)
  if (sortable) {
    sortable.destroy()
  }
  if (pageSortable) {
    pageSortable.destroy()
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
  gap: 0;
  min-height: 0;
  overflow: hidden;
  background: white;
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.left-panel-header {
  flex-shrink: 0;
  padding: 16px 16px 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.left-panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

.preview-thumbnail-item {
  width: 150px;
}

.preview-thumbnail-item canvas {
  display: block;
  width: 100%;
  height: auto;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  display: flex;
  background: var(--bg-color);
  border-radius: 6px;
  padding: 2px;
}

.view-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.view-btn:hover {
  color: var(--primary-color);
}

.view-btn.active {
  background: var(--primary-color);
  color: white;
}

.page-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 6px;
}

.page-list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}

.page-list-hint {
  font-size: 11px;
  color: var(--text-placeholder);
}

.page-grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  overflow-y: auto;
  padding: 8px;
  align-content: flex-start;
}

.page-item {
  width: 120px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: grab;
}

.page-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-hover);
}

.page-item:active {
  cursor: grabbing;
}

.page-item-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.page-item-badge {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-item-number {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
}

.page-item-thumb {
  width: 100%;
  aspect-ratio: 1 / 1.4;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.page-item-thumb canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 2px;
}

.page-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-top: 1px solid var(--border-color);
}

.page-item-order {
  font-size: 10px;
  color: var(--text-placeholder);
  font-weight: 600;
}

.merge-settings {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.merge-settings .setting-item {
  margin-bottom: 16px;
}

.merge-settings .setting-item:last-child {
  margin-bottom: 0;
}

.merge-settings .setting-item label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.auto-name-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toggle-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 22px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.naming-patterns {
  padding: 12px;
  background: var(--bg-color);
  border-radius: 6px;
}

.pattern-group {
  margin-bottom: 12px;
}

.pattern-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.pattern-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pattern-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.pattern-option:hover {
  border-color: var(--primary-color);
}

.pattern-option input[type="radio"] {
  accent-color: var(--primary-color);
}

.pattern-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
}

.pattern-example {
  font-size: 12px;
  color: var(--text-placeholder);
  font-family: monospace;
}

.custom-pattern {
  margin-top: 8px;
}

.custom-pattern label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.history-section {
  position: relative;
}

.no-history {
  padding: 16px;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 13px;
  background: var(--bg-color);
  border-radius: 6px;
}

.history-list {
  max-height: 160px;
  overflow-y: auto;
  background: var(--bg-color);
  border-radius: 6px;
  padding: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.history-item:hover {
  background: #ecf5ff;
}

.history-files {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-pages {
  font-size: 11px;
  color: var(--primary-color);
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.history-date {
  font-size: 11px;
  color: var(--text-placeholder);
  white-space: nowrap;
}

.clear-history {
  margin-top: 8px;
  width: 100%;
}
</style>
