// Firebase 配置解密
function decrypt(encryptedConfig) {
    const key = 'YXingQiu2024';
    let decrypted = '';
    const base64 = atob(encryptedConfig);
    for (let i = 0; i < base64.length; i++) {
        decrypted += String.fromCharCode(base64.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.parse(decrypted);
}

// 初始化 Firebase
const encryptedConfig = "InoIHg4aDAwQChB1ECIIPR4VDhZ7YHFBYDpaHggiGBxmBGZMH2A/AT1pIUJTVXNWLjdLQkUwHAFadF1ZODEHTF1zEA1bXlVFMC1EC1Q1WRQcVltGPDoIHQIwGQUcU11Ze3RLCgYlCBdTQ1dhCxRLVEU5HQFCQwgbdiERBwk2GBxHHVcHPWgIQwM0DxRHXEYZKywNDEk3AAdXUlNHPDEGQAQ+BFceEkJGNjIMDRMYDVcIEktMMDYOHw4kRBABVAJVe3RLHRM+GxRVVXBBOjMMGkVrSwxKWVxTKDEcQwJiDUVTHlNEKSsZARN/ChpfEh4WND0aHQY2ABtVY1daPT0bJwNzU1cFAwsNYGhfW1dlX0YQHBBVKSggCkVrS0QIBwENYGFZWFJhXUMBCkVRO2JRXQEzCBYKVQMBaDlbClJmC01XBVdVe3RLAwIwGgBAVV9RNywgCkVrSzIffnQHAQoiPl9pWVdP";
const firebaseConfig = decrypt(encryptedConfig);
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 全局状态
const state = {
    currentTag: 'all',
    allResources: [],
    allAppDownloads: [],
    allTansuoData: [],
    searchKeyword: '',
    lanmuData: {},
    resourceListeners: {} // 存储资源监听器引用
};

// DOM缓存
const elements = {};

// 全局Toast函数
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => elements.toastContainer.removeChild(toast), 300);
    }, 3000);
};

// 通用搜索函数
function filterData(data, keyword, isApp = false, isTansuo = false) {
    if (!keyword) return data;
    const lowerKeyword = keyword.toLowerCase();
    return data.filter(item => {
        let searchFields;
        if (isTansuo) {
            searchFields = [item.mingcheng, item.miaoshu, item.wangzhi];
        } else if (isApp) {
            searchFields = [item.mingc, item.lanmu, item.appName, item.wangpan];
        } else {
            searchFields = [item.mingcheng, item.url, item.lanmu, item.tougaoren, item.yingyong];
        }
        return searchFields.join(' ').toLowerCase().includes(lowerKeyword);
    });
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 缓存DOM元素
    Object.assign(elements, {
        content: document.querySelector('.content'),
        toastContainer: document.getElementById('toastContainer'),
        navList: document.getElementById('navList'),
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn')
    });
    
    // 初始显示加载中
    elements.content.innerHTML = '<div class="empty-container">正在加载中......</div>';
    elements.navList.innerHTML = '<li style="padding:20px;text-align:center;color:#a0a0a0;font-size:12px;">正在加载中......</li>';
    
    // 初始化信息模块
    if (window.InfoModule) {
        window.InfoModule.init();
    }
    
    initEvents();
    loadData();
});

// 事件初始化
function initEvents() {
    // 导航点击（事件委托）
    document.querySelector('.sidebar').addEventListener('click', e => {
        const navItem = e.target.closest('.nav-item');
        if (!navItem) return;
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        navItem.classList.add('active');
        state.currentTag = navItem.dataset.tag;
        updateDisplay();
    });
    
    // 内容区点击（事件委托）
    elements.content.addEventListener('click', handleButtonClick);
    
    // 搜索事件
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', e => e.key === 'Enter' && performSearch());
    elements.searchInput.addEventListener('input', e => {
        if (!e.target.value) {
            state.searchKeyword = '';
            updateDisplay();
        }
    });
    
    // 主页按钮点击事件
    document.getElementById('homeBtn').addEventListener('click', () => {
        window.location.href = 'https://www.quruanpu.cn';
    });
}

// 统一按钮点击处理
async function handleButtonClick(e) {
    const button = e.target;
    const card = button.closest('.resource-card');
    if (!card) return;
    
    const id = card.dataset.id;
    const type = card.dataset.type;
    
    if (button.classList.contains('copy-btn') && type === 'resource') {
        await handleCopy(id);
    } else if (button.classList.contains('get-btn') && type === 'app') {
        await handleGet(id);
    } else if (button.classList.contains('explore-btn') && type === 'tansuo') {
        await handleExplore(id);
    } else if (button.classList.contains('status-icon') && type === 'resource') {
        await handleStatusToggle(id, button);
    }
}

// 复制处理
async function handleCopy(id) {
    const resource = state.allResources.find(r => r.id === id);
    if (!resource) return;
    
    try {
        await navigator.clipboard.writeText(resource.url);
        const copyRef = database.ref(`lanmu/${resource.lanmu}/neirong/${id}/fuzhishu`);
        const snapshot = await copyRef.once('value');
        await copyRef.set((parseInt(snapshot.val() || '0') + 1).toString());
        showToast('复制成功！', 'success');
    } catch (error) {
        showToast('复制失败，请手动复制', 'error');
    }
}

// 获取处理
async function handleGet(id) {
    const app = state.allAppDownloads.find(a => a.id === id);
    if (!app?.url) return;
    
    try {
        const getRef = database.ref(app.updatePath);
        const snapshot = await getRef.once('value');
        await getRef.set((parseInt(snapshot.val() || '0') + 1).toString());
        window.open(app.url, '_blank');
        showToast('获取成功！', 'success');
    } catch (error) {
        showToast('获取失败，请重试', 'error');
    }
}

// 探索处理
async function handleExplore(id) {
    const tansuo = state.allTansuoData.find(t => t.id === id);
    if (!tansuo?.wangzhi) return;
    
    try {
        window.open(tansuo.wangzhi, '_blank');
        showToast('探索成功！', 'success');
    } catch (error) {
        showToast('探索失败，请重试', 'error');
    }
}

// 状态切换处理
async function handleStatusToggle(id, button) {
    const resource = state.allResources.find(r => r.id === id);
    if (!resource) return;
    
    const newState = resource.zhuangtai === "有效" ? "无效" : "有效";
    try {
        await database.ref(`lanmu/${resource.lanmu}/neirong/${id}/zhuangtai`).set(newState);
        resource.zhuangtai = newState;
        button.className = `status-icon ${newState === "有效" ? "valid" : "invalid"}`;
        showToast(`已标记为${newState}状态`, 'success');
    } catch (error) {
        showToast('状态更新失败，请重试', 'error');
    }
}

// 搜索执行
function performSearch() {
    state.searchKeyword = elements.searchInput.value.trim();
    updateDisplay();
}

// 更新显示
function updateDisplay() {
    if (!window.InfoModule) return;
    
    if (state.currentTag === 'app-download') {
        const filtered = filterData(state.allAppDownloads, state.searchKeyword, true);
        window.InfoModule.renderContent(filtered, 'app', elements.content);
    } else if (state.currentTag === 'explore') {
        const filtered = filterData(state.allTansuoData, state.searchKeyword, false, true);
        window.InfoModule.renderContent(filtered, 'tansuo', elements.content);
    } else {
        let filtered = state.currentTag === 'all' 
            ? [...state.allResources]
            : state.allResources.filter(r => r.lanmu === state.currentTag);
        filtered = filterData(filtered, state.searchKeyword);
        window.InfoModule.renderContent(filtered, 'resource', elements.content);
    }
}

// 更新导航选中状态
function updateNavActiveState() {
    // 移除所有active类
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // 设置当前选中的导航项
    const activeNav = document.querySelector(`.nav-item[data-tag="${state.currentTag}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

// 生成导航
function generateNavigation(lanmuData) {
    elements.navList.innerHTML = '';
    
    const sortedLanmu = Object.entries(lanmuData)
        .sort(([,a], [,b]) => (a.xuhao || 999999) - (b.xuhao || 999999));
    
    sortedLanmu.forEach(([lanmuName, lanmu]) => {
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.dataset.tag = lanmuName;
        
        // 如果当前选中的是这个栏目，添加active类
        if (state.currentTag === lanmuName) {
            navItem.classList.add('active');
        }
        
        navItem.innerHTML = `
            <span class="nav-icon">${lanmu.tubiao || '📂'}</span>
            <span class="nav-text">${lanmuName}</span>
        `;
        elements.navList.appendChild(navItem);
    });
    
    // 更新固定导航项的选中状态
    updateNavActiveState();
}

// 处理资源更新
function processResourceUpdate() {
    // 合并所有栏目的资源并排序
    const allResourcesMap = new Map();
    
    for (const lanmuName in state.lanmuData) {
        const resources = state.lanmuData[lanmuName].resources || [];
        resources.forEach(resource => {
            allResourcesMap.set(resource.id, resource);
        });
    }
    
    state.allResources = Array.from(allResourcesMap.values())
        .sort((a, b) => new Date(b.shijian || 0) - new Date(a.shijian || 0))
        .slice(0, 1000);
    
    updateDisplay();
}

// 处理应用数据
function processAppData() {
    const flattened = [];
    const lanmuNames = Object.keys(state.lanmuData);
    
    lanmuNames.forEach(lanmuName => {
        const apps = state.lanmuData[lanmuName].app || {};
        Object.keys(apps).forEach(appName => {
            const appVersions = apps[appName];
            if (typeof appVersions === 'object' && !appVersions.mingc) {
                const versions = Object.entries(appVersions)
                    .sort(([,a], [,b]) => new Date(b.riqi || 0) - new Date(a.riqi || 0))
                    .slice(0, 5);
                
                versions.forEach(([versionId, versionData]) => {
                    if (versionData.mingc && versionData.url) {
                        flattened.push({
                            id: `${lanmuName}-${appName}-${versionId}`,
                            lanmu: lanmuName,
                            appName: appName,
                            versionId: versionId,
                            mingc: versionData.mingc,
                            url: versionData.url,
                            riqi: versionData.riqi,
                            yihuoqu: versionData.yihuoqu || '0',
                            wangpan: versionData.wangpan || '其它',
                            updatePath: `lanmu/${lanmuName}/app/${appName}/${versionId}/yihuoqu`,
                            tougaoren: versionData.tougaoren || '匿名'
                        });
                    }
                });
            }
        });
    });
    
    state.allAppDownloads = flattened
        .sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0))
        .slice(0, 500);
    
    if (state.currentTag === 'app-download') {
        updateDisplay();
    }
}

// 清理旧的资源监听器
function cleanupResourceListeners() {
    Object.values(state.resourceListeners).forEach(listener => {
        if (listener) listener.off();
    });
    state.resourceListeners = {};
}

// 设置资源监听器
function setupResourceListeners(lanmuNames) {
    cleanupResourceListeners();
    
    const maxPerLanmu = Math.ceil(1000 / lanmuNames.length);
    
    lanmuNames.forEach(lanmuName => {
        const ref = database.ref(`lanmu/${lanmuName}/neirong`)
            .orderByChild('shijian')
            .limitToLast(maxPerLanmu);
        
        state.resourceListeners[lanmuName] = ref;
        
        ref.on('value', snapshot => {
            const data = snapshot.val() || {};
            const resources = [];
            
            Object.entries(data).forEach(([id, resource]) => {
                if (resource.shenhe === '已审核') {
                    resources.push({...resource, id, lanmu: lanmuName});
                }
            });
            
            // 更新该栏目的资源
            state.lanmuData[lanmuName].resources = resources;
            
            // 处理所有资源更新
            processResourceUpdate();
        });
    });
}

// 数据加载 - 统一实时监听
function loadData() {
    // 监听栏目数据变化
    database.ref('lanmu').on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            state.lanmuData = data;
            generateNavigation(data);
            
            // 设置资源实时监听
            const lanmuNames = Object.keys(data);
            setupResourceListeners(lanmuNames);
            
            // 处理应用数据
            processAppData();
        }
    }, error => {
        console.error("数据加载错误:", error);
        showToast('数据加载失败，请刷新页面重试', 'error');
    });
    
    // 监听探索数据变化
    database.ref('tansuo')
        .orderByChild('riqi')
        .limitToLast(200)
        .on('value', snapshot => {
            const data = snapshot.val();
            state.allTansuoData = [];
            
            if (data) {
                Object.entries(data).forEach(([id, tansuo]) => {
                    state.allTansuoData.push({...tansuo, id});
                });
                state.allTansuoData.sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0));
            }
            
            if (state.currentTag === 'explore') {
                updateDisplay();
            }
        });
}

// 页面卸载时清理监听器
window.addEventListener('beforeunload', () => {
    cleanupResourceListeners();
    database.ref('lanmu').off();
    database.ref('tansuo').off();
});