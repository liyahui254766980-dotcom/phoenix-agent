/**
 * Engine - Phoenix Agent 核心引擎
 * 整合所有模块，提供统一接口
 */
import { EventEmitter } from 'events';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SelfModifier } from './self-modifier';
import { BenchmarkRunner, BenchmarkResult, DEFAULT_THRESHOLDS } from './benchmark';
import { RedundancyManager, AgentHealth } from './redundancy';
import { SafetyGuard, SafetyReport } from './safety';
import { MemorySystem } from './memory';

export interface PhoenixConfig {
  // LLM 配置
  llm: {
    provider: 'openai' | 'stepfun';
    apiKey: string;
    baseUrl?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  
  // 进化配置
  evolution: {
    enabled: boolean;
    checkInterval: number; // 毫秒
    autoImprove: boolean;
    maxGenerations: number;
  };
  
  // 冗余配置
  redundancy: {
    enabled: boolean;
    maxStandbys: number;
    syncEnabled: boolean;
    syncTargets?: string[];
  };
  
  // 安全配置
  safety: {
    enabled: boolean;
    strictMode: boolean;
    requireSandboxTest: boolean;
  };
  
  // 记忆配置
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

export class Engine extends EventEmitter {
  private config: PhoenixConfig;
  private selfModifier: SelfModifier;
  private benchmarkRunner: BenchmarkRunner;
  private redundancyManager: RedundancyManager;
  private safetyGuard: SafetyGuard;
  private memory: MemorySystem;
  
  private isRunning: boolean = false;
  private evolutionInterval: NodeJS.Timeout | null = null;
  private currentGeneration: number = 0;

  constructor(config: PhoenixConfig) {
    super();
    this.config = config;
    
    // 初始化模块
    this.selfModifier = new SelfModifier();
    this.benchmarkRunner = new BenchmarkRunner(DEFAULT_THRESHOLDS);
    this.redundancyManager = new RedundancyManager(process.cwd(), this.selfModifier);
    this.safetyGuard = new SafetyGuard();
    this.memory = new MemorySystem();
  }

  /**
   * 启动 Phoenix Agent
   */
  async start(): Promise<void> {
    console.log('\n🔥 Phoenix Agent starting...\n');
    
    // 初始化各模块
    await this.selfModifier.initialize();
    await this.redundancyManager.initialize();
    await this.memory.initialize();
    
    // 加载当前版本
    const currentVersion = this.selfModifier.getCurrentVersion();
    if (currentVersion) {
      this.redundancyManager.activate(currentVersion.id);
      console.log(`✓ Version activated: ${currentVersion.label}`);
    }

    // 启动进化循环
    if (this.config.evolution.enabled) {
      this.startEvolutionLoop();
    }

    this.isRunning = true;
    console.log('\n✨ Phoenix Agent is now running!\n');
    this.emit('started');
  }

  /**
   * 停止 Agent
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping Phoenix Agent...');
    
    this.isRunning = false;
    
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = null;
    }
    
    this.redundancyManager.stop();
    
    console.log('✓ Phoenix Agent stopped\n');
    this.emit('stopped');
  }

  /**
   * 启动进化循环
   */
  private startEvolutionLoop(): void {
    this.evolutionInterval = setInterval(async () => {
      if (this.isRunning && this.config.evolution.autoImprove) {
        await this.evolutionCycle();
      }
    }, this.config.evolution.checkInterval);
  }

  /**
   * 进化周期 - 核心的"思考-行动-学习"循环
   */
  private async evolutionCycle(): Promise<void> {
    console.log('\n🔄 Starting evolution cycle...');
    
    try {
      // 1. 监控阶段 - 收集性能数据
      const performanceData = await this.collectPerformanceData();
      
      // 2. 分析阶段 - 识别优化机会
      const optimizationOpportunities = await this.analyzePerformance(performanceData);
      
      // 3. 修改阶段 - 生成改进代码
      if (optimizationOpportunities.length > 0) {
        const codeModification = await this.generateImprovements(optimizationOpportunities);
        
        if (codeModification) {
          // 4. 测试阶段
          const testResult = await this.testModification(codeModification);
          
          // 5. 决策阶段
          const decision = await this.makeDecision(testResult);
          
          // 6. 部署阶段
          if (decision.accept) {
            await this.deployImprovement(codeModification, testResult);
          }
        }
      }
      
      this.currentGeneration++;
      this.emit('evolution_complete', { generation: this.currentGeneration });
      
    } catch (err) {
      console.error('Evolution cycle failed:', err);
      this.emit('evolution_error', err);
    }
  }

  /**
   * 收集性能数据
   */
  private async collectPerformanceData(): Promise<any> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss
      },
      uptime,
      timestamp: Date.now(),
      tasksCompleted: this.memory.getTaskCount(),
      recentErrors: this.memory.getRecentErrors(10)
    };
  }

  /**
   * 分析性能，找出瓶颈
   */
  private async analyzePerformance(data: any): Promise<string[]> {
    const opportunities: string[] = [];
    
    // 分析内存使用
    if (data.memory.heapUsed / data.memory.heapTotal > 0.8) {
      opportunities.push('High memory usage detected - optimize memory allocation');
    }
    
    // 分析常见错误
    if (data.recentErrors.length > 10) {
      opportunities.push('High error rate - improve error handling');
    }
    
    // 生成更多机会...
    // 这里可以集成 LLM 来分析数据并生成建议
    
    return opportunities;
  }

  /**
   * 生成改进代码
   */
  private async generateImprovements(opportunities: string[]): Promise<any> {
    console.log(`💡 Generating improvements for ${opportunities.length} opportunities...`);
    
    // TODO: 使用 LLM 生成针对性改进代码
    // 这里返回模拟数据
    return {
      files: [
        {
          path: 'src/core/engine.ts',
          oldCode: '// placeholder',
          newCode: '// improved code'
        }
      ],
      rationale: opportunities.join('; ')
    };
  }

  /**
   * 测试修改
   */
  private async testModification(modification: any): Promise<BenchmarkResult> {
    console.log('🧪 Testing modification...');
    
    // 1. 安全审查
    const safetyPromises = modification.files.map(file =>
      this.safetyGuard.reviewCode(file.path, file.newCode)
    );
    const safetyReports = await Promise.all(safetyPromises);
    
    if (safetyReports.some(r => !r.safe)) {
      throw new Error('Safety check failed');
    }
    
    // 2. 沙箱测试
    if (this.config.safety.requireSandboxTest) {
      for (const file of modification.files) {
        const sandboxResult = await this.safetyGuard.sandboxTest(file.newCode);
        if (!sandboxResult.success) {
          throw new Error(`Sandbox test failed: ${sandboxResult.error}`);
        }
      }
    }
    
    // 3. 应用修改到候选版本
    const versionId = await this.selfModifier.createSnapshot(
      `candidate-${Date.now()}`
    );
    
    // 4. 运行基准测试
    const benchmarkResult = await this.benchmarkRunner.runBenchmark(versionId.id);
    
    return { ...benchmarkResult, version: versionId.id };
  }

  /**
   * 决策 - 是否采用新版本
   */
  private async makeDecision(testResult: BenchmarkResult): Promise<EvolutionDecision> {
    const currentPrimary = this.redundancyManager.getStatus().primary;
    
    if (!currentPrimary) {
      return { accept: true, reason: 'No current version', risk: 0 };
    }
    
    // 获取当前版本的基准测试结果
    // TODO: 从数据库或文件获取
    
    // 简化：总是接受（实际中应该对比）
    return {
      accept: testResult.metrics.score >= 60,
      reason: testResult.metrics.score >= 60 ? 'Score meets threshold' : 'Score below threshold',
      risk: 10
    };
  }

  /**
   * 部署改进版本
   */
  private async deployImprovement(
    modification: any, 
    testResult: BenchmarkResult
  ): Promise<void> {
    console.log('🚀 Deploying improvement...');
    
    // 1. 候选版本添加到冗余池
    const versionId = testResult.version;
    await this.redundancyManager.addCandidate(
      path.join(process.cwd(), 'versions', versionId),
      `gen-${this.currentGeneration}`
    );
    
    // 2. 上传到冗余池（自动成为 standy）
    this.emit('version_tested', { versionId, result: testResult });
    
    // 3. 如果稳定运行一段时间后，在这里自动提升为 Primary
    // （逻辑在更高的管理层实现）
  }

  /**
   * 处理用户请求
   */
  async processRequest(task: Task): Promise<any> {
    // 记录到短期记忆
    this.memory.addToWorkingMemory(task);
    
    // 检查长期记忆中的相关经验
    const relevantExperience = await this.memory.searchRelevant(task.content);
    
    // 执行任务（这里应该调用 LLM）
    // 简化：返回模拟响应
    const response = {
      id: uuidv4(),
      taskId: task.id,
      content: `Processed: ${task.content}`,
      timestamp: Date.now()
    };
    
    // 记录结果
    this.memory.recordResult(response);
    
    return response;
  }

  /**
   * 手动触发基准测试
   */
  async runBenchmark(): Promise<BenchmarkResult> {
    const version = this.selfModifier.getCurrentVersion();
    const label = version?.label || 'current';
    return await this.benchmarkRunner.runBenchmark(label);
  }

  /**
   * 获取系统状态
   */
  getStatus(): any {
    const redundancyStatus = this.redundancyManager.getStatus();
    
    return {
      isRunning: this.isRunning,
      generation: this.currentGeneration,
      redundancy: redundancyStatus,
      memory: this.memory.getStats(),
      uptime: process.uptime()
    };
  }
}
