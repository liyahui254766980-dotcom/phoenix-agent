import { EventEmitter } from 'events';
import { SelfModifier } from './self-modifier';
export declare enum AgentHealth {
    Healthy = "healthy",
    Degraded = "degraded",
    Critical = "critical"
}
export interface AgentVersion {
    id: string;
    label: string;
    path: string;
    active: boolean;
    createdAt: number;
    score?: number;
    health: AgentHealth;
    lastCheckAt?: number;
    errorCount: number;
}
export interface RedundancyStatus {
    primary: AgentVersion | null;
    standbys: AgentVersion[];
    candidates: AgentVersion[];
    totalVersions: number;
}
export interface FailoverResult {
    success: boolean;
    fromVersion: string;
    toVersion: string;
    reason: string;
}
export declare class RedundancyManager extends EventEmitter {
    private selfModifier;
    private versionsDir;
    private pool;
    private primaryId;
    private healthCheckInterval;
    private readonly HEALTH_CHECK_INTERVAL;
    private readonly MAX_ERRORS_BEFORE_DEGRADED;
    private readonly MAX_ERRORS_BEFORE_CRITICAL;
    constructor(baseDir: string, selfModifier: SelfModifier);
    /**
     * 初始化冗余池 - 加载所有已保存版本
     */
    initialize(): Promise<void>;
    /**
     * 添加候选版本
     */
    addCandidate(versionSource: string, label: string): Promise<string>;
    /**
     * 激活某个版本为主版本
     */
    activate(versionId: string): Promise<void>;
    /**
     * 健康检查循环
     */
    private startHealthChecks;
    /**
     * 执行健康检查
     */
    private performHealthCheck;
    /**
     * 检查单个版本的健康状态
     */
    private checkVersionHealth;
    /**
     * 故障转移 - 切换到备用版本
     */
    failover(): Promise<FailoverResult>;
    /**
     * 同步版本到所有节点
     */
    syncVersion(versionId: string, targets?: string[]): Promise<void>;
    /**
     * 获取所有版本状态
     */
    getStatus(): RedundancyStatus;
    /**
     * 保存池状态到磁盘
     */
    private savePool;
    /**
     * 停止健康检查
     */
    stop(): void;
    /**
     * 获取版本
     */
    getVersion(versionId: string): AgentVersion | undefined;
    /**
     * 更新版本评分
     */
    updateVersionScore(versionId: string, score: number): void;
}
//# sourceMappingURL=redundancy.d.ts.map