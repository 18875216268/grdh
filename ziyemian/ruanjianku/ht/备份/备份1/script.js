// 全局变量
let currentSection = 'domain';
let draggedElement = null;

// 懒加载配置
const lazyLoadConfig = {
    batchSize: 12,  // 每批加载数量
    threshold: 100   // 触发加载的距离阈值
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待Firebase SDK加载完成
    const checkFirebase = setInterval(() => {
        if (window.firebaseDB) {
            clearInterval(checkFirebase);
            firebase.initRealtimeSync();
            initEventListeners();
            initLazyLoad();
        }
    }, 100);
});

// 初始化事件监听
function initEventListeners() {
    // 导航点击事件
    document.addEventListener('click', function(e) {
        if (e.target.closest('.admin-nav-item')) {
            const section = e.target.closest('.admin-nav-item').dataset.section;
            switchSection(section);
        }
        
        // 弹窗外部点击关闭
        if (e.target.classList.contains('modal')) {
            if (e.target.id === 'addNetdiskModal') {
                domainModule.hideModal();
            } else if (e.target.id === 'addRuleModal') {
                filterModule.hideModal();
            } else if (e.target.id === 'addLinkModal') {
                linksModule.hideModal();
            }
        }
    });
}

// 初始化懒加载
function initLazyLoad() {
    ['domainContainer', 'filterContainer', 'linksContainer'].forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.addEventListener('scroll', () => {
                const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (scrollBottom < lazyLoadConfig.threshold) {
                    const section = containerId.replace('Container', '');
                    if (section === 'domain') {
                        domainModule.loadMore();
                    } else if (section === 'filter') {
                        filterModule.loadMore();
                    } else if (section === 'links') {
                        linksModule.loadMore();
                    }
                }
            });
        }
    });
}

// 切换页面
function switchSection(section) {
    currentSection = section;
    
    // 更新导航状态
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // 更新内容区域
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });
    
    // 渲染对应内容
    if (section === 'domain') {
        domainModule.render();
    } else if (section === 'filter') {
        filterModule.render();
    } else if (section === 'links') {
        linksModule.render();
    }
}

// 域名配置模块
const domainModule = {
    currentEditKey: null,
    loadedCount: 0,
    allItems: [],
    
    render() {
        const container = document.getElementById('domainCardsGrid');
        container.innerHTML = '';
        
        this.allItems = [];
        for (const [key, value] of Object.entries(firebase.xinxiData)) {
            if (key !== 'tongyong' && typeof value === 'object' && value.name) {
                this.allItems.push({
                    key: key,
                    xuhao: value.xuhao || 999,
                    name: value.name || '',
                    yuming: value.yuming || '',
                    time: value.time || Date.now()
                });
            }
        }
        
        this.allItems.sort((a, b) => a.xuhao - b.xuhao);
        
        if (this.allItems.length === 0) {
            container.innerHTML = '<div class="empty-card">暂无网盘配置，点击右上角+添加</div>';
            return;
        }
        
        // 初始加载
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('domainCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.allItems.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.allItems[i];
            const cardHtml = `
                <div class="unified-card" data-key="${item.key}" draggable="true">
                    <div class="card-header">
                        <div class="card-title">${item.name}</div>
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="domainModule.edit('${item.key}')">编辑</button>
                            <button class="btn btn-danger" onclick="domainModule.delete('${item.key}')">删除</button>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="domain-content-area">${item.yuming}</div>
                    </div>
                    <div class="card-footer">
                        <span class="card-date">日期：${utils.formatDate(item.time)}</span>
                        <span>|</span>
                        <span class="card-order">序号：${i + 1}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
        
        if (currentSection === 'domain' && endIndex > startIndex) {
            setTimeout(this.initDragAndDrop, 100);
        }
    },
    
    initDragAndDrop() {
        const cards = document.querySelectorAll('#domainCardsGrid .unified-card');
        cards.forEach(card => {
            card.removeEventListener('dragstart', domainModule.handleDragStart);
            card.removeEventListener('dragover', domainModule.handleDragOver);
            card.removeEventListener('drop', domainModule.handleDrop);
            card.removeEventListener('dragend', domainModule.handleDragEnd);
            card.removeEventListener('dragenter', domainModule.handleDragEnter);
            card.removeEventListener('dragleave', domainModule.handleDragLeave);
            
            card.addEventListener('dragstart', domainModule.handleDragStart);
            card.addEventListener('dragover', domainModule.handleDragOver);
            card.addEventListener('drop', domainModule.handleDrop);
            card.addEventListener('dragend', domainModule.handleDragEnd);
            card.addEventListener('dragenter', domainModule.handleDragEnter);
            card.addEventListener('dragleave', domainModule.handleDragLeave);
        });
    },

    handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    },

    handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    },

    handleDragLeave(e) {
        this.classList.remove('drag-over');
    },

    handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();
        
        if (draggedElement !== this) {
            const allCards = Array.from(document.querySelectorAll('#domainCardsGrid .unified-card'));
            const draggedIndex = allCards.indexOf(draggedElement);
            const targetIndex = allCards.indexOf(this);
            
            if (draggedIndex < targetIndex) {
                this.parentNode.insertBefore(draggedElement, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedElement, this);
            }
            
            domainModule.updateOrderAfterDrag();
        }
        
        this.classList.remove('drag-over');
        return false;
    },

    handleDragEnd(e) {
        document.querySelectorAll('#domainCardsGrid .unified-card').forEach(card => {
            card.classList.remove('dragging', 'drag-over');
        });
        draggedElement = null;
    },

    async updateOrderAfterDrag() {
        const cards = document.querySelectorAll('#domainCardsGrid .unified-card');
        const orderUpdates = {};
        
        cards.forEach((card, index) => {
            const key = card.dataset.key;
            if (key) {
                orderUpdates[key] = index + 1;
            }
        });
        
        await firebase.updateXinxiOrders(orderUpdates);
    },

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modalNetdiskName').value = '';
        document.getElementById('modalNetdiskDomain').value = '';
        document.querySelector('#addNetdiskModal .modal-title').textContent = '添加新网盘';
        const btn = document.getElementById('confirmNetdiskBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addNetdiskModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addNetdiskModal').classList.remove('show');
    },

    edit(key) {
        const item = firebase.xinxiData[key];
        if (!item) return;

        this.currentEditKey = key;
        document.getElementById('modalNetdiskName').value = item.name || '';
        document.getElementById('modalNetdiskDomain').value = item.yuming || '';
        document.querySelector('#addNetdiskModal .modal-title').textContent = '编辑网盘';
        const btn = document.getElementById('confirmNetdiskBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addNetdiskModal').classList.add('show');
    },

    async save() {
        const name = document.getElementById('modalNetdiskName').value.trim();
        const domain = document.getElementById('modalNetdiskDomain').value.trim();

        if (!name || !domain) {
            utils.showToast('请填写网盘名称和域名关键字', 'error');
            return;
        }

        if (this.currentEditKey) {
            // 编辑 - 定点更新
            const updateData = {
                ...firebase.xinxiData[this.currentEditKey],
                name: name,
                yuming: domain
            };
            await firebase.updateXinxiNode(this.currentEditKey, updateData);
        } else {
            // 新增
            const existingOrders = Object.values(firebase.xinxiData)
                .filter(item => item && typeof item === 'object' && item.xuhao)
                .map(item => item.xuhao);
            const newOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
            
            const key = `netdisk_${Date.now()}`;
            const newData = {
                xuhao: newOrder,
                name: name,
                yuming: domain,
                time: Date.now()
            };
            await firebase.updateXinxiNode(key, newData);
        }

        this.hideModal();
    },

    async delete(key) {
        if (!confirm('确定删除这个网盘配置？注意：相关的专属过滤规则也会被删除。')) {
            return;
        }
        
        // 删除节点
        await firebase.deleteXinxiNode(key);
        
        // 重新排序
        const remainingNetdisks = Object.entries(firebase.xinxiData)
            .filter(([k, v]) => k !== 'tongyong' && k !== key && v && typeof v === 'object' && v.name)
            .sort((a, b) => (a[1].xuhao || 999) - (b[1].xuhao || 999));
        
        const orderUpdates = {};
        remainingNetdisks.forEach(([k], index) => {
            orderUpdates[k] = index + 1;
        });
        
        if (Object.keys(orderUpdates).length > 0) {
            await firebase.updateXinxiOrders(orderUpdates);
        }
    }
};

// 过滤规则模块
const filterModule = {
    currentEditKey: null,
    currentEditType: null,
    loadedCount: 0,
    allCards: [],
    
    render() {
        const container = document.getElementById('filterCardsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        this.allCards = [];
        
        // 通用规则
        const tongyong = firebase.xinxiData.tongyong || {};
        this.allCards.push({
            type: 'general',
            key: 'tongyong',
            title: '通用过滤规则',
            validRules: tongyong.youxiao || '',
            invalidRules: tongyong.wuxiao || '',
            time: tongyong.time || Date.now(),
            order: -1
        });
        
        // 网盘专属规则
        Object.entries(firebase.xinxiData).forEach(([key, value]) => {
            if (key !== 'tongyong' && value && typeof value === 'object' && value.name) {
                const guize = value.guize || {};
                if (guize.youxiao || guize.wuxiao) {
                    this.allCards.push({
                        type: 'netdisk',
                        key: key,
                        title: value.name,
                        validRules: guize.youxiao || '',
                        invalidRules: guize.wuxiao || '',
                        time: guize.time || Date.now(),
                        order: value.xuhao || 999
                    });
                }
            }
        });
        
        this.allCards.sort((a, b) => a.order - b.order);
        
        if (this.allCards.length === 1 && !this.allCards[0].validRules && !this.allCards[0].invalidRules) {
            container.innerHTML = '<div class="empty-card">暂无过滤规则，点击右上角+添加</div>';
            return;
        }
        
        // 初始加载
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('filterCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.allCards.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const card = this.allCards[i];
            const isGeneral = card.type === 'general';
            const cardHtml = `
                <div class="unified-card" data-key="${card.key}" data-type="${card.type}">
                    <div class="card-header">
                        <div class="card-title">${card.title}</div>
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="filterModule.edit('${card.key}', '${card.type}')">编辑</button>
                            <button class="btn btn-danger" ${isGeneral ? 'disabled' : ''} 
                                ${!isGeneral ? `onclick="filterModule.delete('${card.key}')"` : ''}>删除</button>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="filter-content-area">
                            <div class="filter-section">
                                <div class="filter-section-header">有效</div>
                                <div class="filter-section-content">
                                    ${card.validRules || '<div class="empty-content">无</div>'}
                                </div>
                            </div>
                            <div class="filter-section">
                                <div class="filter-section-header">无效</div>
                                <div class="filter-section-content">
                                    ${card.invalidRules || '<div class="empty-content">无</div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="card-date">日期：${utils.formatDate(card.time)}</span>
                        <span>|</span>
                        <span class="card-order">序号：${isGeneral ? '0' : card.order}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
    },

    showAddModal() {
        this.currentEditKey = null;
        this.currentEditType = null;
        this.updateNetdiskOptions();
        document.getElementById('ruleNetdiskSelect').value = '';
        document.getElementById('ruleValidKeywords').value = '';
        document.getElementById('ruleInvalidKeywords').value = '';
        document.getElementById('ruleNetdiskGroup').style.display = 'block';
        document.querySelector('#addRuleModal .modal-title').textContent = '添加过滤规则';
        const btn = document.getElementById('confirmRuleBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addRuleModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addRuleModal').classList.remove('show');
    },

    updateNetdiskOptions() {
        const select = document.getElementById('ruleNetdiskSelect');
        select.innerHTML = '<option value="">请选择网盘</option>';
        
        const netdiskOptions = [];
        Object.entries(firebase.xinxiData).forEach(([key, value]) => {
            if (key !== 'tongyong' && value && typeof value === 'object' && value.name) {
                netdiskOptions.push({
                    key: key,
                    name: value.name,
                    xuhao: value.xuhao || 999
                });
            }
        });
        
        netdiskOptions.sort((a, b) => a.xuhao - b.xuhao);
        netdiskOptions.forEach(item => {
            const option = document.createElement('option');
            option.value = item.key;
            option.textContent = item.name;
            select.appendChild(option);
        });
    },

    edit(key, type) {
        this.currentEditKey = key;
        this.currentEditType = type;
        
        let validRules = '', invalidRules = '';
        
        if (type === 'general') {
            const tongyong = firebase.xinxiData.tongyong || {};
            validRules = tongyong.youxiao || '';
            invalidRules = tongyong.wuxiao || '';
            document.getElementById('ruleNetdiskGroup').style.display = 'none';
        } else {
            const netdiskData = firebase.xinxiData[key];
            if (netdiskData && netdiskData.guize) {
                validRules = netdiskData.guize.youxiao || '';
                invalidRules = netdiskData.guize.wuxiao || '';
            }
            document.getElementById('ruleNetdiskGroup').style.display = 'block';
            this.updateNetdiskOptions();
            document.getElementById('ruleNetdiskSelect').value = key;
        }
        
        document.getElementById('ruleValidKeywords').value = validRules;
        document.getElementById('ruleInvalidKeywords').value = invalidRules;
        document.querySelector('#addRuleModal .modal-title').textContent = '编辑过滤规则';
        const btn = document.getElementById('confirmRuleBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addRuleModal').classList.add('show');
    },

    async save() {
        const validKeywords = document.getElementById('ruleValidKeywords').value.trim();
        const invalidKeywords = document.getElementById('ruleInvalidKeywords').value.trim();
        
        if (!validKeywords && !invalidKeywords) {
            utils.showToast('请至少填写一个关键字', 'error');
            return;
        }
        
        if (this.currentEditType === 'general') {
            // 更新通用规则
            await firebase.updateXinxiNode('tongyong', {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData.tongyong?.time || Date.now()
            });
        } else {
            const netdiskKey = this.currentEditKey || document.getElementById('ruleNetdiskSelect').value;
            
            if (!netdiskKey) {
                utils.showToast('请选择网盘', 'error');
                return;
            }
            
            // 更新网盘专属规则
            await firebase.updateXinxiNode(`${netdiskKey}/guize`, {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData[netdiskKey]?.guize?.time || Date.now()
            });
        }
        
        this.hideModal();
    },

    async delete(key) {
        if (!confirm('确定删除这个网盘的专属过滤规则？')) {
            return;
        }
        
        // 删除guize节点
        await firebase.deleteXinxiNode(`${key}/guize`);
    }
};

// 链接管理模块
const linksModule = {
    currentEditKey: null,
    loadedCount: 0,
    allLinks: [],
    
    detectNetdiskType(url) {
        const lowerUrl = url.toLowerCase();
        
        for (const [key, value] of Object.entries(firebase.xinxiData)) {
            if (key !== 'tongyong' && value && value.yuming) {
                const domains = value.yuming.split(',').map(d => d.trim());
                for (const domain of domains) {
                    if (domain && lowerUrl.includes(domain)) {
                        return value.name;
                    }
                }
            }
        }
        
        return '未分类';
    },
    
    render() {
        const container = document.getElementById('linksCardsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!firebase.ruanjiankuData || Object.keys(firebase.ruanjiankuData).length === 0) {
            container.innerHTML = '<div class="empty-card">暂无链接，点击右上角+添加</div>';
            return;
        }
        
        this.allLinks = [];
        Object.entries(firebase.ruanjiankuData).forEach(([key, value]) => {
            if (value && typeof value === 'object') {
                this.allLinks.push({
                    key: key,
                    name: value.name || '未命名',
                    url: value.url || '',
                    type: value.type || '未分类',
                    time: value.time || Date.now(),
                    visits: value.visits || 0
                });
            }
        });
        
        // 按时间倒序排序
        this.allLinks.sort((a, b) => b.time - a.time);
        
        // 初始加载
        this.loadedCount = 0;
        this.loadMore();
    },
    
    loadMore() {
        const container = document.getElementById('linksCardsGrid');
        const startIndex = this.loadedCount;
        const endIndex = Math.min(startIndex + lazyLoadConfig.batchSize, this.allLinks.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const link = this.allLinks[i];
            const cardHtml = `
                <div class="link-card" data-key="${link.key}">
                    <div class="link-card-header">
                        <div class="link-card-title">${link.name}</div>
                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="linksModule.edit('${link.key}')">编辑</button>
                            <button class="btn btn-danger" onclick="linksModule.delete('${link.key}')">删除</button>
                        </div>
                    </div>
                    <div class="link-card-body">
                        <div class="link-card-time">更新时间：${utils.formatDate(link.time)}</div>
                        <a href="${link.url}" target="_blank" class="link-card-url" title="${link.url}">${link.url}</a>
                    </div>
                    <div class="link-card-footer">
                        <span class="link-card-type">${link.type}</span>
                        <span class="link-card-visits">访问次数：${link.visits}</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        }
        
        this.loadedCount = endIndex;
    },

    showAddModal() {
        this.currentEditKey = null;
        document.getElementById('modalLinkName').value = '';
        document.getElementById('modalLinkUrl').value = '';
        document.querySelector('#addLinkModal .modal-title').textContent = '添加新链接';
        const btn = document.getElementById('confirmLinkBtn');
        btn.textContent = '添加';
        btn.onclick = () => this.save();
        document.getElementById('addLinkModal').classList.add('show');
    },

    hideModal() {
        document.getElementById('addLinkModal').classList.remove('show');
    },

    edit(key) {
        const item = firebase.ruanjiankuData[key];
        if (!item) return;

        this.currentEditKey = key;
        document.getElementById('modalLinkName').value = item.name || '';
        document.getElementById('modalLinkUrl').value = item.url || '';
        document.querySelector('#addLinkModal .modal-title').textContent = '编辑链接';
        const btn = document.getElementById('confirmLinkBtn');
        btn.textContent = '保存';
        btn.onclick = () => this.save();
        document.getElementById('addLinkModal').classList.add('show');
    },

    async save() {
        const name = document.getElementById('modalLinkName').value.trim();
        const url = document.getElementById('modalLinkUrl').value.trim();

        if (!name || !url) {
            utils.showToast('请填写网站名称和链接', 'error');
            return;
        }

        if (this.currentEditKey) {
            // 编辑 - 定点更新
            const type = this.detectNetdiskType(url);
            const updateData = {
                ...firebase.ruanjiankuData[this.currentEditKey],
                name: name,
                url: url,
                type: type,
                time: Date.now()
            };
            await firebase.updateRuanjiankuNode(this.currentEditKey, updateData);
        } else {
            // 新增
            const type = this.detectNetdiskType(url);
            const key = utils.generateId();
            const newData = {
                name: name,
                url: url,
                type: type,
                time: Date.now(),
                visits: 0
            };
            await firebase.updateRuanjiankuNode(key, newData);
        }

        this.hideModal();
    },

    async delete(key) {
        if (!confirm('确定删除这个链接？')) {
            return;
        }
        
        // 删除节点
        await firebase.deleteRuanjiankuNode(key);
    }
};