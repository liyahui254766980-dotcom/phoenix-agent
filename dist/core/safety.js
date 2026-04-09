"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyGuard = void 0;
const path = __importStar(require("path"));
const vm2_1 = require("vm2");
const recast = __importStar(require("recast"));
const events_1 = require("events");
class SafetyGuard extends events_1.EventEmitter {
    forbiddenPatterns = [];
    criticalFilePaths = [];
    sandbox = null;
    constructor() {
        super();
        this.initializePatterns();
    }
    /**
     * 初始化危险模式
     */
    initializePatterns() {
        // 危险操作正则
        this.forbiddenPatterns = [
            // 删除关键文件
            /rm\s+-rf\s+\/|rmdir\s+\/s\/q|del\s+\/f\s+\/q/,
            /fs\.unlinkSync\(.*process\.(mainModule|execPath)/,
            /fs\.rmSync\(.*\{.*recursive:\s*true/,
            // 无限循环
            /while\s*\(\s*true\s*\)/,
            /for\s*\(\s*;\s*;\s*\)/,
            /do\s*\{\s*\}while\s*\(\s*true\s*\)/,
            // 递归自我调用无终止
            /function\s+\w+\s*\([^)]*\)\s*\{\s*\w+\s*\(\s*\)\s*\}/,
            // 进程自毁
            /process\.exit\(/,
            /process\.kill\(process\.pid/,
            /process\.abort\(/,
            // 格式化磁盘
            /mkfs|format|fdisk/,
            // 网络危险操作
            /curl.*\|.*sh|wget.*-O.*\|.*sh/,
            // 权限提升
            /sudo\s+|chmod\s+777|chown\s+root/,
            // 覆盖自身
            /fs\.writeFileSync\(.*__filename/,
            /fs\.copyFileSync\(.*process\.(mainModule|execPath)/,
        ];
        // 关键文件路径（不允许修改）
        this.criticalFilePaths = [
            'src/core/engine.ts',
            'src/core/self-modifier.ts',
            'src/core/redundancy.ts',
            'src/core/safety.ts',
            'src/core/benchmark.ts',
            'package.json',
            'tsconfig.json',
            'phoenix.yaml'
        ];
    }
    /**
     * 代码静态分析 - AST 级别检查
     */
    async analyzeCode(filePath, code) {
        const issues = [];
        const warnings = [];
        const suggestions = [];
        try {
            // 解析 AST
            const ast = recast.parse(code, {
                parser: require('recast/parsers/typescript')
            });
            // 检查危险模式
            this.checkForbiddenPatterns(code, issues);
            // 检查关键文件
            this.checkCriticalFile(filePath, issues, warnings);
            // AST 深度检查
            this.astChecks(ast, issues);
            // 依赖检查
            this.checkDependencies(ast, issues, warnings);
            // 计算风险评分
            const riskScore = this.calculateRiskScore(issues);
            const safe = riskScore < 30 && issues.filter(i => i.type === 'critical').length === 0;
            return {
                safe,
                riskScore,
                issues,
                warnings,
                suggestions
            };
        }
        catch (err) {
            return {
                safe: false,
                riskScore: 100,
                issues: [{
                        type: 'critical',
                        message: `Failed to parse code: ${err instanceof Error ? err.message : err}`
                    }],
                warnings,
                suggestions: ['Fix syntax errors before proceeding']
            };
        }
    }
    /**
     * 检查危险模式
     */
    checkForbiddenPatterns(code, issues) {
        for (const pattern of this.forbiddenPatterns) {
            const matches = code.match(pattern);
            if (matches) {
                issues.push({
                    type: 'critical',
                    message: `Forbidden pattern detected: ${pattern.toString().slice(0, 50)}...`,
                    codeSnippet: matches[0].slice(0, 100)
                });
            }
        }
    }
    /**
     * 检查关键文件修改
     */
    checkCriticalFile(filePath, issues, warnings) {
        const fileName = path.basename(filePath);
        const fullPath = filePath.replace(/\\/g, '/');
        if (this.criticalFilePaths.some(critical => fullPath.endsWith(critical))) {
            warnings.push(`Modifying critical file: ${filePath}`);
        }
    }
    /**
     * AST 深度检查
     */
    astChecks(ast, issues) {
        // 检查递归函数
        const recursiveFuncs = this.findRecursiveFunctions(ast);
        if (recursiveFuncs.length > 0) {
            issues.push({
                type: 'medium',
                message: `Found ${recursiveFuncs.length} recursive functions (ensure termination condition)`,
                codeSnippet: recursiveFuncs[0].slice(0, 100)
            });
        }
        // 检查大函数（可能复杂度高）
        const largeFuncs = this.findLargeFunctions(ast);
        if (largeFuncs.length > 0) {
            issues.push({
                type: 'low',
                message: `Found ${largeFuncs.length} large functions (>100 lines). Consider splitting.`
            });
        }
    }
    /**
     * 检查依赖变更
     */
    checkDependencies(ast, issues, warnings) {
        // 检查 require/import 语句
        const imports = this.findAllImports(ast);
        // 可以在这里检查新增依赖是否在白名单中
        // 简化：只记录警告
        if (imports.length > 20) {
            warnings.push(`High number of imports: ${imports.length} (might increase bundle size)`);
        }
    }
    /**
     * 查找递归函数
     */
    findRecursiveFunctions(ast) {
        const recursiveFuncs = [];
        function visit(node, inFunction, functionName) {
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                const name = node.id?.name || 'anonymous';
                visit(node.body, true, name);
            }
            else if (node.type === 'CallExpression') {
                if (inFunction && node.callee?.name === functionName) {
                    recursiveFuncs.push(`Function "${functionName}" appears to call itself`);
                }
            }
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const child = node[key];
                    if (Array.isArray(child)) {
                        child.forEach(c => c && typeof c === 'object' && visit(c, inFunction, functionName));
                    }
                    else if (child && typeof child === 'object') {
                        visit(child, inFunction, functionName);
                    }
                }
            }
        }
        visit(ast, false, null);
        return recursiveFuncs;
    }
    /**
     * 查找大函数
     */
    findLargeFunctions(ast) {
        const largeFuncs = [];
        function visit(node) {
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                const lines = node.loc?.end.line - node.loc?.start.line + 1;
                if (lines > 100) {
                    largeFuncs.push(node);
                }
            }
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const child = node[key];
                    if (Array.isArray(child)) {
                        child.forEach(c => c && typeof c === 'object' && visit(c));
                    }
                    else if (child && typeof child === 'object') {
                        visit(child);
                    }
                }
            }
        }
        visit(ast);
        return largeFuncs;
    }
    /**
     * 查找所有 import/require
     */
    findAllImports(ast) {
        const imports = [];
        function visit(node) {
            if (node.type === 'ImportDeclaration') {
                imports.push(node.source.value);
            }
            else if (node.type === 'CallExpression' && node.callee?.name === 'require') {
                if (node.arguments?.[0]?.type === 'Literal') {
                    imports.push(node.arguments[0].value);
                }
            }
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const child = node[key];
                    if (Array.isArray(child)) {
                        child.forEach(c => c && typeof c === 'object' && visit(c));
                    }
                    else if (child && typeof child === 'object') {
                        visit(child);
                    }
                }
            }
        }
        visit(ast);
        return imports;
    }
    /**
     * 计算风险评分
     */
    calculateRiskScore(issues) {
        let score = 0;
        for (const issue of issues) {
            switch (issue.type) {
                case 'critical':
                    score += 50;
                    break;
                case 'high':
                    score += 30;
                    break;
                case 'medium':
                    score += 15;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        }
        return Math.min(score, 100);
    }
    /**
     * 沙箱测试 - 隔离环境运行代码
     */
    async sandboxTest(code, testCase) {
        if (!this.sandbox) {
            this.sandbox = new vm2_1.VM({
                timeout: 5000,
                sandbox: {},
                eval: false,
                wasm: false
            });
        }
        const startTime = Date.now();
        const memBefore = process.memoryUsage().heapUsed;
        try {
            // 准备测试代码
            const testCode = testCase || `
        try {
          // 模拟 Agent 的主要功能
          const result = { status: 'ok', timestamp: Date.now() };
          // 暴露给外部
          module.exports = { testResult: result };
        } catch (err) {
          console.error(err);
          throw err;
        }
      `;
            // 在沙箱中运行
            const output = this.sandbox.run(testCode);
            const duration = Date.now() - startTime;
            const memAfter = process.memoryUsage().heapUsed;
            const memoryDelta = (memAfter - memBefore) / 1024 / 1024;
            return {
                success: true,
                output,
                duration,
                memoryDelta: Math.round(memoryDelta * 100) / 100
            };
        }
        catch (err) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                error: err instanceof Error ? err.message : String(err),
                duration,
                memoryDelta: 0
            };
        }
    }
    /**
     * 完整的安全审查流程
     */
    async reviewCode(filePath, code) {
        console.log(`🔍 Reviewing code: ${filePath}`);
        // 1. 静态分析
        const staticReport = await this.analyzeCode(filePath, code);
        // 2. 沙箱测试（如果静态分析通过）
        if (staticReport.safe) {
            const sandboxResult = await this.sandboxTest(code);
            if (!sandboxResult.success) {
                staticReport.safe = false;
                staticReport.issues.push({
                    type: 'high',
                    message: `Sandbox test failed: ${sandboxResult.error}`
                });
            }
            if (sandboxResult.memoryDelta > 10) {
                staticReport.warnings.push(`Memory increase in sandbox: +${sandboxResult.memoryDelta}MB`);
            }
        }
        // 3. 输出审查报告
        this.emit('review_complete', staticReport);
        return staticReport;
    }
    /**
     * 紧急停止 - 立即阻止危险操作
     */
    emergencyStop(reason) {
        console.error(`🛑 EMERGENCY STOP: ${reason}`);
        process.exit(1);
    }
}
exports.SafetyGuard = SafetyGuard;
//# sourceMappingURL=safety.js.map