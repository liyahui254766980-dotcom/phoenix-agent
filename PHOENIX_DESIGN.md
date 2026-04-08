# Phoenix Agent - 自进化双冗余智能体系统
## 设计文档 v1.0

---

## 1. 项目概述

Phoenix Agent 是一个**具备自主进化能力**的 AI Agent 系统。能够在运行中修改自身代码、测试性能优化、并将更高效的版本同步到冗余节点。

**灵感来源：**
- Claude Code CLI 的文件操作、工具调用、任务执行能力
- 自进化系统的概念：代码即数据，性能即进化动力

---

## 2. 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Phoenix Agent System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Active Agent │◄──►│Benchmark     │◄──►│Performance   │  │
│  │  (主力版本)   │    │  Runner      │    │  Monitor     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   ▲                    │          │
│         │                   │                    │          │
│  ┌──────▼────────┐         │           ┌────────▼──────┐  │
│  │ Self-Modifier │         │           │ Redundancy    │  │
│  │  自修改器      │         │           │ Manager       │  │
│  │ · 读自身代码   │◄────────┘           │ · 多版本管理   │  │
│  │ · 改自身代码   │                    │ · 故障转移     │  │
│  │ · 热重载      │                    │ · 版本同步     │  │
│  └──────▲────────┘                    └────────▲──────┘  │
│         │                                      │          │
│  ┌──────┴──────────────────────────────────────┴─────────┐│
│  │                  Safety Guard                         ││
│  │  · 代码静态分析 (AST)                                  ││
│  │  · 沙箱测试                                            ││
│  │  · 风险评分                                           ││
│  │  · 版本回滚保护                                        ││
│  └───────────────────────────────────────────────────────┘│
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Memory System (两层记忆)                   │  │
│  │  · Working Memory: Session 上下文 + Redis            │  │
│  │  · Long-term: ChromaDB / LanceDB 向量存储            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 模块详细设计

### 3.1 Self-Modifier（自修改器）

**职责：** 读取、修改、热重载自身源代码

**接口：**
```typescript
interface ISelfModifier {
  // 读取任意文件
  readFile(path: string): Promise<string>;
  
  // 精确替换代码片段
  editFile(path: string, oldCode: string, newCode: string): Promise<void>;
  
  // 插入代码到指定位置
  insertAt(path: string, marker: string, code: string, position: 'before'|'after'): Promise<void>;
  
  // 创建版本快照（不运行）
  createSnapshot(label: string): string;
  
  // 热重载（不需要重启进程）
  hotReload(): Promise<void>;
  
  // 列出所有版本
  listVersions(): Version[];
  
  // 回滚到指定版本
  rollback(versionId: string): Promise<void>;
}
```

**实现思路：**
- 读取自身源代码（需要 Agent 有文件系统权限）
- 修改后保存
- 使用 Node.js 的 `module.constructor` 或动态 import 实现热重载
- 版本快照保存到 `versions/` 目录或 Git

---

### 3.2 Benchmark Runner（性能基准）

**职责：** 量化评估不同版本的性能

**关键指标：**
1. **响应时间**（平均、P50、P95、P99）
2. **吞吐量**（每秒请求数）
3. **内存占用**（峰值、均值）
4. **工具调用效率**（成功/失败率、平均耗时）
5. **任务完成率**（复杂任务完成百分比）
6. **用户满意度**（需要反馈机制）

**接口：**
```typescript
interface IBenchmarkRunner {
  // 运行完整基准测试套件
  runBenchmark(versionCode?: string): Promise<BenchmarkResult>;
  
  // 对比两次运行结果
  compare(oldResult: BenchmarkResult, newResult: BenchmarkResult): Comparison;
  
  // 判断是否"更优"
  isBetter(newResult: BenchmarkResult, oldResult: BenchmarkResult, 
           thresholds: BenchmarkThresholds): boolean;
}

interface BenchmarkResult {
  version: string;
  timestamp: number;
  duration: number;
  
  // 响应时间（ms）
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  
  // 吞吐量（req/s）
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
  
  // 综合评分（0-100）
  score: number;
}

// 遗传算法筛选条件
const FITNESS_THRESHOLDS: BenchmarkThresholds = {
  minScore: 70,           // 综合评分至少 70
  maxResponseTime: 5000,  // 平均响应时间 < 5s
  minCompletionRate: 0.8, // 任务完成率 > 80%
  minToolSuccess: 0.9,    // 工具成功率 > 90%
};
```

---

### 3.3 Redundancy Manager（冗余管理器）

**职责：** 管理多个版本实例，故障转移，版本同步

**架构：**
```
Redundancy Pool
├── Primary (当前活跃版本)
├── Standby 1 (备用版本 1)
├── Standby 2 (备用版本 2)
└── Candidate (待测试新版本)
```

**接口：**
```typescript
interface IRedundancyManager {
  // 初始化冗余池（加载所有已保存版本）
  initialize(): Promise<void>;
  
  // 添加新版本到待测试池
  addCandidate(versionSource: string, label: string): Promise<string>;
  
  // 激活某个版本（成为 Primary）
  activate(versionId: string): Promise<void>;
  
  // 健康检查（监控 Primary）
  healthCheck(): Promise<AgentHealth>;
  
  // 故障转移（自动切换到 Standby）
  failover(): Promise<void>;
  
  // 同步版本到所有节点
  sync(versionId: string, targets: string[]): Promise<void>;
  
  // 获取所有版本状态
  getStatus(): RedundancyStatus;
}

// 版本容器
interface AgentVersion {
  id: string;              // UUID
  label: string;           // "v1.2.0", "candidate-20240409", etc.
  active: boolean;         // 是否为当前活跃版本
  path: string;            // 代码路径
  createdAt: number;
  score?: number;          // 基准测试评分（如果有）
  health: 'healthy' | 'degraded' | 'critical';
}
```

** fault tolerance 策略：**
- Primary 故障 → 自动切换 Standby 1（5s 内）
- Standby 1 也故障 → 切换 Standby 2（10s 内）
- 所有备份都故障 → 回滚到最近的健康版本
- 每次故障记录日志，触发 Safety Guard 审查

---

### 3.4 Safety Guard（安全守卫）

**职责：** 防止自进化过程破坏系统稳定性

**机制：**
1. **静态代码分析**
   - 使用 AST（抽象语法树）解析
   - 检测破坏性操作（删除核心文件、死循环、无限递归）
   - 检查依赖变更（新增/删除 npm 包）

2. **沙箱测试**
   - 在隔离环境运行新版本
   - 模拟典型任务（读写文件、网络请求）
   - 监控异常（崩溃、内存泄漏、超时）

3. **风险评分**
   - 代码更改量（越大风险越高）
   - 变更文件的重要性（核心模块 > 辅助模块）
   - 破坏性操作数量
   - 历史稳定性（该版本的过往表现）

4. **回滚保护**
   - 新版本启动后，保留旧版本至少 24 小时
   - 监控新版本的关键指标，异常自动回滚
   - 回滚决策条件：响应时间 > 2x、失败率 > 20%、内存泄漏 > 50%

---

### 3.5 Memory System（记忆系统）

**两层记忆架构：**

| 层级 | 类型 | 容量 | 速度 | 用途 |
|------|------|------|------|------|
| Level 1 | Working Memory | 会话级 | 极快 | 当前任务上下文 |
| Level 2 | Long-term Memory | 持久化 | 快 | 经验、教训、优化历史 |

**技术选型：**
- Level 1: 全局变量 + Session Storage + Redis（如果可用）
- Level 2: ChromaDB 或 LanceDB（向量数据库，支持语义搜索）

**记忆内容：**
```
memory/
├── lessons/           # 学到的教训（错误、.success）
├── optimizations/     # 优化历史（代码变更 + 效果）
├── version-history/   # 版本演进图谱
└── user-preferences/  # 用户偏好（速度优先 vs 质量优先）
```

---

## 4. 自进化工作流

```
┌─────────────────────────────────────────────────────────┐
│                自动进化周期（每 24h 或触发）               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ① 监控阶段                                              │
│     · 收集性能指标（响应时间、吞吐量、错误率）              │
│     · 记录任务完成情况                                    │
│     · 检测异常（性能下降、用户投诉）                        │
│                                                          │
│  ② 分析阶段                                              │
│     · 识别瓶颈（慢查询、高频失败的工具调用）                 │
│     · 生成优化建议（A/B brainstorm）                     │
│                                                          │
│  ③ 修改阶段                                              │
│     · Self-Modifier 生成改进代码                          │
│     · 新版本添加到 Candidate 池                           │
│                                                          │
│  ④ 测试阶段                                              │
│     · Safety Guard 静态扫描                              │
│     · 沙箱测试（模拟典型任务）                              │
│     · Benchmark Runner 对比新旧版本                       │
│                                                          │
│  ⑤ 决策阶段                                              │
│     IF 新版本评分更高 && 风险低                           │
│       → 同步到冗余池，成为新 Standby                      │
│     ELSE                                                  │
│       → 拒绝，记录原因，回滚                              │
│                                                          │
│  ⑥ 部署阶段                                              │
│     IF 新版本稳定运行 > 24h && 指标持续优于当前版本          │
│       → 激活新版本为 Primary                              │
│     ELSE                                                  │
│       → 回滚到旧版本                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 技术栈

| 组件 | 技术选型 | 理由 |
|------|---------|------|
| 运行环境 | Node.js >= 18 | 动态导入、热重载 |
| LLM API | StepFun API (已有) | 稳定、成本可控 |
| 记忆存储 | LanceDB / ChromaDB | 向量搜索、开源 |
| 临时缓存 | Redis / NodeCache | 快速读写 |
| 版本控制 | 内置 Git + 快照 | 可追溯、可回滚 |
| 沙箱测试 | Node.js VM / isolated-vm | 安全隔离 |
| 工具体系 | OpenClaw 工具 + 自定义 | 复用已有能力 |
| 配置管理 | YAML + 热重载 | 易修改 |
| 监控指标 | Prometheus + Grafana (可选) | 可视化 |
| 前端界面 | CLI + Web (可选) | 多终端支持 |

---

## 6. 关键文件结构

```
phoenix-agent/
├── src/
│   ├── core/
│   │   ├── engine.ts          # 核心引擎
│   │   ├── self-modifier.ts   # 自修改器
│   │   ├── benchmark.ts       # 性能基准
│   │   ├── redundancy.ts      # 冗余管理
│   │   ├── safety.ts          # 安全守卫
│   │   └── version-control.ts # 版本控制
│   ├── skills/
│   │   ├── file-editor.ts
│   │   ├── code-runner.ts
│   │   ├── profiler.ts
│   │   └── sync-engine.ts
│   ├── memory/
│   │   ├── working.ts
│   │   └── long-term.ts
│   └── cli/
│       └── phoenix.ts
├── tests/
├── docs/
└── package.json
```

---

## 7. 开发里程碑

| 阶段 | 时间估计 | 交付物 | 状态 |
|------|---------|--------|------|
| Phase 1: 基础框架 | 2 天 | 可运行的 Agent 骨架，文件读写+基本工具 | 📋 规划 |
| Phase 2: 自修改+热重载 | 2 天 | Self-Modifier + Hot Reload 演示 | 📋 规划 |
| Phase 3: 温度测试 | 2 天 | 完整测试套件+性能指标+冗余系统 | 📋 规划 |
| Phase 4: 安全系统 | 2 天 | Safety Guard + 沙箱测试 | 📋 规划 |
| Phase 5: 优化进化 | 2 天 | Benchmark Runner + 自动进化循环 | 📋 规划 |
| Phase 6: 记忆系统 | 1 天 | 两层记忆架构 | 📋 规划 |
| Phase 7: Alpha测试 | 2 天 | 端到端演示 + 压力测试 | 📋 规划 |
| **总计** | **~14天** | **完整原型** | |

---

## 8. 实现步骤（建议顺序）

### 步骤 1：创建项目骨架
- 初始化 npm 项目（package.json + tsconfig.json）
- 创建目录结构
- 安装依赖：openai SDK、lancedb/chromadb、commander、chalk 等

### 步骤 2：实现核心引擎（Engine）
- Agent 主循环
- 工具注册机制
- 会话状态管理
- 简单的 "Hello World" 测试

### 步骤 3：实现 Self-Modifier
- readFile、editFile 工具
- 版本快照创建
- 热重载演示（修改一个函数，不重启）

### 步骤 4：实现 Benchmark Runner
- 定义指标（响应时间、成功率等）
- 创建测试数据集（10-20个典型任务）
- 运行基准并输出报告

### 步骤 5：实现 Redundancy Manager
- 多版本并行加载
- 主备切换逻辑
- 健康检查

### 步骤 6：实现 Safety Guard
- AST 静态分析
- 沙箱测试
- 回滚保护

### 步骤 7：集成进化循环
- 监测 + 分析 + 修改 + 测试 + 决策 + 部署
- 全链路跑通

### 步骤 8：记忆系统
- 短期 Working Memory（Session 变量）
- 长期 Long-term Memory（向量数据库）
- 语义搜索

### 步骤 9：Alpha 测试
- 让 Phoenix Agent 运行 24h+，观察它是否真的自我优化
- 压力测试（10-20 并发）
- 故障注入测试

### 步骤 10：文档与云部署
- 用户指南
- API 文档
- 部署到云文档（你指定的位置）
- 演示视频录制

---

## 9. 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 自修改导致崩溃 | 高 | Safety Guard + 多级回滚 |
| 无限递归修改 | 高 | 修改计数器、冷却期 |
| 性能退化 | 中 | 基准对比、严格阈值 |
| 安全漏洞 | 高 | AST 扫描、禁止破坏性操作 |
| LLM 成本 | 中 | 缓存 + 递归教育 |
| 数据丢失 | 高 | 所有修改前自动快照 |

---

## 10. 扩展方向

### 短期（v1.0+）
- [ ] Web UI 监控面板
- [ ] 更多工具集成（GitHub Actions、Docker）
- [ ] 插件机制（第三方技能）
- [ ] 联邦学习（多 Agent 知识共享）

### 中期（v2.0）
- [ ] 遗传算法 + 强化学习（AI 训练 AI）
- [ ] 多模态进化（文本+图像+代码）
- [ ] 跨语言自进化（TS -> Python -> Rust）

### 远期（v3.0）
- [ ] 分布式部署（多服务器）
- [ ] 自主申请 API 额度、购买服务器
- [ ] 贡献开源社区

---

## 11. 成功标准

- ✅ Agent 能在运行中修改自身代码而不崩溃
- ✅ 新版本通过基准测试后被自动采用
- ✅ 双冗余实现故障自动转移（< 5s）
- ✅ 完整云文档（设计 + API + 部署 + 使用指南）

---

**文档版本：** v1.0  
**最后更新：** 2026-04-09  
**作者：** Phoenix Agent Design Team
