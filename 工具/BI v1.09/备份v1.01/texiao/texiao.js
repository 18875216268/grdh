// 加载特效模块 - 简化版（v1.03）
const TexiaoModule = (function() {
    let isLoading = true;
    
    function init() {
        // 由于加载特效已经在HTML中直接渲染，这里主要是确保控制接口可用
        // 不需要再次创建DOM元素
    }
    
    function hide() {
        if (!isLoading) return;
        
        isLoading = false;
        const overlay = document.getElementById('loadingOverlay');
        
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
            }, 800);
        }
    }
    
    return {
        init,
        hide
    };
})();