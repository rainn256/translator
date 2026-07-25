<template>
    <div class="translator-container">
        <!-- 头部 -->
        <div class="header">
            <div>
                <h1>🌐 在线翻译</h1>
                <!-- 语言栏 + 翻译按钮 -->
                <div class="lang-bar">
                    <div class="lang-selectors">
                        <select v-model="sourceLang">
                            <option v-for="(label, code) in languages" :key="code" :value="code">{{ label }}</option>
                        </select>
                        <button class="icon-circle" @click="swapLanguages" :disabled="sourceLang === 'AUTO'" title="交换语言">⇄</button>
                        <select v-model="targetLang">
                            <option v-for="(label, code) in languages" :key="code" :value="code">{{ label }}</option>
                        </select>
                    </div>
                    <button class="translate-btn" @click="doTranslate" :disabled="!sourceText.trim() || loading">{{ loading ? '翻译中...' : '翻译' }}</button>
                </div>
            </div>

            <div>
                <button class="history-toggle" @click="drawerVisible = true">📜 历史记录</button>
                <!-- <button class="logout" @click="logout">登出</button> -->
            </div>
        </div>

        <!-- 文本区域 -->
        <div class="text-areas">
            <!-- 原文框 -->
            <div class="text-box">
                <div class="textarea-wrapper">
                    <!-- 工具栏（外部） -->
                    <div class="toolbar-external">
                        <span class="lang-label">{{ sourceDisplay }}</span>
                        <div class="toolbar-actions">
                            <button class="icon-circle" @click="clearSource" title="清空原文">✕</button>
                            <button class="icon-circle" @click="copyText(sourceText)" title="复制原文">📋</button>
                            <span class="char-count">字符数：{{ sourceCount }}</span>
                        </div>
                    </div>
                    <textarea v-model="sourceText" placeholder="请输入要翻译的文本" @input="updateStats"></textarea>
                </div>
            </div>

            <!-- 译文框 -->
            <div class="text-box">
                <div class="textarea-wrapper">
                    <!-- 工具栏（外部） -->
                    <div class="toolbar-external">
                        <span class="lang-label">{{ targetDisplay }}</span>
                        <div class="toolbar-actions">
                            <button class="icon-circle" @click="copyText(targetText)" title="复制译文">📋</button>
                            <span class="char-count">字符数：{{ targetCount }}</span>
                        </div>
                    </div>
                    <textarea v-model="targetText" readonly placeholder="翻译结果"></textarea>
                </div>
            </div>
        </div>

        <footer class="footer">
            <a href="https://github.com/rainn256/LibreTranslator" target="_blank">GitHub</a>|
            <span>基于DeepLx</span>|
            <a href="#" @click="logout">退出</a>
        </footer>

        <!-- Toast 提示 -->
        <Teleport to="body">
            <div class="toast-container" v-if="toastVisible">
                <div class="toast-message">{{ toastMessage }}</div>
            </div>
        </Teleport>

        <!-- 自定义确认对话框 -->
        <Teleport to="body">
            <div class="modal-overlay" v-if="confirmVisible" @click="confirmVisible = false">
                <div class="modal-box" @click.stop>
                    <p>{{ confirmMessage }}</p>
                    <div class="modal-actions">
                        <button class="modal-btn cancel" @click="confirmResolve(false)">取消</button>
                        <button class="modal-btn confirm" @click="confirmResolve(true)">确定</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- 历史抽屉 -->
        <div class="drawer-overlay" v-if="drawerVisible" @click="drawerVisible = false"></div>
        <div class="drawer" :class="{ open: drawerVisible }">
            <div class="drawer-header">
                <h3>📜 历史记录</h3>
                <button @click="drawerVisible = false">✕</button>
            </div>
            <div class="drawer-body">
                <ul v-if="history.length">
                    <li v-for="(item, idx) in history" :key="idx" @click="loadHistoryItem(idx)">
                        <div class="history-meta">
                            <span>{{ formatTime(item.timestamp) }}</span>
                            <span>{{ item.srcLang }} → {{ item.tgtLang }}</span>
                            <button @click.stop="deleteHistory(idx)">删除</button>
                        </div>
                        <p>
                            <strong>源：</strong>
                            {{ item.source }}
                        </p>
                        <p>
                            <strong>译：</strong>
                            {{ item.target }}
                        </p>
                    </li>
                </ul>
                <p v-else class="empty">暂无翻译记录</p>
                <button class="clear-all" @click="requestClearHistory">清空历史记录</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const languages = {
    "AUTO": "自动检测",
    "EN": "英语",
    "ZH": "中文",
    "AR": "阿拉伯语",
    "BG": "保加利亚语",
    "CS": "捷克语",
    "DA": "丹麦语",
    "DE": "德语",
    "EL": "希腊语",
    "ES": "西班牙语",
    "ET": "爱沙尼亚语",
    "FI": "芬兰语",
    "FR": "法语",
    "HU": "匈牙利语",
    "ID": "印尼语",
    "IT": "意大利语",
    "JA": "日语",
    "KO": "韩语",
    "LT": "立陶宛语",
    "LV": "拉脱维亚语",
    "NB": "挪威语",
    "NL": "荷兰语",
    "PL": "波兰语",
    "PT": "葡萄牙语",
    "RO": "罗马尼亚语",
    "RU": "俄语",
    "SK": "斯洛伐克语",
    "SL": "斯洛文尼亚语",
    "SV": "瑞典语",
    "TR": "土耳其语",
    "UK": "乌克兰语",
}

const sourceLang = ref('AUTO')
const targetLang = ref('ZH')
const sourceText = ref('')
const targetText = ref('')
const loading = ref(false)
const history = ref([])
const drawerVisible = ref(false)
const detectedSource = ref(null) // 存储翻译返回的 source_lang

// Toast 状态
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

// 确认对话框状态
const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolveFn = null

const HISTORY_KEY = 'translation_history'

const sourceCount = computed(() => sourceText.value.length)
const targetCount = computed(() => targetText.value.length)

// 显示语言信息
const sourceDisplay = computed(() => {
    if (sourceLang.value === 'AUTO') {
        if (detectedSource.value && detectedSource.value !== 'AUTO') {
            return `自动检测（${languages[detectedSource.value] || detectedSource.value}）`
        }
        return '自动检测'
    }
    return languages[sourceLang.value] || sourceLang.value
})

const targetDisplay = computed(() => {
    return languages[targetLang.value] || targetLang.value
})

// Toast 显示
function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer)
    toastMessage.value = message
    toastVisible.value = true
    toastTimer = setTimeout(() => {
        toastVisible.value = false
    }, 3000)
}

// 自定义确认对话框
function showConfirm(message) {
    return new Promise((resolve) => {
        confirmMessage.value = message
        confirmVisible.value = true
        confirmResolveFn = resolve
    })
}
function confirmResolve(result) {
    confirmVisible.value = false
    if (confirmResolveFn) {
        confirmResolveFn(result)
        confirmResolveFn = null
    }
}

// 语言互换
function swapLanguages() {
    if (sourceLang.value === 'AUTO') return
    const temp = sourceLang.value
    sourceLang.value = targetLang.value
    targetLang.value = temp
}

// 执行翻译
async function doTranslate() {
    if (!sourceText.value.trim()) return
    loading.value = true
    // 不清除 detectedSource，等待新结果覆盖
    try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: sourceText.value,
                target_lang: targetLang.value,
                source_lang: sourceLang.value
            })
        })

        if (res.status === 401) {
            localStorage.removeItem('token')
            router.push('/login')
            return
        }

        const data = await res.json()
        targetText.value = data.result || data.translated_text || ''

        // 更新检测到的源语言
        if (data.source_lang) {
            detectedSource.value = data.source_lang
        } else if (sourceLang.value !== 'AUTO') {
            detectedSource.value = sourceLang.value
        } else {
            detectedSource.value = null
        }

        const src = data.source_lang || sourceLang.value
        const tgt = data.target_lang || targetLang.value
        // 不强制更新 translationInfo，因为我们直接在工具栏显示语言

        const record = {
            source: sourceText.value,
            target: targetText.value,
            srcLang: src,
            tgtLang: tgt,
            timestamp: Date.now()
        }
        history.value.unshift(record)
        if (history.value.length > 100) history.value.pop()
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch (err) {
        showToast('翻译失败：' + err.message)
    } finally {
        loading.value = false
    }
}

// 清空原文
function clearSource() {
    sourceText.value = ''
    targetText.value = ''
    detectedSource.value = null
}

// 复制
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制')
    }).catch(() => {
        showToast('复制失败')
    })
}

function updateStats() { }

function formatTime(ts) {
    return new Date(ts).toLocaleString('zh-CN')
}

function loadHistoryItem(idx) {
    const item = history.value[idx]
    if (!item) return
    sourceText.value = item.source
    targetText.value = item.target
    sourceLang.value = item.srcLang
    targetLang.value = item.tgtLang
    if (item.srcLang === 'AUTO' && item.detected) {
        // 如果有存储检测结果，可还原，但历史记录中未存，故忽略
    }
    drawerVisible.value = false
}

function deleteHistory(idx) {
    history.value.splice(idx, 1)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    showToast('已删除该记录')
}

// 请求清空历史（弹出确认框）
async function requestClearHistory() {
    const confirmed = await showConfirm('确认清空所有历史记录？')
    if (confirmed) {
        history.value = []
        localStorage.removeItem(HISTORY_KEY)
        showToast('已清空所有历史记录')
    }
}

function logout() {
    localStorage.removeItem('token')
    router.push('/login')
}

onMounted(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
        try { history.value = JSON.parse(stored) } catch (e) { }
    }
})
</script>

<style scoped>
/* ---- 全局容器 ---- */
.translator-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 20px 24px;
    box-sizing: border-box;
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

/* ---- 头部 ---- */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    margin-bottom: 16px;
}
.header h1 {
    font-size: 32px;
    margin: 0;
    line-height: 46px;
}
.header div {
    display: flex;
    gap: 10px;
}
.history-toggle,
.logout {
    padding: 6px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
}
.history-toggle {
    background: #edf2f7;
    color: #2d3748;
}
.logout {
    background: #e53e3e;
    color: white;
}

/* ---- 语言栏 ---- */
.lang-bar {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 16px;
    flex-wrap: wrap;
    line-height: 46px;
}
.lang-selectors {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 30px;
}
.lang-selectors select {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: white;
    font-size: 15px;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.lang-selectors select:focus,
.text-box textarea:focus {
    outline: none;
    border-color: #90b8fd;
    box-shadow: 0 4px 8px rgba(60, 64, 67, 0.16);
}
.text-box textarea:read-only:focus {
    border-color: #ddd;
    box-shadow: none;
}

/* ---- 圆形图标按钮 ---- */
.icon-circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: transparent;
    border: none;
    font-size: 16px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    flex-shrink: 0;
}
.icon-circle:hover:not(:disabled) {
    background: #caced1;
}
.icon-circle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.translate-btn {
    padding: 6px 20px;
    background: #2d7aff;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
    height: 34px;
}
.translate-btn:hover:not(:disabled) {
    background: #1a5fd9;
}
.translate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ---- 文本区域 ---- */
.text-areas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    flex: 1;
    min-height: 0;
}
@media (max-width: 640px) {
    .text-areas {
        grid-template-columns: 1fr;
    }
}

.text-box {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

/* ---- textarea 包装器（工具栏 + 文本框一体） ---- */
.textarea-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fafbfc;
    transition: border-color 0.2s, box-shadow 0.2s;
}
.textarea-wrapper:focus-within {
    border-color: #90b8fd;
    box-shadow: 0 4px 8px rgba(60, 64, 67, 0.16);
}
/* 只读时保持样式 */
.text-box:has(textarea:read-only) .textarea-wrapper:focus-within {
    border-color: #ddd;
    box-shadow: none;
}

/* ---- 外部工具栏（放在输入框上方） ---- */
.toolbar-external {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px;
    background: #f1f3f6;
    border-bottom: 1px solid #ddd;
    border-radius: 6px 6px 0 0;
    flex-shrink: 0;
    min-height: 48px;
}
.toolbar-external .lang-label {
    font-size: 14px;
    font-weight: 500;
    color: #2d3748;
}
.toolbar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}
.toolbar-actions .icon-circle {
    width: 26px;
    height: 26px;
    font-size: 14px;
}
.toolbar-actions .char-count {
    font-size: 13px;
    color: #666;
    margin-left: 2px;
}

/* ---- textarea 样式 ---- */
.textarea-wrapper textarea {
    flex: 1;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 0 0 6px 6px;
    font-size: 15px;
    font-family: inherit;
    resize: none;
    background: transparent;
    min-height: 0;
}
.textarea-wrapper textarea:focus {
    outline: none;
}
.textarea-wrapper textarea:read-only {
    background: transparent;
}

/* ---- Toast ---- */
.toast-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    animation: slideDown 0.3s ease;
}
.toast-message {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
@keyframes slideDown {
    from {
        opacity: 0;
        transform: translate(-50%, -20px);
    }
    to {
        opacity: 1;
        transform: translate(-50%, 0);
    }
}

/* ---- 自定义确认对话框 ---- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.modal-box {
    background: white;
    padding: 30px 40px 24px;
    border-radius: 8px;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
.modal-box p {
    margin: 0 0 24px;
    font-size: 16px;
    line-height: 1.5;
}
.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}
.modal-btn {
    padding: 8px 28px;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s;
}
.modal-btn.cancel {
    background: #edf2f7;
    color: #2d3748;
}
.modal-btn.cancel:hover {
    background: #d2d9e3;
}
.modal-btn.confirm {
    background: #e53e3e;
    color: white;
}
.modal-btn.confirm:hover {
    background: #c53030;
}

/* ---- 历史抽屉 ---- */
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
}
.drawer {
    position: fixed;
    top: 0;
    right: -400px;
    width: 380px;
    max-width: 90%;
    height: 100%;
    background: white;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
    transition: right 0.3s ease;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    border-radius: 6px 0 0 6px;
}
.drawer.open {
    right: 0;
}
.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}
.drawer-header h3 {
    margin: 0;
}
.drawer-header button {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
}
.drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
}
.drawer-body ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.drawer-body li {
    border-bottom: 1px solid #f0f0f0;
    padding: 10px 0;
    cursor: pointer;
    transition: background 0.1s;
}
.drawer-body li:hover {
    background: #f7fafc;
}
.history-meta {
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
    align-items: center;
}
.history-meta button {
    background: none;
    border: none;
    color: #e53e3e;
    cursor: pointer;
    font-size: 13px;
    margin-left: auto;
}
.drawer-body li p {
    margin: 4px 0;
    font-size: 14px;
    word-break: break-word;
}
.clear-all {
    margin-top: 16px;
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
    height: 48px;
}
.clear-all:hover {
    background: #cdd5db;
}
.empty {
    color: #999;
    text-align: center;
    padding: 20px;
}
.footer {
    margin-top: 6px;
    padding-top: 18px;
    border-top: 1px solid #e8eaed;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 13px;
    color: #5f6368;
}
.footer a {
    color: #1a73e8;
    text-decoration: none;
    margin: 0 8px;
    transition: color 0.2s ease;
    font-weight: 500;
}
.footer a:hover {
    color: #174ea6;
    text-decoration: underline;
}
.footer span {
    margin: 0 8px;
}
</style>