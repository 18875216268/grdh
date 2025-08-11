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
    const grid = document.getElementById('tansuoCardsGrid');
    
    if (Object.keys(currentTansuoData).length === 0) {
        grid.innerHTML = '<div class="empty-card">暂无探索数据</div>';
        return;
    }
    
    const allData = Object.entries(currentTansuoData).map(([id, item]) => ({ id, ...item }));
    allData.sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0));
    
    grid.innerHTML = allData.map(createTansuoCard).join('');
}

function createTansuoCard(tansuo) {
    // 处理URL
    const formattedUrl = formatUrl(tansuo.wangzhi);
    
    // 获取投稿人，如果没有或为空则显示"匿名"
    const contributor = tansuo.tougaoren || '匿名';
    
    // 第二行完整内容
    const metaContent = `${formatDate(tansuo.riqi)} | by ${contributor}`;
    
    // 第四行完整内容（描述）
    const statsContent = tansuo.miaoshu || '暂无描述';
    
    return `
        <div class="content-card" data-id="${tansuo.id}" data-type="tansuo">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="resource-title">${tansuo.mingcheng}</span>
                        <div class="resource-tooltip">
                            <div class="tooltip-line">
                                <span class="tooltip-label">标题</span>
                                ${tansuo.mingcheng}
                            </div>
                            <div class="tooltip-line">
                                <span class="tooltip-label">信息</span>
                                ${metaContent}
                            </div>
                            <div class="tooltip-line">
                                <span class="tooltip-label">描述</span>
                                ${statsContent}
                            </div>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn-small action-edit" data-action="edit" data-id="${tansuo.id}" data-type="tansuo">编辑</button>
                        <button class="action-btn-small action-delete" data-action="delete" data-id="${tansuo.id}" data-type="tansuo">删除</button>
                    </div>
                </div>
                
                <div class="resource-meta">
                    <span>${formatDate(tansuo.riqi)}</span>
                    <span>by ${contributor}</span>
                </div>
                
                <div class="resource-url">
                    <a href="${formattedUrl}" target="_blank">${tansuo.wangzhi}</a>
                </div>
                
                <div class="tansuo-description">
                    ${statsContent}
                </div>
            </div>
        </div>
    `;
}