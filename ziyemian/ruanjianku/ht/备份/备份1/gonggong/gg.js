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
    }
};