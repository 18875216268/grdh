// ==================== 状态管理模块 ====================

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
    grid.innerHTML = allResources.map(data => createCard(data, 'audit')).join('');
}

// 切换资源显示状态
async function toggleResourceDisplay(id, lanmu) {
    try {
        const resource = currentLanmuData[lanmu]?.neirong?.[id];
        if (!resource) {
            showToast('资源不存在', 'error');
            return;
        }
        
        const newStatus = resource.shenhe === '已审核' ? '未审核' : '已审核';
        
        await database.ref(`lanmu/${lanmu}/neirong/${id}/shenhe`).set(newStatus);
        showToast('显示状态更新成功', 'success');
    } catch (error) {
        console.error('更新显示状态失败:', error);
        showToast('更新失败', 'error');
    }
}

// 切换资源有效状态
async function toggleResourceStatus(id, lanmu) {
    try {
        const resource = currentLanmuData[lanmu]?.neirong?.[id];
        if (!resource) {
            showToast('资源不存在', 'error');
            return;
        }
        
        const newStatus = resource.zhuangtai === '有效' ? '无效' : '有效';
        
        await database.ref(`lanmu/${lanmu}/neirong/${id}/zhuangtai`).set(newStatus);
        showToast('有效状态更新成功', 'success');
    } catch (error) {
        console.error('更新有效状态失败:', error);
        showToast('更新失败', 'error');
    }
}