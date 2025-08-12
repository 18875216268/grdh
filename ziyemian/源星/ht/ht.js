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

// ==================== 工具函数 ====================
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

function formatUrl(url) {
    if (!url) return '';
    return url.match(/^https?:\/\//) ? url : `https://${url}`;
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

// ==================== 悬浮提示 ====================
function initTooltip() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'resource-tooltip';
        document.body.appendChild(tooltipElement);
    }
}

function showTooltip(element, content) {
    if (!tooltipElement) initTooltip();
    
    tooltipElement.innerHTML = content;
    const rect = element.getBoundingClientRect();
    const tooltipHeight = 100;
    
    tooltipElement.style.left = rect.left + 'px';
    tooltipElement.style.top = (rect.top - tooltipHeight - 10) + 'px';
    tooltipElement.classList.add('show');
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.classList.remove('show');
    }
}

// ==================== 通用卡片渲染函数 ====================
function createCard(data, type) {
    const formattedUrl = formatUrl(data.url || data.wangzhi);
    const contributor = data.tougaoren || '匿名';
    
    let metaContent, statsContent, titleRow, actions;
    
    if (type === 'resource' || type === 'audit') {
        const statusDotClass = data.zhuangtai === '有效' ? 'valid' : 'invalid';
        metaContent = `${data.lanmu} | ${formatDate(data.shijian)} | by ${contributor}`;
        statsContent = `${data.yingyong || '通用'}|源数量：${data.yuanshuliang || '未知'}|已复制：${data.fuzhishu || '0'}`;
        
        titleRow = type === 'resource' 
            ? `<span class="status-dot ${statusDotClass}">●</span><span class="resource-title">${data.mingcheng}</span>`
            : `<span class="resource-title">${data.mingcheng}</span>`;
        
        if (type === 'audit') {
            const displayText = data.shenhe === '已审核' ? '已显示' : '已隐藏';
            const displayClass = data.shenhe === '已审核' ? 'action-edit' : 'action-delete';
            const statusText = data.zhuangtai === '有效' ? '有效' : '无效';
            const statusClass = data.zhuangtai === '有效' ? 'action-edit' : 'action-delete';
            
            actions = `
                <button class="action-btn-small ${displayClass}" data-action="toggle-display" data-id="${data.id}" data-lanmu="${data.lanmu}">${displayText}</button>
                <button class="action-btn-small ${statusClass}" data-action="toggle-status" data-id="${data.id}" data-lanmu="${data.lanmu}">${statusText}</button>
            `;
        } else {
            actions = `
                <button class="action-btn-small action-edit" data-action="edit" data-id="${data.id}" data-type="${type}">编辑</button>
                <button class="action-btn-small action-delete" data-action="delete" data-id="${data.id}" data-type="${type}">删除</button>
            `;
        }
    } else if (type === 'app') {
        metaContent = `${data.lanmu} | ${formatDate(data.riqi)} | by ${contributor}`;
        statsContent = `${data.appName || '应用'}|${data.wangpan || '其它'}|已获取：${data.yihuoqu || '0'}`;
        titleRow = `<span class="resource-title">${data.mingc}</span>`;
        actions = `
            <button class="action-btn-small action-edit" data-action="edit" data-id="${data.id}" data-type="${type}">编辑</button>
            <button class="action-btn-small action-delete" data-action="delete" data-id="${data.id}" data-type="${type}">删除</button>
        `;
    } else if (type === 'tansuo') {
        metaContent = `${formatDate(data.riqi)} | by ${contributor}`;
        statsContent = data.miaoshu || '暂无描述';
        titleRow = `<span class="resource-title">${data.mingcheng}</span>`;
        actions = `
            <button class="action-btn-small action-edit" data-action="edit" data-id="${data.id}" data-type="${type}">编辑</button>
            <button class="action-btn-small action-delete" data-action="delete" data-id="${data.id}" data-type="${type}">删除</button>
        `;
    }
    
    const tooltipContent = `
        <div class="tooltip-line">
            <span class="tooltip-label">标题</span>
            ${data.mingcheng || data.mingc}
        </div>
        <div class="tooltip-line">
            <span class="tooltip-label">信息</span>
            ${metaContent}
        </div>
        <div class="tooltip-line">
            <span class="tooltip-label">${type === 'tansuo' ? '描述' : '统计'}</span>
            ${statsContent}
        </div>
    `;
    
    return `
        <div class="content-card" data-id="${data.id}" data-type="${type}" ${data.lanmu ? `data-lanmu="${data.lanmu}"` : ''}>
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        ${titleRow}
                        <div class="resource-tooltip">${tooltipContent}</div>
                    </div>
                    <div class="resource-actions">${actions}</div>
                </div>
                
                <div class="resource-meta">
                    ${data.lanmu ? `<span class="resource-tag">${data.lanmu}</span>` : ''}
                    <span>${formatDate(data.shijian || data.riqi)}</span>
                    <span>by ${contributor}</span>
                </div>
                
                <div class="resource-url">
                    <a href="${formattedUrl}" target="_blank">${data.url || data.wangzhi}</a>
                </div>
                
                <div class="${type === 'tansuo' ? 'tansuo-description' : 'resource-stats'}">
                    ${statsContent}
                </div>
            </div>
        </div>
    `;
}

// ==================== 数据查找函数 ====================
function findResourceData(id, type) {
    if (type === 'resource') {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.neirong?.[id]) {
                return { id, lanmu: lanmuName, ...lanmuData.neirong[id] };
            }
        }
    } else if (type === 'app') {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.app) {
                for (const [appName, appVersions] of Object.entries(lanmuData.app)) {
                    if (appVersions[id]) {
                        return { id, lanmu: lanmuName, appName, ...appVersions[id] };
                    }
                }
            }
        }
    } else if (type === 'tansuo') {
        if (currentTansuoData[id]) {
            return { id, ...currentTansuoData[id] };
        }
    }
    return null;
}

// ==================== 实时监听器 ====================
function initRealtimeListeners() {
    database.ref('lanmu').on('value', (snapshot) => {
        currentLanmuData = snapshot.val() || {};
        updateLanmuSelectors();
        
        const currentSection = document.querySelector('.admin-nav-item.active')?.dataset.section;
        const renderFunctions = {
            'lanmu': renderLanmuCards,
            'resources': renderResourceCards,
            'apps': renderAppCards,
            'audit': renderAuditCards
        };
        renderFunctions[currentSection]?.();
    });
    
    database.ref('tansuo').on('value', (snapshot) => {
        currentTansuoData = snapshot.val() || {};
        
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

// ==================== 页面导航 ====================
const sectionHandlers = {
    'lanmu': () => renderLanmuCards?.(),
    'resources': () => renderResourceCards?.(),
    'apps': () => renderAppCards?.(),
    'tansuo': () => renderTansuoCards?.(),
    'audit': () => renderAuditCards?.()
};

function switchSection(section) {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = sec.id === `${section}-section` ? 'block' : 'none';
    });

    sectionHandlers[section]?.();
}

// ==================== 事件处理 ====================
function handleEdit(id, type) {
    const data = findResourceData(id, type);
    if (data) {
        showEditModal(type, data);
    }
}

async function handleDelete(id, type) {
    try {
        if (type === 'lanmu') {
            await database.ref(`lanmu/${id}`).remove();
        } else if (type === 'resource') {
            for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
                if (lanmuData.neirong?.[id]) {
                    await database.ref(`lanmu/${lanmuName}/neirong/${id}`).remove();
                    break;
                }
            }
        } else if (type === 'app') {
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

// ==================== 统一事件监听 ====================
document.addEventListener('click', function(e) {
    const target = e.target;
    
    const navItem = target.closest('.admin-nav-item');
    if (navItem) {
        switchSection(navItem.dataset.section);
        return;
    }
    
    if (target.dataset.add) {
        showEditModal(target.dataset.add);
        return;
    }
    
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

document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('resource-title')) {
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

document.addEventListener('change', function(e) {
    if (e.target.id === 'resource-lanmu-filter') renderResourceCards?.();
    else if (e.target.id === 'app-lanmu-filter') renderAppCards?.();
});

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initTooltip();
    initRealtimeListeners();
});