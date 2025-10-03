// ==========================================
// 导航模块 - 被动渲染
// ==========================================

const NavigationModule = (() => {
    let clickCallback = null;
    
    // 初始化
    function init() {
        document.querySelector('.sidebar').addEventListener('click', e => {
            const item = e.target.closest('.nav-item');
            if (!item) return;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            if (clickCallback) clickCallback(item.dataset.type);
        });
    }
    
    // 渲染导航
    function render(xinxiData, resources) {
        const navList = document.getElementById('navList');
        navList.innerHTML = '';
        
        // 统计各类资源数量
        const counts = {};
        let othersCount = 0;
        
        resources.forEach(r => {
            if (r.type === '未分类') {
                othersCount++;
            } else {
                counts[r.type] = (counts[r.type] || 0) + 1;
            }
        });
        
        // 收集并排序有资源的网盘
        const items = Object.entries(xinxiData)
            .filter(([key, val]) => key !== 'tongyong' && val?.name && counts[val.name] > 0)
            .map(([, val]) => ({ name: val.name, xuhao: val.xuhao || 999 }))
            .sort((a, b) => a.xuhao - b.xuhao);
        
        items.forEach(item => navList.appendChild(createNavItem(item.name)));
        
        // 更新"其它资源"显示
        const othersNav = document.querySelector('.sidebar-footer .nav-item[data-type="others"]');
        if (othersNav) othersNav.style.display = othersCount > 0 ? 'flex' : 'none';
    }
    
    // 创建导航项
    function createNavItem(name) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.dataset.type = name;
        li.innerHTML = `
            <span class="nav-icon" data-first-char="${name.charAt(0)}">⛅︎</span>
            <span class="nav-text">${name}</span>
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