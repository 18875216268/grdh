// 通用列表管理基类
class BaseListManager {
    constructor(config) {
        this.type = config.type; // 'link' 或 'site'
        this.listId = config.listId;
        this.modalId = config.modalId;
        this.nameInputId = config.nameInputId;
        this.urlInputId = config.urlInputId;
        this.iconGridId = config.iconGridId;
        this.firebaseMethods = config.firebaseMethods;
        
        this.currentEditingItem = null;
        this.currentEditingMode = 'add';
        this.selectedIconName = 'plus';
        this.isListening = false;
        this.draggedItem = null;
    }

    // 初始化
    init() {
        this.initIconGrid();
        this.listen();
    }

    // 初始化图标网格
    initIconGrid() {
        const iconGrid = document.getElementById(this.iconGridId);
        ADMIN_ICONS.forEach(iconName => {
            const option = document.createElement('div');
            option.className = 'icon-option';
            option.setAttribute('data-icon', iconName);
            option.innerHTML = `<i data-lucide="${iconName}"></i>`;
            option.onclick = () => this.selectIcon(iconName);
            iconGrid.appendChild(option);
        });
        lucide.createIcons();
    }

    // 监听数据
    async listen() {
        if (this.isListening) return;
        
        try {
            await waitForFirebase();
            this.isListening = true;
            
            window.FirebaseAuth[this.firebaseMethods.listen]((items) => {
                const list = document.getElementById(this.listId);
                list.innerHTML = '';
                
                items.forEach((item, index) => {
                    this.addItemToDOM(item, index);
                });
                
                this.initDragAndDrop();
            });
        } catch (error) {
            console.error(`监听${this.type === 'link' ? '链接' : '站点'}列表失败:`, error);
            tongzhi.error(`${this.type === 'link' ? '链接' : '站点'}列表加载失败`);
        }
    }

    // 添加项目到DOM
    addItemToDOM(itemData, index) {
        const list = document.getElementById(this.listId);
        const item = document.createElement('li');
        item.className = 'link-item';
        item.setAttribute(`data-${this.type}-id`, itemData.id);
        item.setAttribute(`data-${this.type}-icon`, itemData.icon);
        item.setAttribute(`data-${this.type}-index`, index);
        item.draggable = true;
        
        item.innerHTML = `
            <div class="drag-handle">
                <i data-lucide="grip-vertical"></i>
            </div>
            <div class="link-info">
                <div class="link-icon">
                    <i data-lucide="${itemData.icon}"></i>
                </div>
                <div class="link-details">
                    <div class="link-text">${itemData.text}</div>
                    <div class="link-url">${itemData.url}</div>
                </div>
            </div>
            <div class="link-actions">
                <button class="btn btn-secondary" onclick="${this.type === 'link' ? 'LinkManager' : 'SiteManager'}.edit(this)">编辑</button>
                <button class="btn btn-success" onclick="${this.type === 'link' ? 'LinkManager' : 'SiteManager'}.visit(this)">访问</button>
                <button class="btn btn-danger" onclick="${this.type === 'link' ? 'LinkManager' : 'SiteManager'}.remove(this)">删除</button>
            </div>
        `;
        list.appendChild(item);
        lucide.createIcons();
    }

    // 初始化拖拽功能
    initDragAndDrop() {
        const items = document.querySelectorAll(`#${this.listId} .link-item`);
        
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
                const afterElement = this.getDragAfterElement(document.getElementById(this.listId), e.clientY);
                if (afterElement == null) {
                    document.getElementById(this.listId).appendChild(this.draggedItem);
                } else {
                    document.getElementById(this.listId).insertBefore(this.draggedItem, afterElement);
                }
            });
            
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                await this.updateOrder();
            });
        });
    }

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
    }

    // 更新序号
    async updateOrder() {
        const items = document.querySelectorAll(`#${this.listId} .link-item`);
        const orderData = [];
        
        items.forEach((item, index) => {
            orderData.push({
                id: item.getAttribute(`data-${this.type}-id`),
                xuhao: index + 1
            });
        });
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth[this.firebaseMethods.updateOrders](orderData);
            
            if (success) {
                tongzhi.success('排序已更新');
            } else {
                tongzhi.error('排序更新失败');
            }
        } catch (error) {
            console.error('更新排序失败:', error);
            tongzhi.error('排序更新失败');
        }
    }

    // 打开编辑弹窗
    openModal(mode, data = {}) {
        this.currentEditingMode = mode;
        document.getElementById(this.nameInputId).value = data.text || '';
        document.getElementById(this.urlInputId).value = data.url || '';
        this.selectedIconName = data.icon || 'plus';
        this.selectIcon(this.selectedIconName);
        
        document.getElementById(this.modalId).classList.add('show');
        document.getElementById(this.nameInputId).focus();
    }

    // 关闭弹窗
    closeModal() {
        document.getElementById(this.modalId).classList.remove('show');
        this.currentEditingItem = null;
        this.currentEditingMode = 'add';
        this.selectedIconName = 'plus';
        
        document.getElementById(this.nameInputId).value = '';
        document.getElementById(this.urlInputId).value = '';
        document.querySelectorAll(`#${this.iconGridId} .icon-option`).forEach(option => {
            option.classList.remove('selected');
        });
    }

    // 选择图标
    selectIcon(iconName) {
        this.selectedIconName = iconName;
        document.querySelectorAll(`#${this.iconGridId} .icon-option`).forEach(option => {
            option.classList.toggle('selected', option.getAttribute('data-icon') === iconName);
        });
    }

    // 编辑
    edit(btn) {
        const item = btn.closest('.link-item');
        this.currentEditingItem = item;
        
        this.openModal('edit', {
            text: item.querySelector('.link-text').textContent,
            url: item.querySelector('.link-url').textContent,
            icon: item.getAttribute(`data-${this.type}-icon`) || 'plus'
        });
    }

    // 访问
    visit(btn) {
        const url = btn.closest('.link-item').querySelector('.link-url').textContent.trim();
        if (url && url !== '#') {
            window.open(/^https?:\/\//.test(url) ? url : 'https://' + url, '_blank');
        }
    }

    // 删除
    async remove(btn) {
        const item = btn.closest('.link-item');
        const itemId = item.getAttribute(`data-${this.type}-id`);
        
        try {
            await waitForFirebase();
            const success = await window.FirebaseAuth[this.firebaseMethods.delete](itemId);
            
            if (success) {
                tongzhi.success(`${this.type === 'link' ? '链接' : '站点'}已删除`);
            } else {
                tongzhi.error('删除失败，请重试');
            }
        } catch (error) {
            console.error(`删除${this.type === 'link' ? '链接' : '站点'}失败:`, error);
            tongzhi.error('删除失败，请重试');
        }
    }

    // 保存
    async save() {
        const itemData = {
            text: document.getElementById(this.nameInputId).value.trim() || `未命名${this.type === 'link' ? '链接' : '站点'}`,
            url: document.getElementById(this.urlInputId).value.trim() || '#',
            icon: this.selectedIconName
        };
        
        try {
            await waitForFirebase();
            
            if (this.currentEditingMode === 'add') {
                const itemId = await window.FirebaseAuth[this.firebaseMethods.add](itemData);
                if (itemId) {
                    tongzhi.success(`${this.type === 'link' ? '链接' : '站点'}添加成功`);
                } else {
                    tongzhi.error('添加失败，请重试');
                    return;
                }
            } else if (this.currentEditingMode === 'edit' && this.currentEditingItem) {
                const itemId = this.currentEditingItem.getAttribute(`data-${this.type}-id`);
                const success = await window.FirebaseAuth[this.firebaseMethods.update](itemId, itemData);
                
                if (success) {
                    tongzhi.success(`${this.type === 'link' ? '链接' : '站点'}修改成功`);
                } else {
                    tongzhi.error('修改失败，请重试');
                    return;
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error(`保存${this.type === 'link' ? '链接' : '站点'}失败:`, error);
            tongzhi.error('保存失败，请重试');
        }
    }
}