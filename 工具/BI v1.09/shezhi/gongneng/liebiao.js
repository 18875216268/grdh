// 列表管理模块 - 增量更新版本（v1.06）- 智能DOM操作避免闪烁
const LiebiaoModule = (function() {
    let draggedElement = null;
    const items = {}; // 缓存DOM元素
    let fields = [];
    let order = {};
    let status = {};
    const ORDER_GAP = 1000;
    
    function init() {
        setupPeizhiListener();
    }
    
    // 直接监听peizhi节点
    function setupPeizhiListener() {
        console.log('设置左侧列表 - 增量更新模式');
        
        firebase.database().ref('/peizhi').on('value', (snapshot) => {
            const peizhiData = snapshot.val() || {};
            const shunxuData = peizhiData.shunxu || {};
            const zhuangtaiData = peizhiData.zhuangtai || {};
            
            console.log('peizhi配置变化，增量更新列表');
            
            updateListIncrementally(shunxuData, zhuangtaiData);
        });
    }
    
    // 增量更新列表 - 只操作变化的部分
    function updateListIncrementally(newOrder, newStatus) {
        const newFields = Object.keys(newOrder);
        const container = document.getElementById('shezhiList');
        if (!container) return;
        
        // 1. 处理新增字段
        const addedFields = newFields.filter(field => !fields.includes(field));
        addedFields.forEach(field => {
            const item = createListItem(field, newOrder, newStatus);
            items[field] = item;
            // 暂时添加到容器末尾，后面统一排序
            container.appendChild(item);
            console.log('新增字段:', field);
        });
        
        // 2. 处理删除字段
        const removedFields = fields.filter(field => !newFields.includes(field));
        removedFields.forEach(field => {
            const item = items[field];
            if (item) {
                item.remove();
                delete items[field];
                console.log('删除字段:', field);
            }
        });
        
        // 3. 处理状态变化
        newFields.forEach(field => {
            const item = items[field];
            if (item && status[field] !== newStatus[field]) {
                const isSelected = newStatus[field] === 1;
                item.className = `list-item ${isSelected ? 'selected' : 'unselected'}`;
                console.log('更新状态:', field, isSelected ? 'selected' : 'unselected');
            }
        });
        
        // 4. 处理顺序变化 - 只在需要时重排
        if (needsReorder(newFields, newOrder)) {
            reorderDOMElements(newFields, newOrder);
        }
        
        // 5. 更新本地状态
        fields = newFields;
        order = newOrder;
        status = newStatus;
        
        // 6. 处理空状态
        if (newFields.length === 0) {
            showEmptyState();
        } else {
            // 移除可能存在的空状态
            const emptyState = container.querySelector('.empty-list');
            if (emptyState) emptyState.remove();
        }
    }
    
    // 检查是否需要重新排序
    function needsReorder(newFields, newOrder) {
        const currentOrder = Array.from(document.querySelectorAll('.list-item'))
            .map(item => item.dataset.field);
        const expectedOrder = newFields.sort((a, b) => (newOrder[a] || 999999) - (newOrder[b] || 999999));
        
        return currentOrder.join(',') !== expectedOrder.join(',');
    }
    
    // 重新排序DOM元素
    function reorderDOMElements(newFields, newOrder) {
        const container = document.getElementById('shezhiList');
        const sortedFields = newFields.sort((a, b) => (newOrder[a] || 999999) - (newOrder[b] || 999999));
        
        console.log('重新排序DOM元素:', sortedFields);
        
        // 创建文档片段进行批量DOM操作
        const fragment = document.createDocumentFragment();
        sortedFields.forEach(field => {
            const item = items[field];
            if (item) {
                fragment.appendChild(item);
            }
        });
        
        // 清空容器并添加排序后的元素
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    // 创建列表项
    function createListItem(field, orderData, statusData) {
        const item = document.createElement('div');
        const isSelected = statusData[field] === 1;
        
        item.className = `list-item ${isSelected ? 'selected' : 'unselected'}`;
        item.dataset.field = field;
        item.draggable = true;
        
        const label = document.createElement('span');
        label.className = 'item-label';
        // 显示层映射：name字段显示为"负责人"
        label.textContent = field === 'name' ? '负责人' : field;
        item.appendChild(label);
        
        // 只有非name字段才有删除按钮
        if (field !== 'name') {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                handleDelete(field);
            };
            item.appendChild(deleteBtn);
        }
        
        item.onclick = () => handleStatusToggle(field);
        setupDragEvents(item);
        
        return item;
    }
    
    // 处理状态切换
    function handleStatusToggle(field) {
        const newStatus = status[field] === 1 ? 0 : 1;
        
        console.log(`切换字段状态: ${field} -> ${newStatus}`);
        
        // 直接写入数据库，监听器会自动更新UI
        firebase.database().ref(`/peizhi/zhuangtai/${field}`).set(newStatus);
    }
    
    // 处理删除
    function handleDelete(field) {
        console.log(`删除字段: ${field}`);
        
        // 调用Firebase模块的删除方法
        FirebaseModule.deleteField(field);
    }
    
    // 计算拖拽后的新顺序值
    function calculateNewOrder(draggedField, beforeField, afterField) {
        if (!beforeField && afterField) {
            return (order[afterField] || 0) / 2;
        } else if (beforeField && !afterField) {
            return (order[beforeField] || 0) + ORDER_GAP;
        } else if (beforeField && afterField) {
            const beforeOrder = order[beforeField] || 0;
            const afterOrder = order[afterField] || 0;
            const newOrder = (beforeOrder + afterOrder) / 2;
            
            // 如果间隔太小，需要重新排序
            if (afterOrder - beforeOrder < 0.001) {
                reorderAllFields();
                return null;
            }
            return newOrder;
        }
        return null;
    }
    
    // 重新排序所有字段
    function reorderAllFields() {
        const container = document.getElementById('shezhiList');
        const allItems = Array.from(container.querySelectorAll('.list-item'));
        const updates = {};
        
        allItems.forEach((item, index) => {
            const field = item.dataset.field;
            const newOrder = (index + 1) * ORDER_GAP;
            updates[`/peizhi/shunxu/${field}`] = newOrder;
        });
        
        console.log('批量重排序:', updates);
        firebase.database().ref().update(updates);
    }
    
    // 设置拖拽事件
    function setupDragEvents(item) {
        item.ondragstart = (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        item.ondragover = (e) => {
            e.preventDefault();
            if (!draggedElement || draggedElement === item) return;
            
            const container = item.parentNode;
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                container.insertBefore(draggedElement, item);
            } else {
                container.insertBefore(draggedElement, item.nextSibling);
            }
        };
        
        item.ondragend = () => {
            if (!draggedElement) return;
            
            draggedElement.classList.remove('dragging');
            
            const draggedField = draggedElement.dataset.field;
            const prevItem = draggedElement.previousElementSibling;
            const nextItem = draggedElement.nextElementSibling;
            
            const beforeField = prevItem?.dataset.field;
            const afterField = nextItem?.dataset.field;
            
            const newOrder = calculateNewOrder(draggedField, beforeField, afterField);
            if (newOrder !== null) {
                console.log(`拖拽排序: ${draggedField} -> ${newOrder}`);
                firebase.database().ref(`/peizhi/shunxu/${draggedField}`).set(newOrder);
            }
            
            draggedElement = null;
        };
    }
    
    // 显示空状态
    function showEmptyState() {
        const container = document.getElementById('shezhiList');
        if (container) {
            container.innerHTML = '<div class="empty-list">暂无字段</div>';
        }
        // 清空本地状态
        fields = [];
        order = {};
        status = {};
        Object.keys(items).forEach(key => delete items[key]);
    }
    
    return { 
        init
    };
})();