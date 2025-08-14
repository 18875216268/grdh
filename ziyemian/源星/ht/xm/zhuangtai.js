// ==================== 状态管理模块 ====================

// 渲染状态管理卡片
function renderAuditCards() {
    const grid = document.getElementById('auditCardsGrid');
    if (!grid) return;
    
    const filterType = document.getElementById('audit-type-filter')?.value || '';
    
    // 收集所有数据
    const allData = [];
    
    // 收集资源数据
    if (!filterType || filterType === 'resource') {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.neirong) {
                Object.entries(lanmuData.neirong).forEach(([id, resource]) => {
                    allData.push({
                        ...resource,
                        id,
                        lanmu: lanmuName,
                        dataType: 'resource',
                        sortDate: resource.shijian,
                        // 确保有状态字段
                        shenhe: resource.shenhe || '已审核',
                        zhuangtai: resource.zhuangtai || '有效'
                    });
                });
            }
        }
    }
    
    // 收集应用数据
    if (!filterType || filterType === 'app') {
        for (const [lanmuName, lanmuData] of Object.entries(currentLanmuData)) {
            if (lanmuData.app) {
                Object.entries(lanmuData.app).forEach(([appName, appVersions]) => {
                    Object.entries(appVersions).forEach(([id, appData]) => {
                        allData.push({
                            ...appData,
                            id,
                            lanmu: lanmuName,
                            appName,
                            dataType: 'app',
                            sortDate: appData.riqi,
                            // 转换字段名以匹配资源卡片格式
                            mingcheng: appData.mingc,
                            url: appData.url,
                            shijian: appData.riqi,
                            yuanshuliang: appData.wangpan,
                            fuzhishu: appData.yihuoqu,
                            // 确保有状态字段
                            shenhe: appData.shenhe || '已审核',
                            zhuangtai: appData.zhuangtai || '有效'
                        });
                    });
                });
            }
        }
    }
    
    // 收集探索数据
    if (!filterType || filterType === 'tansuo') {
        Object.entries(currentTansuoData).forEach(([id, tansuoData]) => {
            allData.push({
                ...tansuoData,
                id,
                dataType: 'tansuo',
                sortDate: tansuoData.riqi,
                // 转换字段名以匹配资源卡片格式
                url: tansuoData.wangzhi,
                shijian: tansuoData.riqi,
                yuanshuliang: '',
                fuzhishu: '',
                yingyong: tansuoData.miaoshu,
                // 确保有状态字段
                shenhe: tansuoData.shenhe || '已审核',
                zhuangtai: tansuoData.zhuangtai || '有效'
            });
        });
    }
    
    // 按日期排序
    allData.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
    
    // 渲染卡片
    if (allData.length === 0) {
        grid.innerHTML = '<div class="empty-card">暂无数据</div>';
    } else {
        grid.innerHTML = allData.map(data => createCard(data, 'audit')).join('');
    }
}

// 切换显示状态
async function toggleResourceDisplay(id, lanmu, type) {
    try {
        let ref;
        if (type === 'resource') {
            ref = database.ref(`lanmu/${lanmu}/neirong/${id}/shenhe`);
        } else if (type === 'app') {
            // 找到应用的完整路径
            for (const [appName, appVersions] of Object.entries(currentLanmuData[lanmu]?.app || {})) {
                if (appVersions[id]) {
                    ref = database.ref(`lanmu/${lanmu}/app/${appName}/${id}/shenhe`);
                    break;
                }
            }
        } else if (type === 'tansuo') {
            ref = database.ref(`tansuo/${id}/shenhe`);
        }
        
        if (!ref) {
            throw new Error('找不到数据路径');
        }
        
        const snapshot = await ref.once('value');
        const currentStatus = snapshot.val() || '已审核';
        const newStatus = currentStatus === '已审核' ? '未审核' : '已审核';
        
        await ref.set(newStatus);
        showToast(`已切换为${newStatus === '已审核' ? '显示' : '隐藏'}状态`, 'success');
    } catch (error) {
        console.error('切换显示状态失败:', error);
        showToast('操作失败，请重试', 'error');
    }
}

// 切换有效状态
async function toggleResourceStatus(id, lanmu, type) {
    try {
        let ref;
        if (type === 'resource') {
            ref = database.ref(`lanmu/${lanmu}/neirong/${id}/zhuangtai`);
        } else if (type === 'app') {
            // 找到应用的完整路径
            for (const [appName, appVersions] of Object.entries(currentLanmuData[lanmu]?.app || {})) {
                if (appVersions[id]) {
                    ref = database.ref(`lanmu/${lanmu}/app/${appName}/${id}/zhuangtai`);
                    break;
                }
            }
        } else if (type === 'tansuo') {
            ref = database.ref(`tansuo/${id}/zhuangtai`);
        }
        
        if (!ref) {
            throw new Error('找不到数据路径');
        }
        
        const snapshot = await ref.once('value');
        const currentStatus = snapshot.val() || '有效';
        const newStatus = currentStatus === '有效' ? '无效' : '有效';
        
        await ref.set(newStatus);
        showToast(`已切换为${newStatus}状态`, 'success');
    } catch (error) {
        console.error('切换状态失败:', error);
        showToast('操作失败，请重试', 'error');
    }
}