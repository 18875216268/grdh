// ==========================================
// 提示弹窗模块 - 进入页面提示
// ==========================================

const TipModule = (() => {
    let modal, closeBtn, confirmBtn;
    
    // 初始化
    function init() {
        modal = document.getElementById('tipModal');
        closeBtn = document.getElementById('tipModalClose');
        confirmBtn = document.getElementById('tipConfirmBtn');
        
        bindEvents();
        showTip();
    }
    
    // 绑定事件
    function bindEvents() {
        // 关闭按钮
        closeBtn.addEventListener('click', close);
        
        // 确认按钮
        confirmBtn.addEventListener('click', close);
    }
    
    // 显示提示
    function showTip() {
        // 延迟100ms显示，让页面先加载
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }
    
    // 关闭提示
    function close() {
        modal.classList.remove('show');
    }
    
    return { init };
})();

window.TipModule = TipModule;