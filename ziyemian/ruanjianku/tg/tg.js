// ==========================================
// 投稿模块 - 自动判断+手动选择
// ==========================================

const ContributeModule = (() => {
    let modal, submitBtn;
    let currentNavKey = 'other';
    let currentType = '*';
    
    // 初始化
    function init() {
        modal = document.getElementById('contributeModal');
        submitBtn = document.getElementById('submitBtn');
        bindEvents();
    }
    
    // 绑定事件
    function bindEvents() {
        document.getElementById('contributeBtn').addEventListener('click', open);
        document.getElementById('modalClose').addEventListener('click', close);
        
        // URL输入自动判断
        document.getElementById('resourceUrl').addEventListener('input', e => {
            const url = e.target.value.trim();
            if (url) {
                const result = window.FirebaseModule.detectNavAndType(url);
                currentNavKey = result.daohang;
                currentType = result.type;
                updateSelections();
            }
        });
        
        // 手动选择导航
        document.getElementById('navSelect').addEventListener('change', e => {
            currentNavKey = e.target.value;
            updateTypeOptions();
        });
        
        // 手动选择类型
        document.getElementById('typeSelect').addEventListener('change', e => {
            currentType = e.target.value;
        });
        
        submitBtn.addEventListener('click', submit);
    }
    
    // 打开弹窗
    function open() {
        renderSelections();
        modal.classList.add('show');
    }
    
    // 关闭弹窗
    function close() {
        modal.classList.remove('show');
        document.getElementById('resourceName').value = '';
        document.getElementById('resourceUrl').value = '';
        document.getElementById('contributor').value = '';
        currentNavKey = 'other';
        currentType = '*';
    }
    
    // 渲染选择框
    function renderSelections() {
        const xiangmuData = window.FirebaseModule.getXiangmuData();
        const navSelect = document.getElementById('navSelect');
        
        navSelect.innerHTML = '';
        for (const key in xiangmuData) {
            const data = xiangmuData[key];
            if (!data?.name) continue;
            
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.name;
            if (key === 'other') option.selected = true;
            navSelect.appendChild(option);
        }
        
        currentNavKey = 'other';
        currentType = '*';
        updateTypeOptions();
    }
    
    // 更新类型选择框
    function updateTypeOptions() {
        const typeSelect = document.getElementById('typeSelect');
        const xiangmuData = window.FirebaseModule.getXiangmuData();
        
        typeSelect.innerHTML = '<option value="*">未分类</option>';
        
        const navData = xiangmuData[currentNavKey];
        if (navData) {
            for (const key in navData) {
                const typeData = navData[key];
                if (typeof typeData === 'object' && typeData.yuming) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = key;
                    typeSelect.appendChild(option);
                }
            }
        }
        
        typeSelect.value = currentType;
    }
    
    // 更新选择框
    function updateSelections() {
        const navSelect = document.getElementById('navSelect');
        navSelect.value = currentNavKey;
        updateTypeOptions();
    }
    
    // 提交投稿
    async function submit() {
        const name = document.getElementById('resourceName').value.trim();
        const url = document.getElementById('resourceUrl').value.trim();
        const tougao = document.getElementById('contributor').value.trim() || '匿名';
        
        if (!name) {
            window.showToast('请输入资源名称', 'error');
            return;
        }
        
        if (!url) {
            window.showToast('请输入资源链接', 'error');
            return;
        }
        
        try {
            new URL(url);
        } catch (e) {
            window.showToast('请输入有效的URL地址', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        const success = await window.FirebaseModule.addResource({
            name,
            url,
            daohang: currentNavKey,
            type: currentType,
            tougao
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = '提交投稿';
        
        if (success) {
            window.showToast('投稿成功！等待管理员审核', 'success');
            close();
        } else {
            window.showToast('投稿失败，请重试', 'error');
        }
    }
    
    return { init };
})();

window.ContributeModule = ContributeModule;