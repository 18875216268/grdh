// 主脚本 - 优化版（v1.03）
let globalData = {};

// 简化的加载特效控制
const LoadingController = {
    hide: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
            }, 800);
        }
    }
};

// 提示模块
const Toast = {
    show: (message, type = 'info') => {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 500);
        }, 2500);
    }
};

// 状态显示
function updateStatus(connected, message) {
    document.getElementById('statusIndicator').className = 
        connected ? 'status-indicator' : 'status-indicator disconnected';
    document.getElementById('connectionStatus').textContent = 
        message || (connected ? '实时同步中' : '连接断开');
}

// 初始化 - 无需等待DOMContentLoaded，加载特效已经在HTML中显示
document.addEventListener('DOMContentLoaded', () => {
    updateStatus(false, '正在连接...');
    
    FirebaseModule.init(connected => 
        updateStatus(connected, connected ? '实时同步中' : '连接断开')
    );
    
    ShezhiModule.init();
    
    if (typeof ShangchuanModule !== 'undefined') {
        ShangchuanModule.init();
    }
    
    if (typeof XiazaiModule !== 'undefined') {
        XiazaiModule.init();
    }
    
    if (typeof FuzhiModule !== 'undefined') {
        FuzhiModule.init();
    }
});

// 事件监听
window.addEventListener('resize', TableModule.setTableDimensions);
window.addEventListener('online', () => FirebaseModule.reconnect());
window.addEventListener('offline', () => updateStatus(false, '网络断开'));

// 全局方法
window.showToast = Toast.show;
window.updateStatus = updateStatus;
window.LoadingController = LoadingController; // 导出给其他模块使用