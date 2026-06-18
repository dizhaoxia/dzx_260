<template>
  <div class="extractor-container">
    <div class="content-wrapper">
      <div class="left-panel">
        <div class="left-panel-header">
          <div class="panel-header">
            <h2>📁 PDF文件</h2>
            <button class="btn btn-primary" @click="handleImportPdf">
              <span>📂</span>
              <span>导入PDF</span>
            </button>
          </div>
        </div>

        <div class="left-panel-scroll">
          <div
            class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <div v-if="!pdfDocument" class="empty-state">
            <div class="empty-icon">📄</div>
            <p class="empty-text">拖拽 PDF 文件到此处</p>
            <p class="empty-hint">或点击上方按钮选择文件</p>
            <p class="empty-support">支持 .pdf 格式文件</p>
          </div>

          <div v-else class="file-info">
            <div class="file-icon">📕</div>
            <div class="file-details">
              <h3 class="file-name">{{ pdfDocument.fileName }}</h3>
              <div class="file-meta">
                <span class="badge badge-primary">{{ pdfDocument.pageCount }} 页</span>
                <span class="file-size">{{ formatFileSize(pdfDocument.fileSize) }}</span>
              </div>
            </div>
            <button class="btn btn-default btn-small" @click="clearPdf">
              ✕
            </button>
          </div>
        </div>

        <div v-if="pdfDocument" class="extract-settings">
          <h3>⚙️ 提取设置</h3>
          
          <div class="setting-item">
            <label>选择页面方式</label>
            <div class="mode-selector">
              <button
                class="mode-btn"
                :class="{ active: selectMode === 'input' }"
                @click="selectMode = 'input'"
              >
                手动输入
              </button>
              <button
                class="mode-btn"
                :class="{ active: selectMode === 'click' }"
                @click="selectMode = 'click'"
              >
                点击选择
              </button>
            </div>
          </div>

          <div v-if="selectMode === 'input'" class="setting-item">
            <label>页码范围</label>
            <input
              v-model="pageRange"
              type="text"
              class="input"
              placeholder="例如: 2 或 2-4 或 1,3,5-7；批量导出用分号分隔: 1-3; 5; 8-10"
            />
            <p class="hint">
              支持单个页码(2)、连续范围(2-4)、多个范围(1,3,5-7)<br/>
              <strong>批量导出</strong>：用分号分隔多组范围，每组导出为独立PDF
            </p>
            <div v-if="batchRanges.length > 1" class="batch-preview">
              <p class="batch-title">📦 将导出 {{ batchRanges.length }} 个文件：</p>
              <div class="batch-items">
                <span 
                  v-for="(range, idx) in batchRanges" 
                  :key="idx" 
                  class="badge badge-secondary"
                >
                  {{ idx + 1 }}. {{ range.label }} ({{ range.pages.length }}页)
                </span>
              </div>
            </div>
          </div>

          <div v-if="selectMode === 'click'" class="setting-item">
            <label>已选择页面</label>
            <div class="selected-pages">
              <span v-if="selectedPages.length === 0" class="no-selection">
                请在右侧点击缩略图选择页面
              </span>
              <span v-else class="page-badges">
                <span
                  v-for="page in sortedSelectedPages"
                  :key="page"
                  class="badge badge-primary"
                >
                  第 {{ page }} 页
                </span>
              </span>
            </div>
            <p v-if="selectedPages.length > 0" class="selection-count">
              已选择 {{ selectedPages.length }} 页
            </p>
          </div>

          <div class="setting-item">
            <label>缩略图大小</label>
            <input
              v-model.number="thumbnailSize"
              type="range"
              min="80"
              max="200"
              class="range-input"
            />
            <span class="range-value">{{ thumbnailSize }}px</span>
          </div>

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
                  placeholder="{name} = 原文件名, {page} = 起始页, {pages} = 页数, {range} = 页码范围"
                />
                <p class="hint">可用变量: {'{'}name{'}'}, {'{'}page{'}'}, {'{'}pages{'}'}, {'{'}range{'}'}</p>
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
                  <span class="history-file">{{ item.fileName }}</span>
                  <span class="history-range">{{ item.range }}</span>
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

          <button
            class="btn btn-success extract-btn"
            :disabled="!canExtract || isExtracting"
            @click="handleExtract"
          >
            <span v-if="isExtracting" class="spinner"></span>
            <span v-else>✂️</span>
            <span>{{ isExtracting ? '提取中...' : '提取页面' }}</span>
          </button>
        </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-header">
          <h2>👁️ 页面预览</h2>
          <div v-if="pdfDocument" class="preview-info">
            <span class="badge badge-primary">共 {{ pdfDocument.pageCount }} 页</span>
          </div>
        </div>

        <div class="thumbnail-container" ref="thumbnailContainer">
          <div v-if="!pdfDocument" class="preview-empty">
            <div class="preview-icon">🔍</div>
            <p>导入PDF后可预览页面缩略图</p>
          </div>

          <div v-else class="thumbnail-grid">
            <div
              v-for="(page, index) in thumbnails"
              :key="index"
              class="thumbnail-item"
              :class="{
                selected: selectedPages.includes(index + 1),
                loading: page.loading
              }"
              @click="handleThumbnailClick(index + 1)"
              @dblclick="openDetailModal(index + 1)"
              :style="{ width: thumbnailSize + 'px' }"
            >
              <div v-if="page.loading" class="thumbnail-loading">
                <div class="spinner"></div>
              </div>
              <canvas
                :ref="el => setCanvasRef(el, index)"
                :width="page.width || 100"
                :height="page.height || 140"
                :class="{ 'canvas-loading': page.loading }"
                :style="{
                  width: thumbnailSize + 'px',
                  height: (page.width > 0 ? (thumbnailSize * page.height / page.width) + 'px' : (thumbnailSize * 1.4) + 'px')
                }"
              ></canvas>
              <div v-if="page.loading" class="thumbnail-placeholder">
                📄
              </div>
              <div class="page-number">
                <span class="page-badge">{{ index + 1 }}</span>
                <span v-if="selectedPages.includes(index + 1)" class="check-icon">✓</span>
              </div>
            </div>
          </div>

          <div v-if="isLoadingThumbnails" class="loading-overlay">
            <div class="spinner large"></div>
            <p>正在生成缩略图...</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="extractionResult" class="result-panel">
      <div class="result-header">
        <h3>✅ 提取完成</h3>
        <button class="btn btn-default btn-small" @click="extractionResult = null">
          ✕
        </button>
      </div>
      <div class="result-content">
        <div class="result-info">
          <div class="result-item">
            <span class="result-label">输出文件：</span>
            <span class="result-value">{{ extractionResult.fileName }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">页面数量：</span>
            <span class="result-value">{{ extractionResult.pageCount }} 页</span>
          </div>
          <div class="result-item">
            <span class="result-label">文件大小：</span>
            <span class="result-value">{{ formatFileSize(extractionResult.fileSize) }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">保存路径：</span>
            <span class="result-value path">{{ extractionResult.filePath }}</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" @click="openExtractedFile">
            📂 打开文件
          </button>
          <button class="btn btn-default" @click="extractionResult = null">
            继续操作
          </button>
        </div>
      </div>
    </div>

    <div v-if="detailModal.show" class="detail-modal" @click.self="closeDetailModal">
      <div class="detail-modal-content">
        <div class="detail-modal-header">
          <h3>📄 页面详情 - 第 {{ detailModal.pageNum }} 页</h3>
          <button class="btn btn-default btn-small" @click="closeDetailModal">
            ✕
          </button>
        </div>
        <div class="detail-modal-body">
          <div v-show="detailModal.loading" class="detail-loading">
            <div class="spinner large"></div>
            <p>正在加载页面...</p>
          </div>
          <div v-show="!detailModal.loading" class="detail-canvas-container">
            <canvas ref="detailCanvas"></canvas>
          </div>
        </div>
        <div class="detail-modal-footer">
          <button class="btn btn-default" @click="prevDetailPage" :disabled="detailModal.pageNum <= 1">
            ← 上一页
          </button>
          <span class="page-info">
            {{ detailModal.pageNum }} / {{ pdfDocument?.pageCount || 0 }}
          </span>
          <button class="btn btn-default" @click="nextDetailPage" :disabled="detailModal.pageNum >= (pdfDocument?.pageCount || 0)">
            下一页 →
          </button>
          <button 
            class="btn btn-primary" 
            @click="selectAndClose"
            v-if="selectMode === 'click'"
          >
            {{ selectedPages.includes(detailModal.pageNum) ? '取消选择' : '选择此页' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, nextTick } from 'vue'
import 'pdfjs-dist/build/pdf.min.js'
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { PDFDocument } from 'pdf-lib'

const showToast = inject('showToast')

const getPdfLib = () => {
  return window.pdfjsLib
}

const initPdfJs = () => {
  const lib = getPdfLib()
  if (lib && lib.GlobalWorkerOptions) {
    lib.GlobalWorkerOptions.workerSrc = PdfjsWorker
  }
}

initPdfJs()
const isDragOver = ref(false)
const isExtracting = ref(false)
const isLoadingThumbnails = ref(false)
const pdfDocument = ref(null)
const pdfjsDoc = ref(null)
const thumbnails = ref([])
const canvasRefs = ref([])
const selectMode = ref('input')
const pageRange = ref('')
const selectedPages = ref([])
const thumbnailSize = ref(140)
const extractionResult = ref(null)
const thumbnailContainer = ref(null)
const detailCanvas = ref(null)
const detailModal = ref({
  show: false,
  pageNum: 1,
  loading: false
})

const autoNamingEnabled = ref(true)
const selectedNamingPattern = ref('name_page')
const customNamingPattern = ref('{name}_第{page}页')
const historyList = ref([])

const namingPatterns = [
  { value: 'name_page', label: '原文件名_页码', example: '文档_第2页.pdf' },
  { value: 'name_range', label: '原文件名_页码范围', example: '文档_第2-5页.pdf' },
  { value: 'name_pages', label: '原文件名_页数', example: '文档_提取3页.pdf' },
  { value: 'date', label: '日期_原文件名', example: '20260618_文档.pdf' },
  { value: 'custom', label: '自定义规则', example: '自定义...' }
]

const sortedSelectedPages = computed(() => {
 return [...selectedPages.value].sort((a, b) => a - b);
})

const batchRanges = computed(() => {
  if (!pdfDocument.value || !pageRange.value) return []
  const groups = pageRange.value.split(/[;；]/).filter(g => g.trim())
  const result = []
  for (const group of groups) {
    const pages = parsePageRange(group)
    if (pages.length > 0) {
      result.push({
        label: group.trim(),
        pages: pages.filter(p => p <= pdfDocument.value.pageCount)
      })
    }
  }
  return result
})

const canExtract = computed(() => {
 if (!pdfDocument.value)
 return false;
 if (selectMode.value === 'input') {
 return batchRanges.value.length > 0 && batchRanges.value.some(r => r.pages.length > 0);
 }
 else {
 return selectedPages.value.length > 0;
 }
})
const setCanvasRef = (el, index) => {
 if (el) {
 canvasRefs.value[index] = el;
 }
};
const formatFileSize = (bytes) => {
 if (bytes < 1024)
 return bytes + ' B';
 if (bytes < 1024 * 1024)
 return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const formatDate = (timestamp) => {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const generateFileName = (baseName, pages, rangeLabel) => {
  if (!autoNamingEnabled.value) {
    return baseName.replace('.pdf', '') + '_提取_' + pages.length + '页.pdf'
  }
  
  const nameWithoutExt = baseName.replace('.pdf', '')
  const firstPage = pages[0]
  const lastPage = pages[pages.length - 1]
  const rangeText = firstPage === lastPage ? `${firstPage}` : `${firstPage}-${lastPage}`
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  let pattern = selectedNamingPattern.value
  if (pattern === 'custom') {
    pattern = customNamingPattern.value || '{name}_第{page}页'
  }
  
  const templates = {
    'name_page': '{name}_第{page}页',
    'name_range': '{name}_第{range}页',
    'name_pages': '{name}_提取{pages}页',
    'date': '{date}_{name}'
  }
  
  const template = templates[pattern] || '{name}_第{page}页'
  
  let result = template
    .replace(/{name}/g, nameWithoutExt)
    .replace(/{page}/g, firstPage)
    .replace(/{pages}/g, pages.length)
    .replace(/{range}/g, rangeText)
    .replace(/{date}/g, dateStr)
  
  if (!result.endsWith('.pdf')) {
    result += '.pdf'
  }
  
  return result
}

const loadHistory = () => {
  try {
    const saved = localStorage.getItem('pdf_extract_history')
    if (saved) {
      historyList.value = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('加载历史记录失败', e)
  }
}

const saveToHistory = (range) => {
  if (!pdfDocument.value) return
  
  const item = {
    fileName: pdfDocument.value.fileName,
    filePath: pdfDocument.value.filePath || '',
    range: range,
    timestamp: Date.now()
  }
  
  historyList.value.unshift(item)
  if (historyList.value.length > 10) {
    historyList.value = historyList.value.slice(0, 10)
  }
  
  try {
    localStorage.setItem('pdf_extract_history', JSON.stringify(historyList.value))
  } catch (e) {
    console.warn('保存历史记录失败', e)
  }
}

const loadFromHistory = async (item) => {
  if (!item.filePath) {
    showToast('历史记录不含文件路径，请重新选择文件', 'warning')
    return
  }
  try {
    await loadPdfFile(item.filePath)
    pageRange.value = item.range
    selectMode.value = 'input'
    showToast('已加载历史记录', 'success')
  } catch (e) {
    showToast('加载文件失败: ' + e.message, 'error')
  }
}

const clearHistory = () => {
  historyList.value = []
  localStorage.removeItem('pdf_extract_history')
  showToast('已清空历史记录', 'info')
}

const extractSingleRange = async (pages, fileName) => {
  const newPdfDoc = await PDFDocument.create();
  const sourcePdfDoc = pdfDocument.value.pdfDoc;
  for (const pageNum of pages) {
    const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [pageNum - 1]);
    newPdfDoc.addPage(copiedPage);
  }
  const pdfBytes = await newPdfDoc.save();
  
  const saveResult = await window.electronAPI.saveFileDialog({
    defaultPath: fileName
  });
  
  if (saveResult.canceled) {
    return null;
  }
  
  const writeResult = await window.electronAPI.writeFile(saveResult.filePath, Array.from(pdfBytes));
  if (!writeResult.success) {
    showToast('保存文件失败: ' + writeResult.error, 'error');
    return null;
  }
  
  return {
    fileName: fileName,
    pageCount: pages.length,
    fileSize: pdfBytes.length,
    filePath: saveResult.filePath,
    pages: pages
  };
}
const parsePageRange = (input) => {
 if (!input || !input.trim())
 return [];
 const pages = new Set();
 const parts = input.split(/[,，]/);
 for (const part of parts) {
 const trimmed = part.trim();
 if (trimmed.includes('-') || trimmed.includes('～')) {
 const range = trimmed.split(/[-～]/);
 const start = parseInt(range[0]);
 const end = parseInt(range[1]);
 if (!isNaN(start) && !isNaN(end) && start > 0 && end > 0) {
 const min = Math.min(start, end);
 const max = Math.max(start, end);
 for (let i = min; i <= max; i++) {
 pages.add(i);
 }
 }
 }
 else {
 const page = parseInt(trimmed);
 if (!isNaN(page) && page > 0) {
 pages.add(page);
 }
 }
 }
 return Array.from(pages).filter(p => p <= pdfDocument.value?.pageCount || 9999);
};
const handleImportPdf = async () => {
 if (!window.electronAPI) {
 showToast('请在Electron环境中运行', 'warning');
 return;
 }
 const result = await window.electronAPI.openFileDialog();
 if (!result.canceled && result.filePaths.length > 0) {
 await loadPdfFile(result.filePaths[0]);
 }
};
const handleDrop = async (e) => {
 isDragOver.value = false;
 const files = e.dataTransfer.files;
 const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
 if (pdfFiles.length === 0) {
 showToast('请拖入PDF文件', 'warning');
 return;
 }
 if (pdfFiles.length > 1) {
 showToast('请拖入单个PDF文件进行提取操作', 'warning');
 return;
 }
 const file = pdfFiles[0];
 const arrayBuffer = await file.arrayBuffer();
 const uint8Array = new Uint8Array(arrayBuffer);
 await loadPdfFromData(uint8Array, file.name, file.size);
};
const loadPdfFile = async (filePath) => {
 try {
 const result = await window.electronAPI.readFile(filePath);
 if (!result.success) {
 showToast('读取文件失败: ' + result.error, 'error');
 return;
 }
 await loadPdfFromData(new Uint8Array(result.data), result.fileName, result.size, filePath);
 }
 catch (error) {
 showToast('加载PDF失败: ' + error.message, 'error');
 }
};
const loadPdfFromData = async (data, fileName, fileSize, filePath = '') => {
 try {
 isLoadingThumbnails.value = true;
 const pdfDoc = await PDFDocument.load(data);
 const pageCount = pdfDoc.getPageCount();
 pdfDocument.value = {
 data,
 fileName,
 fileSize,
 pageCount,
 pdfDoc,
 filePath
 };
 selectedPages.value = [];
 extractionResult.value = null;
 
 const doc = await getPdfLib().getDocument({ data }).promise
 pdfjsDoc.value = doc;
 
 thumbnails.value = [];
 canvasRefs.value = [];
 for (let i = 0; i < pageCount; i++) {
   thumbnails.value.push({
     loading: true,
     width: 0,
     height: 0
   });
 }
 
 const pageSizes = [];
 for (let i = 0; i < pageCount; i++) {
   const page = await doc.getPage(i + 1);
   const viewport = page.getViewport({ scale: 1 });
   const scale = thumbnailSize.value / viewport.width;
   const scaledViewport = page.getViewport({ scale });
   pageSizes.push({
     width: scaledViewport.width,
     height: scaledViewport.height
   });
 }
 
 for (let i = 0; i < pageCount; i++) {
   thumbnails.value[i] = {
     loading: false,
     width: pageSizes[i].width,
     height: pageSizes[i].height
   };
 }
 
 await nextTick();
 
 for (let i = 0; i < pageCount; i++) {
   await renderThumbnail(i);
 }
 
 isLoadingThumbnails.value = false;
 showToast(`成功加载 ${fileName}，共 ${pageCount} 页`, 'success');
 }
 catch (error) {
 console.error('加载PDF失败:', error);
 isLoadingThumbnails.value = false;
 showToast('解析PDF失败: ' + error.message, 'error');
 }
};
const renderThumbnail = async (pageIndex) => {
  try {
    if (!pdfjsDoc.value) return;
    
    const page = await pdfjsDoc.value.getPage(pageIndex + 1);
    const thumb = thumbnails.value[pageIndex];
    if (!thumb || thumb.width === 0) return;
    
    const canvas = canvasRefs.value[pageIndex];
    if (!canvas) return;
    
    const viewport = page.getViewport({ scale: 1 });
    const scale = thumbnailSize.value / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    const context = canvas.getContext('2d');
    canvas.width = thumb.width;
    canvas.height = thumb.height;
    
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise;
  } catch (error) {
    console.error('渲染缩略图失败:', error);
  }
}
const handleThumbnailClick = (pageNum) => {
  if (selectMode.value !== 'click') {
    openDetailModal(pageNum)
    return
  }
  const index = selectedPages.value.indexOf(pageNum)
  if (index > -1) {
    selectedPages.value.splice(index, 1)
  } else {
    selectedPages.value.push(pageNum)
  }
}

const openDetailModal = async (pageNum) => {
  if (!pdfjsDoc.value) return
  
  detailModal.value = {
    show: true,
    pageNum,
    loading: true
  }
  
  await nextTick()
  await renderDetailPage(pageNum)
}

const closeDetailModal = () => {
  detailModal.value.show = false
}

const renderDetailPage = async (pageNum) => {
  if (!pdfjsDoc.value) return
  
  try {
    detailModal.value.loading = true
    
    let canvas = detailCanvas.value
    let tries = 0
    while (!canvas && tries < 20) {
      await nextTick()
      await new Promise(r => setTimeout(r, 30))
      canvas = detailCanvas.value
      tries++
    }
    
    if (!canvas) {
      throw new Error('Canvas元素未找到')
    }
    
    const page = await pdfjsDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    
    const containerWidth = 700
    const scale = containerWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })
    
    const context = canvas.getContext('2d')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    
    await page.render({
      canvasContext: context,
      viewport: scaledViewport
    }).promise
    
    detailModal.value.loading = false
  } catch (error) {
    console.error('渲染详情页失败:', error)
    detailModal.value.loading = false
    showToast('渲染页面失败: ' + error.message, 'error')
  }
}

const prevDetailPage = async () => {
  if (detailModal.value.pageNum > 1) {
    detailModal.value.pageNum--
    await renderDetailPage(detailModal.value.pageNum)
  }
}

const nextDetailPage = async () => {
  if (detailModal.value.pageNum < pdfDocument.value.pageCount) {
    detailModal.value.pageNum++
    await renderDetailPage(detailModal.value.pageNum)
  }
}

const selectAndClose = () => {
  const pageNum = detailModal.value.pageNum
  const index = selectedPages.value.indexOf(pageNum)
  if (index > -1) {
    selectedPages.value.splice(index, 1)
  } else {
    selectedPages.value.push(pageNum)
  }
  closeDetailModal()
}
const clearPdf = () => {
 pdfDocument.value = null;
 pdfjsDoc.value = null;
 thumbnails.value = [];
 canvasRefs.value = [];
 selectedPages.value = [];
 pageRange.value = '';
 extractionResult.value = null;
};
const handleExtract = async () => {
 if (!canExtract.value || isExtracting.value)
 return;

 let rangesToExtract = [];

 if (selectMode.value === 'input') {
 const maxPage = pdfDocument.value.pageCount;
 const ranges = batchRanges.value;
 if (ranges.length === 0) {
 showToast('请输入有效的页码范围', 'warning');
 return;
 }
 rangesToExtract = ranges.map(r => ({
   pages: r.pages.filter(p => p <= maxPage),
   label: r.label
 })).filter(r => r.pages.length > 0);
 }
 else {
 rangesToExtract = [{
   pages: sortedSelectedPages.value,
   label: sortedSelectedPages.value.join(',')
 }];
 }

 if (rangesToExtract.length === 0) {
 showToast('没有可提取的页面', 'warning');
 return;
 }

 try {
 isExtracting.value = true;
 const results = [];
 const isBatch = rangesToExtract.length > 1;

 for (let i = 0; i < rangesToExtract.length; i++) {
   const range = rangesToExtract[i];
   const fileName = generateFileName(pdfDocument.value.fileName, range.pages, range.label);
   const batchInfo = isBatch ? ` [${i + 1}/${rangesToExtract.length}]` : '';
   
   showToast(`正在导出${batchInfo}: ${fileName}`, 'info');
   
   const result = await extractSingleRange(range.pages, fileName);
   if (result) {
     results.push(result);
   } else {
     showToast(`已跳过: ${fileName}`, 'info');
   }
 }

 if (results.length > 0) {
   saveToHistory(selectMode.value === 'input' ? pageRange.value : rangesToExtract[0].label);
   extractionResult.value = results[0];
   
   if (isBatch) {
     showToast(`批量导出完成！共生成 ${results.length} 个文件`, 'success');
   } else {
     showToast(`成功提取 ${results[0].pageCount} 页`, 'success');
   }
 }

 isExtracting.value = false;
 }
 catch (error) {
 isExtracting.value = false;
 showToast('提取失败: ' + error.message, 'error');
 }
};
const openExtractedFile = async () => {
 if (extractionResult.value) {
 await window.electronAPI.openExternal(extractionResult.value.filePath);
 }
};
const handleMenuImport = () => {
 handleImportPdf();
};
onMounted(() => {
 window.addEventListener('menu-import-pdf', handleMenuImport);
 loadHistory();
});
onUnmounted(() => {
 window.removeEventListener('menu-import-pdf', handleMenuImport);
 if (pdfjsDoc.value) {
 pdfjsDoc.value.destroy();
 }
});
</script>

<style scoped>
.extractor-container {
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
  width: 380px;
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
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
  background-color: white;
}

.drop-zone.drag-over {
  border-color: var(--primary-color);
  background-color: #ecf5ff;
}

.empty-state {
  text-align: center;
  padding: 30px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
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

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

.extract-settings {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.extract-settings h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 16px 0;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.mode-selector {
  display: flex;
  gap: 8px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mode-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.hint {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-top: 6px;
}

.selected-pages {
  min-height: 40px;
  padding: 8px;
  background: var(--bg-color);
  border-radius: 4px;
}

.no-selection {
  font-size: 12px;
  color: var(--text-placeholder);
}

.page-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selection-count {
  font-size: 12px;
  color: var(--primary-color);
  margin-top: 8px;
}

.range-input {
  width: 100%;
  margin-bottom: 4px;
}

.range-value {
  font-size: 12px;
  color: var(--primary-color);
  font-weight: 500;
}

.extract-btn {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  margin-top: 8px;
}

.thumbnail-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow);
  overflow-y: auto;
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

.thumbnail-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.thumbnail-item {
  position: relative;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.thumbnail-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.thumbnail-item.selected {
  border-color: var(--success-color);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
}

.thumbnail-item.loading {
  background: var(--bg-color);
}

.thumbnail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1.4;
}

.thumbnail-item canvas {
  display: block;
  border-radius: 4px;
  background: white;
}

.page-number {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-badge {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.check-icon {
  background: var(--success-color);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
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

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--text-placeholder);
  background: var(--bg-color);
  border-radius: 4px;
  z-index: 1;
}

.canvas-loading {
  visibility: hidden;
}

.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.detail-modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.detail-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.detail-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.detail-modal-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-canvas-container {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 10px;
}

.detail-canvas-container canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
}

.detail-modal-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

.batch-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 6px;
  border: 1px solid #d9ecff;
}

.batch-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0 0 8px 0;
}

.batch-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge.badge-secondary {
  background: #e6a23c;
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

.history-file {
  flex: 1;
  font-size: 13px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-range {
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
