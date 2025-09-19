// 解析模块 - 全新优化算法
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
    
    // 验证表达式语法（新算法）
    function validateExpression(expression) {
        // 分析表达式结构
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
    
    // 分析表达式结构（修复数字识别）
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
            fields: [...new Set(fields)], // 去重
            numbers: [...new Set(numbers)],
            operators,
            invalidChars: [...new Set(invalidChars)]
        };
    }
    
    // 标记化表达式（区分字段、数字、运算符）
    function tokenizeExpression(expression) {
        const tokens = [];
        let i = 0;
        const chars = Array.from(expression);
        
        while (i < chars.length) {
            const char = chars[i];
            
            if (char === ' ') {
                // 跳过空格
                i++;
                continue;
            }
            
            if (OPERATORS.includes(char)) {
                // 运算符
                tokens.push({ type: 'operator', value: char });
                i++;
            } else if (isDigitStart(chars, i)) {
                // 数字（包括小数）
                const numberResult = extractNumber(chars, i);
                tokens.push({ type: 'number', value: numberResult.value });
                i = numberResult.nextIndex;
            } else if (isFieldStart(char)) {
                // 字段名
                const fieldResult = extractField(chars, i);
                tokens.push({ type: 'field', value: fieldResult.value });
                i = fieldResult.nextIndex;
            } else {
                // 无效字符
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
    
    // 提取数字（支持小数）
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
    
    // 判断是否为字段字符（排除纯数字）
    function isFieldChar(char) {
        return /[\u4e00-\u9fff\w]/.test(char);
    }
    
    // 提取表达式中的字段（使用新的标记化算法）
    function extractFields(expression) {
        const analysis = analyzeExpression(expression);
        // 按长度降序排序，避免短字段影响长字段
        return analysis.fields.sort((a, b) => b.length - a.length);
    }
    
    // 验证表达式中的字段是否存在（支持公式依赖）
    function validateExpressionFields(expression, availableFields, calculatedFields = []) {
        const usedFields = extractFields(expression);
        const allAvailableFields = [...availableFields, ...calculatedFields];
        
        for (const field of usedFields) {
            if (!allAvailableFields.includes(field)) {
                return {
                    valid: false,
                    message: `字段 "${field}" 不存在`,
                    missingField: field
                };
            }
        }
        
        return { valid: true, usedFields };
    }
    
    // 分析公式依赖关系（支持公式间依赖）
    function analyzeDependencies(formulas, availableFields) {
        const dependencies = {};
        const errors = [];
        const calculatedFields = []; // 跟踪计算出的字段
        
        // 按公式顺序处理，支持前面公式为后面公式提供字段
        formulas.forEach(({ fieldName, expression }) => {
            const validation = validateExpressionFields(expression, availableFields, calculatedFields);
            if (validation.valid) {
                dependencies[fieldName] = validation.usedFields;
                // 将新计算的字段添加到可用字段列表
                calculatedFields.push(fieldName);
            } else {
                errors.push(`字段 "${fieldName}": ${validation.message}`);
            }
        });
        
        return { 
            dependencies, 
            errors, 
            calculatedFields,
            calculationOrder: Object.keys(dependencies)
        };
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
                if (dependencies[dep]) { // 只检查计算字段的依赖
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
                numValue = parseFloat(value.replace(/[,，\s]/g, '')); // 移除各种分隔符
            } else {
                numValue = parseFloat(value);
            }
            
            if (!isNaN(numValue) && isFinite(numValue)) {
                mapping[field] = numValue;
            }
        }
        
        return mapping;
    }
    
    // 精确替换字段为数值（全新算法）
    function replaceFields(expression, fieldMapping) {
        if (!expression || Object.keys(fieldMapping).length === 0) {
            return expression;
        }
        
        // 使用位置匹配算法
        return replaceByPosition(expression, fieldMapping);
    }
    
    // 基于位置的精确替换算法
    function replaceByPosition(expression, fieldMapping) {
        const fields = Object.keys(fieldMapping).sort((a, b) => b.length - a.length);
        let result = expression;
        
        // 为避免重复替换问题，使用占位符机制
        const placeholders = {};
        let placeholderIndex = 0;
        
        // 第一步：将字段替换为唯一占位符
        fields.forEach(field => {
            const placeholder = `__PLACEHOLDER_${placeholderIndex++}__`;
            placeholders[placeholder] = `(${fieldMapping[field]})`;
            
            // 精确匹配并替换
            result = preciseReplace(result, field, placeholder);
        });
        
        // 第二步：将占位符替换为实际数值
        Object.entries(placeholders).forEach(([placeholder, value]) => {
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        
        return result;
    }
    
    // 精确匹配替换（确保完整字段匹配）
    function preciseReplace(text, fieldName, replacement) {
        let result = text;
        let startIndex = 0;
        
        while (true) {
            const index = result.indexOf(fieldName, startIndex);
            if (index === -1) break;
            
            const endIndex = index + fieldName.length;
            
            // 检查前后字符，确保是完整的字段名
            const beforeChar = index > 0 ? result[index - 1] : '';
            const afterChar = endIndex < result.length ? result[endIndex] : '';
            
            const isValidBefore = !beforeChar || !isFieldChar(beforeChar);
            const isValidAfter = !afterChar || !isFieldChar(afterChar);
            
            if (isValidBefore && isValidAfter) {
                // 执行替换
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
        // 只允许数字、运算符、括号和空格
        return /^[\d\s+\-*/().]+$/.test(expression);
    }
    
    // 表达式求值（内置安全检查）
    function safeEvaluate(expression) {
        try {
            // 最后一次安全检查
            if (!isSafeExpression(expression)) {
                return { success: false, error: '表达式包含不安全字符' };
            }
            
            // 检查基本语法（括号匹配等）
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
        // 检查括号匹配
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
        parseFormula,
        validateFormulaComponents,
        isValidFieldName,
        validateExpression,
        analyzeExpression,
        extractFields,
        validateExpressionFields,
        analyzeDependencies,
        checkCircularDependency,
        createFieldMapping,
        replaceFields,
        isSafeExpression,
        safeEvaluate
    };
})();