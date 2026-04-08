/**
 * SelfModifier - 自修改器
 * 负责读取、修改、热重载自身源代码
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as diff from 'diff';

export interface VersionSnapshot {
  id: string;
  label: string;
  path: string;
  timestamp: number;
  description?: string;
}

export interface EditResult {
  success: boolean;
  diff: string;
  backupPath: string;
  error?: string;
}

export class SelfModifier {
  private baseDir: string;
  private versionsDir: string;
  private currentVersion: VersionSnapshot | null = null;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
    this.versionsDir = path.join(baseDir, 'versions', 'snapshots');
  }

  /**
   * 初始化 - 创建版本目录
   */
  async initialize(): Promise<void> {
    await fs.ensureDir(this.versionsDir);
    
    // 创建当前版本快照
    const label = `initial-${new Date().toISOString().slice(0,10)}`;
    this.currentVersion = await this.createSnapshot(label);
    console.log(`✓ Initial version created: ${this.currentVersion.id}`);
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.baseDir, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * 精确替换代码片段
   */
  async editFile(filePath: string, oldCode: string, newCode: string): Promise<EditResult> {
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
    const diffText = change.map(part => 
      part.added ? `+ ${part.value}` : part.removed ? `- ${part.value}` : `  ${part.value}`
    ).join('');

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
  async createSnapshot(label: string, description?: string): Promise<VersionSnapshot> {
    const id = uuidv4();
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

    const snapshot: VersionSnapshot = {
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
  async hotReload(moduleName?: string): Promise<void> {
    if (moduleName) {
      // 清除指定模块缓存
      delete require.cache[require.resolve(moduleName)];
      console.log(`✓ Hot reload: ${moduleName}`);
    } else {
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
  async rollback(versionId: string): Promise<void> {
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
  async listVersions(): Promise<VersionSnapshot[]> {
    const versions: VersionSnapshot[] = [];
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
  getCurrentVersion(): VersionSnapshot | null {
    return this.currentVersion;
  }
}
