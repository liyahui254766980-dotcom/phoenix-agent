/**
 * Benchmark Runner - 性能基准测试
 * 量化评估 Agent 版本的性能
 */
import { EventEmitter } from 'events';

export interface BenchmarkMetrics {
  // 响应时间（毫秒）
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // 吞吐量（每秒任务数）
  throughput: number;
  
  // 内存（MB）
  memoryPeak: number;
  memoryAvg: number;
  
  // 任务指标
  tasksAttempted: number;
  tasksCompleted: number;
  completionRate: number;
  
  // 工具调用
  toolCalls: number;
  toolSuccessRate: number;
  avgToolLatency: number;
  
  // 错误率
  errorRate: number;
  
  // 综合评分 (0-100)
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

export const DEFAULT_THRESHOLDS: BenchmarkThresholds = {
  minScore: 70,
  maxResponseTime: 5000,
  minCompletionRate: 0.8,
  minToolSuccess: 0.9,
  maxMemoryMB: 512
};

export class BenchmarkRunner extends EventEmitter {
  private thresholds: BenchmarkThresholds;
  private testSuite: BenchmarkTask[] = [];

  constructor(thresholds?: Partial<BenchmarkThresholds>) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.initializeTestSuite();
  }

  /**
   * 初始化测试套件
   */
  private initializeTestSuite(): void {
    this.testSuite = [
      {
        id: 'simple-query',
        name: '简单问答',
        prompt: '什么是人工智能？',
        expectedTimeMs: 2000,
        weight: 1.0
      },
      {
        id: 'code-generation',
        name: '代码生成',
        prompt: '写一个 TypeScript 函数，实现快速排序',
        expectedTimeMs: 5000,
        weight: 1.5
      },
      {
        id: 'file-read',
        name: '文件读取',
        prompt: '读取 README.md 并总结内容',
        expectedTimeMs: 3000,
        weight: 1.2
      },
      {
        id: 'tool-call',
        name: '工具调用',
        prompt: '搜索当前时间',
        expectedTimeMs: 2000,
        weight: 1.3
      },
      {
        id: 'complex-task',
        name: '复杂任务',
        prompt: '创建一个计划：为 AI 工具箱网站写一篇评测文章',
        expectedTimeMs: 10000,
        weight: 2.0
      },
      {
        id: 'self-modification-test',
        name: '自修改测试',
        prompt: '读取 src/core/engine.ts 的前10行',
        expectedTimeMs: 2000,
        weight: 1.0
      }
    ];
  }

  /**
   * 运行完整基准测试
   */
  async runBenchmark(versionLabel: string): Promise<BenchmarkResult> {
    console.log(`\n🧪 Running benchmark for version: ${versionLabel}\n`);
    
    const startTime = Date.now();
    const tasks: TaskResult[] = [];
    const memorySamples: number[] = [];
    
    // 监控内存
    const memoryMonitor = setInterval(() => {
      const mem = process.memoryUsage().heapUsed / 1024 / 1024;
      memorySamples.push(mem);
    }, 100);

    // 运行每个测试任务
    for (const testTask of this.testSuite) {
      console.log(`  Running: ${testTask.name}...`);
      
      const taskStart = Date.now();
      let success = false;
      let errorMsg: string | undefined;
      let memBefore = process.memoryUsage().heapUsed;

      try {
        // 这里应该调用 Agent 的实际执行逻辑
        // 为了演示，我们模拟一个任务执行
        success = await this.executeTask(testTask);
      } catch (err) {
        success = false;
        errorMsg = err instanceof Error ? err.message : String(err);
      }

      const duration = Date.now() - taskStart;
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = (memAfter - memBefore) / 1024 / 1024;

      tasks.push({
        id: testTask.id,
        name: testTask.name,
        success,
        duration,
        error: errorMsg,
        memoryDelta: Math.round(memDelta * 100) / 100
      });

      // 输出进度
      const status = success ? '✅' : '❌';
      console.log(`    ${status} ${testTask.name} (${duration}ms)`);
    }

    clearInterval(memoryMonitor);
    const totalDuration = Date.now() - startTime;

    // 计算指标
    const metrics = this.calculateMetrics(tasks, memorySamples);

    // 计算综合评分
    const score = this.calculateScore(metrics);

    const result: BenchmarkResult = {
      version: versionLabel,
      timestamp: Date.now(),
      duration: totalDuration,
      metrics,
      tasks,
      warnings: this.checkThresholds(metrics)
    };

    // 输出报告
    this.printReport(result);

    return result;
  }

  /**
   * 执行单个任务（需要集成实际的 Agent 执行逻辑）
   */
  private async executeTask(task: BenchmarkTask): Promise<boolean> {
    // TODO: 这里是模拟实现
    // 实际应该调用 Agent 的 processMessage 方法
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // 模拟成功率（95%）
    return Math.random() > 0.05;
  }

  /**
   * 计算性能指标
   */
  private calculateMetrics(tasks: TaskResult[], memorySamples: number[]): BenchmarkMetrics {
    const successfulTasks = tasks.filter(t => t.success);
    const totalTasks = tasks.length;
    const completedTasks = successfulTasks.length;

    // 响应时间统计
    const responseTimes = successfulTasks.map(t => t.duration);
    responseTimes.sort((a, b) => a - b);

    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
    const p50 = this.percentile(responseTimes, 50);
    const p95 = this.percentile(responseTimes, 95);
    const p99 = this.percentile(responseTimes, 99);

    // 内存统计
    const memoryAvg = memorySamples.length ? 
      memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length : 0;
    const memoryPeak = Math.max(...memorySamples, 0);

    // 吞吐量（任务数 / 总耗时秒）
    const throughput = totalTasks / (this.testSuite.reduce((sum, t) => sum + t.expectedTimeMs, 0) / 1000);

    // 完成率
    const completionRate = completedTasks / totalTasks;

    // 工具调用成功率（这里用任务成功率代替）
    const toolSuccessRate = completionRate;

    return {
      avgResponseTime: Math.round(avg * 100) / 100,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      throughput: Math.round(throughput * 100) / 100,
      memoryPeak: Math.round(memoryPeak * 100) / 100,
      memoryAvg: Math.round(memoryAvg * 100) / 100,
      tasksAttempted: totalTasks,
      tasksCompleted: completedTasks,
      completionRate: Math.round(completionRate * 10000) / 10000,
      toolCalls: totalTasks, // 简化
      toolSuccessRate: Math.round(toolSuccessRate * 10000) / 10000,
      avgToolLatency: Math.round(avg * 100) / 100,
      errorRate: Math.round((1 - completionRate) * 10000) / 10000,
      score: 0 // 稍后计算
    };
  }

  /**
   * 计算百分位数
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 计算综合评分 (0-100)
   */
  private calculateScore(metrics: BenchmarkMetrics): number {
    // 加权评分算法
    const weights = {
      completionRate: 0.30,    // 30% - 任务完成率
      responseTime: 0.25,      // 25% - 响应速度
      toolSuccess: 0.20,       // 20% - 工具成功率
      memoryEfficiency: 0.15,  // 15% - 内存效率
      throughput: 0.10         // 10% - 吞吐量
    };

    // 完成率得分
    const completionScore = metrics.completionRate * 100 * weights.completionRate;

    // 响应时间得分（越快越高）
    const expectedTime = this.thresholds.maxResponseTime;
    const timeScore = Math.max(0, (1 - metrics.avgResponseTime / expectedTime)) * 100 * weights.responseTime;

    // 成功率得分
    const successScore = metrics.toolSuccessRate * 100 * weights.toolSuccess;

    // 内存效率得分（内存越低分越高）
    const memoryScore = Math.max(0, (1 - metrics.memoryPeak / this.thresholds.maxMemoryMB)) * 100 * weights.memoryEfficiency;

    // 吞吐量得分
    const throughputScore = Math.min(metrics.throughput / 10, 1) * 100 * weights.throughput;

    const totalScore = completionScore + timeScore + successScore + memoryScore + throughputScore;
    
    return Math.round(totalScore * 100) / 100;
  }

  /**
   * 检查是否超过阈值
   */
  private checkThresholds(metrics: BenchmarkMetrics): string[] {
    const warnings: string[] = [];

    if (metrics.avgResponseTime > this.thresholds.maxResponseTime) {
      warnings.push(`平均响应时间 ${metrics.avgResponseTime}ms 超过阈值 ${this.thresholds.maxResponseTime}ms`);
    }
    if (metrics.completionRate < this.thresholds.minCompletionRate) {
      warnings.push(`任务完成率 ${(metrics.completionRate * 100).toFixed(1)}% 低于阈值 ${(this.thresholds.minCompletionRate * 100).toFixed(1)}%`);
    }
    if (metrics.toolSuccessRate < this.thresholds.minToolSuccess) {
      warnings.push(`工具成功率 ${(metrics.toolSuccessRate * 100).toFixed(1)}% 低于阈值 ${(this.thresholds.minToolSuccess * 100).toFixed(1)}%`);
    }
    if (metrics.memoryPeak > this.thresholds.maxMemoryMB) {
      warnings.push(`内存峰值 ${metrics.memoryPeak.toFixed(1)}MB 超过阈值 ${this.thresholds.maxMemoryMB}MB`);
    }

    return warnings;
  }

  /**
   * 打印测试报告
   */
  private printReport(result: BenchmarkResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Benchmark Report - ${result.version}`);
    console.log('='.repeat(60));
    console.log(`Duration: ${result.duration}ms`);
    console.log(`\n🎯 Metrics:`);
    console.log(`  • Score:              ${result.metrics.score}/100`);
    console.log(`  • Avg Response Time:  ${result.metrics.avgResponseTime}ms`);
    console.log(`  • Completion Rate:    ${(result.metrics.completionRate * 100).toFixed(1)}%`);
    console.log(`  • Tool Success Rate:  ${(result.metrics.toolSuccessRate * 100).toFixed(1)}%`);
    console.log(`  • Memory Peak:        ${result.metrics.memoryPeak}MB`);
    console.log(`  • Throughput:         ${result.metrics.throughput} tasks/s`);

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach(w => console.log(`  • ${w}`));
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * 对比两个版本
   */
  compare(oldResult: BenchmarkResult, newResult: BenchmarkResult): Comparison {
    const scoreDiff = newResult.metrics.score - oldResult.metrics.score;
    const timeDiff = oldResult.metrics.avgResponseTime - newResult.metrics.avgResponseTime;
    const memoryDiff = oldResult.metrics.memoryPeak - newResult.metrics.memoryPeak;

    return {
      scoreImprovement: scoreDiff,
      responseTimeImprovement: timeDiff,
      memoryImprovement: memoryDiff,
      isBetter: scoreDiff > 0 && newResult.metrics.avgResponseTime <= oldResult.metrics.avgResponseTime * 1.1,
      improvements: {
        score: scoreDiff > 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2),
        responseTime: timeDiff > 0 ? `-${timeDiff.toFixed(0)}ms` : `${timeDiff.toFixed(0)}ms`,
        memory: memoryDiff > 0 ? `-${memoryDiff.toFixed(1)}MB` : `${memoryDiff.toFixed(1)}MB`
      }
    };
  }
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

interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  expectedTimeMs: number;
  weight: number;
}
