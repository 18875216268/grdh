// ==========================================
// 主控制器 - 实时刷新 + 懒加载版本
// ==========================================

const App = (() => {
    let currentType = 'all';
    let searchKeyword = '';
    let currentFilteredResources = [];
    let displayedCount = 0;
    const BATCH_SIZE = 50;
    
    // 页面初始化
    async function init() {
        showLoading();
        
        try {
            await window.FirebaseModule.init();
            window.FirebaseModule.setDataChangeCallback(refresh);
            window.NavigationModule.init();
            window.ContributeModule.init();
            window.BlindBoxModule.init();
            bindEvents();
            refresh();
        } catch (error) {
            console.error('初始化失败:', error);
            showToast('加载失败，请刷新页面', 'error');
        }
    }
    
    // 刷新界面
    function refresh() {
        const resources = window.FirebaseModule.getResources();
        const xinxiData = window.FirebaseModule.getXinxiData();
        window.NavigationModule.render(xinxiData, resources);
        refreshResourceList(resources);
    }
    
    // 绑定事件
    function bindEvents() {
        window.NavigationModule.onClick(type => {
            currentType = type;
            refreshResourceList(window.FirebaseModule.getResources());
        });
        
        document.getElementById('searchInput').addEventListener('input', e => {
            searchKeyword = e.target.value.trim();
            refreshResourceList(window.FirebaseModule.getResources());
        });
        
        document.getElementById('adminBtn').addEventListener('click', () => {
            window.location.href = '../../index.html';
        });
        
        const grid = document.getElementById('resourceGrid');
        grid.addEventListener('click', handleCardClick);
        
        const tooltip = document.getElementById('tooltip');
        grid.addEventListener('mouseover', e => {
            const title = e.target.closest('.card-title');
            if (title?.dataset.info) {
                const info = JSON.parse(title.dataset.info);
                const rect = title.getBoundingClientRect();
                tooltip.textContent = `${info.name}\n${info.type} | ${info.time}\nby ${info.tougao} | 访问: ${info.visits}次`;
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - 80) + 'px';
                tooltip.classList.add('show');
            }
        });
        
        grid.addEventListener('mouseout', e => {
            if (e.target.closest('.card-title')) tooltip.classList.remove('show');
        });
        
        document.querySelector('.content').addEventListener('scroll', e => {
            const el = e.target;
            const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (scrollBottom < 200 && displayedCount < currentFilteredResources.length) {
                loadMoreCards();
            }
        });
    }
    
    // 刷新资源列表
    function refreshResourceList(allResources) {
        currentFilteredResources = filterResources(allResources);
        displayedCount = 0;
        
        const grid = document.getElementById('resourceGrid');
        if (currentFilteredResources.length === 0) {
            grid.innerHTML = '<div class="empty-placeholder">暂无资源，点击右下角按钮投稿</div>';
            return;
        }
        
        grid.innerHTML = '';
        loadMoreCards();
    }
    
    // 加载更多卡片
    function loadMoreCards() {
        const grid = document.getElementById('resourceGrid');
        const start = displayedCount;
        const end = Math.min(start + BATCH_SIZE, currentFilteredResources.length);
        
        for (let i = start; i < end; i++) {
            grid.appendChild(createCard(currentFilteredResources[i]));
        }
        
        displayedCount = end;
        console.log(`已加载 ${displayedCount}/${currentFilteredResources.length} 个资源`);
    }
    
    // 过滤资源
    function filterResources(allResources) {
        let result = allResources;
        
        if (currentType !== 'all') {
            result = result.filter(r => 
                currentType === 'others' ? r.type === '未分类' : r.type === currentType
            );
        }
        
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            result = result.filter(r => 
                `${r.name} ${r.url} ${r.type} ${r.tougao}`.toLowerCase().includes(kw)
            );
        }
        
        return result;
    }
    
    // 创建卡片
    function createCard(r) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.dataset.id = r.id;
        
        const time = new Date(r.time).toISOString().split('T')[0].replace(/-/g, '/');
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title-wrapper">
                    <span class="status-icon ${r.zhuangtai === '有效' ? 'valid' : 'invalid'}">●</span>
                    <h3 class="card-title" data-info='${JSON.stringify({name:r.name,type:r.type,time,tougao:r.tougao,visits:r.visits})}'>${r.name}</h3>
                </div>
                <button class="visit-btn">访问</button>
            </div>
            <div class="card-meta">
                <span class="card-tag">${r.type}</span>
                <span class="card-date">${time}</span>
            </div>
            <div class="card-url">${r.url}</div>
            <div class="card-footer">
                <span>by ${r.tougao}</span>
                <span>访问: ${r.visits}次</span>
            </div>
        `;
        return card;
    }
    
    // 处理卡片点击
    async function handleCardClick(e) {
        const btn = e.target.closest('.visit-btn');
        if (!btn) return;
        
        const id = btn.closest('.resource-card').dataset.id;
        const resource = window.FirebaseModule.getResources().find(r => r.id === id);
        
        if (resource?.url) {
            window.open(resource.url, '_blank');
            await window.FirebaseModule.updateVisits(id, resource.visits);
            showToast('访问成功！', 'success');
        }
    }
    
    // 显示加载
    function showLoading() {
        document.getElementById('resourceGrid').innerHTML = '<div class="loading-placeholder">正在加载资源...</div>';
        document.getElementById('navList').innerHTML = '<li class="loading-nav">正在加载...</li>';
    }
    
    return { init };
})();

// Toast 全局函数
window.showToast = (msg, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => App.init());