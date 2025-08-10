// 投稿功能模块（使用IIFE避免全局变量冲突）
(function() {
    let currentPage = 1;
    let selectedLanmu = '';
    let selectedApps = [];
    let tgLanmuData = {};

    // 页面验证配置
    const validators = {
        1: () => {
            const name = document.getElementById('tgName').value.trim();
            const url = document.getElementById('tgUrl').value.trim();
            if (!name) return { valid: false, message: '请输入资源名称' };
            if (!url) return { valid: false, message: '请输入资源地址' };
            return { valid: true };
        },
        2: () => {
            if (!selectedLanmu) return { valid: false, message: '请选择栏目' };
            return { valid: true };
        }
    };

    // DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', initTG);

    function initTG() {
        // 事件绑定
        const events = [
            ['contributeBtn', 'click', openModal],
            ['tgModalClose', 'click', closeModal],
            ['tgModal', 'click', e => e.target.id === 'tgModal' && closeModal()],
            ['tgNext1', 'click', () => navigatePage(2)],
            ['tgPrev2', 'click', () => navigatePage(1)],
            ['tgNext2', 'click', () => navigatePage(3)],
            ['tgPrev3', 'click', () => navigatePage(2)],
            ['tgSubmit', 'click', submitForm],
            ['tgNumber', 'input', e => e.target.value = e.target.value.replace(/[^0-9]/g, '')]
        ];

        events.forEach(([id, event, handler]) => {
            document.getElementById(id).addEventListener(event, handler);
        });
    }

    function openModal() {
        document.getElementById('tgModal').classList.add('show');
        showPage(1);
        loadLanmuData();
    }

    function closeModal() {
        document.getElementById('tgModal').classList.remove('show');
        resetForm();
    }

    function navigatePage(pageNum) {
        const validation = validators[currentPage];
        if (validation) {
            const result = validation();
            if (!result.valid) {
                window.showToast(result.message, 'error');
                return;
            }
        }
        showPage(pageNum);
    }

    function showPage(pageNum) {
        // 隐藏所有页面
        [1, 2, 3].forEach(num => {
            document.getElementById(`tgPage${num}`).style.display = 'none';
        });
        
        // 显示目标页面
        document.getElementById(`tgPage${pageNum}`).style.display = 'flex';
        currentPage = pageNum;
    }

    function loadLanmuData() {
        database.ref('lanmu').once('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                tgLanmuData = data;
                renderLanmuList();
            }
        });
    }

    function renderLanmuList() {
        const container = document.getElementById('tgLanmuList');
        container.innerHTML = '';
        
        // 转换为数组并按xuhao排序
        const sortedLanmu = Object.entries(tgLanmuData)
            .sort(([,a], [,b]) => (a.xuhao || 999999) - (b.xuhao || 999999));
        
        sortedLanmu.forEach(([lanmuName, lanmu]) => {
            const item = document.createElement('div');
            item.className = 'tg-lanmu-item';
            item.textContent = lanmuName;
            
            item.addEventListener('click', () => {
                // 更新选中状态
                document.querySelectorAll('.tg-lanmu-item').forEach(el => 
                    el.classList.remove('active'));
                item.classList.add('active');
                selectedLanmu = lanmuName;
                renderAppTags(lanmuName);
            });
            
            container.appendChild(item);
        });
    }

    function renderAppTags(lanmuName) {
        const container = document.getElementById('tgAppTags');
        const applist = tgLanmuData[lanmuName]?.applist || '';  // 从applist字段读取
        
        container.innerHTML = '';
        selectedApps = [];
        
        if (applist) {
            const appNames = applist.split('|').filter(app => app.trim());
            if (appNames.length > 0) {
                appNames.forEach(appName => {
                    const tag = document.createElement('div');
                    tag.className = 'tg-app-tag';
                    tag.textContent = appName;
                    
                    tag.addEventListener('click', () => {
                        const isActive = tag.classList.contains('active');
                        if (isActive) {
                            tag.classList.remove('active');
                            selectedApps = selectedApps.filter(app => app !== appName);
                        } else {
                            tag.classList.add('active');
                            selectedApps.push(appName);
                        }
                    });
                    
                    container.appendChild(tag);
                });
            } else {
                container.innerHTML = '<div class="tg-placeholder">该栏目暂无应用</div>';
            }
        } else {
            container.innerHTML = '<div class="tg-placeholder">该栏目暂无应用</div>';
        }
    }

    async function submitForm() {
        const btn = document.getElementById('tgSubmit');
        btn.disabled = true;
        btn.textContent = '提交中...';

        try {
            const formData = {
                mingcheng: document.getElementById('tgName').value.trim(),
                url: document.getElementById('tgUrl').value.trim(),
                lanmu: selectedLanmu,
                yingyong: selectedApps.join('|') || '通用',
                yuanshuliang: document.getElementById('tgNumber').value || '0',
                tougaoren: document.getElementById('tgUser').value.trim() || '匿名',
                shijian: new Date().toISOString().split('T')[0],
                fuzhishu: '0',
                shenhe: '未审核',
                zhuangtai: '有效'
            };

            const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            await database.ref(`lanmu/${selectedLanmu}/neirong/${id}`).set(formData);
            
            window.showToast('投稿成功！等待管理员审核', 'success');
            closeModal();
        } catch (error) {
            window.showToast('投稿失败，请重试', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '投稿';
        }
    }

    function resetForm() {
        // 重置表单字段
        ['tgName', 'tgUrl', 'tgNumber', 'tgUser'].forEach(id => {
            document.getElementById(id).value = '';
        });
        
        // 重置选择状态
        document.getElementById('tgLanmuList').innerHTML = '';
        document.getElementById('tgAppTags').innerHTML = '<div class="tg-placeholder">请先选择栏目</div>';
        selectedLanmu = '';
        selectedApps = [];
        currentPage = 1;
    }
})();