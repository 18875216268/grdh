// ==========================================
// 投稿模块 - 独立运作
// ==========================================

const ContributeModule = (() => {
    let modal, submitBtn;
    
    // 初始化
    function init() {
        modal = document.getElementById('contributeModal');
        submitBtn = document.getElementById('submitBtn');
        bindEvents();
    }
    
    // 绑定事件
    function bindEvents() {
        // 打开
        document.getElementById('contributeBtn').addEventListener('click', open);
        
        // 关闭
        document.getElementById('modalClose').addEventListener('click', close);
        document.getElementById('cancelBtn').addEventListener('click', close);
        modal.addEventListener('click', e => {
            if (e.target === modal) close();
        });
        
        // 提交
        submitBtn.addEventListener('click', submit);
    }
    
    // 打开弹窗
    function open() {
        modal.classList.add('show');
    }
    
    // 关闭弹窗
    function close() {
        modal.classList.remove('show');
        document.getElementById('resourceName').value = '';
        document.getElementById('resourceUrl').value = '';
        document.getElementById('contributor').value = '';
    }
    
    // 提交投稿
    async function submit() {
        const name = document.getElementById('resourceName').value.trim();
        const url = document.getElementById('resourceUrl').value.trim();
        const tougao = document.getElementById('contributor').value.trim() || '匿名';
        
        // 验证
        if (!name) {
            showToast('请输入资源名称', 'error');
            return;
        }
        
        if (!url) {
            showToast('请输入资源链接', 'error');
            return;
        }
        
        try {
            new URL(url);
        } catch (e) {
            showToast('请输入有效的URL地址', 'error');
            return;
        }
        
        // 提交
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        const success = await window.FirebaseModule.addResource({ name, url, tougao });
        
        submitBtn.disabled = false;
        submitBtn.textContent = '提交投稿';
        
        if (success) {
            showToast('投稿成功！等待管理员审核', 'success');
            close();
        } else {
            showToast('投稿失败，请重试', 'error');
        }
    }
    
    return { init };
})();

window.ContributeModule = ContributeModule;