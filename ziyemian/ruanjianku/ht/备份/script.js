// 全局变量
let currentSection = 'project';

// 懒加载配置
const lazyLoadConfig = {
    batchSize: 12,
    threshold: 100
};

// 刷新模块 - 核心刷新逻辑
const refreshModule = {
    async refresh() {
        Toast.show('开始重新归类所有资源...', 'info');
        const updates = {};
        let updateCount = 0;
        
        for (const [key, link] of Object.entries(firebase.ruanjiankuData)) {
            if (!link || typeof link !== 'object') continue;
            
            // 跳过：type包含"*"且daohang不为"other"的卡片（用户手动分类，不被破坏）
            if (link.type && link.type.includes('*') && link.daohang !== 'other') {
                // 仅补充基础字段
                if (!link.time) {
                    updates[`ruanjianku/${key}/time`] = Date.now();
                    updateCount++;
                }
                if (!link.zhuangtai) {
                    updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                    updateCount++;
                }
                if (!link.shenhe) {
                    updates[`ruanjianku/${key}/shenhe`] = '已审';
                    updateCount++;
                }
                if (!link.tougao) {
                    updates[`ruanjianku/${key}/tougao`] = '木小匣';
                    updateCount++;
                }
                continue;
            }
            
            // 根据URL检测导航项和类型
            const { navKey, type } = utils.detectNavAndType(link.url, firebase.xiangmuData);
            
            if (navKey && type) {
                // 匹配成功 → 更新导航项和类型（不管原字段是否缺失或不一致，统一更新）
                if (link.daohang !== navKey) {
                    updates[`ruanjianku/${key}/daohang`] = navKey;
                    updateCount++;
                }
                if (link.type !== type) {
                    updates[`ruanjianku/${key}/type`] = type;
                    updateCount++;
                }
            } else {
                // 未匹配 → daohang="other", type="*"
                if (link.daohang !== 'other') {
                    updates[`ruanjianku/${key}/daohang`] = 'other';
                    updateCount++;
                }
                if (link.type !== '*') {
                    updates[`ruanjianku/${key}/type`] = '*';
                    updateCount++;
                }
            }
            
            // 补充基础字段
            if (!link.time) {
                updates[`ruanjianku/${key}/time`] = Date.now();
                updateCount++;
            }
            if (!link.zhuangtai) {
                updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                updateCount++;
            }
            if (!link.shenhe) {
                updates[`ruanjianku/${key}/shenhe`] = '已审';
                updateCount++;
            }
            if (!link.tougao) {
                updates[`ruanjianku/${key}/tougao`] = '木小匣';
                updateCount++;
            }
        }
        
        if (updateCount === 0) {
            Toast.show('所有资源归类已是最新状态', 'success');
            return;
        }
        
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database),
                updates
            );
            Toast.show(`成功更新 ${updateCount} 个字段`, 'success');
        } catch (error) {
            console.error('更新失败:', error);
            Toast.show('更新失败，请重试', 'error');
        }
    }
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

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    const checkFirebase = setInterval(() => {
        if (window.firebaseDB) {
            clearInterval(checkFirebase);
            firebase.initRealtimeSync();
            initEventListeners();
            initLazyLoad();
            toubuNav.init();
            zhongjianNav.init();
            dibuNav.render();
            projectModule.init();
            updateHeaderControls();
        }
    }, 100);
});

// 初始化事件监听
function initEventListeners() {
    document.addEventListener('click', function(e) {
        const navItem = e.target.closest('.nav-section-top .admin-nav-item, .nav-section-middle .admin-nav-item, .nav-section-bottom .admin-nav-item');
        if (navItem) {
            const section = navItem.dataset.section;
            const navkey = navItem.dataset.navkey;
            
            if (section === 'project') {
                switchSection('project');
            } else if (section === 'links' && navkey) {
                zhongjianNav.currentFilter = navkey;
                zhongjianNav.setFilter(navkey);
            }
        }
    });
    
    const searchInput = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('globalSearchClear');
    const addBtn = document.getElementById('globalAddBtn');
    
    searchInput.addEventListener('keyup', handleGlobalSearch);
    clearBtn.addEventListener('click', clearGlobalSearch);
    addBtn.addEventListener('click', handleGlobalAdd);
}

// 初始化懒加载
function initLazyLoad() {
    ['projectContainer', 'linksContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (scrollBottom < lazyLoadConfig.threshold) {
                    const section = containerId.replace('Container', '');
                    if (section === 'project') {
                        projectModule.loadMore();
                    } else if (section === 'links') {
                        linksModule.loadMore();
                    }
                }
            });
        }
    });
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
}