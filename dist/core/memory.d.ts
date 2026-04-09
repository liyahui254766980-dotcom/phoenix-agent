import { EventEmitter } from 'events';
export interface MemoryItem {
    id: string;
    type: 'task' | 'result' | 'lesson' | 'optimization' | 'error' | 'success';
    content: string;
    embedding?: number[];
    metadata: {
        timestamp: number;
        taskId?: string;
        tags: string[];
        importance: number;
        metrics?: any;
    };
}
export interface WorkingMemoryItem {
    id: string;
    content: any;
    createdAt: number;
    expiresAt?: number;
}
export declare class MemorySystem extends EventEmitter {
    private workingMemory;
    private vectorStore;
    private longTermEnabled;
    private maxWorkingItems;
    private storagePath;
    constructor(options?: {
        longTermEnabled?: boolean;
        maxWorkingItems?: number;
    });
    /**
     * 初始化记忆系统
     */
    initialize(): Promise<void>;
    /**
     * 添加到工作记忆（短期）
     */
    addToWorkingMemory(item: any): string;
    /**
     * 获取工作记忆
     */
    getWorkingMemory(): WorkingMemoryItem[];
    /**
     * 获取特定任务的相关记忆
     */
    getRelevant(taskContent: string, limit?: number): Promise<MemoryItem[]>;
    /**
     * 记录任务结果到长期记忆
     */
    recordResult(result: any): Promise<void>;
    /**
     * 记录学到的教训
     */
    recordLesson(type: 'error' | 'success' | 'optimization', description: string, tags?: string[]): Promise<void>;
    /**
     * 记录优化历史
     */
    recordOptimization(versionId: string, changes: string[], metricsBefore: any, metricsAfter: any): Promise<void>;
    /**
     * 保存到长期存储
     */
    private saveToLongTerm;
    /**
     * 加载长期记忆
     */
    private loadLongTermMemory;
    /**
     * 清理过期的工作记忆
     */
    private cleanupExpired;
    /**
     * 获取统计信息
     */
    getStats(): any;
    /**
     * 获取任务计数（从记忆中）
     */
    getTaskCount(): number;
    /**
     * 获取最近错误
     */
    getRecentErrors(limit?: number): any[];
    /**
     * 简单的文本嵌入（演示用）
     * 实际应该用 OpenAI embedding API
     */
    private simpleEmbedding;
    /**
     * 搜索相关记忆
     */
    searchRelevant(query: string, limit?: number): Promise<MemoryItem[]>;
}
//# sourceMappingURL=memory.d.ts.map