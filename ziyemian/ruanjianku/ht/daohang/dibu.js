// 底部导航模块 - 优化版
const dibuNav = {
    render() {
        const container = document.querySelector('.nav-section-bottom');
        if (!container) return;
        
        const fragment = document.createDocumentFragment();
        
        // 渲染weizhi='底部'的导航项
        const bottomNavItems = Object.entries(firebase.xiangmuData)
            .filter(([key, value]) => value && typeof value === 'object' && value.name && value.weizhi === '底部')
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999));
        
        bottomNavItems.forEach(([key, navItem]) => {
            const navElement = document.createElement('div');
            navElement.className = 'admin-nav-item';
            navElement.dataset.section = 'links';
            navElement.dataset.navkey = key;
            navElement.innerHTML = `
                <span class="admin-nav-icon">${navItem.icon || '📁'}</span>
                <span>${navItem.name}</span>
            `;
            fragment.appendChild(navElement);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }
};