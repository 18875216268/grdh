// ==========================================
// 导航模块 - 支持顶中底部分、密码验证、全部导航
// ==========================================

const NavigationModule = (() => {
    let clickCallback = null;
    let passwordModal, passwordInput, passwordConfirmBtn, passwordModalClose;
    let passwordResolve = null;
    let currentActiveNavKey = null;
    
    // 初始化
    function init() {
        passwordModal = document.getElementById('passwordModal');
        passwordInput = document.getElementById('passwordInput');
        passwordConfirmBtn = document.getElementById('passwordConfirmBtn');
        passwordModalClose = document.getElementById('passwordModalClose');
        
        bindPasswordModalEvents();
        
        // 绑定导航点击事件
        document.querySelector('.sidebar').addEventListener('click', async e => {
            const item = e.target.closest('.nav-item');
            if (!item) return;
            
            const navKey = item.dataset.type;
            
            // "全部"导航项无需密码验证
            if (navKey !== 'all') {
                // 验证密码
                if (!window.FirebaseModule.isPasswordVerified(navKey)) {
                    const xiangmuData = window.FirebaseModule.getXiangmuData();
                    const navName = xiangmuData[navKey]?.name || '该导航项';
                    const password = await showPasswordPrompt(navName);
                    if (password === null) return;
                    
                    if (!window.FirebaseModule.verifyPassword(navKey, password)) {
                        window.showToast('密码错误', 'error');
                        return;
                    }
                    window.showToast('验证成功', 'success');
                    
                    // 密码验证成功后，重新渲染导航项以移除小锁
                    render(xiangmuData);
                }
            }
            
            // 更新当前选中的导航key
            currentActiveNavKey = navKey;
            
            // 切换激活状态
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            if (clickCallback) clickCallback(navKey);
        });
    }
    
    // 绑定密码弹窗事件
    function bindPasswordModalEvents() {
        passwordModalClose.addEventListener('click', closePasswordModal);
        passwordConfirmBtn.addEventListener('click', confirmPassword);
        
        // 回车键确认
        passwordInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') confirmPassword();
        });
    }
    
    // 显示密码弹窗
    function showPasswordPrompt(navName) {
        return new Promise(resolve => {
            passwordResolve = resolve;
            passwordInput.value = '';
            passwordModal.classList.add('show');
            passwordInput.focus();
        });
    }
    
    // 确认密码
    function confirmPassword() {
        const password = passwordInput.value.trim();
        if (passwordResolve) {
            passwordResolve(password || null);
            passwordResolve = null;
        }
        closePasswordModal();
    }
    
    // 关闭密码弹窗
    function closePasswordModal() {
        passwordModal.classList.remove('show');
        passwordInput.value = '';
        if (passwordResolve) {
            passwordResolve(null);
            passwordResolve = null;
        }
    }
    
    // 渲染导航
    function render(xiangmuData) {
        const topContainer = document.querySelector('.sidebar-header');
        const middleContainer = document.querySelector('.sidebar-content .nav-list');
        const bottomContainer = document.querySelector('.sidebar-footer');
        
        topContainer.innerHTML = '';
        middleContainer.innerHTML = '';
        bottomContainer.innerHTML = '';
        
        // 固定添加"全部"导航项到顶部
        const allNavItem = createNavItem({
            key: 'all',
            name: '全部',
            icon: '🌌',
            xuhao: 0,
            mima: ''
        });
        topContainer.appendChild(allNavItem);
        
        // 分组并排序
        const groups = { 顶部: [], 中部: [], 底部: [] };
        
        for (const key in xiangmuData) {
            const data = xiangmuData[key];
            if (!data?.name) continue;
            
            // 过滤隐藏的导航项
            if (data.zhuangtai === '隐藏') continue;
            
            const weizhi = data.weizhi || '中部';
            groups[weizhi].push({
                key,
                name: data.name,
                icon: data.icon || '📁',
                xuhao: data.xuhao || 999,
                mima: data.mima || ''
            });
        }
        
        // 各组内按序号排序
        Object.values(groups).forEach(arr => arr.sort((a, b) => a.xuhao - b.xuhao));
        
        // 渲染顶部(在"全部"之后)
        groups.顶部.forEach(item => topContainer.appendChild(createNavItem(item)));
        
        // 渲染中部
        groups.中部.forEach(item => middleContainer.appendChild(createNavItem(item)));
        
        // 渲染底部
        groups.底部.forEach(item => bottomContainer.appendChild(createNavItem(item)));
        
        // 恢复选中状态
        if (currentActiveNavKey) {
            const activeNav = document.querySelector(`.nav-item[data-type="${currentActiveNavKey}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            } else {
                // 如果之前选中的导航项不存在了，选中"全部"
                activateFirstNav();
            }
        } else {
            // 首次加载，激活"全部"
            activateFirstNav();
        }
    }
    
    // 激活第一个导航项(即"全部")
    function activateFirstNav() {
        const firstNav = document.querySelector('.nav-item');
        if (firstNav) {
            currentActiveNavKey = firstNav.dataset.type;
            firstNav.classList.add('active');
            if (clickCallback) clickCallback(currentActiveNavKey);
        }
    }
    
    // 创建导航项
    function createNavItem(item) {
        const li = document.createElement('div');
        li.className = 'nav-item';
        li.dataset.type = item.key;
        
        const icon = item.icon || '📁';
        const firstChar = item.name.charAt(0);
        
        // 判断是否需要显示小锁（有密码且未验证）
        const needLock = item.mima && !window.FirebaseModule.isPasswordVerified(item.key);
        const lockIcon = needLock ? '<span class="nav-lock">🔒</span>' : '';
        
        li.innerHTML = `
            <span class="nav-icon" data-first-char="${firstChar}">${icon}</span>
            <span class="nav-text">${item.name}${lockIcon}</span>
        `;
        return li;
    }
    
    // 注册点击回调
    function onClick(callback) {
        clickCallback = callback;
    }
    
    return { init, render, onClick };
})();

window.NavigationModule = NavigationModule;