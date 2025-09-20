// 表格控制模块 - 添加最小加载时间（v1.12）
const TableModule = (function() {
    let fieldOrder = {};
    let fieldStatus = {};
    let currentFuzerenData = null;
    let isFirstLoad = true;
    let database = null;
    let editingCell = null;
    let originalValue = null;
    let loadStartTime = Date.now(); // 记录加载开始时间
    
    // 格式化数字
    function formatNumber(num, fieldName) {
        if (typeof num !== 'number' || num === 0) return num === 0 ? '0' : num;
        
        if (fieldName?.includes('率')) {
            return (num * 100).toFixed(2) + '%';
        }
        
        return num >= 10000 ? (num / 10000).toFixed(2) + '万' : num.toFixed(2);
    }
    
    // 统一排序函数
    function sortByOrder(items, orderMapping, keyExtractor = item => item) {
        return items.sort((a, b) => {
            const keyA = keyExtractor(a);
            const keyB = keyExtractor(b);
            return (orderMapping[keyA] || 999999) - (orderMapping[keyB] || 999999);
        });
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
        
        const isFullWidth = visibleFields.length <= 8;
        const colWidth = Math.floor(wrapperWidth / (isFullWidth ? visibleFields.length : 8));
        const tableWidth = isFullWidth ? '100%' : `${colWidth * visibleFields.length}px`;
        
        table.style.cssText = `width: ${tableWidth}; min-width: ${tableWidth};`;
        
        const cells = table.querySelectorAll('th, td');
        const cellStyle = `height: ${rowHeight}px; width: ${colWidth}px; min-width: ${colWidth}px; max-width: ${colWidth}px;`;
        cells.forEach(cell => cell.style.cssText += cellStyle);
        
        const tableScroll = document.getElementById('tableScroll');
        if (tableScroll) {
            tableScroll.style.overflowX = isFullWidth ? 'hidden' : 'auto';
        }
    }
    
    // 创建可编辑输入框
    function createEditInput(cell, value, fieldName) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.style.cssText = `
            width: 100%;
            height: 100%;
            border: 2px solid #00ffcc;
            background: rgba(0, 255, 204, 0.1);
            color: #00ffcc;
            text-align: ${fieldName?.includes('率') || typeof value === 'number' ? 'right' : 'center'};
            padding: 0 5px;
            font-size: inherit;
            font-family: inherit;
            outline: none;
            box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
        `;
        
        return input;
    }
    
    // 启用单元格编辑
    function enableCellEdit(cell, operatorId, field) {
        if (editingCell || field === 'name') return;
        
        const personData = currentFuzerenData[operatorId];
        if (!personData) return;
        
        const value = personData.jieguo ? personData.jieguo[field] : undefined;
        originalValue = value;
        editingCell = { cell, operatorId, field };
        
        const originalHTML = cell.innerHTML;
        
        const input = createEditInput(cell, value, field);
        cell.innerHTML = '';
        cell.appendChild(input);
        
        input.focus();
        input.select();
        
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await saveEdit(input.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit(cell, originalHTML);
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (editingCell && editingCell.cell === cell) {
                    cancelEdit(cell, originalHTML);
                }
            }, 200);
        });
    }
    
    // 保存编辑
    async function saveEdit(inputValue) {
        if (!editingCell) return;
        
        const { cell, operatorId, field } = editingCell;
        const value = inputValue.trim();
        
        let parsedValue = value;
        if (value !== '' && !isNaN(value)) {
            parsedValue = parseFloat(value);
        }
        
        try {
            const updates = {};
            updates[`/fuzeren/${operatorId}/jieguo/${field}`] = value === '' ? null : parsedValue;
            updates['/peizhi/biaozhi'] = Math.random();
            
            await database.ref().update(updates);
            
            window.showToast('数据已更新', 'success');
            
            if (currentFuzerenData[operatorId]) {
                if (!currentFuzerenData[operatorId].jieguo) {
                    currentFuzerenData[operatorId].jieguo = {};
                }
                if (value === '') {
                    delete currentFuzerenData[operatorId].jieguo[field];
                } else {
                    currentFuzerenData[operatorId].jieguo[field] = parsedValue;
                }
            }
            
            cell.className = 'number-cell' + (parsedValue > 0 ? ' positive' : parsedValue < 0 ? ' negative' : '');
            cell.textContent = value === '' ? '-' : formatNumber(parsedValue, field);
            
        } catch (error) {
            window.showToast('保存失败: ' + error.message, 'error');
            cell.textContent = originalValue ? formatNumber(originalValue, field) : '-';
        }
        
        editingCell = null;
        originalValue = null;
    }
    
    // 取消编辑
    function cancelEdit(cell, originalHTML) {
        if (!editingCell || editingCell.cell !== cell) return;
        
        cell.innerHTML = originalHTML;
        editingCell = null;
        originalValue = null;
    }
    
    // 创建单元格
    function createCell(value, field, operatorId) {
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
        
        if (field !== 'name' && operatorId) {
            td.addEventListener('dblclick', () => {
                enableCellEdit(td, operatorId, field);
            });
            td.style.cursor = 'pointer';
        }
        
        return td;
    }
    
    // 获取字段值
    function getFieldValue(personData, field) {
        if (field === 'name') {
            return personData.name;
        }
        return personData.jieguo ? personData.jieguo[field] : undefined;
    }
    
    // 处理首次加载完成
    function handleFirstLoadComplete() {
        isFirstLoad = false;
        
        // 计算已经过去的时间
        const elapsedTime = Date.now() - loadStartTime;
        const minimumLoadTime = 5000; // 最小3秒
        const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);
        
        // 等待剩余时间后隐藏加载界面
        setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => overlay.remove(), 800);
            }
        }, remainingTime);
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
            // 即使无数据也要等待最小时间
            if (isFirstLoad) {
                handleFirstLoadComplete();
            }
            return;
        }
        
        if (!tableScroll.querySelector('.data-table')) {
            tableScroll.innerHTML = `
                <table class="data-table" id="dataTable">
                    <thead id="tableHead"></thead>
                    <tbody id="tableBody"></tbody>
                </table>
            `;
        }
        
        const visibleFields = getVisibleFields();
        
        const tableHead = document.getElementById('tableHead');
        const headerRow = document.createElement('tr');
        visibleFields.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field === 'name' ? '负责人' : field;
            headerRow.appendChild(th);
        });
        tableHead.innerHTML = '';
        tableHead.appendChild(headerRow);
        
        const tableBody = document.getElementById('tableBody');
        const fragment = document.createDocumentFragment();
        
        const sortedEntries = sortPersonsByOrder(fuzerenData);
        
        sortedEntries.forEach(([operatorId, personData]) => {
            const row = document.createElement('tr');
            row.id = `row-${operatorId}`;
            
            visibleFields.forEach(field => {
                const value = getFieldValue(personData, field);
                row.appendChild(createCell(value, field, operatorId));
            });
            
            fragment.appendChild(row);
        });
        
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
        
        setTableDimensions();
        
        // 首次加载完成处理
        if (isFirstLoad) {
            handleFirstLoadComplete();
        }
    }
    
    // 初始化模块
    function init() {
        database = firebase.database();
        
        Promise.all([
            database.ref('/peizhi/shunxu').once('value'),
            database.ref('/peizhi/zhuangtai').once('value'),
            database.ref('/fuzeren').once('value')
        ]).then(([shunxuSnapshot, zhuangtaiSnapshot, fuzerenSnapshot]) => {
            fieldOrder = shunxuSnapshot.val() || {};
            fieldStatus = zhuangtaiSnapshot.val() || {};
            updateTable(fuzerenSnapshot.val());
        });
        
        database.ref('/peizhi/shunxu').on('value', (snapshot) => {
            fieldOrder = snapshot.val() || {};
            if (currentFuzerenData && !editingCell) {
                updateTable(currentFuzerenData);
            }
        });
        
        database.ref('/peizhi/zhuangtai').on('value', (snapshot) => {
            fieldStatus = snapshot.val() || {};
            if (currentFuzerenData && !editingCell) {
                updateTable(currentFuzerenData);
            }
        });
        
        database.ref('/fuzeren').on('value', (snapshot) => {
            const fuzerenData = snapshot.val();
            globalData = fuzerenData || {};
            
            if (!editingCell) {
                updateTable(fuzerenData);
            } else {
                currentFuzerenData = fuzerenData;
            }
        });
    }
    
    return {
        init,
        updateTable,
        setTableDimensions,
        getVisibleFields
    };
})();