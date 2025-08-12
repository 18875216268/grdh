// ==================== 应用管理模块 ====================

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
    grid.innerHTML = allData.map(data => createCard(data, 'app')).join('');
}