// ==================== 探索管理模块 ====================

// 处理URL，确保可以正常访问
function formatUrl(url) {
    if (!url) return '';
    
    // 如果没有协议前缀，添加 https://
    if (!url.match(/^https?:\/\//)) {
        return `https://${url}`;
    }
    return url;
}

function renderTansuoCards() {
    database.ref('tansuo').once('value').then(snapshot => {
        const tansuoData = snapshot.val() || {};
        const grid = document.getElementById('tansuoCardsGrid');
        
        if (Object.keys(tansuoData).length === 0) {
            grid.innerHTML = '<div class="empty-card">暂无探索数据</div>';
            return;
        }
        
        const allData = Object.entries(tansuoData).map(([id, item]) => ({ id, ...item }));
        allData.sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0));
        
        grid.innerHTML = allData.map(createTansuoCard).join('');
    });
}

function createTansuoCard(tansuo) {
    // 处理URL
    const formattedUrl = formatUrl(tansuo.wangzhi);
    
    return `
        <div class="content-card" data-id="${tansuo.id}" data-type="tansuo">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="resource-title">${tansuo.mingcheng}</span>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn-small action-edit" data-action="edit" data-id="${tansuo.id}" data-type="tansuo">编辑</button>
                        <button class="action-btn-small action-delete" data-action="delete" data-id="${tansuo.id}" data-type="tansuo">删除</button>
                    </div>
                </div>
                
                <div class="resource-meta">
                    <span>${formatDate(tansuo.riqi)}</span>
                </div>
                
                <div class="resource-url">
                    <a href="${formattedUrl}" target="_blank">${tansuo.wangzhi}</a>
                </div>
                
                <div class="resource-stats">
                    ${tansuo.miaoshu || '暂无描述'}
                </div>
            </div>
        </div>
    `;
}