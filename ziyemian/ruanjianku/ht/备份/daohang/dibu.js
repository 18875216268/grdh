// 底部导航模块
const dibuNav = {
    render() {
        const container = document.querySelector('.nav-section-bottom');
        if (!container) return;
        
        const otherNav = firebase.xiangmuData.other;
        if (!otherNav) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="admin-nav-item" data-section="links" data-navkey="other">
                <span class="admin-nav-icon">${otherNav.icon || '📦'}</span>
                <span>${otherNav.name || '其它资源'}</span>
            </div>
        `;
        
        // 绑定点击事件
        const navElement = container.querySelector('.admin-nav-item');
        if (navElement) {
            navElement.addEventListener('click', () => zhongjianNav.setFilter('other'));
        }
    }
};