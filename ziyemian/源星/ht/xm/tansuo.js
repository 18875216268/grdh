// ==================== 探索管理模块 ====================

function renderTansuoCards() {
    const grid = document.getElementById('tansuoCardsGrid');
    
    if (Object.keys(currentTansuoData).length === 0) {
        grid.innerHTML = '<div class="empty-card">暂无探索数据</div>';
        return;
    }
    
    const allData = Object.entries(currentTansuoData).map(([id, item]) => ({ id, ...item }));
    allData.sort((a, b) => new Date(b.riqi || 0) - new Date(a.riqi || 0));
    
    grid.innerHTML = allData.map(data => createCard(data, 'tansuo')).join('');
}