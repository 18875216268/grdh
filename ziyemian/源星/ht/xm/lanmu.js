// ==================== 栏目管理模块 ====================

// 50个常用emoji图标
const emojiIcons = [
    '📂', '📁', '📄', '📱', '🎬', '📖', '🎨', '🎵', '📢', '📌',
    '🏠', '🎮', '🎯', '🎪', '🎭', '🎸', '🎹', '🎤', '🎧', '📻',
    '📺', '📷', '📹', '💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '📀',
    '🔍', '🔎', '💡', '🔦', '📡', '🔌', '🔋', '⚡', '🌐', '🌍',
    '🚀', '✈️', '🚗', '🚕', '🚙', '🏆', '🥇', '⭐', '🌟', '✨'
];

let selectedIcon = '📂';
let draggedCard = null;

// DOM元素缓存
const elements = {
    get grid() { return document.getElementById('lanmuCardsGrid'); },
    get nameInput() { return document.getElementById('lanmuName'); },
    get appInput() { return document.getElementById('lanmuApps'); },
    get modalTitle() { return document.getElementById('modalTitle'); },
    get iconGrid() { return document.getElementById('iconGrid'); }
};

// 统计资源数据 - 改为统计无效资源
function calculateStats(lanmu) {
    const resources = lanmu.neirong || {};
    const resourceValues = Object.values(resources);
    
    return {
        total: Object.keys(resources).length,
        invalid: resourceValues.filter(res => res.zhuangtai === '无效').length,
        unaudited: resourceValues.filter(res => res.shenhe === '未审核').length,
        apps: lanmu.applist ? lanmu.applist.split('|').filter(app => app.trim()).length : 0
    };
}

// 渲染栏目卡片
function renderLanmuCards() {
    const lanmuEntries = Object.entries(currentLanmuData);
    
    if (!lanmuEntries.length) {
        elements.grid.innerHTML = '<div class="empty-card">暂无栏目数据</div>';
        return;
    }

    // 按序号排序并渲染
    elements.grid.innerHTML = lanmuEntries
        .sort(([,a], [,b]) => (a.xuhao || 999999) - (b.xuhao || 999999))
        .map(([lanmuName, lanmu]) => {
            const stats = calculateStats(lanmu);
            const sequence = lanmu.xuhao || 999999;
            
            return `
                <div class="content-card draggable" draggable="true" data-id="${lanmuName}" data-type="lanmu" data-sequence="${sequence}">
                    <div class="card-display">
                        <div class="card-header">
                            <div class="card-title-with-icon">${lanmu.tubiao || '📂'}${lanmuName}</div>
                            <div class="card-sequence">${sequence}</div>
                        </div>
                        
                        <div class="resource-meta">
                            <span>${formatDate(lanmu.riqi) || '1990/1/1'}</span>
                        </div>
                        
                        <div class="card-stats-table">
                            <div class="stats-table-row stats-table-header">
                                <div class="stats-cell">资源</div>
                                <div class="stats-cell">应用</div>
                                <div class="stats-cell">未审</div>
                                <div class="stats-cell">无效</div>
                            </div>
                            <div class="stats-table-row stats-table-data">
                                <div class="stats-cell">${stats.total}</div>
                                <div class="stats-cell">${stats.apps}</div>
                                <div class="stats-cell">${stats.unaudited}</div>
                                <div class="stats-cell">${stats.invalid}</div>
                            </div>
                        </div>
                        
                        <div class="card-actions">
                            <button class="action-btn action-edit" data-action="edit" data-id="${lanmuName}" data-type="lanmu">编辑</button>
                            <button class="action-btn action-delete" data-action="delete" data-id="${lanmuName}" data-type="lanmu">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    // 初始化拖拽功能
    initCardDragAndDrop();
}

// 拖拽事件处理器
const dragHandlers = {
    dragstart(e) {
        draggedCard = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },
    
    dragover(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },
    
    drop(e) {
        e.stopPropagation();
        
        if (draggedCard && draggedCard !== this) {
            const allCards = Array.from(elements.grid.children);
            const draggedIndex = allCards.indexOf(draggedCard);
            const targetIndex = allCards.indexOf(this);
            
            // 重新排序DOM
            if (draggedIndex < targetIndex) {
                this.parentNode.insertBefore(draggedCard, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedCard, this);
            }
            
            saveCardOrder();
        }
    },
    
    dragend() {
        this.classList.remove('dragging');
        draggedCard = null;
    }
};

// 初始化卡片拖拽功能
function initCardDragAndDrop() {
    elements.grid.querySelectorAll('.draggable').forEach(card => {
        Object.entries(dragHandlers).forEach(([event, handler]) => {
            card.addEventListener(event, handler);
        });
    });
}

// 保存卡片顺序
async function saveCardOrder() {
    try {
        const cards = elements.grid.querySelectorAll('.draggable');
        const updates = {};
        
        // 批量更新序号
        cards.forEach((card, index) => {
            const newSequence = index + 1;
            updates[`lanmu/${card.dataset.id}/xuhao`] = newSequence;
            // 实时更新显示的序号
            card.querySelector('.card-sequence').textContent = newSequence;
        });
        
        await database.ref().update(updates);
        showToast('排序保存成功', 'success');
        loadLanmuData();
    } catch (error) {
        console.error('保存排序失败:', error);
        showToast('保存排序失败', 'error');
        loadLanmuData();
    }
}

// 图标选择功能
function initIconGrid() {
    elements.iconGrid.innerHTML = emojiIcons.map(icon => 
        `<div class="icon-item${icon === selectedIcon ? ' active' : ''}" onclick="selectIcon('${icon}', this)">${icon}</div>`
    ).join('');
}

function selectIcon(icon, element) {
    // 移除所有active类
    elements.iconGrid.querySelectorAll('.icon-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 添加active类并设置选中图标
    element.classList.add('active');
    selectedIcon = icon;
}

// 模态框操作
function showAddLanmuModal() {
    selectedIcon = '📂';
    showEditModal('lanmu');
}

function editLanmu(lanmuName) {
    const lanmu = currentLanmuData[lanmuName];
    const apps = lanmu.applist || '';
    
    selectedIcon = lanmu.tubiao || '📂';
    showEditModal('lanmu', {
        name: lanmuName,
        apps: apps,
        tubiao: selectedIcon,
        ...lanmu
    });
}

// 保存栏目 - 使用applist方式
async function saveLanmu() {
    const name = document.getElementById('lanmuName').value.trim();
    const apps = document.getElementById('lanmuApps').value.trim();
    const isEdit = currentEditData.name ? true : false;
    const oldName = currentEditData.name;

    if (!name) {
        showToast('请输入栏目名称', 'error');
        return;
    }

    try {
        const currentDate = new Date().toISOString().split('T')[0];
        let updates = {};
        
        if (isEdit && oldName) {
            if (oldName !== name) {
                const oldData = currentLanmuData[oldName] || {};
                updates[`lanmu/${name}`] = { 
                    ...oldData, 
                    tubiao: selectedIcon,
                    riqi: oldData.riqi || currentDate,
                    xuhao: oldData.xuhao || await getNextSequenceNumber(),
                    applist: apps
                };
                updates[`lanmu/${oldName}`] = null;
            } else {
                updates[`lanmu/${oldName}/tubiao`] = selectedIcon;
                updates[`lanmu/${oldName}/applist`] = apps;
                if (!currentLanmuData[oldName].riqi) {
                    updates[`lanmu/${oldName}/riqi`] = currentDate;
                }
                if (!currentLanmuData[oldName].xuhao) {
                    updates[`lanmu/${oldName}/xuhao`] = await getNextSequenceNumber();
                }
            }
        } else {
            updates[`lanmu/${name}`] = {
                tubiao: selectedIcon,
                riqi: currentDate,
                xuhao: await getNextSequenceNumber(),
                applist: apps
            };
        }
        
        await database.ref().update(updates);
        // 移除这两行，由tc.js统一处理
        // showToast('保存成功', 'success');  
        // closeModal();
        loadLanmuData();
    } catch (error) {
        console.error('保存栏目失败:', error);
        showToast('保存栏目失败', 'error');
    }
}

// 获取下一个序号 - 优化算法
async function getNextSequenceNumber() {
    try {
        const snapshot = await database.ref('lanmu').once('value');
        const data = snapshot.val() || {};
        
        return Math.max(0, ...Object.values(data)
            .map(lanmu => lanmu.xuhao)
            .filter(xuhao => typeof xuhao === 'number')) + 1;
    } catch (error) {
        console.error('获取序号失败:', error);
        return 1;
    }
}