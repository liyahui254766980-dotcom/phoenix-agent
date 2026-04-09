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
exports.MemorySystem = void 0;
/**
 * Memory System - 两层记忆架构
 * Level 1: Working Memory (短期工作区)
 * Level 2: Long-term Memory (长期向量记忆)
 */
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const events_1 = require("events");
const uuid_1 = require("uuid");
// 简单向量数据库实现（后面可以替换为 LanceDB/ChromaDB）
class SimpleVectorStore {
    vectors = new Map();
    async add(id, embedding, metadata) {
        this.vectors.set(id, { embedding, metadata });
    }
    async search(queryEmbedding, topK = 5) {
        // 简单的余弦相似度搜索
        const results = [];
        for (const [id, item] of this.vectors) {
            const score = this.cosineSimilarity(queryEmbedding, item.embedding);
            results.push({ id, score, metadata: item.metadata });
        }
        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
class MemorySystem extends events_1.EventEmitter {
    workingMemory = [];
    vectorStore;
    longTermEnabled;
    maxWorkingItems;
    storagePath;
    constructor(options) {
        super();
        this.longTermEnabled = options?.longTermEnabled ?? true;
        this.maxWorkingItems = options?.maxWorkingItems ?? 100;
        this.vectorStore = new SimpleVectorStore();
        this.storagePath = path.join(process.cwd(), 'memory');
    }
    /**
     * 初始化记忆系统
     */
    async initialize() {
        await fs.ensureDir(this.storagePath);
        if (this.longTermEnabled) {
            // 加载长期记忆
            await this.loadLongTermMemory();
        }
        console.log('✓ Memory system initialized');
    }
    /**
     * 添加到工作记忆（短期）
     */
    addToWorkingMemory(item) {
        const id = (0, uuid_1.v4)();
        const memoryItem = {
            id,
            content: item,
            createdAt: Date.now(),
            // 默认1小时后过期
            expiresAt: Date.now() + 60 * 60 * 1000
        };
        this.workingMemory.push(memoryItem);
        // 清理过期项目
        this.cleanupExpired();
        // 限制大小
        if (this.workingMemory.length > this.maxWorkingItems) {
            this.workingMemory = this.workingMemory.slice(-this.maxWorkingItems);
        }
        return id;
    }
    /**
     * 获取工作记忆
     */
    getWorkingMemory() {
        this.cleanupExpired();
        return this.workingMemory;
    }
    /**
     * 获取特定任务的相关记忆
     */
    async getRelevant(taskContent, limit = 5) {
        if (!this.longTermEnabled) {
            return [];
        }
        // 生成查询向量（简化：使用关键词的简单哈希）
        const queryEmbedding = this.simpleEmbedding(taskContent);
        // 向量搜索
        const results = await this.vectorStore.search(queryEmbedding, limit);
        // 转换为 MemoryItem
        const items = [];
        for (const result of results) {
            const itemPath = path.join(this.storagePath, 'longterm', `${result.id}.json`);
            if (await fs.pathExists(itemPath)) {
                const item = await fs.readJson(itemPath);
                items.push(item);
            }
        }
        return items;
    }
    /**
     * 记录任务结果到长期记忆
     */
    async recordResult(result) {
        if (!this.longTermEnabled)
            return;
        const content = typeof result === 'string' ? result : JSON.stringify(result);
        const embedding = this.simpleEmbedding(content);
        const item = {
            id: (0, uuid_1.v4)(),
            type: 'result',
            content,
            embedding,
            metadata: {
                timestamp: Date.now(),
                tags: ['result'],
                importance: 0.3
            }
        };
        await this.saveToLongTerm(item);
    }
    /**
     * 记录学到的教训
     */
    async recordLesson(type, description, tags = []) {
        if (!this.longTermEnabled)
            return;
        const item = {
            id: (0, uuid_1.v4)(),
            type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'optimization',
            content: description,
            embedding: this.simpleEmbedding(description),
            metadata: {
                timestamp: Date.now(),
                tags,
                importance: type === 'error' ? 0.6 : 0.4
            }
        };
        await this.saveToLongTerm(item);
        console.log(`📝 Lesson recorded: ${description.slice(0, 50)}...`);
    }
    /**
     * 记录优化历史
     */
    async recordOptimization(versionId, changes, metricsBefore, metricsAfter) {
        if (!this.longTermEnabled)
            return;
        const description = `Optimization ${versionId}: ${changes.join(', ')}`;
        const item = {
            id: (0, uuid_1.v4)(),
            type: 'optimization',
            content: description,
            embedding: this.simpleEmbedding(description),
            metadata: {
                timestamp: Date.now(),
                taskId: versionId,
                tags: ['optimization', 'evolution'],
                importance: 0.7,
                metrics: { before: metricsBefore, after: metricsAfter }
            }
        };
        await this.saveToLongTerm(item);
    }
    /**
     * 保存到长期存储
     */
    async saveToLongTerm(item) {
        const longTermDir = path.join(this.storagePath, 'longterm');
        await fs.ensureDir(longTermDir);
        const filePath = path.join(longTermDir, `${item.id}.json`);
        await fs.writeJson(filePath, item, { spaces: 2 });
        // 索引到向量存储
        if (item.embedding) {
            await this.vectorStore.add(item.id, item.embedding, item.metadata);
        }
    }
    /**
     * 加载长期记忆
     */
    async loadLongTermMemory() {
        const longTermDir = path.join(this.storagePath, 'longterm');
        if (!await fs.pathExists(longTermDir)) {
            await fs.ensureDir(longTermDir);
            return;
        }
        const files = await fs.readdir(longTermDir);
        let loaded = 0;
        for (const file of files) {
            if (file.endsWith('.json')) {
                const itemPath = path.join(longTermDir, file);
                try {
                    const item = await fs.readJson(itemPath);
                    if (item.embedding) {
                        await this.vectorStore.add(item.id, item.embedding, item.metadata);
                    }
                    loaded++;
                }
                catch (err) {
                    console.error(`Failed to load memory item ${file}:`, err);
                }
            }
        }
        console.log(`✓ Loaded ${loaded} long-term memories`);
    }
    /**
     * 清理过期的工作记忆
     */
    cleanupExpired() {
        const now = Date.now();
        this.workingMemory = this.workingMemory.filter(item => !item.expiresAt || item.expiresAt > now);
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            workingMemoryCount: this.workingMemory.length,
            longTermEnabled: this.longTermEnabled,
            uptime: process.uptime()
        };
    }
    /**
     * 获取任务计数（从记忆中）
     */
    getTaskCount() {
        return this.workingMemory.filter(item => item.content?.type === 'task').length;
    }
    /**
     * 获取最近错误
     */
    getRecentErrors(limit = 10) {
        return this.workingMemory
            .filter(item => item.content?.type === 'error')
            .slice(-limit)
            .map(item => item.content);
    }
    /**
     * 简单的文本嵌入（演示用）
     * 实际应该用 OpenAI embedding API
     */
    simpleEmbedding(text) {
        // 简单的词频统计 + 哈希，生成固定长度的伪向量
        const words = text.toLowerCase().split(/\s+/);
        const vector = new Array(128).fill(0);
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            let hash = 0;
            for (let j = 0; j < word.length; j++) {
                hash = ((hash << 5) - hash) + word.charCodeAt(j);
                hash = hash & hash; // 转 32-bit
            }
            const index = Math.abs(hash) % 128;
            vector[index] += 1;
        }
        // 归一化
        const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > 0) {
            return vector.map(v => v / magnitude);
        }
        return vector;
    }
    /**
     * 搜索相关记忆
     */
    async searchRelevant(query, limit = 5) {
        return await this.getRelevant(query, limit);
    }
}
exports.MemorySystem = MemorySystem;
//# sourceMappingURL=memory.js.map