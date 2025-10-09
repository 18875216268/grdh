// 全局变量
let currentSection = 'domain';
let draggedElement = null;

// 懒加载配置
const lazyLoadConfig = {
    batchSize: 12,
    threshold: 100
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
    ['domainContainer', 'filterContainer', 'linksContainer', 'statusContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (scrollBottom < lazyLoadConfig.threshold) {
                    const section = containerId.replace('Container', '');
                    if (section === 'domain') {
                        domainModule.loadMore();
                    } else if (section === 'filter') {
                        filterModule.loadMore();
                    } else if (section === 'links') {
                        linksModule.loadMore();
                    } else if (section === 'status') {
                        statusModule.loadMore();
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
    } else if (section === 'filter') {
        filterModule.render();
    } else if (section === 'links') {
        linksModule.render();
    } else if (section === 'status') {
        statusModule.render();
    }
}
