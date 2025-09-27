// 计算算术模块 - 纯计算逻辑 (v1.2)
const SuanshuModule = (function() {
    
    // 核心计算函数
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
    
    // 分析镜像需求（包含结果字段）
    function analyzeMirrorRequirements(mirrorGroups, fuzerenData) {
        const requirements = {};
        
        try {
            // 通用镜像计算
            const generalMirrorGroup = mirrorGroups.find(g => g.target === '通用');
            if (generalMirrorGroup) {
                const parseResult = JiexiModule.parseFormulas(generalMirrorGroup.content);
                if (!parseResult.success) {
                    return { success: false, message: parseResult.message };
                }
                
                const requiredFields = new Set();
                const resultFields = new Set();
                
                parseResult.data.forEach(formula => {
                    // 添加结果字段
                    resultFields.add(formula.fieldName);
                    
                    // 添加依赖字段
                    JiexiModule.extractFields(formula.expression).forEach(field => {
                        requiredFields.add(field);
                    });
                });
                
                // 为所有负责人创建通用镜像需求
                Object.keys(fuzerenData).forEach(operatorId => {
                    if (!requirements[operatorId]) {
                        requirements[operatorId] = new Set();
                    }
                    
                    // 包含依赖字段
                    requiredFields.forEach(field => {
                        if (field !== 'name') {
                            requirements[operatorId].add(field);
                        }
                    });
                    
                    // 包含结果字段
                    resultFields.forEach(field => {
                        requirements[operatorId].add(field);
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
                    // 添加结果字段
                    requirements[operatorId].add(formula.fieldName);
                    
                    // 添加依赖字段
                    JiexiModule.extractFields(formula.expression).forEach(field => {
                        if (field !== 'name') {
                            requirements[operatorId].add(field);
                        }
                    });
                });
            });
            
            return { success: true, requirements };
        } catch (error) {
            return { success: false, message: '镜像需求分析失败：' + error.message };
        }
    }
    
    // 创建本地镜像（克隆所有字段）
    function createLocalMirror(fuzerenData, requirements) {
        const localMirror = {};
        
        Object.entries(requirements).forEach(([operatorId, requiredFields]) => {
            const personData = fuzerenData[operatorId];
            if (!personData) return;
            
            localMirror[operatorId] = {
                name: personData.name,
                order: personData.order || 999999,
                jieguo: personData.jieguo ? { ...personData.jieguo } : {}
            };
        });
        
        return localMirror;
    }
    
    // 在本地内存中执行计算
    function performLocalCalculations(mirrorGroups, localMirror, requirements) {
        const results = {};
        
        // 通用镜像计算
        const generalGroup = mirrorGroups.find(g => g.target === '通用');
        if (generalGroup) {
            const parseResult = JiexiModule.parseFormulas(generalGroup.content);
            if (!parseResult.success) {
                throw new Error(parseResult.message);
            }
            
            // 收集所有可用字段
            const availableFields = new Set(['name']);
            Object.values(localMirror).forEach(person => {
                if (person.jieguo) {
                    Object.keys(person.jieguo).forEach(field => availableFields.add(field));
                }
            });
            
            const analysisResult = JiexiModule.analyzeAndSortFormulas(
                parseResult.data, 
                Array.from(availableFields)
            );
            
            if (!analysisResult.success) {
                const missingFields = analysisResult.errors.map(error => 
                    error.replace(/^字段 ".+?": 缺少 /, '')
                ).join(', ');
                throw new Error(`#通用，缺失"${missingFields}"。`);
            }
            
            // 为每个负责人计算
            Object.keys(requirements).forEach(operatorId => {
                if (localMirror[operatorId]) {
                    const personResults = calculateForOperator(
                        analysisResult.sortedFormulas, 
                        localMirror[operatorId]
                    );
                    results[operatorId] = personResults;
                    // 更新本地镜像供后续计算使用
                    Object.assign(localMirror[operatorId].jieguo, personResults);
                }
            });
        }
        
        // 个性化镜像计算
        const personalGroups = mirrorGroups.filter(g => g.target !== '通用');
        personalGroups.forEach(group => {
            const operatorId = findOperatorByName(localMirror, group.target);
            if (!operatorId || !localMirror[operatorId]) return;
            
            const parseResult = JiexiModule.parseFormulas(group.content);
            if (!parseResult.success) {
                console.error(`#${group.target} 解析失败：${parseResult.message}`);
                return;
            }
            
            const personalContext = localMirror[operatorId].jieguo || {};
            const availableFields = Object.keys(personalContext).concat('name');
            
            const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, availableFields);
            if (!analysisResult.success) {
                const missingFields = analysisResult.errors.map(error => 
                    error.replace(/^字段 ".+?": 缺少 /, '')
                ).join(', ');
                console.error(`#${group.target}，缺失"${missingFields}"。`);
                return;
            }
            
            const personalResults = calculateForOperator(
                analysisResult.sortedFormulas, 
                localMirror[operatorId]
            );
            
            if (!results[operatorId]) {
                results[operatorId] = {};
            }
            Object.assign(results[operatorId], personalResults);
        });
        
        return results;
    }
    
    // 执行普通计算逻辑
    function executeNormalCalculationLogic(normalGroups, fuzerenData) {
        const workingData = JSON.parse(JSON.stringify(fuzerenData));
        const allResults = {};
        
        console.log('开始执行普通计算。');
        
        // 通用计算
        const generalGroup = normalGroups.find(g => g.target === '通用');
        if (generalGroup) {
            const parseResult = JiexiModule.parseFormulas(generalGroup.content);
            if (!parseResult.success) {
                throw new Error(parseResult.message);
            }
            
            const existingFields = FirebaseModule.extractAllFields(fuzerenData);
            const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, existingFields);
            
            if (!analysisResult.success) {
                throw new Error('分析失败：' + analysisResult.errors.join('; '));
            }
            
            console.log(`通用公式：${analysisResult.sortedFormulas.length} 个字段。`);
            
            Object.keys(workingData).forEach(operatorId => {
                const results = calculateForOperator(analysisResult.sortedFormulas, workingData[operatorId]);
                allResults[operatorId] = results;
                
                if (!workingData[operatorId].jieguo) {
                    workingData[operatorId].jieguo = {};
                }
                Object.assign(workingData[operatorId].jieguo, results);
            });
        }
        
        // 个性化计算
        const personalGroups = normalGroups.filter(g => g.target !== '通用');
        personalGroups.forEach(group => {
            const operatorId = findOperatorByName(fuzerenData, group.target);
            if (!operatorId) {
                console.log(`跳过不存在的负责人：${group.target}。`);
                return;
            }
            
            const parseResult = JiexiModule.parseFormulas(group.content);
            if (!parseResult.success) {
                console.error(`${group.target} 解析失败：${parseResult.message}`);
                return;
            }
            
            const personalContext = workingData[operatorId].jieguo || {};
            const availableFields = Object.keys(personalContext).concat('name');
            
            const analysisResult = JiexiModule.analyzeAndSortFormulas(parseResult.data, availableFields);
            if (!analysisResult.success) {
                const missingFields = analysisResult.errors.map(error => 
                    error.replace(/^字段 ".+?": 缺少 /, '')
                ).join(', ');
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
        
        return allResults;
    }
    
    // 统一的清理操作构建函数
    function buildCleanupOperations(currentMirrorData, requirements, fuzerenData) {
        const cleanupOps = {};
        const allCurrentFields = new Set();
        const allRequiredFields = new Set();
        
        // 收集当前镜像中的所有字段
        Object.values(currentMirrorData || {}).forEach(person => {
            if (person.jieguo) {
                Object.keys(person.jieguo).forEach(field => allCurrentFields.add(field));
            }
        });
        
        // 收集需要保留的字段
        Object.values(requirements || {}).forEach(fields => {
            fields.forEach(field => allRequiredFields.add(field));
        });
        
        // 1. 清理不需要的负责人节点
        Object.keys(currentMirrorData || {}).forEach(operatorId => {
            if (!requirements || !requirements[operatorId]) {
                cleanupOps[`/peizhi/jingxiang/${operatorId}`] = null;
            }
        });
        
        // 2. 清理不需要的字段
        Object.entries(currentMirrorData || {}).forEach(([operatorId, data]) => {
            if (requirements && requirements[operatorId] && data.jieguo) {
                Object.keys(data.jieguo).forEach(field => {
                    if (!requirements[operatorId].has(field)) {
                        cleanupOps[`/peizhi/jingxiang/${operatorId}/jieguo/${field}`] = null;
                    }
                });
            }
        });
        
        // 3. 识别并清理完全孤立的字段配置
        const orphanedFields = new Set();
        allCurrentFields.forEach(field => {
            // 如果字段不再需要
            if (!allRequiredFields.has(field)) {
                // 检查是否在原始数据中存在
                let existsInOriginal = false;
                Object.values(fuzerenData || {}).forEach(person => {
                    if (person.jieguo && person.jieguo[field] !== undefined) {
                        existsInOriginal = true;
                    }
                });
                
                // 如果原始数据中也不存在，则是完全孤立的
                if (!existsInOriginal) {
                    orphanedFields.add(field);
                    cleanupOps[`/peizhi/shunxu/${field}`] = null;
                    cleanupOps[`/peizhi/zhuangtai/${field}`] = null;
                }
            }
        });
        
        return { cleanupOps, orphanedFields };
    }
    
    // 查找负责人
    function findOperatorByName(data, name) {
        for (const [operatorId, personData] of Object.entries(data)) {
            if (personData.name === name) {
                return operatorId;
            }
        }
        return null;
    }
    
    return {
        calculateForOperator,
        analyzeMirrorRequirements,
        createLocalMirror,
        performLocalCalculations,
        executeNormalCalculationLogic,
        findOperatorByName,
        buildCleanupOperations
    };
})();