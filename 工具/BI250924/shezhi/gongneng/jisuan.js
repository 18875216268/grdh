// 计算模块 - 支持重复定义版 (v3.0)
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
        console.log('===== 开始计算 =====');
        
        const groupResult = JiexiModule.parseGroupedFormulas(formulaText);
        if (!groupResult.success) {
            isCalculating = false;
            window.showToast(groupResult.message, 'error');
            return;
        }
        
        console.log(`解析成功：${groupResult.groups.length}个分组`);
        
        FirebaseModule.getAllFuzerenData((fuzerenData) => {
            if (!fuzerenData) {
                isCalculating = false;
                window.showToast('暂无数据，无法计算', 'error');
                return;
            }
            
            console.log(`获取到${Object.keys(fuzerenData).length}个负责人数据`);
            executeGroupedCalculation(groupResult.groups, fuzerenData);
        });
    }
    
    function executeGroupedCalculation(groups, fuzerenData) {
        const workingData = JSON.parse(JSON.stringify(fuzerenData));
        const allResults = {};
        
        // 第1步：通用计算
        const generalGroup = groups.find(g => g.target === '通用');
        console.log('\n--- 通用计算开始 ---');
        
        const parseResult = JiexiModule.parseFormulas(generalGroup.content);
        if (!parseResult.success) {
            isCalculating = false;
            window.showToast(parseResult.message, 'error');
            return;
        }
        
        const existingFields = FirebaseModule.extractAllFields(fuzerenData);
        const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, existingFields);
        
        if (!analysisResult.success) {
            isCalculating = false;
            window.showToast('分析失败: ' + analysisResult.errors.join('; '), 'error');
            return;
        }
        
        console.log(`通用公式：${analysisResult.sortedFormulas.length}个字段`);
        if (analysisResult.stages > 1) {
            console.log(`  分${analysisResult.stages}个阶段计算`);
        }
        
        // 对所有负责人执行通用计算
        Object.keys(workingData).forEach(operatorId => {
            const results = calculateForOperator(
                analysisResult.sortedFormulas,
                workingData[operatorId]
            );
            
            allResults[operatorId] = results;
            
            if (!workingData[operatorId].jieguo) {
                workingData[operatorId].jieguo = {};
            }
            Object.assign(workingData[operatorId].jieguo, results);
        });
        
        console.log(`通用计算完成`);
        
        // 第2步：个性化计算
        const personalGroups = groups.filter(g => g.target !== '通用');
        
        if (personalGroups.length > 0) {
            console.log('\n--- 个性化计算开始 ---');
            
            const targetMap = {};
            personalGroups.forEach(group => {
                if (!targetMap[group.content]) {
                    targetMap[group.content] = [];
                }
                targetMap[group.content].push(group.target);
            });
            
            Object.entries(targetMap).forEach(([content, targets]) => {
                if (targets.length > 1) {
                    console.log(`共享公式：${targets.join('、')}`);
                }
            });
        }
        
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
                console.error(`  依赖分析失败: ${analysisResult.errors.join('; ')}`);
                return;
            }
            
            console.log(`  公式数：${analysisResult.sortedFormulas.length}`);
            if (analysisResult.stages > 1) {
                console.log(`  分${analysisResult.stages}个阶段计算`);
            }
            
            const personalResults = calculateForOperator(
                analysisResult.sortedFormulas,
                workingData[operatorId]
            );
            
            let overrideCount = 0;
            let newCount = 0;
            Object.keys(personalResults).forEach(field => {
                if (allResults[operatorId] && allResults[operatorId][field] !== undefined) {
                    overrideCount++;
                } else {
                    newCount++;
                }
            });
            
            if (overrideCount > 0) console.log(`  覆盖${overrideCount}个字段`);
            if (newCount > 0) console.log(`  新增${newCount}个字段`);
            
            if (!allResults[operatorId]) {
                allResults[operatorId] = {};
            }
            Object.assign(allResults[operatorId], personalResults);
            Object.assign(workingData[operatorId].jieguo, personalResults);
        });
        
        saveAllResults(allResults, fuzerenData);
    }
    
    function findOperatorByName(fuzerenData, name) {
        for (const [operatorId, data] of Object.entries(fuzerenData)) {
            if (data.name === name) {
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
        
        // 按顺序执行，允许后面的公式使用前面的结果
        formulas.forEach(({ fieldName, expression }) => {
            // 更新context包含已计算的结果
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
    
    function saveAllResults(results, originalData) {
        const updates = {};
        
        Object.entries(results).forEach(([operatorId, fields]) => {
            Object.entries(fields).forEach(([field, value]) => {
                updates[`/fuzeren/${operatorId}/jieguo/${field}`] = value;
            });
        });
        
        if (Object.keys(updates).length === 0) {
            isCalculating = false;
            console.log('无计算结果');
            window.showToast('无计算结果', 'info');
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
        
        console.log(`\n保存${Object.keys(updates).length}个更新`);
        if (newFields.size > 0) {
            console.log(`新增${newFields.size}个字段配置`);
        }
        
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
            }).then(() => {
                isCalculating = false;
                const fieldCount = new Set();
                Object.values(results).forEach(fields => {
                    Object.keys(fields).forEach(field => fieldCount.add(field));
                });
                window.showToast(`计算完成：${fieldCount.size}个字段`, 'success');
                console.log('===== 计算结束 =====\n');
            }).catch(error => {
                isCalculating = false;
                console.error('保存失败:', error);
                window.showToast('保存失败: ' + error.message, 'error');
            });
        } else {
            firebase.database().ref().update(updates).then(() => {
                isCalculating = false;
                const fieldCount = new Set();
                Object.values(results).forEach(fields => {
                    Object.keys(fields).forEach(field => fieldCount.add(field));
                });
                window.showToast(`计算完成：${fieldCount.size}个字段`, 'success');
                console.log('===== 计算结束 =====\n');
            }).catch(error => {
                isCalculating = false;
                console.error('保存失败:', error);
                window.showToast('保存失败: ' + error.message, 'error');
            });
        }
    }
    
    return { 
        init,
        parseAndCalculate
    };
})();