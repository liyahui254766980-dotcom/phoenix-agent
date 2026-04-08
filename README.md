# Phoenix Agent - 自进化双冗余智能体系统

> 一个能自我修改、自我优化、自我修复的 AI Agent 系统

## ✨ 特性

- 🔄 **自主进化** - 自动识别性能瓶颈并生成改进代码
- 🔄 **热重载** - 运行中修改代码，无需重启
- 🔄 **双冗余架构** - 主备自动切换，故障秒级恢复
- 🔄 **安全守卫** - AST 静态分析 + 沙箱测试，防止破坏性修改
- 🔄 **两层记忆** - 短期工作记忆 + 长期向量记忆
- 🔄 **性能基准** - 量化评估每个版本的优劣

---

## 📁 项目结构

```
phoenix-agent/
├── src/
│   ├── core/                    # 核心引擎
│   │   ├── engine.ts           # 主引擎（整合所有模块）
│   │   ├── self-modifier.ts    # 自修改器（读写代码+热重载）
│   │   ├── benchmark.ts        # 性能基准测试
│   │   ├── redundancy.ts       # 冗余管理器（多版本+故障转移）
│   │   ├── safety.ts           # 安全守卫（AST分析+沙箱）
│   │   └── memory.ts           # 两层记忆系统
│   ├── skills/                 # 技能模块（待扩展）
│   └── cli/
│       └── phoenix.ts          # CLI 入口
├── versions/                   # 版本快照存储
│   ├── snapshots/
│   └── active/
├── memory/                     # 记忆存储
│   ├── working/               # 短期记忆
│   └── longterm/              # 长期向量记忆
├── tests/                      # 测试
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 快速开始

### 前置要求
- Node.js >= 18.0.0
- StepFun API Key（或 OpenAI 兼容的 API）

### 安装
```bash
cd phoenix-agent
npm install
```

### 配置
创建 `.env` 文件：
```env
STEPFUN_API_KEY=sk-your-api-key-here
```

或直接使用命令行参数：
```bash
phoenix start --api-key sk-your-key
```

### 运行

**启动 Agent：**
```bash
npm run dev
# 或编译后
npm run build
npm start
```

**查看状态：**
```bash
phoenix status
```

**运行基准测试：**
```bash
phoenix benchmark
```

**创建快照：**
```bash
phoenix snapshot "v1.0.0-release"
```

**进入交互控制台：**
```bash
phoenix console
```

---

## 🏗️ 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                 Phoenix Agent Core                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐│
│  │   Self-      │◄──►│ Benchmark   │◄──►│ Performance ││
│  │  Modifier    │    │  Runner     │    │  Monitor    ││
│  └──────▲───────┘    └──────────────┘    └─────────────┘│
│         │                                                 │
│         │              ┌──────────────┐                   │
│         └─────────────►│ Redundancy  │                   │
│                        │  Manager    │                   │
│                        └──────▲──────┘                   │
│                               │                          │
│                        ┌──────┴─────────────────────────┐│
│                        │    Safety Guard                ││
│                        │  · AST Analysis                ││
│                        │  · Sandbox Test                ││
│                        │  · Risk Assessment             ││
│                        └─────────────────────────────────┘│
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │            Memory System                            ││
│  │  · Working Memory (Session)                         ││
│  │  · Long-term Memory (Vector DB)                     ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 自进化工作流

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Monitor  │→  │ Analyze  │→  │ Modify   │→  │ Test     │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
       │                                               │
       └───────────────┬───────────────────────────────┘
                       ▼
                ┌──────────────┐
                │   Decision   │
                │ (Accept/Reject)
                └──────▲───────┘
                       │
                ┌──────┴───────┐
                │   Deploy     │
                │ (Activate New)
                └──────────────┘
```

1. **Monitor** - 收集性能指标（响应时间、内存、错误率）
2. **Analyze** - 识别瓶颈和优化机会
3. **Modify** - Self-Modifier 生成改进代码
4. **Test** - Safety Guard + Benchmark 验证
5. **Decision** - 评分 > 阈值？接受 or 拒绝
6. **Deploy** - 激活新版本，同步到冗余池

---

## 📊 基准测试指标

| 指标 | 说明 | 阈值 |
|------|------|------|
| Score | 综合评分 (0-100) | ≥ 70 |
| Avg Response Time | 平均响应时间 | < 5000ms |
| Completion Rate | 任务完成率 | ≥ 80% |
| Tool Success Rate | 工具成功率 | ≥ 90% |
| Memory Peak | 内存峰值 | < 512MB |

---

## 🔐 安全机制

### 1. 静态分析（AST）
- 检测危险操作：删除文件、无限循环、自毁代码
- 识别递归函数和复杂度高的代码
- 检查依赖变更

### 2. 沙箱测试
- 在隔离 VM 中运行代码
- 监控内存增长
- 限制执行时间

### 3. 风险评分
- 代码更改量
- 文件重要性
- 历史稳定性

### 4. 多级回滚
- 每次修改前自动创建快照
- 新版本运行失败自动回滚
- 保留旧版本至少 24 小时

---

## 🔄 冗余机制

```
Redundancy Pool
├── Primary (活跃版本) - 处理所有请求
├── Standby 1 (备用1)   - 健康检查，随时切换
├── Standby 2 (备用2)   - 第二个备份
└── Candidate (候选)    - 待测试的新版本
```

**故障转移流程：**
1. Primary 故障 → 5s 内切换到 Standby 1
2. Standby 1 也故障 → 10s 内切换到 Standby 2
3. 所有备份故障 → 回滚到最近健康版本

---

## 💾 记忆系统

### Level 1: Working Memory
- 会话级短期记忆
- 基于内存（可配置 Redis）
- 自动过期清理

### Level 2: Long-term Memory
- 持久化向量数据库
- 语义搜索相似经验
- 存储教训、优化历史、版本演进

---

## 🛠️ 开发指南

### 添加新的技能（Skill）
```typescript
// src/skills/my-skill.ts
export interface MySkillConfig {
  // 配置
}

export class MySkill {
  async execute(params: any): Promise<any> {
    // 实现
  }
}

// 注册到引擎
engine.registerSkill('my-skill', new MySkill());
```

### 扩展基准测试
```typescript
// tests/benchmark-suite/custom.ts
export const customBenchmarks = [
  {
    id: 'my-test',
    name: 'My Custom Test',
    run: async (agent: Engine) => {
      // 测试逻辑
      return { success: true, duration: 1000 };
    }
  }
];
```

### 自定义安全规则
```typescript
// 扩展 SafetyGuard
class MySafetyGuard extends SafetyGuard {
  protected checkCustomRules(code: string) {
    // 添加业务特定的安全规则
  }
}
```

---

## 📈 监控与调试

### 日志
所有关键操作都记录到：
- `logs/phoenix.log` - 主日志
- `logs/evolution.log` - 进化过程
- `logs/errors.log` - 错误日志

### 指标端点（可选）
启动时添加 `--metrics-port 9090` 暴露 Prometheus 指标。

### 调试模式
```bash
DEBUG=phoenix:* phoenix start
```

---

## 🧪 测试

```bash
# 单元测试
npm test

# 运行基准测试套件
npm run test:benchmark

# 压力测试
npm run test:stress
```

---

## 📦 部署

### 本地运行（开发）
```bash
git clone <repo>
cd phoenix-agent
npm install
npm run dev
```

### Docker（生产）
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/cli/phoenix.js", "start"]
```

### Kubernetes（集群）
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: phoenix-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: phoenix
  template:
    metadata:
      labels:
        app: phoenix
    spec:
      containers:
      - name: phoenix
        image: phoenix-agent:latest
        env:
        - name: STEPFUN_API_KEY
          valueFrom:
            secretKeyRef:
              name: phoenix-secret
              key: api-key
```

---

## 🤝 贡献

欢迎提交 PR！请确保：
1. 所有测试通过
2. 代码符合 ESLint 规范
3. 更新相关文档

---

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

## 🙏 致谢

- **OpenClaw** - 优秀的 Agent 框架基础
- **StepFun** - 强大的 LLM API
- **Claude Code** - 自修改系统的灵感来源

---

## 📞 支持

- 📧 Email: support@example.com
- 📖 Docs: https://docs.example.com/phoenix
- 🐛 Issues: https://github.com/example/phoenix-agent/issues

---

**🚀 Phoenix Agent - 让 AI 学会自我进化**
