/**
 * Benchmark Runner - 性能基准测试
 * 量化评估 Agent 版本的性能
 */
import { EventEmitter } from 'events';
export interface BenchmarkMetrics {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    memoryPeak: number;
    memoryAvg: number;
    tasksAttempted: number;
    tasksCompleted: number;
    completionRate: number;
    toolCalls: number;
    toolSuccessRate: number;
    avgToolLatency: number;
    errorRate: number;
    score: number;
}
export interface BenchmarkResult {
    version: string;
    timestamp: number;
    duration: number;
    metrics: BenchmarkMetrics;
    tasks: TaskResult[];
    warnings: string[];
}
export interface TaskResult {
    id: string;
    name: string;
    success: boolean;
    duration: number;
    error?: string;
    memoryDelta: number;
}
export interface BenchmarkThresholds {
    minScore: number;
    maxResponseTime: number;
    minCompletionRate: number;
    minToolSuccess: number;
    maxMemoryMB: number;
}
export declare const DEFAULT_THRESHOLDS: BenchmarkThresholds;
export declare class BenchmarkRunner extends EventEmitter {
    private thresholds;
    private testSuite;
    constructor(thresholds?: Partial<BenchmarkThresholds>);
    /**
     * 初始化测试套件
     */
    private initializeTestSuite;
    /**
     * 运行完整基准测试
     */
    runBenchmark(versionLabel: string): Promise<BenchmarkResult>;
    /**
     * 执行单个任务（需要集成实际的 Agent 执行逻辑）
     */
    private executeTask;
    /**
     * 计算性能指标
     */
    private calculateMetrics;
    /**
     * 计算百分位数
     */
    private percentile;
    /**
     * 计算综合评分 (0-100)
     */
    private calculateScore;
    /**
     * 检查是否超过阈值
     */
    private checkThresholds;
    /**
     * 打印测试报告
     */
    private printReport;
    /**
     * 对比两个版本
     */
    compare(oldResult: BenchmarkResult, newResult: BenchmarkResult): Comparison;
}
export interface Comparison {
    scoreImprovement: number;
    responseTimeImprovement: number;
    memoryImprovement: number;
    isBetter: boolean;
    improvements: {
        score: string;
        responseTime: string;
        memory: string;
    };
}
//# sourceMappingURL=benchmark.d.ts.map