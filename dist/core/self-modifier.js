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
exports.SelfModifier = void 0;
/**
 * SelfModifier - 自修改器
 * 负责读取、修改、热重载自身源代码
 */
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const diff = __importStar(require("diff"));
class SelfModifier {
    baseDir;
    versionsDir;
    currentVersion = null;
    constructor(baseDir = process.cwd()) {
        this.baseDir = baseDir;
        this.versionsDir = path.join(baseDir, 'versions', 'snapshots');
    }
    /**
     * 初始化 - 创建版本目录
     */
    async initialize() {
        await fs.ensureDir(this.versionsDir);
        // 创建当前版本快照
        const label = `initial-${new Date().toISOString().slice(0, 10)}`;
        this.currentVersion = await this.createSnapshot(label);
        console.log(`✓ Initial version created: ${this.currentVersion.id}`);
    }
    /**
     * 读取文件内容
     */
    async readFile(filePath) {
        const fullPath = path.join(this.baseDir, filePath);
        return await fs.readFile(fullPath, 'utf-8');
    }
    /**
     * 精确替换代码片段
     */
    async editFile(filePath, oldCode, newCode) {
        const fullPath = path.join(this.baseDir, filePath);
        const original = await fs.readFile(fullPath, 'utf-8');
        // 验证 oldCode 是否匹配
        if (!original.includes(oldCode)) {
            throw new Error('Old code snippet not found in file');
        }
        // 创建备份
        const backupDir = path.join(this.versionsDir, 'backups');
        await fs.ensureDir(backupDir);
        const backupPath = path.join(backupDir, `${path.basename(filePath)}.${Date.now()}.bak`);
        await fs.writeFile(backupPath, original);
        // 计算 diff
        const change = diff.diffWords(oldCode, newCode);
        const diffText = change.map(part => part.added ? `+ ${part.value}` : part.removed ? `- ${part.value}` : `  ${part.value}`).join('');
        // 执行修改
        const updated = original.replace(oldCode, newCode);
        await fs.writeFile(fullPath, updated);
        return {
            success: true,
            diff: diffText,
            backupPath
        };
    }
    /**
     * 创建版本快照
     */
    async createSnapshot(label, description) {
        const id = (0, uuid_1.v4)();
        const snapshotDir = path.join(this.versionsDir, id);
        await fs.ensureDir(snapshotDir);
        // 复制所有源代码文件
        const srcDir = path.join(this.baseDir, 'src');
        if (await fs.pathExists(srcDir)) {
            await fs.copy(srcDir, path.join(snapshotDir, 'src'));
        }
        // 复制配置文件
        const configFiles = ['package.json', 'tsconfig.json', 'phoenix.yaml'];
        for (const file of configFiles) {
            const srcPath = path.join(this.baseDir, file);
            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, path.join(snapshotDir, file));
            }
        }
        const snapshot = {
            id,
            label,
            path: snapshotDir,
            timestamp: Date.now(),
            description
        };
        // 保存元数据
        await fs.writeJson(path.join(snapshotDir, 'meta.json'), snapshot);
        return snapshot;
    }
    /**
     * 热重载 - 重新加载模块（不重启进程）
     * 注意：这需要主进程配合使用 require.cache 清理
     */
    async hotReload(moduleName) {
        if (moduleName) {
            // 清除指定模块缓存
            delete require.cache[require.resolve(moduleName)];
            console.log(`✓ Hot reload: ${moduleName}`);
        }
        else {
            // 清除所有缓存（激进方式）
            for (const key in require.cache) {
                if (key.includes('/phoenix/') || key.includes('/src/')) {
                    delete require.cache[key];
                }
            }
            console.log('✓ Hot reload: all modules');
        }
    }
    /**
     * 回滚到指定版本
     */
    async rollback(versionId) {
        const snapshotDir = path.join(this.versionsDir, versionId);
        if (!await fs.pathExists(snapshotDir)) {
            throw new Error(`Version ${versionId} not found`);
        }
        const meta = await fs.readJson(path.join(snapshotDir, 'meta.json'));
        console.log(`⏪ Rolling back to version: ${meta.label} (${versionId})`);
        // 恢复 src 目录
        const srcBackup = path.join(snapshotDir, 'src');
        if (await fs.pathExists(srcBackup)) {
            await fs.emptyDir(path.join(this.baseDir, 'src'));
            await fs.copy(srcBackup, path.join(this.baseDir, 'src'));
        }
        // 恢复配置文件
        for (const file of ['package.json', 'tsconfig.json', 'phoenix.yaml']) {
            const backupFile = path.join(snapshotDir, file);
            if (await fs.pathExists(backupFile)) {
                await fs.copy(backupFile, path.join(this.baseDir, file));
            }
        }
        // 触发热重载
        await this.hotReload();
        console.log('✓ Rollback complete');
    }
    /**
     * 列出所有版本
     */
    async listVersions() {
        const versions = [];
        const entries = await fs.readdir(this.versionsDir);
        for (const entry of entries) {
            const metaPath = path.join(this.versionsDir, entry, 'meta.json');
            if (await fs.pathExists(metaPath)) {
                const meta = await fs.readJson(metaPath);
                versions.push(meta);
            }
        }
        return versions.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * 获取当前版本
     */
    getCurrentVersion() {
        return this.currentVersion;
    }
}
exports.SelfModifier = SelfModifier;
//# sourceMappingURL=self-modifier.js.map