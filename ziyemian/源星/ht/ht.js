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

// 全局变量
let currentLanmuData = {};
let currentTansuoData = {};
let tooltipElement = null;

// 工具函数
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.parentNode?.removeChild(toast), 3000);
    }, 3000);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-CN');
}

function autoDetectWangpan(url) {
    const wangpanMap = {
        'baidu': '百度网盘', 'quark': '夸克网盘', 'lanzou': '蓝奏云',
        'xunlei': '迅雷网盘', 'ali': '阿里云盘', 'feijipan': '小飞机网盘',
        'weiyun': '腾讯微云', 'yun.139': '中国移动云盘', '123pan': '123云盘',
        'cloud.189': '天翼云盘', 'pan.wo': '联通云盘'
    };
    
    const lowerUrl = url.toLowerCase();
    return Object.entries(wangpanMap).find(([key]) => lowerUrl.includes(key))?.[1] || '其它';
}

// 初始化悬浮提示
function initTooltip() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'resource-tooltip';
        document.body.appendChild(tooltipElement);
    }
}

// 显示悬浮提示
function showTooltip(element, content) {
    if (!tooltipElement) initTooltip();
    
    tooltipElement.innerHTML = content;
    
    // 计算位置
    const rect = element.getBoundingClientRect();
    const tooltipHeight = 100; // 预估高度
    
    // 设置位置（在元素上方）
    tooltipElement.style.left = rect.left + 'px';
    tooltipElement.style.top = (rect.top - tooltipHeight - 10) + 'px';
    
    // 显示
    tooltipElement.classList.add('show');
}

// 隐藏悬浮提示
function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('show');
    }
}

// 初始化实时监听器
function initRealtimeListeners() {
    // 监听栏目数据变化
    database.ref('lanmu').on('value', (snapshot) => {
        currentLanmuData = snapshot.val() || {};
        updateLanmuSelectors();
        
        // 根据当前页面自动更新相应的UI
        const currentSection = document.querySelector('.admin-nav-item.active')?.dataset.section;
        if (currentSection === 'lanmu') {
            renderLanmuCards?.();
        } else if (currentSection === 'resources') {
            renderResourceCards?.();
        } else if (currentSection === 'apps') {
            renderAppCards?.();
        } else if (currentSection === 'audit') {
            renderAuditCards?.();
        }
    });
    
    // 监听探索数据变化
    database.ref('tansuo').on('value', (snapshot) => {
        currentTansuoData = snapshot.val() || {};
        
        // 如果当前在探索页面，自动更新UI
        const currentSection = document.querySelector('.admin-nav-item.active')?.dataset.section;
        if (currentSection === 'tansuo') {
            renderTansuoCards?.();
        }
    });
}

function updateLanmuSelectors() {
    ['resource-lanmu-filter', 'app-lanmu-filter'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">选择栏目</option>';
        
        Object.keys(currentLanmuData).forEach(lanmuName => {
            const option = document.createElement('option');
            option.value = option.textContent = lanmuName;
            if (lanmuName === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}

// 页面导航
const sectionHandlers = {
    'lanmu': () => renderLanmuCards?.(),
    'resources': () => renderResourceCards?.(),
    'apps': () => renderAppCards?.(),
    'tansuo': () => renderTansuoCards?.(),
    'audit': () => renderAuditCards?.()
};

function switchSection(section) {
    // 更新导航状态
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // 切换内容区
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = sec.id === `${section}-section` ? 'block' : 'none';
    });

    // 渲染当前页面
    sectionHandlers[section]?.();
}

// 统一事件处理
document.addEventListener('click', function(e) {
    const target = e.target;
    
    // 导航点击
    const navItem = target.closest('.admin-nav-item');
    if (navItem) {
        switchSection(navItem.dataset.section);
        return;
    }
    
    // 添加按钮
    if (target.dataset.add) {
        const addHandlers = { 
            'resource': () => showEditModal('resource'),
            'app': () => showEditModal('app'),
            'tansuo': () => showEditModal('tansuo')
        };
        addHandlers[target.dataset.add]?.();
        return;
    }
    
    // 卡片操作
    if (target.dataset.action) {
        const { action, id, type, lanmu } = target.dataset;
        const actionHandlers = {
            'edit': () => type === 'lanmu' ? editLanmu(id) : handleEdit(id, type),
            'delete': () => handleDelete(id, type),
            'toggle-display': () => toggleResourceDisplay(id, lanmu),
            'toggle-status': () => toggleResourceStatus(id, lanmu)
        };
        actionHandlers[action]?.();
    }
});

// 为标题添加悬浮事件
document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('resource-title')) {
        const card = e.target.closest('.content-card');
        const tooltipContent = e.target.nextElementSibling?.innerHTML;
        if (tooltipContent) {
            showTooltip(e.target, tooltipContent);
        }
    }
});

document.addEventListener('mouseout', function(e) {
    if (e.target.classList.contains('resource-title')) {
        hideTooltip();
    }
});

function handleEdit(id, type) {
    let data = null;
    
    if (type === 'resource') {
        // 查找资源数据
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.neirong && lanmuData.neirong[id]) {
                data = { id, lanmu: lanmuName, ...lanmuData.neirong[id] };
                break;
            }
        }
    } else if (type === 'app') {
        // 查找应用数据
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.app) {
                for (const [appName, appVersions] of Object.entries(lanmuData.app)) {
                    if (appVersions[id]) {
                        data = { id, lanmu: lanmuName, appName, ...appVersions[id] };
                        break;
                    }
                }
            }
            if (data) break;
        }
    } else if (type === 'tansuo') {
        // 从全局数据获取探索数据
        if (currentTansuoData[id]) {
            data = { id, ...currentTansuoData[id] };
        }
    }
    
    if (data) {
        showEditModal(type, data);
    }
}

// 统一删除处理 - 完全依赖监听器
async function handleDelete(id, type) {
    try {
        if (type === 'lanmu') {
            await database.ref(`lanmu/${id}`).remove();
        } else if (type === 'resource') {
            // 查找并删除资源
            for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
                if (lanmuData.neirong && lanmuData.neirong[id]) {
                    await database.ref(`lanmu/${lanmuName}/neirong/${id}`).remove();
                    break;
                }
            }
        } else if (type === 'app') {
            // 查找并删除应用
            for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
                if (lanmuData.app) {
                    for (const appName of Object.keys(lanmuData.app)) {
                        if (lanmuData.app[appName][id]) {
                            await database.ref(`lanmu/${lanmuName}/app/${appName}/${id}`).remove();
                            break;
                        }
                    }
                }
            }
        } else if (type === 'tansuo') {
            await database.ref(`tansuo/${id}`).remove();
        }
        
        showToast('删除成功', 'success');
    } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败，请重试', 'error');
    }
}

// 筛选器事件
document.addEventListener('change', function(e) {
    if (e.target.id === 'resource-lanmu-filter') renderResourceCards?.();
    else if (e.target.id === 'app-lanmu-filter') renderAppCards?.();
});

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    initTooltip();
    initRealtimeListeners();
});