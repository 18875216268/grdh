// 列表管理模块 - 优化版（v1.07）- 新增字段默认选中
const LiebiaoModule = (function() {
    let draggedElement = null;
    const items = {}; // 缓存DOM元素
    let fields = [];
    let order = {};
    let status = {};
    const ORDER_GAP = 1000;
    
    function init() {
        // 直接监听peizhi节点
        firebase.database().ref('/peizhi').on('value', (snapshot) => {
            const peizhiData = snapshot.val() || {};
            updateListIncrementally(peizhiData.shunxu || {}, peizhiData.zhuangtai || {});
        });
    }
    
    // 增量更新列表
    function updateListIncrementally(newOrder, newStatus) {
        const newFields = Object.keys(newOrder);
        const container = document.getElementById('shezhiList');
        if (!container) return;
        
        // 1. 处理新增字段 - 优化：新字段默认选中
        const addedFields = newFields.filter(field => !fields.includes(field));
        addedFields.forEach(field => {
            // 新字段默认状态为1（选中），避免等待数据库更新
            if (newStatus[field] === undefined) {
                newStatus[field] = 1;
            }
            const item = createListItem(field, newStatus[field]);
            items[field] = item;
            container.appendChild(item);
        });
        
        // 2. 处理删除字段
        fields.filter(field => !newFields.includes(field)).forEach(field => {
            items[field]?.remove();
            delete items[field];
        });
        
        // 3. 处理状态变化
        newFields.forEach(field => {
            const item = items[field];
            if (item && status[field] !== newStatus[field]) {
                updateItemStatus(item, newStatus[field] === 1);
            }
        });
        
        // 4. 处理顺序变化
        if (needsReorder(newFields, newOrder)) {
            reorderElements(newFields, newOrder, container);
        }
        
        // 5. 更新本地状态
        fields = newFields;
        order = newOrder;
        status = newStatus;
        
        // 6. 空状态处理
        if (newFields.length === 0) {
            container.innerHTML = '<div class="empty-list">暂无字段</div>';
            Object.keys(items).forEach(key => delete items[key]);
        }
    }
    
    // 检查是否需要重排序
    function needsReorder(newFields, newOrder) {
        const current = Array.from(document.querySelectorAll('.list-item')).map(item => item.dataset.field);
        const expected = [...newFields].sort((a, b) => (newOrder[a] || 999999) - (newOrder[b] || 999999));
        return current.join(',') !== expected.join(',');
    }
    
    // 重排序DOM元素
    function reorderElements(fields, orderData, container) {
        const sorted = [...fields].sort((a, b) => (orderData[a] || 999999) - (orderData[b] || 999999));
        const fragment = document.createDocumentFragment();
        sorted.forEach(field => items[field] && fragment.appendChild(items[field]));
        container.innerHTML = '';
        container.appendChild(fragment);
    }
    
    // 创建列表项 - 简化参数
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
    
    // 更新项目状态
    function updateItemStatus(item, isSelected) {
        item.className = `list-item ${isSelected ? 'selected' : 'unselected'}`;
    }
    
    // 切换状态
    function toggleStatus(field) {
        firebase.database().ref(`/peizhi/zhuangtai/${field}`).set(status[field] === 1 ? 0 : 1);
    }
    
    // 设置拖拽
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
            
            const field = draggedElement.dataset.field;
            const prev = draggedElement.previousElementSibling;
            const next = draggedElement.nextElementSibling;
            
            if (prev || next) {
                const newOrder = calculateOrder(
                    prev?.dataset.field,
                    next?.dataset.field
                );
                
                if (newOrder !== null) {
                    firebase.database().ref(`/peizhi/shunxu/${field}`).set(newOrder);
                }
            }
            
            draggedElement = null;
        };
    }
    
    // 计算新顺序
    function calculateOrder(prevField, nextField) {
        if (!prevField && nextField) {
            return (order[nextField] || 0) / 2;
        } else if (prevField && !nextField) {
            return (order[prevField] || 0) + ORDER_GAP;
        } else if (prevField && nextField) {
            const prevOrder = order[prevField] || 0;
            const nextOrder = order[nextField] || 0;
            
            if (nextOrder - prevOrder < 0.001) {
                // 间隔太小，触发全体重排
                reorderAll();
                return null;
            }
            return (prevOrder + nextOrder) / 2;
        }
        return null;
    }
    
    // 全体重排序
    function reorderAll() {
        const updates = {};
        const allItems = Array.from(document.querySelectorAll('.list-item'));
        
        allItems.forEach((item, index) => {
            updates[`/peizhi/shunxu/${item.dataset.field}`] = (index + 1) * ORDER_GAP;
        });
        
        firebase.database().ref().update(updates);
    }
    
    return { init };
})();