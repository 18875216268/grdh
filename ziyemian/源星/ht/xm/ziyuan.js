// ==================== 资源管理模块 ====================

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
    grid.innerHTML = allData.map(data => createCard(data, 'resource')).join('');
}