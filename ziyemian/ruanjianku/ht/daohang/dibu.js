// 底部导航模块
const dibuNav = {
    init() {
        this.render();
    },
    
    render() {
        const container = document.querySelector('.nav-section-bottom');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-nav-item" data-section="featured">
                <span class="admin-nav-icon">⭐</span>
                <span>软件精选</span>
            </div>
            <div class="admin-nav-item" data-section="navigation">
                <span class="admin-nav-icon">🧭</span>
                <span>软件导航</span>
            </div>
        `;
    }
};

// 过滤规则弹窗模块
const filterModule = {
    currentEditKey: null,

    hideModal() {
        document.getElementById('addRuleModal').classList.remove('show');
    },

    edit(key) {
        this.currentEditKey = key;
        
        let validRules = '', invalidRules = '';
        
        if (key === 'tongyong') {
            const tongyong = firebase.xinxiData.tongyong || {};
            validRules = tongyong.youxiao || '';
            invalidRules = tongyong.wuxiao || '';
        } else {
            const netdiskData = firebase.xinxiData[key];
            if (netdiskData && netdiskData.guize) {
                validRules = netdiskData.guize.youxiao || '';
                invalidRules = netdiskData.guize.wuxiao || '';
            }
        }
        
        document.getElementById('ruleValidKeywords').value = validRules;
        document.getElementById('ruleInvalidKeywords').value = invalidRules;
        
        const btn = document.getElementById('confirmRuleBtn');
        btn.onclick = () => this.save();
        document.getElementById('addRuleModal').classList.add('show');
    },

    async save() {
        const validKeywords = document.getElementById('ruleValidKeywords').value.trim();
        const invalidKeywords = document.getElementById('ruleInvalidKeywords').value.trim();
        
        if (!validKeywords && !invalidKeywords) {
            Toast.show('请至少填写一个关键字', 'error');
            return;
        }
        
        if (this.currentEditKey === 'tongyong') {
            await firebase.updateXinxiNode('tongyong', {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData.tongyong?.time || Date.now()
            });
        } else {
            await firebase.updateXinxiNode(`${this.currentEditKey}/guize`, {
                youxiao: validKeywords,
                wuxiao: invalidKeywords,
                time: firebase.xinxiData[this.currentEditKey]?.guize?.time || Date.now()
            });
        }
        
        this.hideModal();
    }
};