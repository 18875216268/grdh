// 计算模块 - 支持镜像计算版 (v4.0)
const JisuanModule = (function() {
    let biaozhiRef = null;
    let isCalculating = false;
    
    function init() {
        biaozhiRef = FirebaseModule.getBiaozhiRef();
        
        biaozhiRef.on('value', (snapshot) => {
            const value = snapshot.val();
            if (value !== null) {
                FirebaseModule.getFormula((formula) => {
                    if (formula && formula.trim()) {
                        executeCalculation(formula);
                    }
                });
            }
        });
    }
    
    function parseAndCalculate(text) {
        if (isCalculating) {
            window.showToast('计算进行中，请稍候...', 'warning');
            return;
        }
        executeCalculation(text);
    }
    
    function executeCalculation(formulaText) {
        if (!formulaText || isCalculating) return;
        
        isCalculating = true;
        
        const groupResult = JiexiModule.parseGroupedFormulas(formulaText);
        if (!groupResult.success) {
            isCalculating = false;
            window.showToast(groupResult.message, 'error');
            return;
        }
        
        // 检查是否有镜像公式，没有则清除镜像节点
        if (groupResult.mirrorGroups.length === 0) {
            firebase.database().ref('/peizhi/jingxiang').remove().then(() => {
                proceedWithCalculation();
            }).catch(error => {
                proceedWithCalculation(); // 继续执行，不因为清除失败而中断
            });
        } else {
            proceedWithCalculation();
        }
        
        function proceedWithCalculation() {
            FirebaseModule.getAllFuzerenData((fuzerenData) => {
                if (!fuzerenData) {
                    isCalculating = false;
                    window.showToast('暂无数据，无法计算。', 'error');
                    return;
                }
                
                executeGroupedCalculation(groupResult, fuzerenData);
            });
        }
    }
    
    function executeGroupedCalculation(groupResult, fuzerenData) {
        const { normalGroups, mirrorGroups } = groupResult;
        let successCount = 0;
        let failCount = 0;
        
        // 第一步：执行普通计算
        if (normalGroups.length > 0) {
            executeNormalCalculation(normalGroups, fuzerenData)
                .then((result) => {
                    successCount += result.successCount;
                    failCount += result.failCount;
                    // 第二步：执行镜像计算
                    if (mirrorGroups.length > 0) {
                        return executeMirrorCalculation(mirrorGroups, fuzerenData);
                    }
                    return { successCount: 0, failCount: 0 };
                })
                .then((mirrorResult) => {
                    successCount += mirrorResult.successCount;
                    failCount += mirrorResult.failCount;
                    isCalculating = false;
                    window.showToast(`计算完毕！${successCount}个字段成功，${failCount}个字段失败。`, 'success');
                })
                .catch(error => {
                    isCalculating = false;
                    window.showToast('计算失败: ' + error.message, 'error');
                });
        } else if (mirrorGroups.length > 0) {
            // 只有镜像计算
            executeMirrorCalculation(mirrorGroups, fuzerenData)
                .then((result) => {
                    isCalculating = false;
                    window.showToast(`计算完毕！${result.successCount}个字段成功，${result.failCount}个字段失败。`, 'success');
                })
                .catch(error => {
                    isCalculating = false;
                    window.showToast('计算失败: ' + error.message, 'error');
                });
        } else {
            isCalculating = false;
            window.showToast('计算完毕！0个字段成功，0个字段失败。', 'warning');
        }
    }
    
    // 执行普通计算
    function executeNormalCalculation(normalGroups, fuzerenData) {
        return new Promise((resolve, reject) => {
            const workingData = JSON.parse(JSON.stringify(fuzerenData));
            const allResults = {};
            
            console.log('\n--- 普通计算开始 ---');
            
            // 通用计算
            const generalGroup = normalGroups.find(g => g.target === '通用');
            if (generalGroup) {
                const parseResult = JiexiModule.parseFormulas(generalGroup.content);
                if (!parseResult.success) {
                    reject(new Error(parseResult.message));
                    return;
                }
                
                const existingFields = FirebaseModule.extractAllFields(fuzerenData);
                const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, existingFields);
                
                if (!analysisResult.success) {
                    reject(new Error('分析失败: ' + analysisResult.errors.join('; ')));
                    return;
                }
                
                console.log(`通用公式：${analysisResult.sortedFormulas.length}个字段`);
                
                Object.keys(workingData).forEach(operatorId => {
                    const results = calculateForOperator(analysisResult.sortedFormulas, workingData[operatorId]);
                    allResults[operatorId] = results;
                    
                    if (!workingData[operatorId].jieguo) {
                        workingData[operatorId].jieguo = {};
                    }
                    Object.assign(workingData[operatorId].jieguo, results);
                });
                
                console.log('通用计算完成');
            }
            
            // 个性化计算
            const personalGroups = normalGroups.filter(g => g.target !== '通用');
            personalGroups.forEach(group => {
                const operatorId = findOperatorByName(fuzerenData, group.target);
                if (!operatorId) {
                    console.log(`跳过不存在的负责人: ${group.target}`);
                    return;
                }
                
                console.log(`\n计算 ${group.target}:`);
                
                const parseResult = JiexiModule.parseFormulas(group.content);
                if (!parseResult.success) {
                    console.error(`  解析失败: ${parseResult.message}`);
                    return;
                }
                
                const personalContext = workingData[operatorId].jieguo || {};
                const availableFields = Object.keys(personalContext).concat('name');
                
                const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, availableFields);
                if (!analysisResult.success) {
                    const missingFields = analysisResult.errors.map(error => 
                        error.replace(/^字段 ".+?": 缺少 /, '')
                    ).join(',');
                    console.error(`@${group.target}，缺失"${missingFields}"。`);
                    return;
                }
                
                const personalResults = calculateForOperator(analysisResult.sortedFormulas, workingData[operatorId]);
                
                if (!allResults[operatorId]) {
                    allResults[operatorId] = {};
                }
                Object.assign(allResults[operatorId], personalResults);
                Object.assign(workingData[operatorId].jieguo, personalResults);
            });
            
            // 保存普通计算结果
            saveNormalResults(allResults, fuzerenData).then(resolve).catch(reject);
        });
    }
    
    // 执行镜像计算
    function executeMirrorCalculation(mirrorGroups, fuzerenData) {
        return new Promise((resolve, reject) => {
            let successCount = 0;
            let failCount = 0;
            
            // 分析需要镜像的负责人和字段
            const mirrorAnalysis = analyzeMirrorRequirements(mirrorGroups, fuzerenData);
            if (!mirrorAnalysis.success) {
                reject(new Error(mirrorAnalysis.message));
                return;
            }
            
            // 创建镜像节点
            createMirrorNodes(mirrorAnalysis.requirements, fuzerenData)
                .then(() => {
                    // 执行镜像计算
                    return performMirrorCalculations(mirrorGroups, mirrorAnalysis.requirements);
                })
                .then((result) => {
                    resolve({ successCount: result.successCount, failCount: result.failCount });
                })
                .catch(reject);
        });
    }
    
    // 分析镜像需求
    function analyzeMirrorRequirements(mirrorGroups, fuzerenData) {
        const requirements = {};
        
        // 通用镜像计算
        const generalMirrorGroup = mirrorGroups.find(g => g.target === '通用');
        if (generalMirrorGroup) {
            const parseResult = JiexiModule.parseFormulas(generalMirrorGroup.content);
            if (!parseResult.success) {
                return { success: false, message: parseResult.message };
            }
            
            const requiredFields = new Set();
            parseResult.data.forEach(formula => {
                JiexiModule.extractFields(formula.expression).forEach(field => {
                    requiredFields.add(field);
                });
            });
            
            // 为所有负责人创建通用镜像需求
            Object.keys(fuzerenData).forEach(operatorId => {
                if (!requirements[operatorId]) {
                    requirements[operatorId] = new Set();
                }
                requiredFields.forEach(field => {
                    if (field !== 'name') {
                        requirements[operatorId].add(field);
                    }
                });
            });
        }
        
        // 个性化镜像计算
        const personalMirrorGroups = mirrorGroups.filter(g => g.target !== '通用');
        personalMirrorGroups.forEach(group => {
            const operatorId = findOperatorByName(fuzerenData, group.target);
            if (!operatorId) return;
            
            const parseResult = JiexiModule.parseFormulas(group.content);
            if (!parseResult.success) return;
            
            if (!requirements[operatorId]) {
                requirements[operatorId] = new Set();
            }
            
            parseResult.data.forEach(formula => {
                JiexiModule.extractFields(formula.expression).forEach(field => {
                    if (field !== 'name') {
                        requirements[operatorId].add(field);
                    }
                });
            });
        });
        
        return { success: true, requirements };
    }
    
    // 创建镜像节点
    function createMirrorNodes(requirements, fuzerenData) {
        const mirrorUpdates = {};
        
        Object.entries(requirements).forEach(([operatorId, fields]) => {
            const personData = fuzerenData[operatorId];
            if (!personData) return;
            
            // 复制基础信息
            mirrorUpdates[`/peizhi/jingxiang/${operatorId}/name`] = personData.name;
            mirrorUpdates[`/peizhi/jingxiang/${operatorId}/order`] = personData.order || 999999;
            
            // 复制需要的字段
            fields.forEach(field => {
                const value = personData.jieguo ? personData.jieguo[field] : null;
                if (value !== null && value !== undefined) {
                    mirrorUpdates[`/peizhi/jingxiang/${operatorId}/jieguo/${field}`] = value;
                }
            });
        });
        
        if (Object.keys(mirrorUpdates).length === 0) {
            return Promise.resolve();
        }
        
        return firebase.database().ref().update(mirrorUpdates);
    }
    
    // 执行镜像计算
    function performMirrorCalculations(mirrorGroups, requirements) {
        return new Promise((resolve, reject) => {
            let successCount = 0;
            let failCount = 0;
            
            // 获取镜像数据
            firebase.database().ref('/peizhi/jingxiang').once('value')
                .then(snapshot => {
                    const mirrorData = snapshot.val() || {};
                    const mirrorResults = {};
                    
                    // 通用镜像计算
                    const generalGroup = mirrorGroups.find(g => g.target === '通用');
                    if (generalGroup) {
                        const parseResult = JiexiModule.parseFormulas(generalGroup.content);
                        if (!parseResult.success) {
                            failCount += parseResult.data ? parseResult.data.length : 1;
                            reject(new Error(parseResult.message));
                            return;
                        }
                        
                        const existingFields = Object.keys(requirements).reduce((fields, operatorId) => {
                            const personFields = Array.from(requirements[operatorId]);
                            return fields.concat(personFields);
                        }, ['name']);
                        
                        const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, existingFields);
                        if (!analysisResult.success) {
                            const missingFields = analysisResult.errors.map(error => 
                                error.replace(/^字段 ".+?": 缺少 /, '')
                            ).join(',');
                            failCount += parseResult.data.length;
                            reject(new Error(`#通用，缺失"${missingFields}"。`));
                            return;
                        }
                        
                        Object.keys(requirements).forEach(operatorId => {
                            if (mirrorData[operatorId]) {
                                const results = calculateForOperator(analysisResult.sortedFormulas, mirrorData[operatorId]);
                                mirrorResults[operatorId] = results;
                                successCount += Object.keys(results).length;
                            }
                        });
                    }
                    
                    // 个性化镜像计算
                    const personalGroups = mirrorGroups.filter(g => g.target !== '通用');
                    personalGroups.forEach(group => {
                        const operatorId = findOperatorByName(mirrorData, group.target);
                        if (!operatorId || !mirrorData[operatorId]) return;
                        
                        const parseResult = JiexiModule.parseFormulas(group.content);
                        if (!parseResult.success) {
                            failCount += parseResult.data ? parseResult.data.length : 1;
                            return;
                        }
                        
                        const personalContext = mirrorData[operatorId].jieguo || {};
                        const availableFields = Object.keys(personalContext).concat('name');
                        
                        const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, availableFields);
                        if (!analysisResult.success) {
                            const missingFields = analysisResult.errors.map(error => 
                                error.replace(/^字段 ".+?": 缺少 /, '')
                            ).join(',');
                            failCount += parseResult.data.length;
                            return;
                        }
                        
                        const personalResults = calculateForOperator(analysisResult.sortedFormulas, mirrorData[operatorId]);
                        successCount += Object.keys(personalResults).length;
                        
                        if (!mirrorResults[operatorId]) {
                            mirrorResults[operatorId] = {};
                        }
                        Object.assign(mirrorResults[operatorId], personalResults);
                    });
                    
                    // 保存镜像计算结果
                    saveMirrorResults(mirrorResults)
                        .then(() => resolve({ successCount, failCount }))
                        .catch(reject);
                })
                .catch(reject);
        });
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
                resolve();
                return;
            }
            
            const existingFields = FirebaseModule.extractAllFields(originalData);
            const newFields = new Set();
            
            Object.values(results).forEach(fields => {
                Object.keys(fields).forEach(field => {
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
                }).then(resolve).catch(reject);
            } else {
                firebase.database().ref().update(updates).then(resolve).catch(reject);
            }
        });
    }
    
    // 保存镜像计算结果
    function saveMirrorResults(results) {
        return new Promise((resolve, reject) => {
            const updates = {};
            
            Object.entries(results).forEach(([operatorId, fields]) => {
                Object.entries(fields).forEach(([field, value]) => {
                    updates[`/peizhi/jingxiang/${operatorId}/jieguo/${field}`] = value;
                });
            });
            
            if (Object.keys(updates).length === 0) {
                resolve();
                return;
            }
            
            // 为新字段创建配置
            const allNewFields = new Set();
            Object.values(results).forEach(fields => {
                Object.keys(fields).forEach(field => {
                    allNewFields.add(field);
                });
            });
            
            if (allNewFields.size > 0) {
                firebase.database().ref('/peizhi').once('value').then(snapshot => {
                    const peizhiData = snapshot.val() || {};
                    
                    allNewFields.forEach(fieldName => {
                        const configUpdates = FirebaseModule.generateFieldConfig(
                            fieldName,
                            peizhiData.shunxu || {},
                            peizhiData.zhuangtai || {}
                        );
                        Object.assign(updates, configUpdates);
                    });
                    
                    return firebase.database().ref().update(updates);
                }).then(resolve).catch(reject);
            } else {
                firebase.database().ref().update(updates).then(resolve).catch(reject);
            }
        });
    }
    
    function findOperatorByName(data, name) {
        for (const [operatorId, personData] of Object.entries(data)) {
            if (personData.name === name) {
                return operatorId;
            }
        }
        return null;
    }
    
    function calculateForOperator(formulas, personData) {
        const results = {};
        const context = {
            name: personData.name,
            ...(personData.jieguo || {})
        };
        
        formulas.forEach(({ fieldName, expression }) => {
            Object.assign(context, results);
            
            const fieldMapping = JiexiModule.createFieldMapping(expression, context);
            const requiredFields = JiexiModule.extractFields(expression);
            
            let allFieldsAvailable = true;
            for (const field of requiredFields) {
                if (fieldMapping[field] === undefined) {
                    allFieldsAvailable = false;
                    break;
                }
            }
            
            if (allFieldsAvailable) {
                const evalExpression = JiexiModule.replaceFields(expression, fieldMapping);
                const evalResult = JiexiModule.safeEvaluate(evalExpression);
                
                if (evalResult.success) {
                    results[fieldName] = evalResult.result;
                }
            }
        });
        
        return results;
    }
    
    return { 
        init,
        parseAndCalculate
    };
})();