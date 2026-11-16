export type ModuleId =
  | 'diagnostics'
  | 'magisk-terminal'
  | 'system-files'
  | 'restore-developer'
  | 'factory-wipe'
  | 'root-recovery';

export type ConnectionMode = 'disconnected' | 'connecting' | 'webusb' | 'imported';

export type RootStatus = 'unknown' | 'rooted-magisk' | 'rooted-su' | 'unrooted';

export interface PartitionInfo {
  name: string;
  blockPath: string;
  mountPoint?: string;
  sizeSummary?: string;
}

export interface DeviceSnapshot {
  connectionMode: ConnectionMode;
  deviceName: string;
  serial: string;
  androidVersion: string;
  sdkLevel: string;
  buildId: string;
  buildFingerprint: string;
  socPlatform: string;
  cpuAbi: string;
  mcuVersion: string;
  mcuPrefix: string;
  rootStatus: RootStatus;
  suPath: string;
  magiskVersion: string;
  selinuxMode: string;
  adbTcpPort: string;
  systemMountMode: 'ro' | 'rw' | 'unknown';
  storageSummary: string;
  partitions: PartitionInfo[];
  lastScannedAt: string | null;
}

export interface SystemEntry {
  path: string;
  name: string;
  type: 'directory' | 'file' | 'symlink';
  permissions: string;
  octalMode: string;
  owner: string;
  sizeBytes: number;
  modifiedAt: string;
  isCritical: boolean;
  warningReason?: string;
  backedUp?: boolean;
}

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  source: 'webusb' | 'script' | 'parser';
  command: string;
  output: string;
  status: 'ok' | 'warn' | 'error';
}

export interface RecoveryResource {
  id: string;
  title: string;
  category: 'recovery' | 'root' | 'rom-installer' | 'herramienta-pc' | 'terminal';
  androidVersions: string[];
  mcuScope: string;
  author: string;
  url: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  summary: string;
  notes: string;
}

export interface McuPrefixInfo {
  prefix: string;
  manufacturer: string;
  compatibility: string;
  notes: string;
}

export interface FactoryCodeItem {
  code: string;
  target: string;
  effect: string;
  caution: string;
}

export interface DeveloperSettingAction {
  id: string;
  title: string;
  description: string;
  command: string;
  revertCommand: string;
  requiresRoot: boolean;
  risk: 'bajo' | 'medio';
}
