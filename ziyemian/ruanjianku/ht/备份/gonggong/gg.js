// 公共工具函数
const utils = {
    // 生成8位随机ID
    generateId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },
    
    // 格式化日期
    formatDate(timestamp) {
        if (!timestamp) return new Date().toISOString().split('T')[0].replace(/-/g, '/');
        return new Date(timestamp).toISOString().split('T')[0].replace(/-/g, '/');
    },
    
    // 更新连接状态
    updateConnectionStatus(status) {
        const dot = document.getElementById('statusDot');
        if (dot) dot.className = `status-dot ${status}`;
    },
    
    // 递归获取对象所有值的字符串
    getAllFieldsText(obj) {
        let text = '';
        const traverse = (value) => {
            if (value === null || value === undefined) return;
            if (typeof value === 'object') {
                Object.values(value).forEach(v => traverse(v));
            } else {
                text += ' ' + String(value);
            }
        };
        traverse(obj);
        return text.toLowerCase();
    },
    
    // 提取配置（排除name、icon、xuhao、time）
    extractConfig(navItem) {
        if (!navItem || typeof navItem !== 'object') return {};
        const config = {};
        for (const [key, value] of Object.entries(navItem)) {
            if (!['name', 'icon', 'xuhao', 'time'].includes(key) && value && typeof value === 'object') {
                config[key] = value;
            }
        }
        return config;
    },
    
    // 配置转文本
    convertConfigToText(navItem) {
        const config = this.extractConfig(navItem);
        return Object.entries(config)
            .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999))
            .map(([typeName, typeData]) => `${typeName}:${typeData.yuming || ''}`)
            .join('\n');
    },
    
    // 文本转配置
    convertTextToConfig(text) {
        if (!text || !text.trim()) return {};
        const result = {};
        text.split('\n').map(l => l.trim()).filter(l => l).forEach((line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            const typeName = line.substring(0, colonIndex).trim();
            const yuming = line.substring(colonIndex + 1).trim();
            if (typeName) {
                result[typeName] = { yuming, xuhao: index + 1, time: Date.now() };
            }
        });
        return result;
    },
    
    // 获取导航项的所有类型名称
    getTypesFromNav(navItem) {
        if (!navItem || typeof navItem !== 'object') return [];
        return Object.keys(navItem)
            .filter(key => !['name', 'icon', 'xuhao', 'time'].includes(key))
            .filter(key => navItem[key] && typeof navItem[key] === 'object');
    },
    
    // 根据URL检测导航项和资源类型
    detectNavAndType(url, xiangmuData) {
        if (!url) return { navKey: null, type: null };
        const lowerUrl = url.toLowerCase();
        
        for (const [navKey, navItem] of Object.entries(xiangmuData)) {
            if (!navItem || typeof navItem !== 'object') continue;
            
            for (const [typeName, typeData] of Object.entries(navItem)) {
                if (['name', 'icon', 'xuhao', 'time'].includes(typeName)) continue;
                
                if (typeData && typeData.yuming && typeData.yuming !== '*') {
                    const domains = typeData.yuming.split(',').map(d => d.trim());
                    if (domains.some(domain => domain && lowerUrl.includes(domain.toLowerCase()))) {
                        return { navKey, type: typeName };
                    }
                }
            }
        }
        return { navKey: null, type: null };
    },
    
    // 计算导航项统计数据（只根据daohang统计）
    calcNavStats(navKey, xiangmuData, ruanjiankuData) {
        const navItem = xiangmuData[navKey];
        if (!navItem) return { total: 0, types: 0, unreviewed: 0, invalid: 0 };
        
        const allLinks = Object.values(ruanjiankuData).filter(link => 
            link && typeof link === 'object' && link.daohang === navKey
        );
        
        return {
            total: allLinks.length,
            types: this.getTypesFromNav(navItem).length,
            unreviewed: allLinks.filter(link => link.shenhe === '未审').length,
            invalid: allLinks.filter(link => link.zhuangtai === '无效').length
        };
    }
};

// 公共搜索模块
const searchModule = {
    filterItems(items, searchKeyword, getSearchText) {
        if (!searchKeyword) return [...items];
        const searchText = searchKeyword.toLowerCase();
        
        if (searchText.includes(',') || searchText.includes('，')) {
            const keywords = searchText.split(/[,，]/).map(k => k.trim()).filter(k => k);
            return items.filter(item => {
                const itemText = getSearchText ? getSearchText(item) : utils.getAllFieldsText(item);
                return keywords.some(keyword => itemText.includes(keyword));
            });
        }
        
        const keywords = searchText.split(/\s+/).filter(k => k);
        return items.filter(item => {
            const itemText = getSearchText ? getSearchText(item) : utils.getAllFieldsText(item);
            return keywords.every(keyword => itemText.includes(keyword));
        });
    }
};