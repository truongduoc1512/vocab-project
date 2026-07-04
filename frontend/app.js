// ==========================================
// Config & Constants
// ==========================================
// Đọc từ biến cấu hình động (tạo từ biến môi trường Vercel) hoặc dùng localhost mặc định
const API_BASE_URL = (window.ENV_API_BASE_URL && !window.ENV_API_BASE_URL.startsWith('${'))
    ? window.ENV_API_BASE_URL
    : 'http://localhost:8080/api/v1/words';

// State management
let vocabList = [];
let lastAiResult = null;
let editingWordId = null;

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
        
        if (item.id === editingWordId) {
            // Render inline edit form
            card.innerHTML = `
                <div class="edit-mode-form">
                    <input type="text" class="edit-input-eng" value="${escapeHtml(item.englishWord)}" placeholder="Từ tiếng Anh">
                    <textarea class="edit-input-viet" rows="2" placeholder="Nghĩa tiếng Việt">${escapeHtml(item.vietnameseMeaning)}</textarea>
                    <div class="edit-actions">
                        <button class="btn-text btn-save-edit" onclick="saveInlineEdit(${item.id}, this)">
                            <i class="fa-solid fa-check"></i> Lưu
                        </button>
                        <button class="btn-text btn-cancel-edit" onclick="cancelInlineEdit()">
                            <i class="fa-solid fa-xmark"></i> Hủy
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Render regular card with hover actions
            card.innerHTML = `
                <div class="word-card-header">
                    <span class="word-card-title">${escapeHtml(item.englishWord)}</span>
                    <div class="word-card-actions">
                        <button class="btn-card-action edit-btn" onclick="startInlineEdit(${item.id})" title="Sửa từ vựng">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-card-action delete-btn" onclick="deleteWord(${item.id})" title="Xóa từ vựng">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="word-card-body">
                    <p>${escapeHtml(item.vietnameseMeaning)}</p>
                </div>
            `;
        }
        wordGrid.appendChild(card);
    });
}

// Global functions for inline actions
window.startInlineEdit = function(id) {
    editingWordId = id;
    renderNotebookList(vocabList);
};

window.cancelInlineEdit = function() {
    editingWordId = null;
    renderNotebookList(vocabList);
};

window.saveInlineEdit = async function(id, btnEl) {
    const card = btnEl.closest('.word-card');
    const englishWord = card.querySelector('.edit-input-eng').value.trim();
    const vietnameseMeaning = card.querySelector('.edit-input-viet').value.trim();

    if (!englishWord || !vietnameseMeaning) {
        showToast('Vui lòng nhập đầy đủ các trường bắt buộc!', 'error');
        return;
    }

    btnEl.disabled = true;
    const originalHtml = btnEl.innerHTML;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                englishWord,
                vietnameseMeaning
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Không thể cập nhật từ vựng.');
        }

        const updatedWord = await response.json();
        
        // Update in local list
        const idx = vocabList.findIndex(w => w.id === id);
        if (idx !== -1) {
            vocabList[idx] = updatedWord;
        }

        showToast('Đã sửa từ vựng thành công!', 'success');
        editingWordId = null;
        renderNotebookList(vocabList);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalHtml;
    }
};

window.deleteWord = async function(id) {
    const wordToDelete = vocabList.find(w => w.id === id);
    const wordText = wordToDelete ? `'${wordToDelete.englishWord}'` : 'từ vựng này';
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${wordText} khỏi sổ tay?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Không thể xóa từ vựng.');
        }

        // Remove from local list
        vocabList = vocabList.filter(w => w.id !== id);
        showToast('Đã xóa từ vựng thành công!', 'success');
        renderNotebookList(vocabList);
    } catch (error) {
        showToast(error.message, 'error');
    }
};


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
