// 列表管理模块 - 整数序号版（v2.0）
const LiebiaoModule = (function() {
    let draggedElement = null;
    const items = {};
    let fields = [];
    let order = {};
    let status = {};
    
    function init() {
        firebase.database().ref('/peizhi').on('value', (snapshot) => {
            const peizhiData = snapshot.val() || {};
            updateListIncrementally(peizhiData.shunxu || {}, peizhiData.zhuangtai || {});
        });
    }
    
    function updateListIncrementally(newOrder, newStatus) {
        const newFields = Object.keys(newOrder);
        const container = document.getElementById('shezhiList');
        if (!container) return;
        
        // 处理新增字段
        const addedFields = newFields.filter(field => !fields.includes(field));
        addedFields.forEach(field => {
            if (newStatus[field] === undefined) {
                newStatus[field] = 1;
            }
            const item = createListItem(field, newStatus[field]);
            items[field] = item;
            container.appendChild(item);
        });
        
        // 处理删除字段
        fields.filter(field => !newFields.includes(field)).forEach(field => {
            items[field]?.remove();
            delete items[field];
        });
        
        // 处理状态变化
        newFields.forEach(field => {
            const item = items[field];
            if (item && status[field] !== newStatus[field]) {
                updateItemStatus(item, newStatus[field] === 1);
            }
        });
        
        // 处理顺序变化
        if (needsReorder(newFields, newOrder)) {
            reorderElements(newFields, newOrder, container);
        }
        
        fields = newFields;
        order = newOrder;
        status = newStatus;
        
        if (newFields.length === 0) {
            container.innerHTML = '<div class="empty-list">暂无字段!</div>';
            Object.keys(items).forEach(key => delete items[key]);
        }
    }
    
    function needsReorder(newFields, newOrder) {
        const current = Array.from(document.querySelectorAll('.list-item')).map(item => item.dataset.field);
        const expected = [...newFields].sort((a, b) => (newOrder[a] || 999999) - (newOrder[b] || 999999));
        return current.join(',') !== expected.join(',');
    }
    
    function reorderElements(fields, orderData, container) {
        const sorted = [...fields].sort((a, b) => (orderData[a] || 999999) - (orderData[b] || 999999));
        const fragment = document.createDocumentFragment();
        sorted.forEach(field => items[field] && fragment.appendChild(items[field]));
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    function createListItem(field, isSelected) {
        const item = document.createElement('div');
        item.className = `list-item ${isSelected ? 'selected' : 'unselected'}`;
        item.dataset.field = field;
        item.draggable = true;
        
        const label = document.createElement('span');
        label.className = 'item-label';
        label.textContent = field === 'name' ? '负责人' : field;
        item.appendChild(label);
        
        if (field !== 'name') {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                FirebaseModule.deleteField(field);
            };
            item.appendChild(deleteBtn);
        }
        
        item.onclick = () => toggleStatus(field);
        setupDrag(item);
        
        return item;
    }
    
    function updateItemStatus(item, isSelected) {
        item.className = `list-item ${isSelected ? 'selected' : 'unselected'}`;
    }
    
    function toggleStatus(field) {
        firebase.database().ref(`/peizhi/zhuangtai/${field}`).set(status[field] === 1 ? 0 : 1);
    }
    
    function setupDrag(item) {
        item.ondragstart = (e) => {
            draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        
        item.ondragover = (e) => {
            e.preventDefault();
            if (!draggedElement || draggedElement === item) return;
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const container = item.parentNode;
            
            if (e.clientY < midpoint) {
                container.insertBefore(draggedElement, item);
            } else {
                container.insertBefore(draggedElement, item.nextSibling);
            }
        };
        
        item.ondragend = () => {
            if (!draggedElement) return;
            
            draggedElement.classList.remove('dragging');
            
            // 使用新的整数序号计算
            const updates = calculateIntegerOrder();
            
            if (Object.keys(updates).length > 0) {
                firebase.database().ref().update(updates);
            }
            
            draggedElement = null;
        };
    }
    
    // 核心改进：整数序号计算
    function calculateIntegerOrder() {
        const updates = {};
        const allItems = Array.from(document.querySelectorAll('.list-item'));
        
        // 重新分配整数序号：1, 2, 3, 4, 5...
        allItems.forEach((item, index) => {
            const field = item.dataset.field;
            const newOrder = index + 1;
            
            // 只更新发生变化的字段，减少数据库写入
            if (order[field] !== newOrder) {
                updates[`/peizhi/shunxu/${field}`] = newOrder;
            }
        });
        
        return updates;
    }
    
    return { init };
})();