// 表格控制模块 - 全面更新版（v1.06）- 统一使用name字段，显示层映射为负责人
const TableModule = (function() {
    let fieldOrder = {};
    let fieldStatus = {};
    let currentFuzerenData = null;
    let isFirstLoad = true; // 标记是否为首次加载
    
    // 格式化数字
    function formatNumber(num, fieldName) {
        if (typeof num !== 'number' || num === 0) return num === 0 ? '0' : num;
        
        if (fieldName?.includes('率')) {
            return (num * 100).toFixed(2) + '%';
        }
        
        return num >= 10000 ? (num / 10000).toFixed(2) + '万' : num.toFixed(2);
    }
    
    // 统一排序函数 - 按顺序值从小到大
    function sortByOrder(items, orderMapping, keyExtractor = item => item) {
        return items.sort((a, b) => {
            const keyA = keyExtractor(a);
            const keyB = keyExtractor(b);
            return (orderMapping[keyA] || 999999) - (orderMapping[keyB] || 999999);
        });
    }
    
    // 设置字段顺序
    function setFieldOrder(order) {
        fieldOrder = order || {};
        if (currentFuzerenData) updateTable(currentFuzerenData);
    }
    
    // 设置字段状态
    function setFieldStatus(status) {
        fieldStatus = status || {};
        if (currentFuzerenData) updateTable(currentFuzerenData);
    }
    
    // 获取可见字段并排序
    function getVisibleFields() {
        const allFields = FirebaseModule.extractAllFields(currentFuzerenData);
        const visibleFields = allFields.filter(field => fieldStatus[field] === 1);
        return sortByOrder(visibleFields, fieldOrder);
    }
    
    // 按负责人order排序
    function sortPersonsByOrder(fuzerenData) {
        return Object.entries(fuzerenData).sort((a, b) => {
            const orderA = a[1].order || 999999;
            const orderB = b[1].order || 999999;
            return orderA - orderB;
        });
    }
    
    // 设置表格尺寸
    function setTableDimensions() {
        const wrapper = document.querySelector('.table-wrapper');
        const table = document.getElementById('dataTable');
        if (!wrapper || !table) return;
        
        const visibleFields = getVisibleFields();
        const { offsetHeight: wrapperHeight, offsetWidth: wrapperWidth } = wrapper;
        const rowHeight = Math.floor(wrapperHeight / 12);
        
        // 计算列宽和表格宽度
        const isFullWidth = visibleFields.length <= 8;
        const colWidth = Math.floor(wrapperWidth / (isFullWidth ? visibleFields.length : 8));
        const tableWidth = isFullWidth ? '100%' : `${colWidth * visibleFields.length}px`;
        
        // 设置样式
        table.style.cssText = `width: ${tableWidth}; min-width: ${tableWidth};`;
        
        const cells = table.querySelectorAll('th, td');
        const cellStyle = `height: ${rowHeight}px; width: ${colWidth}px; min-width: ${colWidth}px; max-width: ${colWidth}px;`;
        cells.forEach(cell => cell.style.cssText += cellStyle);
        
        // 设置滚动
        const tableScroll = document.getElementById('tableScroll');
        if (tableScroll) {
            tableScroll.style.overflowX = isFullWidth ? 'hidden' : 'auto';
        }
    }
    
    // 创建单元格
    function createCell(value, field) {
        const td = document.createElement('td');
        
        if (field === 'name') {
            td.className = 'name-cell';
            td.textContent = value || '未知';
        } else if (typeof value === 'number') {
            const className = 'number-cell' + (value > 0 ? ' positive' : value < 0 ? ' negative' : '');
            td.className = className;
            td.textContent = formatNumber(value, field);
        } else {
            td.textContent = value || '-';
        }
        
        return td;
    }
    
    // 从负责人数据中获取字段值 - 统一使用name字段
    function getFieldValue(personData, field) {
        if (field === 'name') {
            return personData.name;
        }
        return personData.jieguo ? personData.jieguo[field] : undefined;
    }
    
    // 更新表格
    function updateTable(fuzerenData) {
        currentFuzerenData = fuzerenData;
        const tableScroll = document.getElementById('tableScroll');
        
        if (!fuzerenData || Object.keys(fuzerenData).length === 0) {
            tableScroll.innerHTML = `
                <div class="empty-state">
                    <div class="icon"><i class="fas fa-inbox"></i></div>
                    <h3>暂无数据</h3>
                    <p>请先运行业绩统计程序生成数据</p>
                </div>
            `;
            return;
        }
        
        // 确保表格存在
        if (!tableScroll.querySelector('.data-table')) {
            tableScroll.innerHTML = `
                <table class="data-table" id="dataTable">
                    <thead id="tableHead"></thead>
                    <tbody id="tableBody"></tbody>
                </table>
            `;
        }
        
        // 获取可见字段
        const visibleFields = getVisibleFields();
        
        // 创建表头 - 关键修改：确保name字段显示为"负责人"
        const tableHead = document.getElementById('tableHead');
        const headerRow = document.createElement('tr');
        visibleFields.forEach(field => {
            const th = document.createElement('th');
            // 显示层映射：name字段显示为"负责人"，其他字段保持原名
            th.textContent = field === 'name' ? '负责人' : field;
            headerRow.appendChild(th);
        });
        tableHead.innerHTML = '';
        tableHead.appendChild(headerRow);
        
        // 创建表体 - 按order排序
        const tableBody = document.getElementById('tableBody');
        const fragment = document.createDocumentFragment();
        
        // 按负责人order排序（而不是姓名）
        const sortedEntries = sortPersonsByOrder(fuzerenData);
        
        sortedEntries.forEach(([operatorId, personData]) => {
            const row = document.createElement('tr');
            row.id = `row-${operatorId}`;
            
            visibleFields.forEach(field => {
                const value = getFieldValue(personData, field);
                row.appendChild(createCell(value, field));
            });
            
            fragment.appendChild(row);
        });
        
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
        
        setTableDimensions();
        
        // 首次数据加载完成后隐藏加载特效
        if (isFirstLoad && typeof window.LoadingController !== 'undefined') {
            isFirstLoad = false;
            // 稍微延迟一下，确保表格渲染完成
            setTimeout(() => {
                window.LoadingController.hide();
            }, 300);
        }
    }
    
    // 移除行
    function removeRow(operatorId) {
        const row = document.getElementById(`row-${operatorId}`);
        if (row) row.remove();
    }
    
    return {
        updateTable,
        removeRow,
        setTableDimensions,
        setFieldOrder,
        setFieldStatus,
        getVisibleFields  // 暴露获取可见字段的方法
    };
})();