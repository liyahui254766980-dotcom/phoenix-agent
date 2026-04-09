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
export declare class SelfModifier {
    private baseDir;
    private versionsDir;
    private currentVersion;
    constructor(baseDir?: string);
    /**
     * 初始化 - 创建版本目录
     */
    initialize(): Promise<void>;
    /**
     * 读取文件内容
     */
    readFile(filePath: string): Promise<string>;
    /**
     * 精确替换代码片段
     */
    editFile(filePath: string, oldCode: string, newCode: string): Promise<EditResult>;
    /**
     * 创建版本快照
     */
    createSnapshot(label: string, description?: string): Promise<VersionSnapshot>;
    /**
     * 热重载 - 重新加载模块（不重启进程）
     * 注意：这需要主进程配合使用 require.cache 清理
     */
    hotReload(moduleName?: string): Promise<void>;
    /**
     * 回滚到指定版本
     */
    rollback(versionId: string): Promise<void>;
    /**
     * 列出所有版本
     */
    listVersions(): Promise<VersionSnapshot[]>;
    /**
     * 获取当前版本
     */
    getCurrentVersion(): VersionSnapshot | null;
}
//# sourceMappingURL=self-modifier.d.ts.map