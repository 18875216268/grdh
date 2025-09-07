// 链接管理模块
const LinkManager = {
    currentEditingItem: null,
    currentEditingMode: 'add',
    selectedIconName: 'plus',
    isListening: false,
    draggedItem: null,

    // 初始化
    init() {
        this.initIconGrid();
        this.listenToLinks();
    },

    // 初始化图标网格
    initIconGrid() {
        const iconGrid = document.getElementById('iconGrid');
        ADMIN_ICONS.forEach(iconName => {
            const option = document.createElement('div');
            option.className = 'icon-option';
            option.setAttribute('data-icon', iconName);
            option.innerHTML = `<i data-lucide="${iconName}"></i>`;
            option.onclick = () => this.selectIcon(iconName);
            iconGrid.appendChild(option);
        });
        lucide.createIcons();
    },

    // 监听链接列表（实时）
    async listenToLinks() {
        if (this.isListening) return;
        
        try {
            await waitForFirebase();
            this.isListening = true;
            
            window.FirebaseAuth.listenToLinks((links) => {
                const linkList = document.getElementById('linkList');
                linkList.innerHTML = '';
                
                links.forEach((link, index) => {
                    this.addLinkToDOM(link, index);
                });
                
                // 初始化拖拽
                this.initDragAndDrop();
            });
        } catch (error) {
            console.error('监听链接列表失败:', error);
            tongzhi.error('链接列表加载失败');
        }
    },

    // 添加链接到DOM
    addLinkToDOM(linkData, index) {
        const linkList = document.getElementById('linkList');
        const item = document.createElement('li');
        item.className = 'link-item';
        item.setAttribute('data-link-id', linkData.id);
        item.setAttribute('data-link-icon', linkData.icon);
        item.setAttribute('data-link-index', index);
        item.draggable = true;
        
        item.innerHTML = `
            <div class="drag-handle">
                <i data-lucide="grip-vertical"></i>
            </div>
            <div class="link-info">
                <div class="link-icon">
                    <i data-lucide="${linkData.icon}"></i>
                </div>
                <div class="link-details">
                    <div class="link-text">${linkData.text}</div>
                    <div class="link-url">${linkData.url}</div>
                </div>
            </div>
            <div class="link-actions">
                <button class="btn btn-secondary" onclick="LinkManager.edit(this)">编辑</button>
                <button class="btn btn-success" onclick="LinkManager.visit(this)">访问</button>
                <button class="btn btn-danger" onclick="LinkManager.remove(this)">删除</button>
            </div>
        `;
        linkList.appendChild(item);
        lucide.createIcons();
    },

    // 初始化拖拽功能
    initDragAndDrop() {
        const items = document.querySelectorAll('#linkList .link-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(document.getElementById('linkList'), e.clientY);
                if (afterElement == null) {
                    document.getElementById('linkList').appendChild(this.draggedItem);
                } else {
                    document.getElementById('linkList').insertBefore(this.draggedItem, afterElement);
                }
            });
            
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                await this.updateOrder();
            });
        });
    },

    // 获取拖拽后的位置
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.link-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    // 更新序号
    async updateOrder() {
        const items = document.querySelectorAll('#linkList .link-item');
        const orderData = [];
        
        items.forEach((item, index) => {
            orderData.push({
                id: item.getAttribute('data-link-id'),
                xuhao: index + 1
            });
        });
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth.updateLinkOrders(orderData);
            
            if (success) {
                tongzhi.success('排序已更新');
            } else {
                tongzhi.error('排序更新失败');
            }
        } catch (error) {
            console.error('更新排序失败:', error);
            tongzhi.error('排序更新失败');
        }
    },

    // 打开编辑弹窗
    openModal(mode, data = {}) {
        this.currentEditingMode = mode;
        document.getElementById('linkNameInput').value = data.text || '';
        document.getElementById('linkUrlInput').value = data.url || '';
        this.selectedIconName = data.icon || 'plus';
        this.selectIcon(this.selectedIconName);
        
        document.getElementById('linkEditModal').classList.add('show');
        document.getElementById('linkNameInput').focus();
    },

    // 关闭弹窗
    closeModal() {
        document.getElementById('linkEditModal').classList.remove('show');
        this.currentEditingItem = null;
        this.currentEditingMode = 'add';
        this.selectedIconName = 'plus';
        
        document.getElementById('linkNameInput').value = '';
        document.getElementById('linkUrlInput').value = '';
        document.querySelectorAll('#iconGrid .icon-option').forEach(option => {
            option.classList.remove('selected');
        });
    },

    // 选择图标
    selectIcon(iconName) {
        this.selectedIconName = iconName;
        document.querySelectorAll('#iconGrid .icon-option').forEach(option => {
            option.classList.toggle('selected', option.getAttribute('data-icon') === iconName);
        });
    },

    // 编辑链接
    edit(btn) {
        const linkItem = btn.closest('.link-item');
        this.currentEditingItem = linkItem;
        
        this.openModal('edit', {
            text: linkItem.querySelector('.link-text').textContent,
            url: linkItem.querySelector('.link-url').textContent,
            icon: linkItem.getAttribute('data-link-icon') || 'plus'
        });
    },

    // 访问链接
    visit(btn) {
        const url = btn.closest('.link-item').querySelector('.link-url').textContent.trim();
        if (url && url !== '#') {
            window.open(/^https?:\/\//.test(url) ? url : 'https://' + url, '_blank');
        }
    },

    // 删除链接
    async remove(btn) {
        const linkItem = btn.closest('.link-item');
        const linkId = linkItem.getAttribute('data-link-id');
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth.deleteLink(linkId);
            
            if (success) {
                tongzhi.success('链接已删除');
            } else {
                tongzhi.error('删除失败，请重试');
            }
        } catch (error) {
            console.error('删除链接失败:', error);
            tongzhi.error('删除失败，请重试');
        }
    },

    // 保存链接
    async save() {
        const linkData = {
            text: document.getElementById('linkNameInput').value.trim() || '未命名链接',
            url: document.getElementById('linkUrlInput').value.trim() || '#',
            icon: this.selectedIconName
        };
        
        try {
            await waitForFirebase();
            
            if (this.currentEditingMode === 'add') {
                const linkId = await window.FirebaseAuth.addLink(linkData);
                if (linkId) {
                    tongzhi.success('链接添加成功');
                } else {
                    tongzhi.error('添加失败，请重试');
                    return;
                }
            } else if (this.currentEditingMode === 'edit' && this.currentEditingItem) {
                const linkId = this.currentEditingItem.getAttribute('data-link-id');
                const success = await window.FirebaseAuth.updateLink(linkId, linkData);
                
                if (success) {
                    tongzhi.success('链接修改成功');
                } else {
                    tongzhi.error('修改失败，请重试');
                    return;
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error('保存链接失败:', error);
            tongzhi.error('保存失败，请重试');
        }
    }
};

// 将LinkManager暴露到全局
window.LinkManager = LinkManager;