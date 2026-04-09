import { EventEmitter } from 'events';
export interface SafetyReport {
    safe: boolean;
    riskScore: number;
    issues: SafetyIssue[];
    warnings: string[];
    suggestions: string[];
}
export interface SafetyIssue {
    type: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    line?: number;
    column?: number;
    codeSnippet?: string;
}
export interface SandboxTestResult {
    success: boolean;
    output?: any;
    error?: string;
    duration: number;
    memoryDelta: number;
}
export declare class SafetyGuard extends EventEmitter {
    private forbiddenPatterns;
    private criticalFilePaths;
    private sandbox;
    constructor();
    /**
     * 初始化危险模式
     */
    private initializePatterns;
    /**
     * 代码静态分析 - AST 级别检查
     */
    analyzeCode(filePath: string, code: string): Promise<SafetyReport>;
    /**
     * 检查危险模式
     */
    private checkForbiddenPatterns;
    /**
     * 检查关键文件修改
     */
    private checkCriticalFile;
    /**
     * AST 深度检查
     */
    private astChecks;
    /**
     * 检查依赖变更
     */
    private checkDependencies;
    /**
     * 查找递归函数
     */
    private findRecursiveFunctions;
    /**
     * 查找大函数
     */
    private findLargeFunctions;
    /**
     * 查找所有 import/require
     */
    private findAllImports;
    /**
     * 计算风险评分
     */
    private calculateRiskScore;
    /**
     * 沙箱测试 - 隔离环境运行代码
     */
    sandboxTest(code: string, testCase?: string): Promise<SandboxTestResult>;
    /**
     * 完整的安全审查流程
     */
    reviewCode(filePath: string, code: string): Promise<SafetyReport>;
    /**
     * 紧急停止 - 立即阻止危险操作
     */
    emergencyStop(reason: string): never;
}
//# sourceMappingURL=safety.d.ts.map