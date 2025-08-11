// ==================== 应用管理模块 ====================

// 处理URL，确保可以正常访问
function formatUrl(url) {
    if (!url) return '';
    
    // 如果没有协议前缀，添加 https://
    if (!url.match(/^https?:\/\//)) {
        return `https://${url}`;
    }
    return url;
}

function renderAppCards() {
    const selectedLanmu = document.getElementById('app-lanmu-filter').value;
    const grid = document.getElementById('appCardsGrid');
    
    let allData = [];
    
    if (selectedLanmu) {
        const lanmuData = currentLanmuData[selectedLanmu];
        if (lanmuData && lanmuData.app) {
            Object.keys(lanmuData.app).forEach(appName => {
                const appVersions = lanmuData.app[appName];
                Object.entries(appVersions).forEach(([versionId, version]) => {
                    allData.push({
                        id: versionId,
                        appName: appName,
                        lanmu: selectedLanmu,
                        ...version
                    });
                });
            });
        }
    } else {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.app) {
                Object.keys(lanmuData.app).forEach(appName => {
                    const appVersions = lanmuData.app[appName];
                    Object.entries(appVersions).forEach(([versionId, version]) => {
                        allData.push({
                            id: versionId,
                            appName: appName,
                            lanmu: lanmuName,
                            ...version
                        });
                    });
                });
            }
        }
    }
    
    if (allData.length === 0) {
        grid.innerHTML = `<div class="empty-card">${selectedLanmu ? '该栏目暂无应用' : '暂无应用'}</div>`;
        return;
    }
    
    allData.sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0));
    grid.innerHTML = allData.map(createAppCard).join('');
}

function createAppCard(app) {
    // 处理URL
    const formattedUrl = formatUrl(app.url);
    
    // 获取投稿人，如果没有或为空则显示"匿名"
    const contributor = app.tougaoren || '匿名';
    
    // 第二行完整内容
    const metaContent = `${app.lanmu} | ${formatDate(app.riqi)} | by ${contributor}`;
    
    // 第四行完整内容
    const statsContent = `${app.appName || '应用'}|${app.wangpan || '其它'}|已获取：${app.yihuoqu || '0'}`;
    
    return `
        <div class="content-card" data-id="${app.id}" data-type="app" data-lanmu="${app.lanmu}" data-app="${app.appName}">
            <div class="card-display">
                <div class="resource-header">
                    <div class="resource-title-row">
                        <span class="resource-title">${app.mingc}</span>
                        <div class="resource-tooltip">
                            <div class="tooltip-line">
                                <span class="tooltip-label">标题</span>
                                ${app.mingc}
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
                        <button class="action-btn-small action-edit" data-action="edit" data-id="${app.id}" data-type="app">编辑</button>
                        <button class="action-btn-small action-delete" data-action="delete" data-id="${app.id}" data-type="app">删除</button>
                    </div>
                </div>
                
                <div class="resource-meta">
                    <span class="resource-tag">${app.lanmu}</span>
                    <span>${formatDate(app.riqi)}</span>
                    <span>by ${contributor}</span>
                </div>
                
                <div class="resource-url">
                    <a href="${formattedUrl}" target="_blank">${app.url}</a>
                </div>
                
                <div class="resource-stats">
                    ${statsContent}
                </div>
            </div>
        </div>
    `;
}