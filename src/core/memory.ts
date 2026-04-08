/**
 * Memory System - 两层记忆架构
 * Level 1: Working Memory (短期工作区)
 * Level 2: Long-term Memory (长期向量记忆)
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// 简单向量数据库实现（后面可以替换为 LanceDB/ChromaDB）
class SimpleVectorStore {
  private vectors: Map<string, { embedding: number[]; metadata: any }> = new Map();
  
  async add(id: string, embedding: number[], metadata: any): Promise<void> {
    this.vectors.set(id, { embedding, metadata });
  }
  
  async search(queryEmbedding: number[], topK: number = 5): Promise<any[]> {
    // 简单的余弦相似度搜索
    const results: { id: string; score: number; metadata: any }[] = [];
    
    for (const [id, item] of this.vectors) {
      const score = this.cosineSimilarity(queryEmbedding, item.embedding);
      results.push({ id, score, metadata: item.metadata });
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export interface MemoryItem {
  id: string;
  type: 'task' | 'result' | 'lesson' | 'optimization' | 'error' | 'success';
  content: string;
  embedding?: number[]; // 向量表示
  metadata: {
    timestamp: number;
    taskId?: string;
    tags: string[];
    importance: number; // 0-1
  };
}

export interface WorkingMemoryItem {
  id: string;
  content: any;
  createdAt: number;
  expiresAt?: number;
}

export class MemorySystem extends EventEmitter {
  private workingMemory: WorkingMemoryItem[] = [];
  private vectorStore: SimpleVectorStore;
  private longTermEnabled: boolean;
  private maxWorkingItems: number;
  private storagePath: string;

  constructor(options?: { longTermEnabled?: boolean; maxWorkingItems?: number }) {
    super();
    this.longTermEnabled = options?.longTermEnabled ?? true;
    this.maxWorkingItems = options?.maxWorkingItems ?? 100;
    this.vectorStore = new SimpleVectorStore();
    this.storagePath = path.join(process.cwd(), 'memory');
  }

  /**
   * 初始化记忆系统
   */
  async initialize(): Promise<void> {
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
  addToWorkingMemory(item: any): string {
    const id = uuidv4();
    const memoryItem: WorkingMemoryItem = {
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
  getWorkingMemory(): WorkingMemoryItem[] {
    this.cleanupExpired();
    return this.workingMemory;
  }

  /**
   * 获取特定任务的相关记忆
   */
  async getRelevant(taskContent: string, limit: number = 5): Promise<MemoryItem[]> {
    if (!this.longTermEnabled) {
      return [];
    }
    
    // 生成查询向量（简化：使用关键词的简单哈希）
    const queryEmbedding = this.simpleEmbedding(taskContent);
    
    // 向量搜索
    const results = await this.vectorStore.search(queryEmbedding, limit);
    
    // 转换为 MemoryItem
    const items: MemoryItem[] = [];
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
  async recordResult(result: any): Promise<void> {
    if (!this.longTermEnabled) return;
    
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    const embedding = this.simpleEmbedding(content);
    
    const item: MemoryItem = {
      id: uuidv4(),
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
  async recordLesson(
    type: 'error' | 'success' | 'optimization',
    description: string,
    tags: string[] = []
  ): Promise<void> {
    if (!this.longTermEnabled) return;
    
    const item: MemoryItem = {
      id: uuidv4(),
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
  async recordOptimization(
    versionId: string,
    changes: string[],
    metricsBefore: any,
    metricsAfter: any
  ): Promise<void> {
    if (!this.longTermEnabled) return;
    
    const description = `Optimization ${versionId}: ${changes.join(', ')}`;
    const item: MemoryItem = {
      id: uuidv4(),
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
  private async saveToLongTerm(item: MemoryItem): Promise<void> {
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
  private async loadLongTermMemory(): Promise<void> {
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
        } catch (err) {
          console.error(`Failed to load memory item ${file}:`, err);
        }
      }
    }
    
    console.log(`✓ Loaded ${loaded} long-term memories`);
  }

  /**
   * 清理过期的工作记忆
   */
  private cleanupExpired(): void {
    const now = Date.now();
    this.workingMemory = this.workingMemory.filter(item => 
      !item.expiresAt || item.expiresAt > now
    );
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      workingMemoryCount: this.workingMemory.length,
      longTermEnabled: this.longTermEnabled,
      uptime: process.uptime()
    };
  }

  /**
   * 获取任务计数（从记忆中）
   */
  getTaskCount(): number {
    return this.workingMemory.filter(item => 
      item.content?.type === 'task'
    ).length;
  }

  /**
   * 获取最近错误
   */
  getRecentErrors(limit: number = 10): any[] {
    return this.workingMemory
      .filter(item => item.content?.type === 'error')
      .slice(-limit)
      .map(item => item.content);
  }

  /**
   * 简单的文本嵌入（演示用）
   * 实际应该用 OpenAI embedding API
   */
  private simpleEmbedding(text: string): number[] {
    // 简单的词频统计 + 哈希，生成固定长度的伪向量
    const words = text.toLowerCase().split(/\s+/);
    const vector: number[] = new Array(128).fill(0);
    
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
  async searchRelevant(query: string, limit: number = 5): Promise<MemoryItem[]> {
    return await this.getRelevant(query, limit);
  }
}
