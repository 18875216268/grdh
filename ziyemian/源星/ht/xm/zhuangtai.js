// ==================== 状态管理模块 ====================

// 处理URL，确保可以正常访问
function formatUrl(url) {
    if (!url) return '';
    
    // 如果没有协议前缀，添加 https://
    if (!url.match(/^https?:\/\//)) {
        return `https://${url}`;
    }
    return url;
}

function renderAuditCards() {
    database.ref('lanmu').once('value').then(snapshot => {
        const lanmuData = snapshot.val() || {};
        const grid = document.getElementById('auditCardsGrid');
        
        let allResources = [];
        for (const [lanmuName, lanmu] of Object.entries(lanmuData)) {
            const resources = lanmu.neirong || {};
            Object.entries(resources).forEach(([id, resource]) => {
                allResources.push({ id, lanmu: lanmuName, ...resource });
            });
        }
        
        if (allResources.length === 0) {
            grid.innerHTML = '<div class="empty-card">暂无资源数据</div>';
            return;
        }
        
        allResources.sort((a, b) => new Date(b.shijian || 0) - new Date(a.shijian || 0));
        grid.innerHTML = allResources.map(createAuditCard).join('');
    });
}

function createAuditCard(resource) {
    // 处理URL
    const formattedUrl = formatUrl(resource.url);
    
    // 显示/隐藏按钮逻辑
    const displayText = resource.shenhe === '已审核' ? '已显示' : '已隐藏';
    const displayClass = resource.shenhe === '已审核' ? 'action-edit' : 'action-delete';
    
    // 有效/无效按钮逻辑
    const statusText = resource.zhuangtai === '有效' ? '有效' : '无效';
    const statusClass = resource.zhuangtai === '有效' ? 'action-edit' : 'action-delete';
    
    return `
        <div class="content-card" data-id="${resource.id}" data-type="audit" data-lanmu="${resource.lanmu}">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="resource-title">${resource.mingcheng}</span>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn-small ${displayClass}" data-action="toggle-display" data-id="${resource.id}" data-lanmu="${resource.lanmu}" data-current-status="${resource.shenhe}">${displayText}</button>
                        <button class="action-btn-small ${statusClass}" data-action="toggle-status" data-id="${resource.id}" data-lanmu="${resource.lanmu}" data-current-status="${resource.zhuangtai}">${statusText}</button>
                    </div>
                </div>
                
                <div class="resource-meta">
                    <span class="resource-tag">${resource.lanmu}</span>
                    <span>${formatDate(resource.shijian)}</span>
                    <span>by ${resource.tougaoren || '匿名'}</span>
                </div>
                
                <div class="resource-url">
                    <a href="${formattedUrl}" target="_blank">${resource.url}</a>
                </div>
                
                <div class="resource-stats">
                    ${resource.yingyong || '通用'}|源数量：${resource.yuanshuliang || '0'}|已复制：${resource.fuzhishu || '0'}
                </div>
            </div>
        </div>
    `;
}

async function toggleResourceDisplay(id, lanmu) {
    const button = document.querySelector(`[data-action="toggle-display"][data-id="${id}"]`);
    if (!button) return;
    
    // 获取当前状态
    const currentStatus = button.dataset.currentStatus;
    const newStatus = currentStatus === '已审核' ? '未审核' : '已审核';
    const newText = newStatus === '已审核' ? '已显示' : '已隐藏';
    const newClass = newStatus === '已审核' ? 'action-edit' : 'action-delete';
    const oldClass = currentStatus === '已审核' ? 'action-edit' : 'action-delete';
    
    // 立即更新UI
    button.textContent = newText;
    button.classList.remove(oldClass);
    button.classList.add(newClass);
    button.dataset.currentStatus = newStatus;
    
    try {
        // 异步更新数据库
        const resourceRef = database.ref(`lanmu/${lanmu}/neirong/${id}`);
        await resourceRef.child('shenhe').set(newStatus);
        showToast('状态更新成功', 'success');
    } catch (error) {
        console.error('更新显示状态失败:', error);
        showToast('更新失败', 'error');
        
        // 回滚UI状态
        button.textContent = currentStatus === '已审核' ? '已显示' : '已隐藏';
        button.classList.remove(newClass);
        button.classList.add(oldClass);
        button.dataset.currentStatus = currentStatus;
    }
}

async function toggleResourceStatus(id, lanmu) {
    const button = document.querySelector(`[data-action="toggle-status"][data-id="${id}"]`);
    if (!button) return;
    
    // 获取当前状态
    const currentStatus = button.dataset.currentStatus;
    const newStatus = currentStatus === '有效' ? '无效' : '有效';
    const newText = newStatus === '有效' ? '有效' : '无效';
    const newClass = newStatus === '有效' ? 'action-edit' : 'action-delete';
    const oldClass = currentStatus === '有效' ? 'action-edit' : 'action-delete';
    
    // 立即更新UI
    button.textContent = newText;
    button.classList.remove(oldClass);
    button.classList.add(newClass);
    button.dataset.currentStatus = newStatus;
    
    try {
        // 异步更新数据库
        const resourceRef = database.ref(`lanmu/${lanmu}/neirong/${id}`);
        await resourceRef.child('zhuangtai').set(newStatus);
        showToast('状态更新成功', 'success');
    } catch (error) {
        console.error('更新有效状态失败:', error);
        showToast('更新失败', 'error');
        
        // 回滚UI状态
        button.textContent = currentStatus === '有效' ? '有效' : '无效';
        button.classList.remove(newClass);
        button.classList.add(oldClass);
        button.dataset.currentStatus = currentStatus;
    }
}