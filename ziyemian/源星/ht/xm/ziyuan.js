// ==================== 资源管理模块 ====================

// 处理URL，确保可以正常访问
function formatUrl(url) {
    if (!url) return '';
    
    // 如果没有协议前缀，添加 https://
    if (!url.match(/^https?:\/\//)) {
        return `https://${url}`;
    }
    return url;
}

function renderResourceCards() {
    const selectedLanmu = document.getElementById('resource-lanmu-filter').value;
    const grid = document.getElementById('resourceCardsGrid');
    
    let allData = [];
    
    if (selectedLanmu) {
        const lanmuData = currentLanmuData[selectedLanmu];
        if (lanmuData && lanmuData.neirong) {
            allData = Object.entries(lanmuData.neirong).map(([id, item]) => ({
                id, lanmu: selectedLanmu, ...item
            }));
        }
    } else {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.neirong) {
                Object.entries(lanmuData.neirong).forEach(([id, item]) => {
                    allData.push({ id, lanmu: lanmuName, ...item });
                });
            }
        }
    }
    
    if (allData.length === 0) {
        grid.innerHTML = `<div class="empty-card">${selectedLanmu ? '该栏目暂无资源' : '暂无资源'}</div>`;
        return;
    }
    
    allData.sort((a, b) => new Date(b.shijian || 0) - new Date(a.shijian || 0));
    grid.innerHTML = allData.map(createResourceCard).join('');
}

function createResourceCard(resource) {
    // 处理URL
    const formattedUrl = formatUrl(resource.url);
    
    // 状态圆点类名
    const statusDotClass = resource.zhuangtai === '有效' ? 'valid' : 'invalid';
    
    return `
        <div class="content-card" data-id="${resource.id}" data-type="resource" data-lanmu="${resource.lanmu}">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="status-dot ${statusDotClass}">●</span>
                        <span class="resource-title">${resource.mingcheng}</span>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn-small action-edit" data-action="edit" data-id="${resource.id}" data-type="resource">编辑</button>
                        <button class="action-btn-small action-delete" data-action="delete" data-id="${resource.id}" data-type="resource">删除</button>
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
                    ${resource.yingyong || '通用'}|源数量：${resource.yuanshuliang || '未知'}|已复制：${resource.fuzhishu || '0'}
                </div>
            </div>
        </div>
    `;
}