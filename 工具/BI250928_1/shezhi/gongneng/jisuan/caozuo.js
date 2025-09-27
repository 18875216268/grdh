// 计算操作模块 - 数据库操作和外部交互 (v1.2)
const CaozuoModule = (function() {
    let biaozhiRef = null;
    let isCalculating = false;
    
    function init() {
        biaozhiRef = FirebaseModule.getBiaozhiRef();
        
        biaozhiRef.on('value', (snapshot) => {
            const value = snapshot.val();
            if (value !== null) {
                FirebaseModule.getFormula((formula) => {
                    // 处理所有情况，包括空公式
                    if (formula !== null && formula !== undefined) {
                        executeCalculation(formula);
                    }
                });
            }
        });
    }
    
    function parseAndCalculate(text) {
        if (isCalculating) {
            window.showToast('计算进行中，请稍候。', 'warning');
            return;
        }
        executeCalculation(text);
    }
    
    function executeCalculation(formulaText) {
        if (isCalculating) return;
        
        isCalculating = true;
        
        // 如果公式为空或只有空白，删除镜像节点和孤立配置
        if (!formulaText || !formulaText.trim()) {
            console.log('公式为空，清理镜像数据和配置。');
            
            // 获取当前数据以识别需要清理的配置
            Promise.all([
                firebase.database().ref('/peizhi/jingxiang').once('value'),
                new Promise(resolve => {
                    FirebaseModule.getAllFuzerenData(data => resolve(data));
                })
            ]).then(([mirrorSnapshot, fuzerenData]) => {
                const currentMirrorData = mirrorSnapshot.val() || {};
                
                // 使用统一的清理函数
                const { cleanupOps } = SuanshuModule.buildCleanupOperations(
                    currentMirrorData,
                    null,  // 没有requirements表示全部清理
                    fuzerenData
                );
                
                // 添加删除整个镜像节点
                cleanupOps['/peizhi/jingxiang'] = null;
                
                // 执行批量删除
                return firebase.database().ref().update(cleanupOps);
            }).then(() => {
                isCalculating = false;
                console.log('镜像数据和孤立配置已清理。');
            }).catch(error => {
                isCalculating = false;
                console.error('清理失败：', error);
            });
            return;
        }
        
        // 正常的计算流程
        const groupResult = JiexiModule.parseGroupedFormulas(formulaText);
        if (!groupResult.success) {
            isCalculating = false;
            window.showToast(groupResult.message, 'error');
            return;
        }
        
        FirebaseModule.getAllFuzerenData((fuzerenData) => {
            if (!fuzerenData) {
                isCalculating = false;
                window.showToast('暂无数据，无法计算。', 'error');
                return;
            }
            
            executeGroupedCalculation(groupResult, fuzerenData);
        });
    }
    
    function executeGroupedCalculation(groupResult, fuzerenData) {
        const { normalGroups, mirrorGroups } = groupResult;
        let successCount = 0;
        let failCount = 0;
        
        // 第一步：执行普通计算
        if (normalGroups.length > 0) {
            executeNormalCalculation(normalGroups, fuzerenData)
                .then((result) => {
                    successCount += (result && result.successCount) || 0;
                    failCount += (result && result.failCount) || 0;
                    
                    // 第二步：执行镜像计算（使用更新后的数据）
                    if (mirrorGroups.length > 0) {
                        const dataForMirror = result.updatedData || fuzerenData;
                        return executeOptimizedMirrorCalculation(mirrorGroups, dataForMirror);
                    } else {
                        // 无镜像需求，删除整个镜像节点
                        return firebase.database().ref('/peizhi/jingxiang').remove()
                            .then(() => ({ successCount: 0, failCount: 0 }));
                    }
                })
                .then((mirrorResult) => {
                    successCount += (mirrorResult && mirrorResult.successCount) || 0;
                    failCount += (mirrorResult && mirrorResult.failCount) || 0;
                    isCalculating = false;
                    window.showToast(`计算完毕！${successCount}个字段成功，${failCount}个字段失败。`, 'success');
                })
                .catch(error => {
                    isCalculating = false;
                    window.showToast('计算失败：' + error.message, 'error');
                    console.error('计算错误：', error);
                });
        } else if (mirrorGroups.length > 0) {
            // 只有镜像计算
            executeOptimizedMirrorCalculation(mirrorGroups, fuzerenData)
                .then((result) => {
                    isCalculating = false;
                    const successCount = (result && result.successCount) || 0;
                    const failCount = (result && result.failCount) || 0;
                    window.showToast(`计算完毕！${successCount}个字段成功，${failCount}个字段失败。`, 'success');
                })
                .catch(error => {
                    isCalculating = false;
                    window.showToast('计算失败：' + error.message, 'error');
                    console.error('计算错误：', error);
                });
        } else {
            // 无任何计算需求，删除镜像节点
            firebase.database().ref('/peizhi/jingxiang').remove()
                .then(() => {
                    isCalculating = false;
                    window.showToast('计算完毕！0个字段成功，0个字段失败。', 'warning');
                });
        }
    }
    
    // 执行普通计算（返回更新后的数据）
    function executeNormalCalculation(normalGroups, fuzerenData) {
        return new Promise((resolve, reject) => {
            try {
                const allResults = SuanshuModule.executeNormalCalculationLogic(normalGroups, fuzerenData);
                
                // 创建更新后的数据副本
                const updatedFuzerenData = JSON.parse(JSON.stringify(fuzerenData));
                Object.entries(allResults).forEach(([operatorId, fields]) => {
                    if (!updatedFuzerenData[operatorId].jieguo) {
                        updatedFuzerenData[operatorId].jieguo = {};
                    }
                    Object.assign(updatedFuzerenData[operatorId].jieguo, fields);
                });
                
                // 保存结果并返回更新后的数据
                saveNormalResults(allResults, fuzerenData)
                    .then((saveResult) => {
                        resolve({ 
                            ...saveResult, 
                            updatedData: updatedFuzerenData 
                        });
                    })
                    .catch(reject);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 优化后的镜像计算
    function executeOptimizedMirrorCalculation(mirrorGroups, fuzerenData) {
        return new Promise((resolve, reject) => {
            // 分析镜像需求
            const mirrorAnalysis = SuanshuModule.analyzeMirrorRequirements(mirrorGroups, fuzerenData);
            if (!mirrorAnalysis.success) {
                reject(new Error(mirrorAnalysis.message));
                return;
            }
            
            // 智能清理和内存计算
            smartMirrorProcessing(mirrorGroups, mirrorAnalysis.requirements, fuzerenData)
                .then(result => resolve(result))
                .catch(reject);
        });
    }
    
    // 智能镜像处理
    async function smartMirrorProcessing(mirrorGroups, requirements, fuzerenData) {
        try {
            console.log('开始镜像计算处理。');
            
            // 1. 获取当前镜像数据
            const currentMirrorSnapshot = await firebase.database().ref('/peizhi/jingxiang').once('value');
            const currentMirrorData = currentMirrorSnapshot.val() || {};
            
            // 2. 使用统一的清理函数构建清理操作
            const { cleanupOps } = SuanshuModule.buildCleanupOperations(
                currentMirrorData,
                requirements,
                fuzerenData
            );
            
            // 3. 在内存中执行计算（使用包含普通计算结果的数据）
            const localMirror = SuanshuModule.createLocalMirror(fuzerenData, requirements);
            const calculationResults = SuanshuModule.performLocalCalculations(mirrorGroups, localMirror, requirements);
            
            // 4. 构建更新操作
            const mirrorUpdates = buildMirrorUpdates(calculationResults);
            const configUpdates = await buildConfigUpdates(calculationResults);
            
            // 5. 合并所有操作并批量执行
            const allUpdates = {
                ...cleanupOps,
                ...mirrorUpdates,
                ...configUpdates
            };
            
            if (Object.keys(allUpdates).length > 0) {
                await firebase.database().ref().update(allUpdates);
            }
            
            // 统计成功的字段数
            let successCount = 0;
            Object.values(calculationResults).forEach(fields => {
                successCount += Object.keys(fields).length;
            });
            
            console.log(`镜像计算完成，成功计算 ${successCount} 个字段。`);
            return { successCount, failCount: 0 };
            
        } catch (error) {
            console.error('镜像处理错误：', error);
            throw error;
        }
    }
    
    // 构建镜像更新
    function buildMirrorUpdates(calculationResults) {
        const updates = {};
        
        Object.entries(calculationResults).forEach(([operatorId, fields]) => {
            Object.entries(fields).forEach(([field, value]) => {
                updates[`/peizhi/jingxiang/${operatorId}/jieguo/${field}`] = value;
            });
        });
        
        return updates;
    }
    
    // 构建配置更新
    async function buildConfigUpdates(calculationResults) {
        const updates = {};
        const allNewFields = new Set();
        
        // 收集所有新字段
        Object.values(calculationResults).forEach(fields => {
            Object.keys(fields).forEach(field => allNewFields.add(field));
        });
        
        if (allNewFields.size > 0) {
            const snapshot = await firebase.database().ref('/peizhi').once('value');
            const peizhiData = snapshot.val() || {};
            
            allNewFields.forEach(fieldName => {
                const configUpdates = FirebaseModule.generateFieldConfig(
                    fieldName,
                    peizhiData.shunxu || {},
                    peizhiData.zhuangtai || {}
                );
                Object.assign(updates, configUpdates);
            });
        }
        
        return updates;
    }
    
    // 保存普通计算结果
    function saveNormalResults(results, originalData) {
        return new Promise((resolve, reject) => {
            const updates = {};
            
            Object.entries(results).forEach(([operatorId, fields]) => {
                Object.entries(fields).forEach(([field, value]) => {
                    updates[`/fuzeren/${operatorId}/jieguo/${field}`] = value;
                });
            });
            
            if (Object.keys(updates).length === 0) {
                resolve({ successCount: 0, failCount: 0 });
                return;
            }
            
            const existingFields = FirebaseModule.extractAllFields(originalData);
            const newFields = new Set();
            let successCount = 0;
            
            Object.values(results).forEach(fields => {
                Object.keys(fields).forEach(field => {
                    successCount++;
                    if (!existingFields.includes(field)) {
                        newFields.add(field);
                    }
                });
            });
            
            if (newFields.size > 0) {
                firebase.database().ref('/peizhi').once('value').then(snapshot => {
                    const peizhiData = snapshot.val() || {};
                    
                    newFields.forEach(fieldName => {
                        const configUpdates = FirebaseModule.generateFieldConfig(
                            fieldName,
                            peizhiData.shunxu || {},
                            peizhiData.zhuangtai || {}
                        );
                        Object.assign(updates, configUpdates);
                    });
                    
                    return firebase.database().ref().update(updates);
                }).then(() => resolve({ successCount, failCount: 0 })).catch(reject);
            } else {
                firebase.database().ref().update(updates)
                    .then(() => resolve({ successCount, failCount: 0 }))
                    .catch(reject);
            }
        });
    }
    
    return {
        init,
        parseAndCalculate
    };
})();