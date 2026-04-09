/**
 * Engine - Phoenix Agent 核心引擎
 * 整合所有模块，提供统一接口
 */
import { EventEmitter } from 'events';
import { BenchmarkResult } from './benchmark';
export interface PhoenixConfig {
    llm: {
        provider: 'openai' | 'stepfun';
        apiKey: string;
        baseUrl?: string;
        model: string;
        temperature?: number;
        maxTokens?: number;
    };
    evolution: {
        enabled: boolean;
        checkInterval: number;
        autoImprove: boolean;
        maxGenerations: number;
    };
    redundancy: {
        enabled: boolean;
        maxStandbys: number;
        syncEnabled: boolean;
        syncTargets?: string[];
    };
    safety: {
        enabled: boolean;
        strictMode: boolean;
        requireSandboxTest: boolean;
    };
    memory: {
        enabled: boolean;
        longTermEnabled: boolean;
        maxShortTermMessages: number;
    };
}
export interface Task {
    id: string;
    type: 'chat' | 'code' | 'file' | 'benchmark' | 'evolve' | 'system';
    content: string;
    context?: any;
    timestamp: number;
}
export interface EvolutionDecision {
    accept: boolean;
    reason: string;
    metrics?: BenchmarkResult;
    risk: number;
}
export declare class Engine extends EventEmitter {
    private config;
    private selfModifier;
    private benchmarkRunner;
    private redundancyManager;
    private safetyGuard;
    private memory;
    private isRunning;
    private evolutionInterval;
    private currentGeneration;
    constructor(config: PhoenixConfig);
    /**
     * 启动 Phoenix Agent
     */
    start(): Promise<void>;
    /**
     * 停止 Agent
     */
    stop(): Promise<void>;
    /**
     * 启动进化循环
     */
    private startEvolutionLoop;
    /**
     * 进化周期 - 核心的"思考-行动-学习"循环
     */
    private evolutionCycle;
    /**
     * 收集性能数据
     */
    private collectPerformanceData;
    /**
     * 分析性能，找出瓶颈
     */
    private analyzePerformance;
    /**
     * 生成改进代码
     */
    private generateImprovements;
    /**
     * 测试修改
     */
    private testModification;
    /**
     * 决策 - 是否采用新版本
     */
    private makeDecision;
    /**
     * 部署改进版本
     */
    private deployImprovement;
    /**
     * 处理用户请求
     */
    processRequest(task: Task): Promise<any>;
    /**
     * 手动触发基准测试
     */
    runBenchmark(): Promise<BenchmarkResult>;
    /**
     * 获取系统状态
     */
    getStatus(): any;
}
//# sourceMappingURL=engine.d.ts.map