// ==========================================
// Config & Constants
// ==========================================
// Tự động chuyển đổi giữa Localhost và Render Cloud khi deploy lên Vercel
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api/v1/words'
    : 'https://vocab-project.onrender.com/api/v1/words';

// State management
let vocabList = [];
let lastAiResult = null;

// ==========================================
// DOM Elements
// ==========================================
const searchInput = document.getElementById('search-input');
const wordGrid = document.getElementById('word-grid');
const wordCountBadge = document.getElementById('word-count');
const wordListLoading = document.getElementById('word-list-loading');
const emptyState = document.getElementById('empty-state');

// AI elements
const aiInput = document.getElementById('ai-input');
const btnAskAi = document.getElementById('btn-ask-ai');
const aiLoading = document.getElementById('ai-loading');
const aiResult = document.getElementById('ai-result');
const resMeaning = document.getElementById('res-meaning');
const resExample = document.getElementById('res-example');
const btnAutofill = document.getElementById('btn-autofill');

// Save Form elements
const saveForm = document.getElementById('save-word-form');
const saveEnglishInput = document.getElementById('save-english');
const saveVietnameseInput = document.getElementById('save-vietnamese');
const btnSaveWord = document.getElementById('btn-save-word');

// ==========================================
// Initialization & Loading Data
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadVocabNotebook();
    setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
    // Search filter
    searchInput.addEventListener('input', handleSearch);

    // AI Trigger
    btnAskAi.addEventListener('click', askAiGemini);
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askAiGemini();
    });

    // Autofill
    btnAutofill.addEventListener('click', handleAutofill);

    // Save Word Submit
    btnSaveWord.addEventListener('click', saveNewWord);
}

// Fetch all saved words from backend
async function loadVocabNotebook() {
    toggleLoading(true);
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('Không thể tải danh sách từ vựng.');
        
        vocabList = await response.json();
        renderNotebookList(vocabList);
    } catch (error) {
        showToast(error.message || 'Lỗi kết nối đến Backend!', 'error');
        showEmptyState(true);
    } finally {
        toggleLoading(false);
    }
}

// Toggle loading state
function toggleLoading(isLoading) {
    if (isLoading) {
        wordListLoading.classList.remove('hidden');
        wordGrid.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        wordListLoading.classList.add('hidden');
    }
}

// Show empty state
function showEmptyState(show) {
    if (show) {
        emptyState.classList.remove('hidden');
        wordGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        wordGrid.classList.remove('hidden');
    }
}

// Render word card grid
function renderNotebookList(list) {
    wordGrid.innerHTML = '';
    wordCountBadge.textContent = `${list.length} từ`;

    if (list.length === 0) {
        showEmptyState(true);
        return;
    }

    showEmptyState(false);
    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div class="word-card-header">
                <span class="word-card-title">${escapeHtml(item.englishWord)}</span>
            </div>
            <div class="word-card-body">
                <p>${escapeHtml(item.vietnameseMeaning)}</p>
            </div>
        `;
        wordGrid.appendChild(card);
    });
}

// ==========================================
// AI Assistant Logic
// ==========================================
async function askAiGemini() {
    const word = aiInput.value.trim();
    if (!word) {
        showToast('Vui lòng nhập từ tiếng Anh để hỏi AI!', 'error');
        return;
    }

    // Set loading state
    btnAskAi.disabled = true;
    aiLoading.classList.remove('hidden');
    aiResult.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/suggest?q=${encodeURIComponent(word)}`);
        
        if (!response.ok) {
            // Read details if returned
            const errText = await response.text();
            throw new Error(errText || 'Lỗi khi gọi AI Gemini.');
        }

        const data = await response.json();
        
        // Show result
        lastAiResult = data;
        resMeaning.textContent = data.suggestedMeaning;
        resExample.textContent = data.exampleSentence || 'Không có câu ví dụ mẫu.';
        
        aiResult.classList.remove('hidden');
        showToast('Đã nhận gợi ý thành công từ AI Gemini!', 'success');
        
        // Pre-fill only the English input in save form automatically
        saveEnglishInput.value = data.word;
        
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Lỗi kết nối đến dịch vụ AI!', 'error');
    } finally {
        btnAskAi.disabled = false;
        aiLoading.classList.add('hidden');
    }
}

// Copy AI meaning to Save form to let user edit it
function handleAutofill() {
    if (!lastAiResult) return;
    
    // Autofill into the save form
    saveEnglishInput.value = lastAiResult.word;
    saveVietnameseInput.value = lastAiResult.suggestedMeaning;
    
    // Scroll to save widget smoothly
    document.querySelector('.save-widget').scrollIntoView({ behavior: 'smooth' });
    showToast('Đã điền thông tin gợi ý vào Form lưu!', 'success');
}

// ==========================================
// Save Word Logic (Manual Entry)
// ==========================================
async function saveNewWord(e) {
    e.preventDefault();
    
    const englishWord = saveEnglishInput.value.trim();
    const vietnameseMeaning = saveVietnameseInput.value.trim();

    if (!englishWord || !vietnameseMeaning) {
        showToast('Vui lòng nhập đầy đủ các trường bắt buộc!', 'error');
        return;
    }

    btnSaveWord.disabled = true;
    btnSaveWord.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                englishWord,
                vietnameseMeaning
            })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || 'Không thể lưu từ vựng.');
        }

        showToast(`Đã lưu thành công từ '${englishWord}'!`, 'success');
        
        // Reset form & AI assistant
        saveForm.reset();
        aiInput.value = '';
        aiResult.classList.add('hidden');
        lastAiResult = null;
        
        // Refresh Notebook list
        loadVocabNotebook();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btnSaveWord.disabled = false;
        btnSaveWord.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Vào Sổ Tay';
    }
}

// ==========================================
// Search / Filtering
// ==========================================
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        renderNotebookList(vocabList);
        return;
    }

    const filtered = vocabList.filter(item => {
        return item.englishWord.toLowerCase().includes(query) || 
               item.vietnameseMeaning.toLowerCase().includes(query);
    });
    
    renderNotebookList(filtered);
}

// ==========================================
// Helper Utilities
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Toast notification trigger
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
