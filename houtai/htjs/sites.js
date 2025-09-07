// 站点访问管理模块
const SiteManager = {
    currentEditingItem: null,
    currentEditingMode: 'add',
    selectedIconName: 'plus',
    isListening: false,
    draggedItem: null,

    // 初始化
    init() {
        this.initIconGrid();
        this.listenToSites();
    },

    // 初始化图标网格
    initIconGrid() {
        const iconGrid = document.getElementById('siteIconGrid');
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

    // 监听站点列表（实时）
    async listenToSites() {
        if (this.isListening) return;
        
        try {
            await waitForFirebase();
            this.isListening = true;
            
            window.FirebaseAuth.listenToSites((sites) => {
                const siteList = document.getElementById('siteList');
                siteList.innerHTML = '';
                
                sites.forEach((site, index) => {
                    this.addSiteToDOM(site, index);
                });
                
                // 初始化拖拽
                this.initDragAndDrop();
            });
        } catch (error) {
            console.error('监听站点列表失败:', error);
            tongzhi.error('站点列表加载失败');
        }
    },

    // 添加站点到DOM
    addSiteToDOM(siteData, index) {
        const siteList = document.getElementById('siteList');
        const item = document.createElement('li');
        item.className = 'link-item';
        item.setAttribute('data-site-id', siteData.id);
        item.setAttribute('data-site-icon', siteData.icon);
        item.setAttribute('data-site-index', index);
        item.draggable = true;
        
        item.innerHTML = `
            <div class="drag-handle">
                <i data-lucide="grip-vertical"></i>
            </div>
            <div class="link-info">
                <div class="link-icon">
                    <i data-lucide="${siteData.icon}"></i>
                </div>
                <div class="link-details">
                    <div class="link-text">${siteData.text}</div>
                    <div class="link-url">${siteData.url}</div>
                </div>
            </div>
            <div class="link-actions">
                <button class="btn btn-secondary" onclick="SiteManager.edit(this)">编辑</button>
                <button class="btn btn-success" onclick="SiteManager.visit(this)">访问</button>
                <button class="btn btn-danger" onclick="SiteManager.remove(this)">删除</button>
            </div>
        `;
        siteList.appendChild(item);
        lucide.createIcons();
    },

    // 初始化拖拽功能
    initDragAndDrop() {
        const items = document.querySelectorAll('#siteList .link-item');
        
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
                const afterElement = this.getDragAfterElement(document.getElementById('siteList'), e.clientY);
                if (afterElement == null) {
                    document.getElementById('siteList').appendChild(this.draggedItem);
                } else {
                    document.getElementById('siteList').insertBefore(this.draggedItem, afterElement);
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
        const items = document.querySelectorAll('#siteList .link-item');
        const orderData = [];
        
        items.forEach((item, index) => {
            orderData.push({
                id: item.getAttribute('data-site-id'),
                xuhao: index + 1
            });
        });
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth.updateSiteOrders(orderData);
            
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
        document.getElementById('siteNameInput').value = data.text || '';
        document.getElementById('siteUrlInput').value = data.url || '';
        this.selectedIconName = data.icon || 'plus';
        this.selectIcon(this.selectedIconName);
        
        document.getElementById('siteEditModal').classList.add('show');
        document.getElementById('siteNameInput').focus();
    },

    // 关闭弹窗
    closeModal() {
        document.getElementById('siteEditModal').classList.remove('show');
        this.currentEditingItem = null;
        this.currentEditingMode = 'add';
        this.selectedIconName = 'plus';
        
        document.getElementById('siteNameInput').value = '';
        document.getElementById('siteUrlInput').value = '';
        document.querySelectorAll('#siteIconGrid .icon-option').forEach(option => {
            option.classList.remove('selected');
        });
    },

    // 选择图标
    selectIcon(iconName) {
        this.selectedIconName = iconName;
        document.querySelectorAll('#siteIconGrid .icon-option').forEach(option => {
            option.classList.toggle('selected', option.getAttribute('data-icon') === iconName);
        });
    },

    // 编辑站点
    edit(btn) {
        const siteItem = btn.closest('.link-item');
        this.currentEditingItem = siteItem;
        
        this.openModal('edit', {
            text: siteItem.querySelector('.link-text').textContent,
            url: siteItem.querySelector('.link-url').textContent,
            icon: siteItem.getAttribute('data-site-icon') || 'plus'
        });
    },

    // 访问站点
    visit(btn) {
        const url = btn.closest('.link-item').querySelector('.link-url').textContent.trim();
        if (url && url !== '#') {
            window.open(/^https?:\/\//.test(url) ? url : 'https://' + url, '_blank');
        }
    },

    // 删除站点
    async remove(btn) {
        const siteItem = btn.closest('.link-item');
        const siteId = siteItem.getAttribute('data-site-id');
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth.deleteSite(siteId);
            
            if (success) {
                tongzhi.success('站点已删除');
            } else {
                tongzhi.error('删除失败，请重试');
            }
        } catch (error) {
            console.error('删除站点失败:', error);
            tongzhi.error('删除失败，请重试');
        }
    },

    // 保存站点
    async save() {
        const siteData = {
            text: document.getElementById('siteNameInput').value.trim() || '未命名站点',
            url: document.getElementById('siteUrlInput').value.trim() || '#',
            icon: this.selectedIconName
        };
        
        try {
            await waitForFirebase();
            
            if (this.currentEditingMode === 'add') {
                const siteId = await window.FirebaseAuth.addSite(siteData);
                if (siteId) {
                    tongzhi.success('站点添加成功');
                } else {
                    tongzhi.error('添加失败，请重试');
                    return;
                }
            } else if (this.currentEditingMode === 'edit' && this.currentEditingItem) {
                const siteId = this.currentEditingItem.getAttribute('data-site-id');
                const success = await window.FirebaseAuth.updateSite(siteId, siteData);
                
                if (success) {
                    tongzhi.success('站点修改成功');
                } else {
                    tongzhi.error('修改失败，请重试');
                    return;
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error('保存站点失败:', error);
            tongzhi.error('保存失败，请重试');
        }
    }
};

// 将SiteManager暴露到全局
window.SiteManager = SiteManager;