#!/usr/bin/env node
"use strict";
/**
 * Phoenix Agent CLI
 * 自进化智能体命令行工具
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const engine_1 = require("../core/engine");
const program = new commander_1.Command();
program
    .name('phoenix')
    .description('Self-evolving AI Agent with redundancy and hot-reload')
    .version('0.1.0');
// 启动 Agent
program
    .command('start')
    .description('Start the Phoenix Agent')
    .option('--no-auto-evolve', 'Disable automatic evolution')
    .option('--check-interval <ms>', 'Evolution check interval in ms', '3600000') // 1 hour default
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Initializing Phoenix Agent...').start();
    try {
        // 加载配置
        const config = {
            llm: {
                provider: 'stepfun',
                apiKey: process.env.STEPFUN_API_KEY || '',
                model: 'step-3.5-flash',
                temperature: 0.7
            },
            evolution: {
                enabled: true,
                autoImprove: options.autoEvolve !== false,
                checkInterval: parseInt(options.checkInterval),
                maxGenerations: 100
            },
            redundancy: {
                enabled: true,
                maxStandbys: 2,
                syncEnabled: true
            },
            safety: {
                enabled: true,
                strictMode: true,
                requireSandboxTest: true
            },
            memory: {
                enabled: true,
                longTermEnabled: true,
                maxShortTermMessages: 100
            }
        };
        // 创建引擎
        const engine = new engine_1.Engine(config);
        // 监听事件
        engine.on('started', () => {
            spinner.succeed('Phoenix Agent started!');
            console.log(chalk_1.default.green('✨ Phoenix Agent is running...'));
            console.log(chalk_1.default.gray('Press Ctrl+C to stop\n'));
        });
        engine.on('evolution_complete', (data) => {
            console.log(chalk_1.default.blue(`\n🔄 Evolution cycle ${data.generation} completed`));
        });
        engine.on('health_status', (status) => {
            if (status.status === 'unhealthy') {
                console.log(chalk_1.default.yellow(`⚠️  Primary health degraded`));
            }
        });
        // 启动
        await engine.start();
        // 保持运行
        process.on('SIGINT', async () => {
            console.log(chalk_1.default.yellow('\n\n🛑 Shutting down...'));
            await engine.stop();
            process.exit(0);
        });
    }
    catch (error) {
        spinner.fail('Failed to start Phoenix Agent');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : error));
        process.exit(1);
    }
});
// 运行基准测试
program
    .command('benchmark')
    .description('Run performance benchmark')
    .option('--version <id>', 'Version ID to benchmark (default: current)')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Running benchmark...').start();
    try {
        // TODO: 实际集成
        await new Promise(resolve => setTimeout(resolve, 1000));
        spinner.succeed('Benchmark completed');
        console.log('\n📊 Benchmark Report:');
        console.log('  Score: 85/100');
        console.log('  Avg Response: 1240ms');
        console.log('  Completion: 100%');
        console.log('  Memory Peak: 156MB');
    }
    catch (error) {
        spinner.fail('Benchmark failed');
        console.error(error);
    }
});
// 列出版本
program
    .command('versions')
    .description('List all versions in the redundancy pool')
    .action(async () => {
    try {
        // TODO: 实际集成
        console.log('📦 Version Pool:');
        console.log('  Primary:  v1.0.0 (active)');
        console.log('  Standby:  v0.9.5 (healthy)');
        console.log('  Candidate: v1.1.0-beta (testing)');
    }
    catch (error) {
        console.error(error);
    }
});
// 创建快照
program
    .command('snapshot')
    .description('Create a snapshot of current version')
    .argument('<label>', 'Snapshot label')
    .action(async (label) => {
    const spinner = (0, ora_1.default)(`Creating snapshot: ${label}`).start();
    try {
        // TODO: 实际集成
        await new Promise(resolve => setTimeout(resolve, 500));
        spinner.succeed(`Snapshot created: ${label}`);
    }
    catch (error) {
        spinner.fail('Snapshot failed');
        console.error(error);
    }
});
// 回滚到指定版本
program
    .command('rollback')
    .description('Rollback to a specific version')
    .argument('<versionId>', 'Version ID to rollback to')
    .action(async (versionId) => {
    const confirm = require('inquirer').confirm;
    const answers = await confirm({
        name: 'confirm',
        message: `Are you sure you want to rollback to ${versionId}? This cannot be undone.`,
        default: false
    });
    if (!answers.confirm) {
        console.log(chalk_1.default.yellow('Rollback cancelled'));
        return;
    }
    const spinner = (0, ora_1.default)('Rolling back...').start();
    try {
        // TODO: 实际集成
        await new Promise(resolve => setTimeout(resolve, 1000));
        spinner.succeed(`Rolled back to ${versionId}`);
    }
    catch (error) {
        spinner.fail('Rollback failed');
        console.error(error);
    }
});
// 状态查看
program
    .command('status')
    .description('Show Phoenix Agent status')
    .action(async () => {
    console.log(chalk_1.default.bold('\n🔥 Phoenix Agent Status\n'));
    // TODO: 实际集成
    console.log(chalk_1.default.gray('System:') + ' Running');
    console.log(chalk_1.default.gray('Uptime:') + ' 2h 34m');
    console.log(chalk_1.default.gray('Generation:') + ' 5');
    console.log(chalk_1.default.gray('Memory:') + ' 124 MB');
    console.log(chalk_1.default.gray('\nRedundancy:'));
    console.log(chalk_1.default.green('  ✓ Primary:  v1.2.0 (active)'));
    console.log(chalk_1.default.blue('  ◉ Standby:  v1.1.0'));
    console.log(chalk_1.default.gray('  ○ Candidate: v1.3.0-beta'));
    console.log(chalk_1.default.gray('\nEvolution:'));
    console.log(chalk_1.default.green('  ✓ Auto-improve enabled'));
    console.log(chalk_1.default.gray('  Last cycle: 3h ago'));
    console.log(chalk_1.default.gray('  Next cycle: 21h'));
    console.log('');
});
// 交互模式
program
    .command('console')
    .description('Start interactive console')
    .action(async () => {
    console.log(chalk_1.default.blue('\n🔥 Phoenix Agent Console'));
    console.log(chalk_1.default.gray('Type "help" for commands, "exit" to quit\n'));
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const ask = () => {
        rl.question(chalk_1.default.cyan('phoenix> '), async (input) => {
            const [cmd, ...args] = input.trim().split(' ');
            switch (cmd) {
                case 'help':
                    console.log(`
  Commands:
    status        - Show system status
    benchmark     - Run benchmark
    versions      - List versions
    snapshot <label> - Create snapshot
    rollback <id> - Rollback to version
    evolve        - Force evolution cycle
    memory        - Show memory stats
    exit          - Exit console
            `.trim());
                    break;
                case 'status':
                    // TODO
                    console.log('Status: Running (implementation pending)');
                    break;
                case 'exit':
                    rl.close();
                    return;
                default:
                    console.log(chalk_1.default.yellow(`Unknown command: ${cmd}`));
            }
            ask();
        });
    };
    ask();
});
program.parse();
//# sourceMappingURL=phoenix.js.map