// ==========================================
// 主控制器 - 基于daohang关联
// ==========================================

const App = (() => {
    let currentNavKey = 'all';
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
            window.TipModule.init();
            bindEvents();
            refresh();
        } catch (error) {
            console.error('初始化失败:', error);
            window.showToast('加载失败，请刷新页面', 'error');
        }
    }
    
    // 刷新界面
    function refresh() {
        const xiangmuData = window.FirebaseModule.getXiangmuData();
        const resources = window.FirebaseModule.getResources();
        window.NavigationModule.render(xiangmuData);
        refreshResourceList(resources);
    }
    
    // 绑定事件
    function bindEvents() {
        window.NavigationModule.onClick(navKey => {
            currentNavKey = navKey;
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
        
        bindTooltipEvents(grid);
        
        document.querySelector('.content').addEventListener('scroll', e => {
            const el = e.target;
            const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (scrollBottom < 200 && displayedCount < currentFilteredResources.length) {
                loadMoreCards();
            }
        });
    }
    
    // 绑定提示框事件
    function bindTooltipEvents(grid) {
        const tooltip = document.getElementById('tooltip');
        
        grid.addEventListener('mouseover', e => {
            const title = e.target.closest('.card-title');
            if (title?.dataset.info) {
                const info = JSON.parse(title.dataset.info);
                const rect = title.getBoundingClientRect();
                tooltip.textContent = `${info.name}\n${info.category}\nby ${info.tougao} | 访问: ${info.visits}次`;
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - 80) + 'px';
                tooltip.classList.add('show');
            }
        });
        
        grid.addEventListener('mouseout', e => {
            if (e.target.closest('.card-title')) {
                tooltip.classList.remove('show');
            }
        });
    }
    
    // 刷新资源列表
    function refreshResourceList(allResources) {
        currentFilteredResources = filterAndSortResources(allResources);
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
        
        const fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            fragment.appendChild(createCard(currentFilteredResources[i]));
        }
        grid.appendChild(fragment);
        
        displayedCount = end;
    }
    
    // 提取@和_之间的数字
    function extractNumber(name) {
        const match = name.match(/@([^_]*)_/);
        if (!match) return null;
        
        const str = match[1];
        const numMatch = str.match(/\d+/);
        return numMatch ? parseInt(numMatch[0]) : null;
    }
    
    // 过滤并排序资源
    function filterAndSortResources(allResources) {
        let result = allResources;
        
        // 按导航项过滤
        if (currentNavKey !== 'all') {
            result = result.filter(r => r.daohang === currentNavKey);
        }
        
        // 按关键词搜索
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            result = result.filter(r => 
                `${r.name} ${r.url} ${r.type} ${r.tougao}`.toLowerCase().includes(kw)
            );
        }
        
        // 排序逻辑
        result.sort((a, b) => {
            const hasAtA = a.name.includes('@');
            const hasAtB = b.name.includes('@');
            
            // 两个都有@
            if (hasAtA && hasAtB) {
                const numA = extractNumber(a.name);
                const numB = extractNumber(b.name);
                
                // 都有数字且不同，按数字从小到大排序
                if (numA !== null && numB !== null && numA !== numB) {
                    return numA - numB;
                }
                
                // 没有数字或数字相同，按visits从大到小排序
                const visitsA = parseFloat(a.visits) || 0;
                const visitsB = parseFloat(b.visits) || 0;
                if (visitsA !== visitsB) {
                    return visitsB - visitsA;
                }
                
                // visits相同，按time排序
                return new Date(a.time) - new Date(b.time);
            }
            
            // 一个有@一个没有，有@的在前
            if (hasAtA && !hasAtB) return -1;
            if (!hasAtA && hasAtB) return 1;
            
            // 都没有@，按visits从大到小排序
            const visitsA = parseFloat(a.visits) || 0;
            const visitsB = parseFloat(b.visits) || 0;
            if (visitsA !== visitsB) {
                return visitsB - visitsA;
            }
            
            // visits相同，按time排序
            return new Date(a.time) - new Date(b.time);
        });
        
        return result;
    }
    
    // 创建卡片
    function createCard(r) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.dataset.id = r.id;
        
        const time = new Date(r.time).toISOString().split('T')[0].replace(/-/g, '/');
        const xiangmuData = window.FirebaseModule.getXiangmuData();
        const navName = xiangmuData[r.daohang]?.name || '其它资源';
        const category = r.type === '*' ? navName : `${navName}/${r.type}`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title-wrapper">
                    <span class="status-icon ${r.zhuangtai === '有效' ? 'valid' : 'invalid'}">●</span>
                    <h3 class="card-title" data-info='${JSON.stringify({name:r.name,category,tougao:r.tougao,visits:r.visits})}'>${r.name}</h3>
                </div>
                <button class="visit-btn">访问</button>
            </div>
            <div class="card-meta">
                <span class="card-tag">${category}</span>
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
        }
    }
    
    // 显示加载
    function showLoading() {
        document.getElementById('resourceGrid').innerHTML = '<div class="loading-placeholder">正在加载资源...</div>';
        document.querySelector('.sidebar-content .nav-list').innerHTML = '<li class="loading-nav">正在加载...</li>';
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