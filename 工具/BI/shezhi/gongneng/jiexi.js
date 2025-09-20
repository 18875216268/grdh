// 解析模块 - 职责清晰版
const JiexiModule = (function() {
    
    // 支持的运算符和分隔符
    const OPERATORS = ['+', '-', '*', '/', '(', ')', ' '];
    const FIELD_PATTERN = /[\u4e00-\u9fff\w]+/g;
    
    // 解析公式文本
    function parseFormulas(text) {
        const cleanText = text.trim();
        if (!cleanText) {
            return { success: false, message: '请输入计算公式' };
        }
        
        // 按分号分割公式
        const formulaLines = cleanText.split(';').filter(line => line.trim());
        
        if (formulaLines.length === 0) {
            return { success: false, message: '请输入有效的计算公式' };
        }
        
        const formulas = [];
        const fieldNames = new Set();
        
        for (let i = 0; i < formulaLines.length; i++) {
            const line = formulaLines[i].trim();
            
            const parseResult = parseFormula(line, i + 1);
            if (!parseResult.success) {
                return parseResult;
            }
            
            const { fieldName, expression } = parseResult.data;
            
            // 检查字段名重复
            if (fieldNames.has(fieldName)) {
                return { 
                    success: false, 
                    message: `字段名 "${fieldName}" 重复定义` 
                };
            }
            fieldNames.add(fieldName);
            
            formulas.push({ fieldName, expression });
        }
        
        return { success: true, data: formulas };
    }
    
    // 解析单个公式
    function parseFormula(line, lineNumber) {
        const colonIndex = line.indexOf(':');
        
        if (colonIndex === -1) {
            return { 
                success: false, 
                message: `第${lineNumber}个公式格式错误: ${line}。请使用"字段:表达式"格式` 
            };
        }
        
        const fieldName = line.substring(0, colonIndex).trim();
        const expression = line.substring(colonIndex + 1).trim();
        
        // 验证字段名和表达式
        const validation = validateFormulaComponents(fieldName, expression, lineNumber);
        if (!validation.success) {
            return validation;
        }
        
        return { 
            success: true, 
            data: { fieldName, expression } 
        };
    }
    
    // 验证公式组件
    function validateFormulaComponents(fieldName, expression, lineNumber) {
        if (!fieldName || !expression) {
            return { 
                success: false, 
                message: `第${lineNumber}个公式格式错误: 字段名或表达式不能为空` 
            };
        }
        
        // 检查字段名合法性
        if (!isValidFieldName(fieldName)) {
            return { 
                success: false, 
                message: `字段名 "${fieldName}" 格式不正确` 
            };
        }
        
        // 检查表达式语法
        const expressionCheck = validateExpression(expression);
        if (!expressionCheck.valid) {
            return { 
                success: false, 
                message: `表达式错误: ${expressionCheck.message}` 
            };
        }
        
        return { success: true };
    }
    
    // 验证字段名格式
    function isValidFieldName(fieldName) {
        return /^[\u4e00-\u9fff\w]+$/.test(fieldName);
    }
    
    // 验证表达式语法
    function validateExpression(expression) {
        const analysis = analyzeExpression(expression);
        
        if (analysis.invalidChars.length > 0) {
            return {
                valid: false,
                message: `包含不支持的字符: ${analysis.invalidChars.join(', ')}`
            };
        }
        
        if (analysis.fields.length === 0) {
            return {
                valid: false,
                message: '表达式中未找到有效字段'
            };
        }
        
        return { valid: true };
    }
    
    // 分析表达式结构
    function analyzeExpression(expression) {
        const tokens = tokenizeExpression(expression);
        const fields = [];
        const numbers = [];
        const operators = [];
        const invalidChars = [];
        
        tokens.forEach(token => {
            if (token.type === 'field') {
                fields.push(token.value);
            } else if (token.type === 'number') {
                numbers.push(token.value);
            } else if (token.type === 'operator') {
                operators.push(token.value);
            } else if (token.type === 'invalid') {
                invalidChars.push(token.value);
            }
        });
        
        return {
            fields: [...new Set(fields)],
            numbers: [...new Set(numbers)],
            operators,
            invalidChars: [...new Set(invalidChars)]
        };
    }
    
    // 标记化表达式
    function tokenizeExpression(expression) {
        const tokens = [];
        let i = 0;
        const chars = Array.from(expression);
        
        while (i < chars.length) {
            const char = chars[i];
            
            if (char === ' ') {
                i++;
                continue;
            }
            
            if (OPERATORS.includes(char)) {
                tokens.push({ type: 'operator', value: char });
                i++;
            } else if (isDigitStart(chars, i)) {
                const numberResult = extractNumber(chars, i);
                tokens.push({ type: 'number', value: numberResult.value });
                i = numberResult.nextIndex;
            } else if (isFieldStart(char)) {
                const fieldResult = extractField(chars, i);
                tokens.push({ type: 'field', value: fieldResult.value });
                i = fieldResult.nextIndex;
            } else {
                tokens.push({ type: 'invalid', value: char });
                i++;
            }
        }
        
        return tokens;
    }
    
    // 判断是否为数字开始
    function isDigitStart(chars, index) {
        const char = chars[index];
        return /\d/.test(char) || (char === '.' && index + 1 < chars.length && /\d/.test(chars[index + 1]));
    }
    
    // 判断是否为字段开始
    function isFieldStart(char) {
        return /[\u4e00-\u9fff\w]/.test(char) && !/\d/.test(char);
    }
    
    // 提取数字
    function extractNumber(chars, startIndex) {
        let i = startIndex;
        let number = '';
        let hasDecimalPoint = false;
        
        while (i < chars.length) {
            const char = chars[i];
            
            if (/\d/.test(char)) {
                number += char;
                i++;
            } else if (char === '.' && !hasDecimalPoint) {
                hasDecimalPoint = true;
                number += char;
                i++;
            } else {
                break;
            }
        }
        
        return { value: number, nextIndex: i };
    }
    
    // 提取字段名
    function extractField(chars, startIndex) {
        let i = startIndex;
        let field = '';
        
        while (i < chars.length) {
            const char = chars[i];
            
            if (isFieldChar(char)) {
                field += char;
                i++;
            } else {
                break;
            }
        }
        
        return { value: field, nextIndex: i };
    }
    
    // 判断是否为字段字符
    function isFieldChar(char) {
        return /[\u4e00-\u9fff\w]/.test(char);
    }
    
    // 提取表达式中的字段
    function extractFields(expression) {
        const analysis = analyzeExpression(expression);
        return analysis.fields.sort((a, b) => b.length - a.length);
    }
    
    // 分析公式依赖并排序
    function analyzeAndSortFormulas(formulas, availableFields) {
        // 构建依赖关系
        const dependencies = {};
        const errors = [];
        const formulaMap = {};
        
        // 首先建立公式映射
        formulas.forEach(({ fieldName, expression }) => {
            formulaMap[fieldName] = expression;
        });
        
        // 分析每个公式的依赖
        formulas.forEach(({ fieldName, expression }) => {
            const usedFields = extractFields(expression);
            const missingFields = [];
            
            // 检查字段是否存在
            usedFields.forEach(field => {
                if (!availableFields.includes(field) && !formulaMap[field]) {
                    missingFields.push(field);
                }
            });
            
            if (missingFields.length > 0) {
                errors.push(`字段 "${fieldName}": 缺少字段 ${missingFields.join(', ')}`);
            } else {
                // 只记录对其他公式字段的依赖
                dependencies[fieldName] = usedFields.filter(field => formulaMap[field]);
            }
        });
        
        if (errors.length > 0) {
            return { success: false, errors };
        }
        
        // 检查循环依赖
        const circularCheck = checkCircularDependency(dependencies);
        if (circularCheck.hasCircular) {
            return { 
                success: false, 
                errors: [`发现循环依赖: ${circularCheck.cycle.join(' → ')}`]
            };
        }
        
        // 拓扑排序
        const sortedFormulas = topologicalSort(formulas, dependencies);
        
        return { 
            success: true, 
            sortedFormulas,
            dependencies
        };
    }
    
    // 拓扑排序
    function topologicalSort(formulas, dependencies) {
        const sorted = [];
        const visited = new Set();
        
        function visit(fieldName) {
            if (visited.has(fieldName)) return;
            visited.add(fieldName);
            
            // 先访问依赖
            const deps = dependencies[fieldName] || [];
            deps.forEach(dep => visit(dep));
            
            // 再添加自己
            const formula = formulas.find(f => f.fieldName === fieldName);
            if (formula) {
                sorted.push(formula);
            }
        }
        
        // 访问所有公式
        formulas.forEach(({ fieldName }) => visit(fieldName));
        return sorted;
    }
    
    // 检查循环依赖
    function checkCircularDependency(dependencies) {
        const visited = new Set();
        const recursionStack = new Set();
        
        function dfs(fieldName) {
            if (recursionStack.has(fieldName)) {
                return { hasCircular: true, cycle: Array.from(recursionStack) };
            }
            
            if (visited.has(fieldName)) {
                return { hasCircular: false };
            }
            
            visited.add(fieldName);
            recursionStack.add(fieldName);
            
            const deps = dependencies[fieldName] || [];
            for (const dep of deps) {
                if (dependencies[dep]) {
                    const result = dfs(dep);
                    if (result.hasCircular) {
                        return result;
                    }
                }
            }
            
            recursionStack.delete(fieldName);
            return { hasCircular: false };
        }
        
        for (const fieldName of Object.keys(dependencies)) {
            const result = dfs(fieldName);
            if (result.hasCircular) {
                return result;
            }
        }
        
        return { hasCircular: false };
    }
    
    // 创建字段替换映射
    function createFieldMapping(expression, context) {
        const fields = extractFields(expression);
        const mapping = {};
        
        for (const field of fields) {
            const value = context[field];
            
            if (value === undefined || value === null) {
                continue;
            }
            
            // 处理数值转换
            let numValue;
            if (typeof value === 'number') {
                numValue = value;
            } else if (typeof value === 'string') {
                numValue = parseFloat(value.replace(/[,，\s]/g, ''));
            } else {
                numValue = parseFloat(value);
            }
            
            if (!isNaN(numValue) && isFinite(numValue)) {
                mapping[field] = numValue;
            }
        }
        
        return mapping;
    }
    
    // 精确替换字段为数值
    function replaceFields(expression, fieldMapping) {
        if (!expression || Object.keys(fieldMapping).length === 0) {
            return expression;
        }
        
        return replaceByPosition(expression, fieldMapping);
    }
    
    // 基于位置的精确替换算法
    function replaceByPosition(expression, fieldMapping) {
        const fields = Object.keys(fieldMapping).sort((a, b) => b.length - a.length);
        let result = expression;
        
        const placeholders = {};
        let placeholderIndex = 0;
        
        // 第一步：将字段替换为占位符
        fields.forEach(field => {
            const placeholder = `__PLACEHOLDER_${placeholderIndex++}__`;
            placeholders[placeholder] = `(${fieldMapping[field]})`;
            result = preciseReplace(result, field, placeholder);
        });
        
        // 第二步：将占位符替换为数值
        Object.entries(placeholders).forEach(([placeholder, value]) => {
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        
        return result;
    }
    
    // 精确匹配替换
    function preciseReplace(text, fieldName, replacement) {
        let result = text;
        let startIndex = 0;
        
        while (true) {
            const index = result.indexOf(fieldName, startIndex);
            if (index === -1) break;
            
            const endIndex = index + fieldName.length;
            
            const beforeChar = index > 0 ? result[index - 1] : '';
            const afterChar = endIndex < result.length ? result[endIndex] : '';
            
            const isValidBefore = !beforeChar || !isFieldChar(beforeChar);
            const isValidAfter = !afterChar || !isFieldChar(afterChar);
            
            if (isValidBefore && isValidAfter) {
                result = result.substring(0, index) + replacement + result.substring(endIndex);
                startIndex = index + replacement.length;
            } else {
                startIndex = endIndex;
            }
        }
        
        return result;
    }
    
    // 验证最终表达式安全性
    function isSafeExpression(expression) {
        return /^[\d\s+\-*/().]+$/.test(expression);
    }
    
    // 表达式求值
    function safeEvaluate(expression) {
        try {
            if (!isSafeExpression(expression)) {
                return { success: false, error: '表达式包含不安全字符' };
            }
            
            if (!isValidSyntax(expression)) {
                return { success: false, error: '表达式语法错误' };
            }
            
            const result = Function('"use strict"; return (' + expression + ')')();
            
            if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                return { success: false, error: '计算结果无效' };
            }
            
            return { success: true, result };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 验证基本语法
    function isValidSyntax(expression) {
        let parenthesesCount = 0;
        for (const char of expression) {
            if (char === '(') parenthesesCount++;
            if (char === ')') parenthesesCount--;
            if (parenthesesCount < 0) return false;
        }
        return parenthesesCount === 0;
    }
    
    return {
        parseFormulas,
        analyzeAndSortFormulas,
        extractFields,
        createFieldMapping,
        replaceFields,
        safeEvaluate
    };
})();