// 设置模块 - 适配新结构优化版
const ShezhiModule = (function() {
    let isOpen = false;
    let isEditMode = false;
    let currentFormula = '';
    
    function init() {
        createButton();
        createModal();
        LiebiaoModule.init();
    }
    
    function createButton() {
        const btn = document.createElement('div');
        btn.className = 'shezhi-btn';
        btn.innerHTML = '<i class="fas fa-cog"></i>';
        btn.onclick = openModal;
        document.body.appendChild(btn);
    }
    
    function createModal() {
        const modal = document.createElement('div');
        modal.className = 'shezhi-modal';
        modal.innerHTML = `
            <div class="shezhi-overlay"></div>
            <div class="shezhi-content">
                <div class="shezhi-header">
                    <h3>设置</h3>
                    <span class="shezhi-close" onclick="ShezhiModule.closeModal()">×</span>
                </div>
                <div class="shezhi-body">
                    <div class="shezhi-left">
                        <div class="shezhi-list" id="shezhiList"></div>
                    </div>
                    <div class="shezhi-right">
                        <div class="shezhi-formula">
                            <textarea id="formulaInput" placeholder="输入公式，例如：\n利润:收入-成本;\n利润率:利润/收入;" readonly></textarea>
                            <button class="formula-btn upload-btn" id="uploadBtn" onclick="ShezhiModule.handleUpload()" title="上传Excel">
                                <i class="fas fa-upload"></i>
                            </button>
                            <button class="formula-btn" id="formulaBtn" onclick="ShezhiModule.toggleEditMode()" title="编辑">
                                <i class="fas fa-pen"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    function openModal() {
        if (isOpen) return;
        isOpen = true;
        isEditMode = false;
        
        const modal = document.querySelector('.shezhi-modal');
        modal.classList.add('show');
        
        // 从数据库读取公式
        FirebaseModule.getFormula((formula) => {
            currentFormula = formula;
            const input = document.getElementById('formulaInput');
            input.value = formula;
            input.readOnly = true;
            input.classList.remove('editing');
        });
        
        // 重置按钮状态
        updateButtonState(false);
    }
    
    function closeModal() {
        if (isEditMode) {
            // 如果在编辑模式，提示用户
            if (!confirm('有未保存的更改，确定要关闭吗？')) {
                return;
            }
        }
        
        isOpen = false;
        isEditMode = false;
        document.querySelector('.shezhi-modal').classList.remove('show');
    }
    
    function toggleEditMode() {
        const input = document.getElementById('formulaInput');
        
        if (!isEditMode) {
            // 进入编辑模式
            isEditMode = true;
            input.readOnly = false;
            input.classList.add('editing');
            input.focus();
            updateButtonState(true);
        } else {
            // 保存并退出编辑模式
            saveFormula();
        }
    }
    
    function saveFormula() {
        const input = document.getElementById('formulaInput');
        const formula = input.value.trim();
        
        // 禁用按钮防止重复点击
        const btn = document.getElementById('formulaBtn');
        btn.disabled = true;
        
        // 保存公式
        FirebaseModule.saveFormula(formula)
            .then(() => {
                currentFormula = formula;
                
                // 退出编辑模式
                isEditMode = false;
                input.readOnly = true;
                input.classList.remove('editing');
                updateButtonState(false);
                
                if (!formula) {
                    window.showToast('公式已清空', 'info');
                } else {
                    window.showToast('公式已保存，开始计算...', 'success');
                    // 直接调用计算
                    JisuanModule.parseAndCalculate(formula);
                }
                
                btn.disabled = false;
            })
            .catch(() => {
                window.showToast('保存失败，请重试', 'error');
                btn.disabled = false;
            });
    }
    
    function updateButtonState(editing) {
        const btn = document.getElementById('formulaBtn');
        if (!btn) return;
        
        if (editing) {
            btn.innerHTML = '<i class="fas fa-save"></i>';
            btn.classList.add('save-mode');
            btn.title = '保存';
        } else {
            btn.innerHTML = '<i class="fas fa-pen"></i>';
            btn.classList.remove('save-mode');
            btn.title = '编辑';
        }
    }
    
    // 处理文件上传
    function handleUpload() {
        if (typeof ShangchuanModule !== 'undefined') {
            ShangchuanModule.handleUpload();
        } else {
            window.showToast('上传模块未加载', 'error');
        }
    }
    
    // 监听ESC键退出编辑
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen && isEditMode) {
            const input = document.getElementById('formulaInput');
            input.value = currentFormula;
            isEditMode = false;
            input.readOnly = true;
            input.classList.remove('editing');
            updateButtonState(false);
        }
    });
    
    return { 
        init, 
        closeModal, 
        toggleEditMode,
        handleUpload
    };
})();