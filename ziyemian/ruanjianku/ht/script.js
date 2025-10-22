// 全局变量
let currentSection = 'project';

// 懒加载配置
const lazyLoadConfig = {
    batchSize: 100,
    threshold: 100
};

// 全局搜索处理
function handleGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('globalSearchClear');
    const keyword = searchInput.value.trim();
    
    clearBtn.style.display = keyword ? 'block' : 'none';
    
    if (currentSection === 'project') {
        projectModule.searchKeyword = keyword;
        projectModule.applySearch();
    } else if (currentSection === 'links') {
        linksModule.searchKeyword = keyword;
        linksModule.applySearch();
    }
    
    // 搜索后清除选中
    piliangModule.clearSelection();
}

// 全局清除搜索
function clearGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('globalSearchClear');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    if (currentSection === 'project') {
        projectModule.searchKeyword = '';
        projectModule.applySearch();
    } else if (currentSection === 'links') {
        linksModule.searchKeyword = '';
        linksModule.applySearch();
    }
    
    // 清除搜索后清除选中
    piliangModule.clearSelection();
}

// 全局添加按钮处理
function handleGlobalAdd() {
    if (currentSection === 'project') {
        projectModule.showModal();
    } else if (currentSection === 'links') {
        linksModule.showModal();
    }
}

// 更新顶部控件状态
function updateHeaderControls() {
    const searchInput = document.getElementById('globalSearchInput');
    const addBtn = document.getElementById('globalAddBtn');
    
    searchInput.placeholder = '空格代表并，逗号代表或......';
    addBtn.style.display = 'inline-flex';
}

// 切换页面
function switchSection(section) {
    currentSection = section;
    
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('globalSearchClear').style.display = 'none';
    
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        if (item.dataset.section === section && !item.dataset.navkey) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });
    
    updateHeaderControls();
    
    if (section === 'project') {
        projectModule.render();
    }
    
    // 切换页面时清除选中
    piliangModule.clearSelection();
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebaseDB) {
            clearInterval(checkFirebase);
            firebase.initRealtimeSync();
            initEventListeners();
            initLazyLoad();
            toubuNav.render();
            zhongjianNav.render();
            dibuNav.render();
            projectModule.init();
            zujianModule.init();
            piliangModule.init();
            updateHeaderControls();
        }
    }, 100);
});

// 初始化事件监听 - 使用事件委托优化
function initEventListeners() {
    // 全局事件委托 - 导航点击
    document.addEventListener('click', function(e) {
        // 左侧导航项点击
        const navItem = e.target.closest('.admin-nav-item');
        if (navItem) {
            const section = navItem.dataset.section;
            const navkey = navItem.dataset.navkey;
            
            if (section === 'project') {
                switchSection('project');
            } else if (section === 'links' && navkey) {
                zhongjianNav.setFilter(navkey);
            }
            return;
        }
        
        // 项目卡片点击 - 支持多选
        const projectCard = e.target.closest('#projectCardsGrid .project-card');
        if (projectCard && !e.target.closest('button')) {
            const key = projectCard.dataset.key;
            piliangModule.handleCardClick(key, e);
            return;
        }
        
        // 链接卡片点击 - 支持多选
        const linkCard = e.target.closest('#linksCardsGrid .link-card');
        if (linkCard && !e.target.closest('button') && !e.target.closest('a')) {
            const key = linkCard.dataset.key;
            piliangModule.handleCardClick(key, e);
            return;
        }
        
        // 项目卡片按钮点击
        const projectBtn = e.target.closest('#projectCardsGrid button[data-action]');
        if (projectBtn) {
            const action = projectBtn.dataset.action;
            const key = projectBtn.dataset.key;
            
            if (action === 'settings') {
                shezhiModule.showModal(key);
            } else if (action === 'edit') {
                projectModule.showModal(key);
            } else if (action === 'delete' && !projectBtn.disabled) {
                projectModule.delete(key);
            } else if (action === 'toggle-zhuangtai') {
                projectModule.toggleZhuangtai(key);
            }
            return;
        }
        
        // 链接卡片按钮点击
        const linkBtn = e.target.closest('#linksCardsGrid button[data-action]');
        if (linkBtn) {
            const action = linkBtn.dataset.action;
            const key = linkBtn.dataset.key;
            const field = linkBtn.dataset.field;
            
            if (action === 'edit') {
                linksModule.showModal(key);
            } else if (action === 'delete') {
                linksModule.delete(key);
            } else if (action === 'toggle') {
                linksModule.toggleStatus(key, field);
            }
            return;
        }
    });
    
    // 搜索框事件
    const searchInput = document.getElementById('globalSearchInput');
    searchInput.addEventListener('keyup', handleGlobalSearch);
    
    // 清除搜索按钮
    const clearBtn = document.getElementById('globalSearchClear');
    clearBtn.addEventListener('click', clearGlobalSearch);
    
    // 添加按钮
    const addBtn = document.getElementById('globalAddBtn');
    addBtn.addEventListener('click', handleGlobalAdd);
    
    // 全选按钮
    const selectAllBtn = document.getElementById('selectAllBtn');
    selectAllBtn.addEventListener('click', () => piliangModule.toggleSelectAll());
    
    // 批量操作按钮
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    batchDeleteBtn.addEventListener('click', () => piliangModule.batchDelete());
    
    const batchShenheBtn = document.getElementById('batchShenheBtn');
    batchShenheBtn.addEventListener('click', () => piliangModule.batchToggleShenhe());
    
    const batchZhuangtaiBtn = document.getElementById('batchZhuangtaiBtn');
    batchZhuangtaiBtn.addEventListener('click', () => piliangModule.batchToggleZhuangtai());
}

// 初始化懒加载
function initLazyLoad() {
    ['projectContainer', 'linksContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (scrollBottom < lazyLoadConfig.threshold) {
                    if (containerId === 'projectContainer') {
                        projectModule.loadMore();
                    } else if (containerId === 'linksContainer') {
                        linksModule.loadMore();
                    }
                }
            });
        }
    });
}