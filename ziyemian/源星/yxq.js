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
    lanmuData: {}
};

// 栏目图标映射
const iconMap = { '影视': '🎬', '小说': '📖', '漫画': '🎨', '音乐': '🎵', '广告': '📢', '其它': '📌' };

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

// 通用卡片创建函数
function createCard(item, type) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.dataset.id = item.id;
    card.dataset.type = type;
    
    if (type === 'resource') {
        const statusClass = item.zhuangtai === "有效" ? "valid" : "invalid";
        card.innerHTML = `
            <div class="resource-header">
                <h3 class="resource-title"><span class="status-icon ${statusClass}">●</span>${item.mingcheng}</h3>
                <button class="copy-btn">复制</button>
            </div>
            <div class="resource-meta">
                <span class="resource-tag">${item.lanmu}</span>
                <span class="resource-date">${item.shijian}</span>
                ${item.tougaoren ? `<span>by ${item.tougaoren}</span>` : ''}
            </div>
            <div class="resource-url">${item.url}</div>
            <div class="resource-footer">
                <div class="resource-info">
                    ${item.yingyong ? `适用: ${item.yingyong} | ` : ''}
                    ${item.yuanshuliang ? `源数量: ${item.yuanshuliang} | ` : ''}
                    已复制: ${item.fuzhishu || '0'}次
                </div>
            </div>
        `;
    } else if (type === 'app') {
        card.innerHTML = `
            <div class="resource-header">
                <h3 class="resource-title">${item.mingc}</h3>
                <button class="get-btn">获取</button>
            </div>
            <div class="resource-meta">
                <span class="resource-tag">${item.lanmu}</span>
                <span class="resource-date">${item.riqi}</span>
            </div>
            <div class="resource-url">${item.url}</div>
            <div class="resource-footer">
                <div class="resource-info">
                    ${item.appName} | ${item.wangpan} | 已获取: ${item.yihuoqu}次
                </div>
            </div>
        `;
    } else if (type === 'tansuo') {
        card.innerHTML = `
            <div class="resource-header">
                <h3 class="resource-title">${item.mingcheng}</h3>
                <button class="explore-btn">探索</button>
            </div>
            <div class="resource-meta">
                <span class="resource-date">${item.riqi}</span>
            </div>
            <div class="resource-url">${item.wangzhi}</div>
            <div class="resource-footer">
                <div class="resource-info">
                    ${item.miaoshu}
                </div>
            </div>
        `;
    }
    return card;
}

// 通用渲染函数
function renderContent(data, type) {
    if (data.length === 0) {
        elements.content.innerHTML = '<div class="empty-container">请等待更新......</div>';
        return;
    }
    
    elements.content.innerHTML = '<div class="resource-grid" id="resourceGrid"></div>';
    const grid = document.getElementById('resourceGrid');
    data.forEach(item => grid.appendChild(createCard(item, type)));
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
    
    // 初始显示加载中 - 两个区域
    elements.content.innerHTML = '<div class="empty-container">正在加载中......</div>';
    elements.navList.innerHTML = '<li style="padding:20px;text-align:center;color:#a0a0a0;font-size:12px;">正在加载中......</li>';
    
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
    
    // 主页按钮点击事件 - 添加这部分
    document.getElementById('homeBtn').addEventListener('click', () => {
        window.location.href = '../../index.html';
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
    if (state.currentTag === 'app-download') {
        const filtered = filterData(state.allAppDownloads, state.searchKeyword, true);
        renderContent(filtered, 'app');
    } else if (state.currentTag === 'explore') {
        const filtered = filterData(state.allTansuoData, state.searchKeyword, false, true);
        renderContent(filtered, 'tansuo');
    } else {
        let filtered = state.currentTag === 'all' 
            ? [...state.allResources]
            : state.allResources.filter(r => r.lanmu === state.currentTag);
        filtered = filterData(filtered, state.searchKeyword);
        renderContent(filtered, 'resource');
    }
}

// 优化的数据加载
function loadData() {
    // 监听栏目结构变化
    database.ref('lanmu').on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            state.lanmuData = data;
            generateNavigation(data);
            loadLimitedResources();
            loadLimitedApps();
        }
    }, error => {
        console.error("数据加载错误:", error);
        showToast('数据加载失败，请刷新页面重试', 'error');
    });
    
    loadLimitedTansuo();
}

// 生成导航 - 按xuhao排序并使用自定义图标
function generateNavigation(lanmuData) {
    elements.navList.innerHTML = '';
    
    // 转换为数组并按xuhao排序
    const sortedLanmu = Object.entries(lanmuData)
        .sort(([,a], [,b]) => (a.xuhao || 999999) - (b.xuhao || 999999));
    
    sortedLanmu.forEach(([lanmuName, lanmu]) => {
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.dataset.tag = lanmuName;
        navItem.innerHTML = `
            <span class="nav-icon">${lanmu.tubiao || iconMap[lanmuName] || '📂'}</span>
            <span class="nav-text">${lanmuName}</span>
        `;
        elements.navList.appendChild(navItem);
    });
}

// 加载有限的资源数据
function loadLimitedResources() {
    state.allResources = [];
    const lanmuNames = Object.keys(state.lanmuData);
    let loadedCount = 0;
    
    if (lanmuNames.length === 0) {
        updateDisplay();
        return;
    }
    
    const maxPerLanmu = Math.ceil(1000 / lanmuNames.length);
    
    lanmuNames.forEach(lanmuName => {
        database.ref(`lanmu/${lanmuName}/neirong`)
            .orderByChild('shijian')
            .limitToLast(maxPerLanmu)
            .once('value', snapshot => {
                const data = snapshot.val() || {};
                Object.entries(data).forEach(([id, resource]) => {
                    if (resource.shenhe === '已审核') {
                        state.allResources.push({...resource, id, lanmu: lanmuName});
                    }
                });
                
                loadedCount++;
                if (loadedCount === lanmuNames.length) {
                    state.allResources = state.allResources
                        .sort((a, b) => new Date(b.shijian || 0) - new Date(a.shijian || 0))
                        .slice(0, 1000);
                    updateDisplay();
                }
            });
    });
}

// 加载有限的应用数据
function loadLimitedApps() {
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
                            updatePath: `lanmu/${lanmuName}/app/${appName}/${versionId}/yihuoqu`
                        });
                    }
                });
            }
        });
    });
    
    state.allAppDownloads = flattened
        .sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0))
        .slice(0, 500);
}

// 加载有限的探索数据
function loadLimitedTansuo() {
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