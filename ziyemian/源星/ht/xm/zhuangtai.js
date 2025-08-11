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
    const grid = document.getElementById('auditCardsGrid');
    
    let allResources = [];
    for (const [lanmuName, lanmu] of Object.entries(currentLanmuData)) {
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
    
    // 第二行完整内容
    const metaContent = `${resource.lanmu} | ${formatDate(resource.shijian)} | by ${resource.tougaoren || '匿名'}`;
    
    // 第四行完整内容
    const statsContent = `${resource.yingyong || '通用'}|源数量：${resource.yuanshuliang || '0'}|已复制：${resource.fuzhishu || '0'}`;
    
    return `
        <div class="content-card" data-id="${resource.id}" data-type="audit" data-lanmu="${resource.lanmu}">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="resource-title">${resource.mingcheng}</span>
                        <div class="resource-tooltip">
                            <div class="tooltip-line">
                                <span class="tooltip-label">标题</span>
                                ${resource.mingcheng}
                            </div>
                            <div class="tooltip-line">
                                <span class="tooltip-label">信息</span>
                                ${metaContent}
                            </div>
                            <div class="tooltip-line">
                                <span class="tooltip-label">统计</span>
                                ${statsContent}
                            </div>
                        </div>
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
                    ${statsContent}
                </div>
            </div>
        </div>
    `;
}

// 切换资源显示状态 - 完全依赖监听器
async function toggleResourceDisplay(id, lanmu) {
    try {
        // 获取当前资源数据
        const resource = currentLanmuData[lanmu]?.neirong?.[id];
        if (!resource) {
            showToast('资源不存在', 'error');
            return;
        }
        
        // 切换状态
        const newStatus = resource.shenhe === '已审核' ? '未审核' : '已审核';
        
        // 更新数据库
        await database.ref(`lanmu/${lanmu}/neirong/${id}/shenhe`).set(newStatus);
        showToast('显示状态更新成功', 'success');
    } catch (error) {
        console.error('更新显示状态失败:', error);
        showToast('更新失败', 'error');
    }
}

// 切换资源有效状态 - 完全依赖监听器
async function toggleResourceStatus(id, lanmu) {
    try {
        // 获取当前资源数据
        const resource = currentLanmuData[lanmu]?.neirong?.[id];
        if (!resource) {
            showToast('资源不存在', 'error');
            return;
        }
        
        // 切换状态
        const newStatus = resource.zhuangtai === '有效' ? '无效' : '有效';
        
        // 更新数据库
        await database.ref(`lanmu/${lanmu}/neirong/${id}/zhuangtai`).set(newStatus);
        showToast('有效状态更新成功', 'success');
    } catch (error) {
        console.error('更新有效状态失败:', error);
        showToast('更新失败', 'error');
    }
}