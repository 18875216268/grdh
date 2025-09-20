// 计算模块 - 职责清晰版（v1.11）
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
        
        autoRecalculate();
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
        
        // 解析公式
        const parseResult = JiexiModule.parseFormulas(formulaText);
        if (!parseResult.success) {
            isCalculating = false;
            window.showToast(parseResult.message, 'error');
            return;
        }
        
        FirebaseModule.getAllFuzerenData((fuzerenData) => {
            if (!fuzerenData) {
                isCalculating = false;
                window.showToast('暂无数据，无法计算', 'error');
                return;
            }
            
            // 获取现有字段
            const existingFields = FirebaseModule.extractAllFields(fuzerenData);
            
            // 分析依赖并排序
            const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, existingFields);
            
            if (!analysisResult.success) {
                isCalculating = false;
                window.showToast('分析失败: ' + analysisResult.errors.join('; '), 'error');
                return;
            }
            
            // 执行计算
            const workingData = JSON.parse(JSON.stringify(fuzerenData));
            calculateFormulas(analysisResult.sortedFormulas, fuzerenData, workingData, 0, []);
        });
    }
    
    function calculateFormulas(formulas, originalData, workingData, index, results) {
        if (index >= formulas.length) {
            // 批量保存结果
            saveAllResults(results, originalData).then(() => {
                isCalculating = false;
                showCalculationResult(results);
            });
            return;
        }
        
        const { fieldName, expression } = formulas[index];
        const calculationResults = {};
        let successCount = 0;
        
        // 计算每个人的数据
        Object.entries(workingData).forEach(([operatorId, personData]) => {
            const context = {
                name: personData.name,
                ...(personData.jieguo || {})
            };
            
            const value = evaluateExpression(expression, context);
            if (value !== null) {
                calculationResults[operatorId] = { [fieldName]: value };
                // 更新工作数据供后续公式使用
                if (!workingData[operatorId].jieguo) {
                    workingData[operatorId].jieguo = {};
                }
                workingData[operatorId].jieguo[fieldName] = value;
                successCount++;
            }
        });
        
        if (successCount === 0) {
            results.push({
                success: false,
                fieldName,
                message: `字段 "${fieldName}": 计算失败`
            });
        } else {
            results.push({ 
                success: true, 
                fieldName, 
                count: successCount,
                data: calculationResults
            });
        }
        
        // 继续下一个公式
        calculateFormulas(formulas, originalData, workingData, index + 1, results);
    }
    
    function evaluateExpression(expression, context) {
        // 创建字段映射
        const fieldMapping = JiexiModule.createFieldMapping(expression, context);
        const requiredFields = JiexiModule.extractFields(expression);
        
        // 检查必需字段
        for (const field of requiredFields) {
            if (fieldMapping[field] === undefined) {
                return null;
            }
        }
        
        // 替换字段并求值
        const evalExpression = JiexiModule.replaceFields(expression, fieldMapping);
        const evalResult = JiexiModule.safeEvaluate(evalExpression);
        
        return evalResult.success ? evalResult.result : null;
    }
    
    function saveAllResults(results, originalData) {
        const updates = {};
        const successResults = results.filter(r => r.success);
        
        if (successResults.length === 0) {
            return Promise.resolve();
        }
        
        // 收集所有数据更新
        successResults.forEach(({ data }) => {
            Object.entries(data).forEach(([operatorId, fieldData]) => {
                Object.entries(fieldData).forEach(([field, value]) => {
                    updates[`/fuzeren/${operatorId}/jieguo/${field}`] = value;
                });
            });
        });
        
        // 检查新字段
        const existingFields = FirebaseModule.extractAllFields(originalData);
        const newFields = successResults
            .map(r => r.fieldName)
            .filter(field => !existingFields.includes(field));
        
        if (newFields.length > 0) {
            return firebase.database().ref('/peizhi').once('value').then(snapshot => {
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
            });
        } else {
            return firebase.database().ref().update(updates);
        }
    }
    
    function showCalculationResult(results) {
        const successCount = results.filter(r => r.success).length;
        const errors = results.filter(r => !r.success);
        
        if (successCount > 0) {
            const message = errors.length > 0 
                ? `${successCount}个字段计算成功，${errors.length}个失败`
                : `${successCount}个字段计算完成`;
            window.showToast(message, 'success');
        } else if (errors.length > 0) {
            window.showToast('计算失败: ' + errors.map(e => e.message).join('; '), 'error');
        }
    }
    
    function autoRecalculate() {
        FirebaseModule.getFormula((formula) => {
            if (formula && formula.trim()) {
                setTimeout(() => {
                    executeCalculation(formula);
                }, 500);
            }
        });
    }
    
    return { 
        init,
        parseAndCalculate
    };
})();