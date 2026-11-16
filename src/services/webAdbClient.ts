import { Adb, AdbDaemonTransport, LinuxFileType } from '@yume-chan/adb';
import type { AdbSync } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import { CRITICAL_SYSTEM_PATHS, DIAGNOSTIC_SCRIPT_LINES } from '../data/px5Knowledge';
import type { DeviceSnapshot, PartitionInfo, RootStatus, SystemEntry } from '../types/px5';

export const EMPTY_DEVICE_SNAPSHOT: DeviceSnapshot = {
  connectionMode: 'disconnected',
  deviceName: 'Sin conexión activa',
  serial: '—',
  androidVersion: 'Desconocido',
  sdkLevel: '—',
  buildId: '—',
  buildFingerprint: '—',
  socPlatform: 'Rockchip PX5 (RK3368)',
  cpuAbi: 'arm64-v8a / armeabi-v7a',
  mcuVersion: 'Sin lectura',
  mcuPrefix: 'MTCD/MTCE',
  rootStatus: 'unknown',
  suPath: '—',
  magiskVersion: '—',
  selinuxMode: '—',
  adbTcpPort: '—',
  systemMountMode: 'unknown',
  storageSummary: '—',
  partitions: [],
  lastScannedAt: null,
};

let activeAdb: Adb | null = null;

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator && Boolean(AdbDaemonWebUsbDeviceManager.BROWSER);
}

export function getActiveAdb(): Adb | null {
  return activeAdb;
}

export async function disconnectWebUsb(): Promise<void> {
  if (activeAdb) {
    try {
      await activeAdb.close();
    } catch {
      // Ignore close errors if USB was already unplugged
    }
    activeAdb = null;
  }
}

export async function connectWebUsb(
  onStatus?: (message: string) => void
): Promise<{ adb: Adb; snapshot: DeviceSnapshot; rawOutput: string }> {
  const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
  if (!manager) {
    throw new Error('Este navegador o contexto no soporta WebUSB. Usa Chrome o Edge sobre HTTPS.');
  }

  onStatus?.('Esperando selección de radio PX5 en el selector USB...');
  const device = await manager.requestDevice();
  if (!device) {
    throw new Error('Selección cancelada por el usuario.');
  }

  onStatus?.(`Abriendo enlace USB con ${device.name || 'dispositivo Android'}...`);
  const connection = await device.connect();
  const credentialStore = new AdbWebCredentialStore('PX5 Console MTCD/MTCE');

  onStatus?.('Autenticando clave RSA ADB (acepta el aviso en la pantalla de la radio si aparece)...');
  const transport = await AdbDaemonTransport.authenticate({
    serial: device.serial,
    connection,
    credentialStore,
  });

  const adb = new Adb(transport);
  activeAdb = adb;

  onStatus?.('Consultando versión Android, estado Root, Magisk y MCU...');
  const { snapshot, rawOutput } = await probeConnectedDevice(adb, device.name || 'Radio Android PX5', device.serial);
  return { adb, snapshot, rawOutput };
}

export async function runShell(command: string): Promise<string> {
  if (!activeAdb) {
    throw new Error('No hay radio conectada vía WebUSB.');
  }
  return activeAdb.subprocess.noneProtocol.spawnWaitText(command);
}

export async function probeConnectedDevice(
  adbInstance?: Adb,
  fallbackName = 'Radio Android PX5',
  fallbackSerial = 'WebUSB'
): Promise<{ snapshot: DeviceSnapshot; rawOutput: string }> {
  const adb = adbInstance ?? activeAdb;
  if (!adb) {
    throw new Error('No hay conexión WebUSB activa.');
  }

  const probeCmd = DIAGNOSTIC_SCRIPT_LINES.join('; ');
  const rawOutput = await adb.subprocess.noneProtocol.spawnWaitText(probeCmd);
  const dfOutput = await adb.subprocess.noneProtocol
    .spawnWaitText('df -h /data /system /sdcard 2>/dev/null | tail -n +2')
    .catch(() => '');

  const parsed = parseDiagnosticOutput(rawOutput, {
    connectionMode: 'webusb',
    deviceName: fallbackName,
    serial: adb.serial || fallbackSerial,
    storageSummary: dfOutput.trim() || '—',
  });

  return { snapshot: parsed, rawOutput };
}

export function extractMcuPrefix(mcuRaw: string): string {
  const upper = mcuRaw.toUpperCase();
  const match = upper.match(/(MTC[BCDE])[_-]?([A-Z0-9]{2,4})/);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  if (upper.includes('MTCE')) return 'MTCE';
  if (upper.includes('MTCD')) return 'MTCD';
  return 'MTCD/MTCE';
}

export function parseDiagnosticOutput(
  rawText: string,
  overrides?: Partial<DeviceSnapshot>
): DeviceSnapshot {
  const lines = rawText.split(/\r?\n/);
  const kv: Record<string, string> = {};
  const partitions: PartitionInfo[] = [];

  let inPartitions = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('=== PARTITIONS ===')) {
      inPartitions = true;
      continue;
    }

    if (inPartitions) {
      const linkMatch = line.match(/([a-zA-Z0-9_-]+)\s*->\s*(\/dev\/block\/[^\s]+)/);
      if (linkMatch) {
        partitions.push({ name: linkMatch[1], blockPath: linkMatch[2] });
      }
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      kv[key] = val;
    } else {
      const propMatch = line.match(/^\[([^\]]+)\]:\s*\[([^\]]*)\]$/);
      if (propMatch) {
        kv[propMatch[1]] = propMatch[2];
      }
    }
  }

  const androidVersion = kv['ANDROID_VERSION'] || kv['ro.build.version.release'] || 'Desconocido';
  const sdkLevel = kv['SDK_LEVEL'] || kv['ro.build.version.sdk'] || '—';
  const model = kv['MODEL'] || kv['ro.product.model'] || overrides?.deviceName || 'Radio PX5 MTCD/MTCE';
  const board = kv['BOARD'] || kv['ro.board.platform'] || 'rk3368 (PX5)';
  const cpuAbi = kv['CPU_ABI'] || kv['ro.product.cpu.abi'] || 'arm64-v8a';
  const buildId = kv['BUILD_ID'] || kv['ro.build.display.id'] || '—';
  const buildFingerprint = kv['FINGERPRINT'] || kv['ro.build.fingerprint'] || '—';
  const mcuRaw = kv['MCU_PROP'] || kv['persist.sys.mcu_version'] || kv['ro.product.mcu'] || 'No detectado por prop';
  const selinuxMode = kv['SELINUX'] || 'Desconocido';
  const adbTcpPort = kv['ADB_TCP'] || kv['persist.adb.tcp.port'] || 'Desactivado';
  const suPath = kv['SU_PATH'] && kv['SU_PATH'] !== 'none' ? kv['SU_PATH'] : 'No encontrado';
  const magiskVersion = kv['MAGISK_VER'] && kv['MAGISK_VER'] !== 'none' ? kv['MAGISK_VER'] : 'No instalado';

  let rootStatus: RootStatus = 'unrooted';
  if (magiskVersion !== 'No instalado') {
    rootStatus = 'rooted-magisk';
  } else if (suPath !== 'No encontrado') {
    rootStatus = 'rooted-su';
  }

  const mountInfo = kv['MOUNT_SYS'] || '';
  let systemMountMode: 'ro' | 'rw' | 'unknown' = 'unknown';
  if (mountInfo.includes('(rw,') || mountInfo.includes(' rw,')) {
    systemMountMode = 'rw';
  } else if (mountInfo.includes('(ro,') || mountInfo.includes(' ro,')) {
    systemMountMode = 'ro';
  }

  return {
    connectionMode: overrides?.connectionMode ?? 'imported',
    deviceName: model,
    serial: overrides?.serial ?? 'Terminal / Script',
    androidVersion,
    sdkLevel,
    buildId,
    buildFingerprint,
    socPlatform: board,
    cpuAbi,
    mcuVersion: mcuRaw || 'No detectado',
    mcuPrefix: extractMcuPrefix(mcuRaw),
    rootStatus,
    suPath,
    magiskVersion,
    selinuxMode,
    adbTcpPort: adbTcpPort || 'Desactivado',
    systemMountMode,
    storageSummary: overrides?.storageSummary ?? '—',
    partitions,
    lastScannedAt: new Date().toLocaleTimeString('es-ES', { hour12: false }),
  };
}

function classifyCritical(fullPath: string): { isCritical: boolean; reason?: string } {
  for (const item of CRITICAL_SYSTEM_PATHS) {
    if (fullPath === item.prefix || fullPath.startsWith(`${item.prefix}/`)) {
      return { isCritical: true, reason: item.reason };
    }
  }
  return { isCritical: false };
}

export async function listRemoteDirectory(dirPath: string): Promise<SystemEntry[]> {
  if (!activeAdb) {
    throw new Error('No hay conexión WebUSB activa.');
  }

  const normalized = dirPath === '/' ? '/' : dirPath.replace(/\/+$/, '');
  const raw = await activeAdb.subprocess.noneProtocol.spawnWaitText(
    `ls -la "${normalized}" 2>&1`
  );

  const entries: SystemEntry[] = [];
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('total ')) continue;

    // Parse standard toybox/toolbox ls -la output
    const match = trimmed.match(
      /^([dlcbps-][rwxstST-]{9})\s+\d+\s+(\S+)\s+(\S+)\s+(\d+)?\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/
    );
    if (!match) continue;

    const [, perms, owner, group, sizeStr, dateStr, rawName] = match;
    const cleanName = rawName.split(' -> ')[0].trim();
    if (cleanName === '.' || cleanName === '..') continue;

    const fullPath = normalized === '/' ? `/${cleanName}` : `${normalized}/${cleanName}`;
    const type: SystemEntry['type'] = perms.startsWith('d')
      ? 'directory'
      : perms.startsWith('l')
        ? 'symlink'
        : 'file';
    const crit = classifyCritical(fullPath);

    entries.push({
      path: fullPath,
      name: cleanName,
      type,
      permissions: perms,
      octalMode: permsToOctal(perms),
      owner: `${owner}:${group}`,
      sizeBytes: sizeStr ? Number(sizeStr) : 0,
      modifiedAt: dateStr,
      isCritical: crit.isCritical,
      warningReason: crit.reason,
    });
  }

  if (entries.length === 0) {
    const sync = await activeAdb.sync();
    try {
      const syncList = await sync.readdir(normalized);
      for (const item of syncList) {
        if (item.name === '.' || item.name === '..') continue;
        const fullPath = normalized === '/' ? `/${item.name}` : `${normalized}/${item.name}`;
        const crit = classifyCritical(fullPath);
        const type: SystemEntry['type'] =
          item.type === LinuxFileType.Directory
            ? 'directory'
            : item.type === LinuxFileType.Link
              ? 'symlink'
              : 'file';
        entries.push({
          path: fullPath,
          name: item.name,
          type,
          permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--',
          octalMode: type === 'directory' ? '755' : '644',
          owner: 'root:root',
          sizeBytes: Number(item.size),
          modifiedAt: new Date(Number(item.mtime) * 1000).toISOString().slice(0, 16).replace('T', ' '),
          isCritical: crit.isCritical,
          warningReason: crit.reason,
        });
      }
    } finally {
      await sync.dispose();
    }
  }

  return entries.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

function permsToOctal(perms: string): string {
  if (perms.length < 10) return '644';
  const mapGroup = (triplet: string) => {
    let val = 0;
    if (triplet[0] === 'r') val += 4;
    if (triplet[1] === 'w') val += 2;
    if (triplet[2] === 'x' || triplet[2] === 's' || triplet[2] === 't') val += 1;
    return val;
  };
  return `${mapGroup(perms.slice(1, 4))}${mapGroup(perms.slice(4, 7))}${mapGroup(perms.slice(7, 10))}`;
}

export async function readRemoteTextFile(filePath: string): Promise<string> {
  if (!activeAdb) {
    throw new Error('No hay conexión WebUSB activa.');
  }
  const sync = await activeAdb.sync();
  try {
    const reader = sync.read(filePath).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
        if (total > 512 * 1024) {
          throw new Error('El archivo supera 512 KB para vista previa directa. Descárgalo como respaldo.');
        }
      }
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(merged);
  } finally {
    await sync.dispose();
  }
}

export async function installLocalApkViaWebUsb(
  file: File,
  onProgress?: (status: string) => void
): Promise<string> {
  if (!activeAdb) {
    throw new Error('Conecta primero la radio PX5 por WebUSB para instalar APKs directamente.');
  }
  const remoteTmp = `/data/local/tmp/${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  onProgress?.(`Transfiriendo ${file.name} hacia ${remoteTmp}...`);

  const sync = await activeAdb.sync();
  try {
    await sync.write({
      filename: remoteTmp,
      file: file.stream() as unknown as Parameters<AdbSync['write']>[0]['file'],
      permission: 0o644,
    });
  } finally {
    await sync.dispose();
  }

  onProgress?.('Ejecutando pm install -r -d en la radio PX5...');
  const installOut = await activeAdb.subprocess.noneProtocol.spawnWaitText(
    `pm install -r -d "${remoteTmp}" && rm -f "${remoteTmp}"`
  );
  return installOut.trim();
}

export async function rebootDeviceMode(mode: 'normal' | 'recovery' | 'bootloader'): Promise<void> {
  if (!activeAdb) {
    throw new Error('No hay conexión WebUSB activa.');
  }
  if (mode === 'recovery') {
    await activeAdb.power.recovery();
  } else if (mode === 'bootloader') {
    await activeAdb.power.bootloader();
  } else {
    await activeAdb.power.reboot();
  }
}
