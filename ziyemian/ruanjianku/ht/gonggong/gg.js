// 公共工具函数
const utils = {
    // 生成8位随机ID
    generateId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },
    
    // 格式化日期
    formatDate(timestamp) {
        if (!timestamp) {
            return new Date().toISOString().split('T')[0].replace(/-/g, '/');
        }
        return new Date(timestamp).toISOString().split('T')[0].replace(/-/g, '/');
    },
    
    // 更新连接状态
    updateConnectionStatus(status, message) {
        const statusEl = document.getElementById('connectionStatus');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('span');
        
        dot.className = `status-dot ${status}`;
        text.textContent = message;
    },
    
    // 递归获取对象所有值的字符串
    getAllFieldsText(obj) {
        let text = '';
        
        const traverse = (value) => {
            if (value === null || value === undefined) {
                return;
            }
            if (typeof value === 'object') {
                Object.values(value).forEach(v => traverse(v));
            } else {
                text += ' ' + String(value);
            }
        };
        
        traverse(obj);
        return text.toLowerCase();
    }
};

// 公共搜索模块
const searchModule = {
    // 执行搜索过滤
    filterItems(items, searchKeyword, getSearchText) {
        if (!searchKeyword) {
            return [...items];
        }
        
        const searchText = searchKeyword.toLowerCase();
        
        // 判断是并搜索还是或搜索
        if (searchText.includes(',') || searchText.includes('，')) {
            // 或搜索：用逗号分隔
            const keywords = searchText.split(/[,，]/).map(k => k.trim()).filter(k => k);
            return items.filter(item => {
                const itemText = getSearchText ? getSearchText(item) : utils.getAllFieldsText(item);
                return keywords.some(keyword => itemText.includes(keyword));
            });
        } else {
            // 并搜索：用空格分隔
            const keywords = searchText.split(/\s+/).filter(k => k);
            return items.filter(item => {
                const itemText = getSearchText ? getSearchText(item) : utils.getAllFieldsText(item);
                return keywords.every(keyword => itemText.includes(keyword));
            });
        }
    },
    
    // 处理搜索输入
    handleSearch(inputId, clearBtnId, callback) {
        const searchInput = document.getElementById(inputId);
        const searchKeyword = searchInput.value.trim();
        
        // 控制清除按钮显示
        const clearBtn = document.getElementById(clearBtnId);
        if (searchKeyword) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
        
        callback(searchKeyword);
    },
    
    // 清除搜索
    clearSearch(inputId, clearBtnId, callback) {
        const searchInput = document.getElementById(inputId);
        searchInput.value = '';
        document.getElementById(clearBtnId).style.display = 'none';
        callback('');
    }
};