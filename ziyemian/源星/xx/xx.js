// ========================================
// 信息模块 - 卡片创建、渲染和悬浮提示
// ========================================

(function() {
    'use strict';
    
    // 悬浮提示元素
    let tooltipElement = null;
    
    // 初始化悬浮提示
    function initTooltip() {
        if (!tooltipElement) {
            tooltipElement = document.createElement('div');
            tooltipElement.className = 'resource-tooltip';
            document.body.appendChild(tooltipElement);
        }
    }
    
    // 显示悬浮提示
    function showTooltip(element, data, type) {
        if (!tooltipElement) initTooltip();
        
        let content = '';
        if (type === 'resource') {
            content = `
                <div class="tooltip-line">
                    <span class="tooltip-label">名称</span>
                    ${data.mingcheng}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">信息</span>
                    ${data.lanmu} | ${data.shijian} | by ${data.tougaoren || '匿名'}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">统计</span>
                    ${data.yingyong || '通用'} | 源数量: ${data.yuanshuliang || '未知'} | 已复制: ${data.fuzhishu || '0'}次
                </div>
            `;
        } else if (type === 'app') {
            content = `
                <div class="tooltip-line">
                    <span class="tooltip-label">名称</span>
                    ${data.mingc}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">信息</span>
                    ${data.lanmu} | ${data.riqi} | by ${data.tougaoren || '匿名'}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">统计</span>
                    ${data.appName} | ${data.wangpan} | 已获取: ${data.yihuoqu}次
                </div>
            `;
        } else if (type === 'tansuo') {
            content = `
                <div class="tooltip-line">
                    <span class="tooltip-label">名称</span>
                    ${data.mingcheng}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">日期</span>
                    ${data.riqi} | by ${data.tougaoren || '匿名'}
                </div>
                <div class="tooltip-line">
                    <span class="tooltip-label">描述</span>
                    ${data.miaoshu}
                </div>
            `;
        }
        
        tooltipElement.innerHTML = content;
        
        const rect = element.getBoundingClientRect();
        const tooltipHeight = 100;
        
        // 调整位置以避免超出视窗
        let top = rect.top - tooltipHeight - 10;
        let left = rect.left;
        
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        if (left + 350 > window.innerWidth) {
            left = window.innerWidth - 360;
        }
        
        tooltipElement.style.left = left + 'px';
        tooltipElement.style.top = top + 'px';
        tooltipElement.classList.add('show');
    }
    
    // 隐藏悬浮提示
    function hideTooltip() {
        if (tooltipElement) {
            tooltipElement.classList.remove('show');
        }
    }
    
    // 创建卡片
    function createCard(item, type) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.dataset.id = item.id;
        card.dataset.type = type;
        
        if (type === 'resource') {
            const statusClass = item.zhuangtai === "有效" ? "valid" : "invalid";
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title-wrapper">
                        <span class="status-icon ${statusClass}">●</span>
                        <h3 class="resource-title" data-tooltip="resource">${item.mingcheng}</h3>
                    </div>
                    <button class="copy-btn">复制</button>
                </div>
                <div class="resource-meta">
                    <span class="resource-tag">${item.lanmu}</span>
                    <span class="resource-date">${item.shijian}</span>
                    ${item.tougaoren ? `<span>by ${item.tougaoren}</span>` : ''}
                </div>
                <div class="resource-url">${item.url}</div>
                <div class="resource-footer">
                    <div class="resource-info">
                        ${item.yingyong ? `适用: ${item.yingyong} | ` : ''}
                        ${item.yuanshuliang ? `源数量: ${item.yuanshuliang} | ` : ''}
                        已复制: ${item.fuzhishu || '0'}次
                    </div>
                </div>
            `;
            // 绑定悬浮提示数据
            const titleEl = card.querySelector('.resource-title');
            titleEl.dataset.itemData = JSON.stringify(item);
        } else if (type === 'app') {
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title-wrapper">
                        <h3 class="resource-title" data-tooltip="app">${item.mingc}</h3>
                    </div>
                    <button class="get-btn">获取</button>
                </div>
                <div class="resource-meta">
                    <span class="resource-tag">${item.lanmu}</span>
                    <span class="resource-date">${item.riqi}</span>
                </div>
                <div class="resource-url">${item.url}</div>
                <div class="resource-footer">
                    <div class="resource-info">
                        ${item.appName} | ${item.wangpan} | 已获取: ${item.yihuoqu}次
                    </div>
                </div>
            `;
            // 绑定悬浮提示数据
            const titleEl = card.querySelector('.resource-title');
            titleEl.dataset.itemData = JSON.stringify(item);
        } else if (type === 'tansuo') {
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title-wrapper">
                        <h3 class="resource-title" data-tooltip="tansuo">${item.mingcheng}</h3>
                    </div>
                    <button class="explore-btn">探索</button>
                </div>
                <div class="resource-meta">
                    <span class="resource-date">${item.riqi}</span>
                    ${item.tougaoren ? `<span>by ${item.tougaoren}</span>` : ''}
                </div>
                <div class="resource-url">${item.wangzhi}</div>
                <div class="resource-footer">
                    <div class="tansuo-description">${item.miaoshu}</div>
                </div>
            `;
            // 绑定悬浮提示数据
            const titleEl = card.querySelector('.resource-title');
            titleEl.dataset.itemData = JSON.stringify(item);
        }
        return card;
    }
    
    // 渲染内容
    function renderContent(data, type, container) {
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-container">请等待更新......</div>';
            return;
        }
        
        container.innerHTML = '<div class="resource-grid" id="resourceGrid"></div>';
        const grid = document.getElementById('resourceGrid');
        data.forEach(item => grid.appendChild(createCard(item, type)));
    }
    
    // 初始化事件监听
    function initEvents() {
        // 悬浮提示事件（事件委托）
        document.addEventListener('mouseover', e => {
            const title = e.target.closest('.resource-title');
            if (title && title.dataset.itemData) {
                const data = JSON.parse(title.dataset.itemData);
                const type = title.dataset.tooltip;
                showTooltip(title, data, type);
            }
        });
        
        document.addEventListener('mouseout', e => {
            if (e.target.closest('.resource-title')) {
                hideTooltip();
            }
        });
    }
    
    // 初始化模块
    function init() {
        initTooltip();
        initEvents();
    }
    
    // 导出模块
    window.InfoModule = {
        init: init,
        createCard: createCard,
        renderContent: renderContent,
        showTooltip: showTooltip,
        hideTooltip: hideTooltip
    };
})();