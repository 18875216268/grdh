// 计算模块 - 全面更新版（v1.06）- 统一使用name字段
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
        
        const parseResult = JiexiModule.parseFormulas(formulaText);
        if (!parseResult.success) {
            isCalculating = false;
            window.showToast(parseResult.message, 'error');
            return;
        }
        
        // 获取数据并计算
        FirebaseModule.getAllFuzerenData((fuzerenData) => {
            if (!fuzerenData) {
                isCalculating = false;
                window.showToast('暂无数据，无法计算', 'error');
                return;
            }
            
            processFormulas(parseResult.data, fuzerenData);
        });
    }
    
    function processFormulas(formulas, fuzerenData) {
        // 使用统一的字段提取函数
        const existingFields = FirebaseModule.extractAllFields(fuzerenData);
        
        const analysis = JiexiModule.analyzeDependencies(formulas, existingFields);
        if (analysis.errors.length > 0) {
            isCalculating = false;
            window.showToast('字段验证失败: ' + analysis.errors.join('; '), 'error');
            return;
        }
        
        const circularCheck = JiexiModule.checkCircularDependency(analysis.dependencies);
        if (circularCheck.hasCircular) {
            isCalculating = false;
            window.showToast('发现循环依赖: ' + circularCheck.cycle.join(' → '), 'error');
            return;
        }
        
        calculateFormulasSequentially(formulas, fuzerenData, 0, []);
    }
    
    function calculateFormulasSequentially(formulas, fuzerenData, index, results) {
        if (index >= formulas.length) {
            isCalculating = false;
            showCalculationResult(results);
            return;
        }
        
        const { fieldName, expression } = formulas[index];
        const extendedData = createExtendedData(fuzerenData, results);
        const calculationResults = {};
        let successCount = 0;
        
        // 为每个负责人计算结果
        Object.entries(extendedData).forEach(([operatorId, personData]) => {
            // 创建计算上下文 - 统一使用name字段
            const context = {
                name: personData.name,
                ...(personData.jieguo || {})
            };
            
            const value = evaluateExpression(expression, context);
            if (value !== null) {
                calculationResults[operatorId] = { [fieldName]: value };
                successCount++;
            }
        });
        
        if (successCount === 0) {
            results.push({
                success: false,
                message: `字段 "${fieldName}": 所有行计算失败，请检查公式`
            });
            calculateFormulasSequentially(formulas, fuzerenData, index + 1, results);
            return;
        }
        
        // 智能保存字段
        saveFieldSmartly(fieldName, calculationResults, FirebaseModule.extractAllFields(fuzerenData)).then(() => {
            results.push({ success: true, fieldName, count: successCount });
            calculateFormulasSequentially(formulas, fuzerenData, index + 1, results);
        }).catch(() => {
            results.push({ success: false, message: `字段 "${fieldName}": 保存失败` });
            calculateFormulasSequentially(formulas, fuzerenData, index + 1, results);
        });
    }
    
    // 智能保存字段 - 已有字段更新，新字段分配最大顺序
    function saveFieldSmartly(fieldName, calculationResults, existingFields) {
        const updates = {};
        
        // 更新每个负责人的结果数据
        Object.entries(calculationResults).forEach(([operatorId, results]) => {
            Object.entries(results).forEach(([field, value]) => {
                updates[`/fuzeren/${operatorId}/jieguo/${field}`] = value;
            });
        });
        
        // 如果是新字段，需要分配顺序和状态
        if (!existingFields.includes(fieldName)) {
            return new Promise((resolve, reject) => {
                FirebaseModule.getMaxOrder((maxOrder) => {
                    updates[`/peizhi/shunxu/${fieldName}`] = maxOrder + 1000;
                    updates[`/peizhi/zhuangtai/${fieldName}`] = 1;
                    
                    firebase.database().ref().update(updates).then(resolve).catch(reject);
                });
            });
        } else {
            // 已有字段，只更新数据
            return firebase.database().ref().update(updates);
        }
    }
    
    function createExtendedData(fuzerenData, calculationResults) {
        const extendedData = {};
        
        Object.entries(fuzerenData).forEach(([operatorId, personData]) => {
            extendedData[operatorId] = {
                name: personData.name,
                order: personData.order,
                jieguo: { ...(personData.jieguo || {}) }
            };
            
            // 添加之前计算的结果
            calculationResults.forEach(result => {
                if (result.success && result.values && result.values[operatorId]) {
                    Object.assign(extendedData[operatorId].jieguo, result.values[operatorId]);
                }
            });
        });
        
        return extendedData;
    }
    
    function evaluateExpression(expression, context) {
        const fieldMapping = JiexiModule.createFieldMapping(expression, context);
        const requiredFields = JiexiModule.extractFields(expression);
        
        for (const field of requiredFields) {
            if (fieldMapping[field] === undefined) {
                return null;
            }
        }
        
        const evalExpression = JiexiModule.replaceFields(expression, fieldMapping);
        const evalResult = JiexiModule.safeEvaluate(evalExpression);
        
        return evalResult.success ? evalResult.result : null;
    }
    
    function showCalculationResult(results) {
        const successCount = results.filter(r => r.success).length;
        const errors = results.filter(r => !r.success).map(r => r.message);
        
        if (successCount > 0) {
            const message = errors.length > 0 
                ? `${successCount}个字段计算成功，${errors.length}个失败`
                : `${successCount}个字段计算完成`;
            window.showToast(message, 'success');
        } else if (errors.length > 0) {
            window.showToast('计算失败: ' + errors.join('; '), 'error');
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