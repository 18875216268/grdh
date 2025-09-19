// 下载模块 - 全面更新版（v1.06）- 统一使用name字段
const XiazaiModule = (function() {
    
    function init() {
        createButton();
    }
    
    function createButton() {
        const btn = document.createElement('div');
        btn.className = 'action-btn xiazai-btn';
        btn.innerHTML = '<i class="fas fa-download"></i>';
        btn.title = '下载Excel';
        btn.onclick = handleDownload;
        document.body.appendChild(btn);
    }
    
    function handleDownload() {
        // 检查是否有数据
        if (!globalData || Object.keys(globalData).length === 0) {
            window.showToast('没有数据可下载', 'warning');
            return;
        }
        
        try {
            // 直接从表格模块获取当前可见字段（原始字段名，已按顺序排列）
            const visibleFields = TableModule.getVisibleFields();
            
            if (visibleFields.length === 0) {
                window.showToast('没有可见字段', 'warning');
                return;
            }
            
            // 构建导出数据（按字段顺序和负责人顺序排列）
            const data = buildExportData(visibleFields);
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // 设置列宽
            const colWidths = visibleFields.map(field => {
                if (field === 'name') return { wch: 12 };
                return { wch: 15 };
            });
            ws['!cols'] = colWidths;
            
            // 不设置任何数字格式，保留原始数据
            
            XLSX.utils.book_append_sheet(wb, ws, '业绩数据');
            
            // 生成文件名
            const date = new Date();
            const filename = `业绩数据_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}_${date.getHours()}${date.getMinutes()}.xlsx`;
            
            XLSX.writeFile(wb, filename);
            window.showToast('下载成功', 'success');
            
        } catch (error) {
            window.showToast('下载失败: ' + error.message, 'error');
        }
    }
    
    // 移除冗余函数，直接使用TableModule.getVisibleFields()
    
    // 统一使用name字段，移除特殊处理
    function getFieldValue(personData, field) {
        if (field === 'name') {
            return personData.name;
        }
        return personData.jieguo ? personData.jieguo[field] : undefined;
    }
    
    // 按负责人order排序
    function sortPersonsByOrder(fuzerenData) {
        return Object.entries(fuzerenData).sort((a, b) => {
            const orderA = a[1].order || 999999;
            const orderB = b[1].order || 999999;
            return orderA - orderB;
        });
    }
    
    function buildExportData(fields) {
        const data = [];
        
        // 添加表头行 - 显示层映射：name字段显示为"负责人"
        const headers = fields.map(field => field === 'name' ? '负责人' : field);
        data.push(headers);
        
        // 按负责人order排序，与表格显示保持一致
        const sortedEntries = sortPersonsByOrder(globalData);
        
        // 添加数据行
        sortedEntries.forEach(([operatorId, personData]) => {
            const row = [];
            
            fields.forEach(field => {
                // 使用统一的数据获取方式
                const value = getFieldValue(personData, field);
                
                // 保持原始数据，不做任何格式化处理
                if (value === undefined || value === null) {
                    row.push('');
                } else {
                    // 完全保留原始数据类型和值
                    row.push(value);
                }
            });
            
            data.push(row);
        });
        
        return data;
    }
    
    return { init };
})();