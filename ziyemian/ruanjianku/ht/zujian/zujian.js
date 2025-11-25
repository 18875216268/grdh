// 组件模块 - 统一管理上传、下载、刷新、模板功能
const zujianModule = {
    // 动态加载SheetJS库
    async ensureSheetJS() {
        if (window.XLSX) return true;
        
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            return true;
        } catch (error) {
            console.error('加载Excel库失败:', error);
            Toast.show('加载必要组件失败，请刷新重试', 'error');
            return false;
        }
    },

    // 检查URL是否已存在
    checkUrlExists(url) {
        if (!url) return null;
        const normalized = url.trim().toLowerCase();
        
        for (const [key, link] of Object.entries(firebase.ruanjiankuData)) {
            if (link?.url?.trim().toLowerCase() === normalized) {
                return key;
            }
        }
        return null;
    },

    // 判断值是否为空
    isEmptyValue(value) {
        return !value || value.trim() === '' || value.trim() === '*';
    },

    // 确定最终类型
    determineFinalType(navKey, type, url) {
        const navItem = firebase.xiangmuData[navKey];
        const validTypes = utils.getTypesFromNav(navItem);

        if (validTypes.length === 0) return '*';
        if (!type || type === '*') return '*';

        const cleanType = type.replace(/^\*/, '');
        const detected = utils.detectNavAndType(url, firebase.xiangmuData);
        const isAutoDetected = detected.navKey === navKey && detected.type === cleanType;

        return isAutoDetected || type.startsWith('*') ? type : '*' + type;
    },

    // 智能检测导航和类型
    smartDetectNavAndType(url, userNavKey, userType) {
        if (userNavKey && firebase.xiangmuData[userNavKey]) {
            const validTypes = utils.getTypesFromNav(firebase.xiangmuData[userNavKey]);
            
            if (userType && userType !== '*') {
                const cleanType = userType.replace(/^\*/, '');
                if (validTypes.length === 0 || validTypes.includes(cleanType)) {
                    return { navKey: userNavKey, type: userType };
                }
            }
            
            if (validTypes.length === 0) {
                return { navKey: userNavKey, type: '*' };
            }
        }

        const detected = utils.detectNavAndType(url, firebase.xiangmuData);
        
        if (userNavKey && firebase.xiangmuData[userNavKey]) {
            return detected.navKey === userNavKey && detected.type 
                ? detected 
                : { navKey: userNavKey, type: '*' };
        }
        
        return detected.navKey && detected.type 
            ? detected 
            : { navKey: 'other', type: '*' };
    },

    // 保存单个资源
    async saveResource(data) {
        const { key, name, url, navKey, type, contributor, visits } = data;

        if (!name?.trim() || !url?.trim()) {
            Toast.show('请填写网站名称和链接', 'error');
            return false;
        }

        if (!navKey || !firebase.xiangmuData[navKey]) {
            Toast.show('请选择有效的导航分类', 'error');
            return false;
        }

        const finalType = this.determineFinalType(navKey, type, url);
        const existing = key ? firebase.ruanjiankuData[key] : null;

        const resourceData = {
            name: name.trim(),
            url: url.trim(),
            daohang: navKey,
            type: finalType,
            tougao: contributor?.trim() || '木小匣',
            time: existing?.time || Date.now(),
            visits: visits !== undefined ? visits : (existing?.visits || 0),
            shenhe: existing?.shenhe || '已审',
            zhuangtai: existing?.zhuangtai || '有效'
        };

        const targetKey = key || utils.generateId();
        return await firebase.updateNode(`ruanjianku/${targetKey}`, resourceData);
    },

    // 删除资源
    async deleteResource(key) {
        return await firebase.deleteNode(`ruanjianku/${key}`);
    },

    // 切换资源状态
    async toggleStatus(key, field) {
        const item = firebase.ruanjiankuData[key];
        if (!item) return false;

        const newValue = field === 'zhuangtai'
            ? (item.zhuangtai === '有效' ? '无效' : '有效')
            : (item.shenhe === '已审' ? '未审' : '已审');

        return await firebase.updateNode(`ruanjianku/${key}/${field}`, newValue);
    },

    // 提取Excel行数据
    extractRowData(row) {
        return {
            url: (row['网站链接'] || row['url'] || '').trim(),
            name: (row['网站名称'] || row['name'] || '').trim(),
            navKey: (row['导航分类'] || row['daohang'] || '').trim(),
            type: (row['资源类型'] || row['type'] || '').trim(),
            contributor: (row['投稿人'] || row['tougao'] || '').trim()
        };
    },

    // 批量上传资源
    async batchUpload(file) {
        if (!await this.ensureSheetJS()) return;

        try {
            Toast.show('正在读取文件...', 'info');
            const rows = await this.readExcel(file);

            if (!rows?.length) {
                Toast.show('文件内容为空', 'error');
                return;
            }

            Toast.show(`正在处理 ${rows.length} 条数据...`, 'info');

            const updates = {};
            let addCount = 0;
            let updateCount = 0;
            let skipCount = 0;
            
            for (const row of rows) {
                const data = this.extractRowData(row);
                
                if (!data.url || !data.name) {
                    skipCount++;
                    continue;
                }
                
                const existingKey = this.checkUrlExists(data.url);
                const existing = existingKey ? firebase.ruanjiankuData[existingKey] : null;
                
                const name = data.name;
                let navKey, type;
                
                if (existing) {
                    navKey = this.isEmptyValue(data.navKey) ? existing.daohang : data.navKey;
                    type = this.isEmptyValue(data.type) ? existing.type : data.type;
                } else {
                    navKey = data.navKey;
                    type = data.type;
                }
                
                if (this.isEmptyValue(navKey) || this.isEmptyValue(type)) {
                    const detected = this.smartDetectNavAndType(data.url, navKey, type);
                    navKey = navKey || detected.navKey;
                    type = type || detected.type;
                } else {
                    type = this.determineFinalType(navKey, type, data.url);
                }
                
                const contributor = existing && this.isEmptyValue(data.contributor)
                    ? existing.tougao
                    : (data.contributor || '木小匣');
                
                const key = existingKey || utils.generateId();
                updates[`ruanjianku/${key}`] = {
                    name,
                    url: data.url,
                    daohang: navKey,
                    type,
                    tougao: contributor,
                    time: existing?.time || Date.now(),
                    visits: existing?.visits || 0,
                    shenhe: existing?.shenhe || '已审',
                    zhuangtai: existing?.zhuangtai || '有效'
                };
                
                existingKey ? updateCount++ : addCount++;
            }

            if (Object.keys(updates).length > 0) {
                await firebase.batchUpdate(updates);
                
                const messages = [];
                if (addCount > 0) messages.push(`新增 ${addCount}`);
                if (updateCount > 0) messages.push(`更新 ${updateCount}`);
                if (skipCount > 0) messages.push(`跳过 ${skipCount}`);
                
                Toast.show(messages.join('，') + ' 条', 'success');
            } else {
                Toast.show('没有有效数据', 'warning');
            }

        } catch (error) {
            console.error('批量上传失败:', error);
            Toast.show('上传失败，请检查文件格式', 'error');
        }
    },

    // 读取Excel文件
    async readExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = window.XLSX.utils.sheet_to_json(sheet);
                    resolve(rows);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    // 下载所有资源为Excel
    async downloadResources() {
        if (!await this.ensureSheetJS()) return;

        try {
            Toast.show('正在生成下载文件...', 'info');

            const resources = Object.entries(firebase.ruanjiankuData)
                .filter(([_, value]) => value && typeof value === 'object')
                .map(([_, resource]) => {
                    const navItem = firebase.xiangmuData[resource.daohang];
                    return {
                        '日期': utils.formatDate(resource.time),
                        '网站名称': resource.name || '',
                        '网站链接': resource.url || '',
                        '导航分类': navItem?.name || resource.daohang || '',
                        '资源类型': resource.type || '',
                        '审核状态': resource.shenhe || '已审',
                        '资源状态': resource.zhuangtai || '有效',
                        '访问次数': resource.visits || 0,
                        '投稿人': resource.tougao || '木小匣'
                    };
                })
                .sort((a, b) => b['日期'].localeCompare(a['日期']));

            if (resources.length === 0) {
                Toast.show('暂无资源可下载', 'warning');
                return;
            }

            const worksheet = window.XLSX.utils.json_to_sheet(resources);
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, '资源列表');

            const fileName = `资源导出_${new Date().toISOString().split('T')[0]}.xlsx`;
            window.XLSX.writeFile(workbook, fileName);

            Toast.show(`成功导出 ${resources.length} 条资源`, 'success');

        } catch (error) {
            console.error('下载失败:', error);
            Toast.show('下载失败，请重试', 'error');
        }
    },

    // 下载模板文件
    async downloadTemplate() {
        if (!await this.ensureSheetJS()) return;

        try {
            Toast.show('正在生成模板文件...', 'info');

            // 获取所有导航分类名称
            const navNames = Object.entries(firebase.xiangmuData)
                .filter(([_, v]) => v && typeof v === 'object' && v.name)
                .sort((a, b) => (a[1].xuhao ?? 999) - (b[1].xuhao ?? 999))
                .map(([_, v]) => v.name);

            // 创建示例数据
            const templateData = [
                {
                    '网站名称': '示例网站1',
                    '网站链接': 'https://example.com',
                    '导航分类': navNames[0] || '',
                    '资源类型': '',
                    '投稿人': '木小匣'
                },
                {
                    '网站名称': '示例网站2',
                    '网站链接': 'https://example2.com',
                    '导航分类': navNames[1] || '',
                    '资源类型': '',
                    '投稿人': '张三'
                }
            ];

            const worksheet = window.XLSX.utils.json_to_sheet(templateData);
            
            // 设置列宽
            worksheet['!cols'] = [
                { wch: 20 },
                { wch: 40 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 }
            ];

            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, '资源模板');

            const fileName = '批量上传模板.xlsx';
            window.XLSX.writeFile(workbook, fileName);

            Toast.show('模板下载成功', 'success');

        } catch (error) {
            console.error('模板下载失败:', error);
            Toast.show('模板下载失败，请重试', 'error');
        }
    },

    // 刷新/重新归类所有资源
    async refresh() {
        Toast.show('开始重新归类所有资源...', 'info');
        const updates = {};
        let updateCount = 0;
        
        for (const [key, link] of Object.entries(firebase.ruanjiankuData)) {
            if (!link || typeof link !== 'object') continue;
            
            // 跳过用户手动分类的资源
            if (link.type && link.type.includes('*') && link.daohang !== 'other') {
                if (!link.time) {
                    updates[`ruanjianku/${key}/time`] = Date.now();
                    updateCount++;
                }
                if (!link.zhuangtai) {
                    updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                    updateCount++;
                }
                if (!link.shenhe) {
                    updates[`ruanjianku/${key}/shenhe`] = '已审';
                    updateCount++;
                }
                if (!link.tougao) {
                    updates[`ruanjianku/${key}/tougao`] = '木小匣';
                    updateCount++;
                }
                continue;
            }
            
            const { navKey, type } = utils.detectNavAndType(link.url, firebase.xiangmuData);
            
            if (navKey && type) {
                if (link.daohang !== navKey) {
                    updates[`ruanjianku/${key}/daohang`] = navKey;
                    updateCount++;
                }
                if (link.type !== type) {
                    updates[`ruanjianku/${key}/type`] = type;
                    updateCount++;
                }
            } else {
                if (link.daohang !== 'other') {
                    updates[`ruanjianku/${key}/daohang`] = 'other';
                    updateCount++;
                }
                if (link.type !== '*') {
                    updates[`ruanjianku/${key}/type`] = '*';
                    updateCount++;
                }
            }
            
            if (!link.time) {
                updates[`ruanjianku/${key}/time`] = Date.now();
                updateCount++;
            }
            if (!link.zhuangtai) {
                updates[`ruanjianku/${key}/zhuangtai`] = '有效';
                updateCount++;
            }
            if (!link.shenhe) {
                updates[`ruanjianku/${key}/shenhe`] = '已审';
                updateCount++;
            }
            if (!link.tougao) {
                updates[`ruanjianku/${key}/tougao`] = '木小匣';
                updateCount++;
            }
        }
        
        if (updateCount === 0) {
            Toast.show('所有资源归类已是最新状态', 'success');
            return;
        }
        
        await firebase.batchUpdate(updates);
        Toast.show(`成功更新 ${updateCount} 个字段`, 'success');
    },

    // 初始化四个按钮
    init() {
        // 模板按钮
        const templateBtn = document.querySelector('.template-btn');
        if (templateBtn) {
            templateBtn.onclick = () => this.downloadTemplate();
        }

        // 上传按钮
        const uploadBtn = document.querySelector('.upload-btn');
        if (uploadBtn) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.style.display = 'none';
            document.body.appendChild(input);

            uploadBtn.onclick = () => input.click();
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file) this.batchUpload(file);
                input.value = '';
            };
        }

        // 下载按钮
        const downloadBtn = document.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.onclick = () => this.downloadResources();
        }

        // 刷新按钮
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refresh();
        }
    }
};