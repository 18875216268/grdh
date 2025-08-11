// ==================== 统一弹窗系统 ====================

// 全局变量
let currentEditData = {};
let currentEditType = '';

// 打开弹窗
function showModal() {
    document.getElementById('modal').classList.add('show');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('modalBody').innerHTML = '';
    currentEditData = {};
    currentEditType = '';
}

// 显示编辑弹窗
function showEditModal(type, data = null) {
    currentEditType = type;
    currentEditData = data || {};
    
    // 设置标题
    const title = data ? '编辑' : '添加';
    document.getElementById('modalTitle').textContent = title;
    
    // 生成表单
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = generateEditForm(type, data);
    
    // 初始化特殊控件
    if (type === 'resource') {
        initResourceAppInput();
    } else if (type === 'app') {
        initAppSelect();
    } else if (type === 'lanmu') {
        initLanmuForm();
    }
    
    // 绑定提交事件
    document.getElementById('modalSubmit').onclick = () => saveEditForm();
    
    showModal();
}

// 生成编辑表单
function generateEditForm(type, data) {
    const forms = {
        lanmu: generateLanmuForm(data),
        resource: generateResourceForm(data),
        app: generateAppForm(data),
        tansuo: generateTansuoForm(data)
    };
    
    return `<form class="form" id="editForm">${forms[type] || ''}</form>`;
}

// 栏目表单
function generateLanmuForm(data) {
    return `
        <div class="form-group">
            <label class="form-label">1. 栏目</label>
            <input type="text" class="form-input" name="name" id="lanmuName" 
                value="${data?.name || ''}" placeholder="请输入栏目名称" required>
        </div>
        <div class="form-group">
            <label class="form-label">2. 应用</label>
            <input type="text" class="form-input" name="apps" id="lanmuApps" 
                value="${data?.apps || ''}" placeholder="请输入应用名称，多个用|分隔">
        </div>
        <div class="form-group">
            <label class="form-label">3. 图标</label>
            <div class="icon-grid" id="iconGrid">
                <!-- 图标将通过JS动态生成 -->
            </div>
        </div>
    `;
}

// 资源表单
function generateResourceForm(data) {
    const lanmuOptions = Object.keys(currentLanmuData).map(name => 
        `<option value="${name}" ${data?.lanmu === name ? 'selected' : ''}>${name}</option>`
    ).join('');
    
    return `
        <div class="form-group">
            <label class="form-label">1. 栏目</label>
            <select class="form-select" name="lanmu" id="editLanmu" onchange="updateResourceAppInput()">
                <option value="">请选择栏目</option>
                ${lanmuOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">2. 应用</label>
            <div class="tag-input-field" id="resourceAppInput">
                <span class="tag-placeholder">请先选择栏目</span>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">3. 名称</label>
            <input type="text" class="form-input" name="mingcheng" 
                value="${data?.mingcheng || ''}" placeholder="请输入资源名称" required>
        </div>
        <div class="form-group">
            <label class="form-label">4. URL</label>
            <input type="text" class="form-input" name="url" 
                value="${data?.url || ''}" placeholder="请输入资源地址" required>
        </div>
        <div class="form-group">
            <label class="form-label">5. 源数量（选填）</label>
            <input type="text" class="form-input" name="yuanshuliang" 
                value="${data?.yuanshuliang || ''}" placeholder="请输入源数量">
        </div>
        <div class="form-group">
            <label class="form-label">6. 投稿人（选填）</label>
            <input type="text" class="form-input" name="tougaoren" 
                value="${data?.tougaoren || ''}" placeholder="请输入投稿人">
        </div>
    `;
}

// 应用表单
function generateAppForm(data) {
    const lanmuOptions = Object.keys(currentLanmuData).map(name => 
        `<option value="${name}" ${data?.lanmu === name ? 'selected' : ''}>${name}</option>`
    ).join('');
    
    return `
        <div class="form-group">
            <label class="form-label">1. 栏目</label>
            <select class="form-select" name="lanmu" id="editLanmu" onchange="updateAppSelect()">
                <option value="">请选择栏目</option>
                ${lanmuOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">2. 应用</label>
            <select class="form-select" name="appName" id="editAppName">
                <option value="">请先选择栏目</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">3. 名称</label>
            <input type="text" class="form-input" name="mingc" 
                value="${data?.mingc || ''}" placeholder="请输入子应用名称" required>
        </div>
        <div class="form-group">
            <label class="form-label">4. URL</label>
            <input type="text" class="form-input" name="url" 
                value="${data?.url || ''}" placeholder="请输入下载地址" required>
        </div>
        <div class="form-group">
            <label class="form-label">5. 投稿人（选填）</label>
            <input type="text" class="form-input" name="tougaoren" 
                value="${data?.tougaoren || ''}" placeholder="请输入投稿人，默认为木小匣">
        </div>
    `;
}

// 探索表单 - 添加投稿人字段
function generateTansuoForm(data) {
    return `
        <div class="form-group">
            <label class="form-label">1. 名称</label>
            <input type="text" class="form-input" name="mingcheng" 
                value="${data?.mingcheng || ''}" placeholder="请输入探索名称" required>
        </div>
        <div class="form-group">
            <label class="form-label">2. URL</label>
            <input type="text" class="form-input" name="wangzhi" 
                value="${data?.wangzhi || ''}" placeholder="请输入探索地址" required>
        </div>
        <div class="form-group">
            <label class="form-label">3. 描述</label>
            <textarea class="form-textarea" name="miaoshu" 
                placeholder="请输入描述信息（限200字）" maxlength="200">${data?.miaoshu || ''}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">4. 投稿人（选填）</label>
            <input type="text" class="form-input" name="tougaoren" 
                value="${data?.tougaoren || ''}" placeholder="请输入投稿人，默认为木小匣">
        </div>
    `;
}

// 初始化栏目表单
function initLanmuForm() {
    const iconGrid = document.getElementById('iconGrid');
    if (!iconGrid) return;
    
    const currentIcon = currentEditData.tubiao || '📂';
    iconGrid.innerHTML = emojiIcons.map(icon => 
        `<div class="icon-item${icon === currentIcon ? ' active' : ''}" 
            onclick="selectIcon('${icon}', this)">${icon}</div>`
    ).join('');
}

// 资源应用输入
let resourceSelectedApps = [];
let resourceAvailableApps = [];

function initResourceAppInput() {
    resourceSelectedApps = [];
    resourceAvailableApps = [];
    
    if (currentEditData.yingyong) {
        resourceSelectedApps = currentEditData.yingyong.split('|').filter(app => app.trim());
    }
    updateResourceAppInput();
}

function updateResourceAppInput() {
    const lanmu = document.getElementById('editLanmu').value;
    const inputField = document.getElementById('resourceAppInput');
    
    if (!lanmu) {
        inputField.innerHTML = '<span class="tag-placeholder">请先选择栏目</span>';
        resourceAvailableApps = [];
        return;
    }
    
    // 从applist读取应用列表
    if (currentLanmuData[lanmu]?.applist) {
        resourceAvailableApps = currentLanmuData[lanmu].applist.split('|').filter(app => app.trim());
        
        if (currentEditData.lanmu === lanmu && currentEditData.yingyong) {
            resourceSelectedApps = currentEditData.yingyong.split('|').filter(app => app.trim());
        } else {
            resourceSelectedApps = [];
        }
    } else {
        resourceAvailableApps = [];
    }
    
    renderResourceAppInput();
}

function renderResourceAppInput() {
    const inputField = document.getElementById('resourceAppInput');
    
    if (resourceAvailableApps.length === 0) {
        inputField.innerHTML = '<span class="tag-placeholder">该栏目暂无应用</span>';
        return;
    }
    
    const tags = resourceAvailableApps.map(app => {
        const isSelected = resourceSelectedApps.includes(app);
        return `<span class="mini-tag ${isSelected ? 'selected' : ''}" 
            onclick="toggleResourceApp('${app}')">${app}</span>`;
    }).join('');
    
    inputField.innerHTML = tags;
}

function toggleResourceApp(appName) {
    const index = resourceSelectedApps.indexOf(appName);
    if (index > -1) {
        resourceSelectedApps.splice(index, 1);
    } else {
        resourceSelectedApps.push(appName);
    }
    renderResourceAppInput();
}

// 应用下拉
function initAppSelect() {
    updateAppSelect();
}

function updateAppSelect() {
    const lanmu = document.getElementById('editLanmu').value;
    const appSelect = document.getElementById('editAppName');
    
    if (!appSelect) return;
    
    appSelect.innerHTML = '<option value="">请先选择栏目</option>';
    
    // 从applist读取应用列表
    if (lanmu && currentLanmuData[lanmu]?.applist) {
        const apps = currentLanmuData[lanmu].applist.split('|').filter(app => app.trim());
        apps.forEach(app => {
            const option = document.createElement('option');
            option.value = app;
            option.textContent = app;
            
            if (currentEditData.appName === app && currentEditData.lanmu === lanmu) {
                option.selected = true;
            }
            
            appSelect.appendChild(option);
        });
    }
}

// 保存表单
async function saveEditForm() {
    const form = document.getElementById('editForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 根据类型调用不同的保存函数
    try {
        if (currentEditType === 'lanmu') {
            await saveLanmuForm(data);
        } else if (currentEditType === 'resource') {
            await saveResourceForm(data);
        } else if (currentEditType === 'app') {
            await saveAppForm(data);
        } else if (currentEditType === 'tansuo') {
            await saveTansuoForm(data);
        }
        
        showToast('保存成功', 'success');
        closeModal();
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败', 'error');
    }
}

// 保存栏目
async function saveLanmuForm(data) {
    const name = data.name.trim();
    const apps = data.apps.trim();
    const isEdit = !!currentEditData.name;
    const oldName = currentEditData.name;
    
    if (!name) {
        showToast('请输入栏目名称', 'error');
        throw new Error('栏目名称不能为空');
    }
    
    await saveLanmu();
}

// 保存资源
async function saveResourceForm(data) {
    if (!data.lanmu || !data.mingcheng || !data.url) {
        showToast('请填写必填项', 'error');
        throw new Error('必填项不能为空');
    }
    
    if (resourceSelectedApps.length === 0) {
        showToast('请选择至少一个应用', 'error');
        throw new Error('未选择应用');
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const id = currentEditData.id || generateId();
    
    const saveData = {
        mingcheng: data.mingcheng,
        lanmu: data.lanmu,
        url: data.url,
        yingyong: resourceSelectedApps.join('|'),
        yuanshuliang: data.yuanshuliang || '未知',
        tougaoren: data.tougaoren || '木小匣',  // 用户未输入时默认为木小匣
        shijian: currentDate,
        fuzhishu: currentEditData.fuzhishu || '0',
        shenhe: currentEditData.shenhe || '已审核',
        zhuangtai: currentEditData.zhuangtai || '有效'
    };
    
    if (currentEditData.id && currentEditData.lanmu !== data.lanmu) {
        await database.ref(`lanmu/${currentEditData.lanmu}/neirong/${id}`).remove();
    }
    
    await database.ref(`lanmu/${data.lanmu}/neirong/${id}`).set(saveData);
}

// 保存应用 - 处理投稿人默认值
async function saveAppForm(data) {
    if (!data.lanmu || !data.appName || !data.mingc || !data.url) {
        showToast('请填写必填项', 'error');
        throw new Error('必填项不能为空');
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const id = currentEditData.id || generateId();
    
    const saveData = {
        mingc: data.mingc,
        url: data.url,
        miaoshu: '',
        wangpan: autoDetectWangpan(data.url),
        riqi: currentDate,
        yihuoqu: currentEditData.yihuoqu || '0',
        tougaoren: data.tougaoren || '木小匣'  // 用户未输入时默认为木小匣
    };
    
    // 如果是编辑且栏目或应用改变，需要删除旧记录
    if (currentEditData.id && (currentEditData.lanmu !== data.lanmu || currentEditData.appName !== data.appName)) {
        await database.ref(`lanmu/${currentEditData.lanmu}/app/${currentEditData.appName}/${id}`).remove();
    }
    
    // 保存到新位置（Firebase会自动创建不存在的路径）
    await database.ref(`lanmu/${data.lanmu}/app/${data.appName}/${id}`).set(saveData);
}

// 保存探索 - 添加投稿人处理
async function saveTansuoForm(data) {
    if (!data.mingcheng || !data.wangzhi || !data.miaoshu) {
        showToast('请填写所有必填字段', 'error');
        throw new Error('必填项不能为空');
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    const id = currentEditData.id || generateId();
    
    const saveData = {
        mingcheng: data.mingcheng,
        wangzhi: data.wangzhi,
        miaoshu: data.miaoshu,
        riqi: currentDate,
        tougaoren: data.tougaoren || '木小匣'  // 用户未输入时默认为木小匣
    };
    
    await database.ref(`tansuo/${id}`).set(saveData);
}