// 列表管理模块 - 全面更新版（v1.06）- 统一使用name字段
const LiebiaoModule = (function() {
    let draggedElement = null;
    const items = {};
    let fields = [];
    let order = {};
    let status = {};
    const ORDER_GAP = 1000;
    
    function init() {
        loadInitialData();
        setupRealtimeListeners();
    }
    
    // 统一排序函数 - 复用表格模块的逻辑
    function sortFieldsByOrder(fieldList) {
        return fieldList.sort((a, b) => (order[a] || 999999) - (order[b] || 999999));
    }
    
    // 初始加载数据
    function loadInitialData() {
        Promise.all([
            firebase.database().ref('/fuzeren').once('value'),
            firebase.database().ref('/peizhi/shunxu').once('value'),
            firebase.database().ref('/peizhi/zhuangtai').once('value')
        ]).then(([fuzerenSnap, orderSnap, statusSnap]) => {
            const fuzerenData = fuzerenSnap.val();
            if (!fuzerenData) {
                showEmptyState();
                return;
            }
            
            // 使用统一的字段提取函数
            fields = FirebaseModule.extractAllFields(fuzerenData);
            order = orderSnap.val() || {};
            status = statusSnap.val() || {};
            
            renderList();
        });
    }
    
    // 渲染列表
    function renderList() {
        const container = document.getElementById('shezhiList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 按顺序排列字段
        const sortedFields = sortFieldsByOrder(fields);
        
        const fragment = document.createDocumentFragment();
        sortedFields.forEach(field => {
            const item = createListItem(field);
            fragment.appendChild(item);
            items[field] = item;
        });
        container.appendChild(fragment);
    }
    
    // 创建列表项 - 统一使用name字段，显示层映射
    function createListItem(field) {
        const item = document.createElement('div');
        const isSelected = status[field] === 1;
        
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
        const item = items[field];
        if (!item) return;
        
        const newStatus = status[field] === 1 ? 0 : 1;
        status[field] = newStatus;
        
        item.classList.toggle('selected', newStatus === 1);
        item.classList.toggle('unselected', newStatus === 0);
        
        firebase.database().ref(`/peizhi/zhuangtai/${field}`).set(newStatus);
    }
    
    // 处理删除
    function handleDelete(field) {
        const item = items[field];
        if (!item) return;
        
        item.style.opacity = '0.3';
        item.style.pointerEvents = 'none';
        
        // 直接调用Firebase模块的删除方法
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
            
            // 如果间隔太小，重新排序
            if (afterOrder - beforeOrder < 0.001) {
                return reorderAllFields();
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
            order[field] = newOrder;
            updates[`/peizhi/shunxu/${field}`] = newOrder;
        });
        
        firebase.database().ref().update(updates);
        return order[draggedElement.dataset.field];
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
                order[draggedField] = newOrder;
                firebase.database().ref(`/peizhi/shunxu/${draggedField}`).set(newOrder);
            }
            
            draggedElement = null;
        };
    }
    
    // 设置实时监听器
    function setupRealtimeListeners() {
        const statusRef = firebase.database().ref('/peizhi/zhuangtai');
        
        // 监听新字段状态添加
        statusRef.on('child_added', (snapshot) => {
            const field = snapshot.key;
            const value = snapshot.val();
            
            status[field] = value;
            
            const item = items[field];
            if (item) {
                item.classList.toggle('selected', value === 1);
                item.classList.toggle('unselected', value === 0);
            }
        });
        
        // 监听字段状态变化
        statusRef.on('child_changed', (snapshot) => {
            const field = snapshot.key;
            const value = snapshot.val();
            
            status[field] = value;
            
            const item = items[field];
            if (item) {
                item.classList.toggle('selected', value === 1);
                item.classList.toggle('unselected', value === 0);
            }
        });
    }
    
    // 处理数据变化 - 由firebase.js调用
    function handleDataChange(fuzerenData) {
        if (!fuzerenData) {
            showEmptyState();
            return;
        }
        
        // 使用统一的字段提取函数
        const newFields = FirebaseModule.extractAllFields(fuzerenData);
        const added = newFields.filter(f => !fields.includes(f));
        const removed = fields.filter(f => !newFields.includes(f));
        
        if (added.length > 0) {
            handleFieldsAdded(added);
        }
        
        if (removed.length > 0) {
            handleFieldsRemoved(removed);
        }
        
        fields = newFields;
    }
    
    // 处理字段新增
    function handleFieldsAdded(addedFields) {
        const container = document.getElementById('shezhiList');
        if (!container) return;
        
        const emptyState = container.querySelector('.empty-list');
        if (emptyState) emptyState.remove();
        
        addedFields.forEach(field => {
            const item = createListItem(field);
            container.appendChild(item);
            items[field] = item;
        });
    }
    
    // 处理字段删除
    function handleFieldsRemoved(removedFields) {
        removedFields.forEach(field => {
            const item = items[field];
            if (item) {
                item.remove();
                delete items[field];
                delete order[field];
                delete status[field];
            }
        });
        
        if (fields.length === 0) {
            showEmptyState();
        }
    }
    
    // 显示空状态
    function showEmptyState() {
        const container = document.getElementById('shezhiList');
        if (container) {
            container.innerHTML = '<div class="empty-list">暂无字段</div>';
        }
        fields = [];
        order = {};
        status = {};
        Object.keys(items).forEach(key => delete items[key]);
    }
    
    return { 
        init,
        handleDataChange
    };
})();