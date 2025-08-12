// 投稿功能模块
(function() {
    let selectedLanmu = '';
    let selectedApps = [];
    let tgLanmuData = {};
    let availableApps = [];

    // DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', initTG);

    function initTG() {
        // 事件绑定
        document.getElementById('contributeBtn').addEventListener('click', openModal);
        document.getElementById('tgModalClose').addEventListener('click', closeModal);
        document.getElementById('tgModal').addEventListener('click', e => {
            if (e.target.id === 'tgModal') closeModal();
        });
        document.getElementById('tgSubmit').addEventListener('click', submitForm);
        
        // 栏目选择变化事件
        document.getElementById('tgLanmu').addEventListener('change', updateAppTags);
    }

    function openModal() {
        document.getElementById('tgModal').classList.add('show');
        loadLanmuData();
    }

    function closeModal() {
        document.getElementById('tgModal').classList.remove('show');
        resetForm();
    }

    function loadLanmuData() {
        database.ref('lanmu').once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                tgLanmuData = data;
                updateLanmuSelect();
            }
        });
    }

    function updateLanmuSelect() {
        const select = document.getElementById('tgLanmu');
        select.innerHTML = '<option value="">请选择栏目</option>';
        
        // 转换为数组并按xuhao排序
        const sortedLanmu = Object.entries(tgLanmuData)
            .sort(([,a], [,b]) => (a.xuhao || 999999) - (b.xuhao || 999999));
        
        sortedLanmu.forEach(([lanmuName]) => {
            const option = document.createElement('option');
            option.value = lanmuName;
            option.textContent = lanmuName;
            select.appendChild(option);
        });
    }

    function updateAppTags() {
        const lanmu = document.getElementById('tgLanmu').value;
        const inputField = document.getElementById('tgAppInput');
        
        if (!lanmu) {
            inputField.innerHTML = '<span class="tg-tag-placeholder">请先选择栏目</span>';
            availableApps = [];
            selectedApps = [];
            return;
        }
        
        selectedLanmu = lanmu;
        
        if (tgLanmuData[lanmu]?.applist) {
            availableApps = tgLanmuData[lanmu].applist.split('|').filter(app => app.trim());
            selectedApps = [];
        } else {
            availableApps = [];
            selectedApps = [];
        }
        
        renderAppTags();
    }

    function renderAppTags() {
        const inputField = document.getElementById('tgAppInput');
        
        if (availableApps.length === 0) {
            inputField.innerHTML = '<span class="tg-tag-placeholder">该栏目暂无应用</span>';
            return;
        }
        
        const tags = availableApps.map(app => {
            const isSelected = selectedApps.includes(app);
            return `<span class="tg-mini-tag ${isSelected ? 'selected' : ''}" 
                onclick="toggleApp('${app}')">${app}</span>`;
        }).join('');
        
        inputField.innerHTML = tags;
    }

    // 全局函数，供onclick使用
    window.toggleApp = function(appName) {
        const index = selectedApps.indexOf(appName);
        if (index > -1) {
            selectedApps.splice(index, 1);
        } else {
            selectedApps.push(appName);
        }
        renderAppTags();
    };

    async function submitForm() {
        // 验证必填项
        const mingcheng = document.getElementById('tgName').value.trim();
        const url = document.getElementById('tgUrl').value.trim();
        const lanmu = document.getElementById('tgLanmu').value;
        
        if (!mingcheng) {
            window.showToast('请输入资源名称', 'error');
            return;
        }
        
        if (!url) {
            window.showToast('请输入资源地址', 'error');
            return;
        }
        
        if (!lanmu) {
            window.showToast('请选择栏目', 'error');
            return;
        }
        
        if (selectedApps.length === 0 && availableApps.length > 0) {
            window.showToast('请选择至少一个应用', 'error');
            return;
        }
        
        const btn = document.getElementById('tgSubmit');
        btn.disabled = true;
        btn.textContent = '提交中...';

        try {
            const formData = {
                mingcheng: mingcheng,
                url: url,
                lanmu: lanmu,
                yingyong: selectedApps.join('|') || '通用',
                yuanshuliang: document.getElementById('tgYuanshuliang').value || '未知',
                tougaoren: document.getElementById('tgTougaoren').value.trim() || '匿名',
                shijian: new Date().toISOString().split('T')[0],
                fuzhishu: '0',
                shenhe: '未审核',  // 前台投稿默认未审核
                zhuangtai: '有效'
            };

            const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            await database.ref(`lanmu/${lanmu}/neirong/${id}`).set(formData);
            
            window.showToast('投稿成功！等待管理员审核', 'success');
            closeModal();
        } catch (error) {
            console.error('投稿失败:', error);
            window.showToast('投稿失败，请重试', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '投稿';
        }
    }

    function resetForm() {
        // 重置表单
        document.getElementById('tgForm').reset();
        
        // 重置选择状态
        selectedLanmu = '';
        selectedApps = [];
        availableApps = [];
        
        // 重置应用标签显示
        document.getElementById('tgAppInput').innerHTML = '<span class="tg-tag-placeholder">请先选择栏目</span>';
    }
})();