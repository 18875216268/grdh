// 全局变量
let currentSection = 'domain';
let draggedElement = null;

// 懒加载配置
const lazyLoadConfig = {
    batchSize: 12,
    threshold: 100
};

// 刷新模块
const refreshModule = {
    async refresh() {
        Toast.show('开始检测并更新网盘类型...', 'info');
        
        const updates = {};
        let updateCount = 0;
        
        for (const [key, link] of Object.entries(firebase.ruanjiankuData)) {
            if (link && typeof link === 'object' && link.url) {
                const detectedType = zhongjianNav.detectNetdiskType(link.url);
                if (link.type !== detectedType) {
                    updates[`ruanjianku/${key}/type`] = detectedType;
                    updateCount++;
                }
            }
        }
        
        if (updateCount === 0) {
            Toast.show('所有链接类型已是最新状态', 'success');
            return;
        }
        
        try {
            await window.firebaseDB.update(
                window.firebaseDB.ref(window.firebaseDB.database),
                updates
            );
            Toast.show(`成功更新 ${updateCount} 条链接的网盘类型`, 'success');
        } catch (error) {
            console.error('更新失败:', error);
            Toast.show('更新失败，请重试', 'error');
        }
    }
};

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
            dibuNav.init();
        }
    }, 100);
});

// 初始化事件监听
function initEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.nav-section-top .admin-nav-item, .nav-section-bottom .admin-nav-item')) {
            const section = e.target.closest('.admin-nav-item').dataset.section;
            switchSection(section);
        }
    });
}

// 初始化懒加载
function initLazyLoad() {
    ['domainContainer', 'linksContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (scrollBottom < lazyLoadConfig.threshold) {
                    const section = containerId.replace('Container', '');
                    if (section === 'domain') {
                        domainModule.loadMore();
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
    
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        if (item.dataset.section === section) {
            item.classList.add('active');
        } else if (item.dataset.section !== 'links') {
            item.classList.remove('active');
        }
    });
    
    if (section !== 'links') {
        document.querySelectorAll('.nav-section-middle .admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        zhongjianNav.currentFilter = 'all';
    }
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });
    
    if (section === 'domain') {
        domainModule.render();
    } else if (section === 'links') {
        linksModule.render();
    }
}