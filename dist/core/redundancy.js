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
exports.RedundancyManager = exports.AgentHealth = void 0;
/**
 * Redundancy Manager - 冗余管理器
 * 管理多个版本实例，实现故障转移和版本同步
 */
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const events_1 = require("events");
var AgentHealth;
(function (AgentHealth) {
    AgentHealth["Healthy"] = "healthy";
    AgentHealth["Degraded"] = "degraded";
    AgentHealth["Critical"] = "critical";
})(AgentHealth || (exports.AgentHealth = AgentHealth = {}));
class RedundancyManager extends events_1.EventEmitter {
    selfModifier;
    versionsDir;
    pool = new Map();
    primaryId = null;
    healthCheckInterval = null;
    HEALTH_CHECK_INTERVAL = 5000; // 5秒
    MAX_ERRORS_BEFORE_DEGRADED = 3;
    MAX_ERRORS_BEFORE_CRITICAL = 10;
    constructor(baseDir, selfModifier) {
        super();
        this.selfModifier = selfModifier;
        this.versionsDir = path.join(baseDir, 'versions', 'active');
    }
    /**
     * 初始化冗余池 - 加载所有已保存版本
     */
    async initialize() {
        console.log('🔄 Initializing Redundancy Manager...');
        await fs.ensureDir(this.versionsDir);
        // 从快照恢复活跃版本列表
        const statusPath = path.join(this.versionsDir, 'pool.json');
        if (await fs.pathExists(statusPath)) {
            const poolData = await fs.readJson(statusPath);
            for (const v of poolData.versions) {
                this.pool.set(v.id, v);
            }
            this.primaryId = poolData.primaryId || null;
            console.log(`✓ Loaded ${this.pool.size} versions from pool`);
        }
        // 启动健康检查
        this.startHealthChecks();
    }
    /**
     * 添加候选版本
     */
    async addCandidate(versionSource, label) {
        const versionId = (0, uuid_1.v4)();
        // 复制版本文件到活跃池
        const destPath = path.join(this.versionsDir, versionId);
        await fs.ensureDir(destPath);
        // 这里需要复制源代码
        // versionSource 可以是快照目录或新创建的版本路径
        if (await fs.pathExists(versionSource)) {
            await fs.copy(versionSource, destPath);
        }
        else {
            throw new Error(`Version source not found: ${versionSource}`);
        }
        const version = {
            id: versionId,
            label,
            path: destPath,
            active: false,
            createdAt: Date.now(),
            health: AgentHealth.Healthy,
            errorCount: 0
        };
        this.pool.set(versionId, version);
        await this.savePool();
        console.log(`✓ Added candidate: ${label} (${versionId})`);
        this.emit('candidate_added', version);
        return versionId;
    }
    /**
     * 激活某个版本为主版本
     */
    async activate(versionId) {
        const version = this.pool.get(versionId);
        if (!version) {
            throw new Error(`Version ${versionId} not found in pool`);
        }
        // 停止当前主版本的健康检查
        if (this.primaryId) {
            const oldPrimary = this.pool.get(this.primaryId);
            if (oldPrimary) {
                oldPrimary.active = false;
            }
        }
        // 激活新版本
        version.active = true;
        this.primaryId = versionId;
        await this.savePool();
        console.log(`🚀 Activated version: ${version.label} (${versionId})`);
        this.emit('activated', version);
    }
    /**
     * 健康检查循环
     */
    startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, this.HEALTH_CHECK_INTERVAL);
    }
    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        if (!this.primaryId) {
            this.emit('health_status', { primary: null, status: 'no_primary' });
            return;
        }
        const primary = this.pool.get(this.primaryId);
        if (!primary) {
            this.emit('health_status', { primary: null, status: 'primary_missing' });
            return;
        }
        // 检查主版本是否响应（这里可以 ping 它）
        const isHealthy = await this.checkVersionHealth(primary);
        if (!isHealthy && primary.errorCount < this.MAX_ERRORS_BEFORE_DEGRADED) {
            primary.errorCount++;
            console.log(`⚠️  Primary ${primary.label} health degraded (errors: ${primary.errorCount})`);
        }
        else if (!isHealthy) {
            // 触发故障转移
            console.log(`🚨 Primary ${primary.label} is critical! Starting failover...`);
            await this.failover();
        }
        this.emit('health_status', {
            primary,
            status: isHealthy ? 'healthy' : 'unhealthy',
            errorCount: primary.errorCount
        });
    }
    /**
     * 检查单个版本的健康状态
     */
    async checkVersionHealth(version) {
        // 这里应该真正检查版本是否响应
        // 简化：检查进程是否存在或端口是否监听
        // 演示：总是返回健康
        return true;
    }
    /**
     * 故障转移 - 切换到备用版本
     */
    async failover() {
        console.log('⚡ Initiating failover...');
        const currentPrimary = this.primaryId;
        const standbys = Array.from(this.pool.values()).filter(v => v.id !== currentPrimary && !v.active);
        if (standbys.length === 0) {
            console.log('❌ No standby versions available for failover');
            return {
                success: false,
                fromVersion: currentPrimary || 'none',
                toVersion: '',
                reason: 'no_standby_available'
            };
        }
        // 选择第一个健康的备用版本
        const standby = standbys.find(v => v.health === AgentHealth.Healthy) || standbys[0];
        try {
            await this.activate(standby.id);
            // 增加旧主版本的错误计数并降级
            if (currentPrimary) {
                const old = this.pool.get(currentPrimary);
                if (old) {
                    old.active = false;
                    old.errorCount += 5;
                    old.health = AgentHealth.Critical;
                }
            }
            console.log(`✅ Failover successful: ${currentPrimary} → ${standby.label}`);
            return {
                success: true,
                fromVersion: currentPrimary || 'none',
                toVersion: standby.id,
                reason: 'primary_unhealthy'
            };
        }
        catch (err) {
            console.error(`❌ Failover failed: ${err}`);
            return {
                success: false,
                fromVersion: currentPrimary || 'none',
                toVersion: standby.id,
                reason: 'activation_failed'
            };
        }
    }
    /**
     * 同步版本到所有节点
     */
    async syncVersion(versionId, targets = []) {
        const version = this.pool.get(versionId);
        if (!version) {
            throw new Error(`Version ${versionId} not found`);
        }
        console.log(`🔄 Syncing version ${version.label} to targets...`);
        // 这里实现同步逻辑：将版本代码复制到其他节点
        // 可以使用 scp、rsync 或共享存储
        for (const target of targets) {
            try {
                console.log(`  Syncing to ${target}...`);
                // TODO: 实现实际同步
                // await this.copyToRemote(version.path, target);
            }
            catch (err) {
                console.error(`  Failed to sync to ${target}: ${err}`);
                // 继续同步到其他节点
            }
        }
        this.emit('version_synced', { versionId, targets });
    }
    /**
     * 获取所有版本状态
     */
    getStatus() {
        const primary = this.primaryId ? this.pool.get(this.primaryId) || null : null;
        const standbys = Array.from(this.pool.values()).filter(v => !v.active && v.id !== this.primaryId);
        const candidates = standbys.filter(v => v.health === AgentHealth.Degraded || v.errorCount > 0);
        return {
            primary,
            standbys,
            candidates,
            totalVersions: this.pool.size
        };
    }
    /**
     * 保存池状态到磁盘
     */
    async savePool() {
        const versions = Array.from(this.pool.values());
        const poolData = {
            primaryId: this.primaryId,
            versions,
            lastUpdated: Date.now()
        };
        await fs.writeJson(path.join(this.versionsDir, 'pool.json'), poolData, { spaces: 2 });
    }
    /**
     * 停止健康检查
     */
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    /**
     * 获取版本
     */
    getVersion(versionId) {
        return this.pool.get(versionId);
    }
    /**
     * 更新版本评分
     */
    updateVersionScore(versionId, score) {
        const version = this.pool.get(versionId);
        if (version) {
            version.score = score;
            // 根据评分调整健康状态
            if (score >= 80) {
                version.health = AgentHealth.Healthy;
            }
            else if (score >= 60) {
                version.health = AgentHealth.Degraded;
            }
            else {
                version.health = AgentHealth.Critical;
            }
            this.savePool();
        }
    }
}
exports.RedundancyManager = RedundancyManager;
//# sourceMappingURL=redundancy.js.map