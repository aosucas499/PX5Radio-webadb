import type {
  DeveloperSettingAction,
  FactoryCodeItem,
  McuPrefixInfo,
  RecoveryResource,
  SystemEntry,
} from '../types/px5';

export const MTCD_MCU_PREFIXES: McuPrefixInfo[] = [
  {
    prefix: 'HCT',
    manufacturer: 'HotAudio / Dasaita / Estándar HCT',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Uno de los MCU más frecuentes en radios PX5; soporte amplio en Hal9k y Malaysk.',
  },
  {
    prefix: 'GS',
    manufacturer: 'Shenzhen GeShi (GS)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Muy común en unidades Xtrons y Pumpkin. No mezclar dmcu.img con prefijos HA o MX.',
  },
  {
    prefix: 'HA',
    manufacturer: 'HotAudio (HA)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Variante clásica de Dasaita; verifica versión exacta antes de actualizar MCU.',
  },
  {
    prefix: 'MX',
    manufacturer: 'Witson / MeiXin (MX)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Presente en radios específicas OEM; requiere archivo dmcu.img exclusivo de MX.',
  },
  {
    prefix: 'KGL',
    manufacturer: 'KaiGeLe (KGL)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Compatible con ROMs MTCD/MTCE estándar conservando el MCU KGL original.',
  },
  {
    prefix: 'LM',
    manufacturer: 'LeiMa (LM)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Soporta entrada a Recovery mediante pinhole RST y actualizaciones update.zip.',
  },
  {
    prefix: 'XRC',
    manufacturer: 'XinRuiChang (XRC)',
    compatibility: 'MTCD / MTCE PX5',
    notes: 'Asegurar respaldo de dmcu.cfg antes de realizar restablecimientos de fábrica.',
  },
];

export const MTCD_FACTORY_CODES: FactoryCodeItem[] = [
  {
    code: '126',
    target: 'Ajustes -> Coche -> Ajustes de fábrica',
    effect: 'Abre el menú maestro de configuración de hardware, CANBUS, amplificador y logo.',
    caution: 'No modifiques parámetros de resolución o panel táctil sin exportar antes dmcu.cfg.',
  },
  {
    code: 'adbon',
    target: 'Campo de contraseña en Ajustes de fábrica',
    effect: 'Activa el demonio ADB (Android Debug Bridge) en la radio para conexión USB o red.',
    caution: 'En muchas PX5 MTCD/MTCE sustituye al interruptor estándar de Depuración USB.',
  },
  {
    code: 'adboff',
    target: 'Campo de contraseña en Ajustes de fábrica',
    effect: 'Desactiva el servicio ADB para cerrar el acceso de depuración cuando termines.',
    caution: 'Recomendado desactivarlo tras terminar tareas de mantenimiento por seguridad.',
  },
  {
    code: 'hctreboot',
    target: 'Campo de contraseña en Ajustes de fábrica',
    effect: 'Fuerza un reinicio completo en frío del sistema Android y MCU en placas HCT/MTCE.',
    caution: 'Útil cuando el botón de encendido solo suspende la radio en modo reposo rápido.',
  },
  {
    code: 'm123456',
    target: 'Campo de contraseña en Ajustes de fábrica (variantes)',
    effect: 'Código alternativo en ciertas compilaciones Android 8/9/10 para acceder al menú de fábrica.',
    caution: 'Probar solo si el código estándar 126 indica contraseña incorrecta.',
  },
  {
    code: '3368 / 8888',
    target: 'Ajustes de fábrica (compilaciones OEM específicas)',
    effect: 'Códigos secundarios utilizados en firmware personalizado o unidades derivadas.',
    caution: 'Verifica en Acerca del dispositivo que la placa sea MTCD/MTCE real.',
  },
];

export const DEVELOPER_ACTIONS: DeveloperSettingAction[] = [
  {
    id: 'adb-tcp-5555',
    title: 'Habilitar ADB por red local (Puerto 5555)',
    description: 'Permite conectar adb connect <IP>:5555 desde PC cuando los puertos USB frontales solo operan como Host.',
    command: 'setprop persist.adb.tcp.port 5555 && setprop service.adb.tcp.port 5555 && stop adbd && start adbd',
    revertCommand: 'setprop persist.adb.tcp.port -1 && setprop service.adb.tcp.port -1 && stop adbd && start adbd',
    requiresRoot: true,
    risk: 'medio',
  },
  {
    id: 'stay-awake',
    title: 'Mantener pantalla activa durante depuración',
    description: 'Evita suspensiones de pantalla o corte de sesión ADB mientras la radio recibe alimentación.',
    command: 'settings put global stay_on_while_plugged_in 3',
    revertCommand: 'settings put global stay_on_while_plugged_in 0',
    requiresRoot: false,
    risk: 'bajo',
  },
  {
    id: 'disable-usb-verifier',
    title: 'Permitir instalación APK vía ADB sin verificación bloqueante',
    description: 'Desactiva el verificador estricto para instalar Magisk, Termux o utilidades locales sin bloqueos.',
    command: 'settings put global verifier_verify_adb_installs 0',
    revertCommand: 'settings put global verifier_verify_adb_installs 1',
    requiresRoot: false,
    risk: 'bajo',
  },
  {
    id: 'fast-animations',
    title: 'Reducir escalas de animación (0.5x)',
    description: 'Agiliza transiciones del sistema en procesadores PX5 RK3368 de 2 GB / 4 GB RAM.',
    command: 'settings put global window_animation_scale 0.5 && settings put global transition_animation_scale 0.5 && settings put global animator_duration_scale 0.5',
    revertCommand: 'settings put global window_animation_scale 1 && settings put global transition_animation_scale 1 && settings put global animator_duration_scale 1',
    requiresRoot: false,
    risk: 'bajo',
  },
  {
    id: 'grant-termux-secure',
    title: 'Conceder WRITE_SECURE_SETTINGS a Terminal / Utilidades',
    description: 'Autoriza escritura segura de ajustes del sistema para automatizaciones y diagnósticos avanzados.',
    command: 'pm grant com.termux android.permission.WRITE_SECURE_SETTINGS',
    revertCommand: 'pm revoke com.termux android.permission.WRITE_SECURE_SETTINGS',
    requiresRoot: false,
    risk: 'medio',
  },
  {
    id: 'check-selinux',
    title: 'Consultar estado de SELinux y depuración USB activa',
    description: 'Verifica si SELinux está en Enforcing o Permissive y lee adb_enabled.',
    command: 'echo "SELinux: $(getenforce)" && echo "ADB: $(settings get global adb_enabled)" && echo "TCP Port: $(getprop persist.adb.tcp.port)"',
    revertCommand: 'getenforce',
    requiresRoot: false,
    risk: 'bajo',
  },
];

export const RECOVERY_RESOURCES: RecoveryResource[] = [
  {
    id: 'magisk-official',
    title: 'Magisk — Releases oficiales (APK y parcheador boot/recovery)',
    category: 'root',
    androidVersions: ['Android 6', 'Android 8', 'Android 9', 'Android 10'],
    mcuScope: 'Universal PX5 (parcheando boot.img o recovery.img)',
    author: 'topjohnwu (GitHub)',
    url: 'https://github.com/topjohnwu/Magisk/releases',
    riskLevel: 'medio',
    summary: 'Aplicación oficial para gestionar root systemless, módulos y parcheo de imágenes de arranque.',
    notes: 'En PX5 sin ramdisk en boot, Magisk puede requerir parchear recovery.img o usar ROM con soporte integrado.',
  },
  {
    id: 'termux-official',
    title: 'Termux — Terminal Android avanzada (GitHub Releases)',
    category: 'terminal',
    androidVersions: ['Android 8', 'Android 9', 'Android 10'],
    mcuScope: 'ARM64 / ARMv7 compatible con RK3368',
    author: 'Termux Project',
    url: 'https://github.com/termux/termux-app/releases',
    riskLevel: 'bajo',
    summary: 'Emulador de terminal completo con entorno Linux, shell sh/bash y soporte para comandos su y adb.',
    notes: 'Para Android 6.0 Marshmallow utiliza el paquete heredado compatible o Android Terminal Emulator.',
  },
  {
    id: 'android-terminal-legacy',
    title: 'Terminal Emulator for Android (APK compatible Android 6/8/9)',
    category: 'terminal',
    androidVersions: ['Android 6', 'Android 8', 'Android 9'],
    mcuScope: 'Universal Android ARM/ARM64',
    author: 'Jack Palevich (F-Droid / Archive)',
    url: 'https://f-droid.org/packages/jackpal.androidterm/',
    riskLevel: 'bajo',
    summary: 'Terminal ligera ideal para unidades PX5 con Android 6 u 8 donde Termux moderno exige API 24+.',
    notes: 'Permite ejecutar su, getprop, dd y scripts .sh directamente desde la pantalla de la radio.',
  },
  {
    id: 'hal9k-modinstaller',
    title: 'Hal9k ModInstaller Pro & ROMs MTCD/MTCE (XDA)',
    category: 'rom-installer',
    androidVersions: ['Android 8', 'Android 9', 'Android 10'],
    mcuScope: 'MTCD / MTCE PX5 (RK3368)',
    author: 'Hal9k_ (XDA Developers)',
    url: 'https://xdaforums.com/f/mtcd-android-head-units-general.7867/',
    riskLevel: 'medio',
    summary: 'Referencia principal en XDA para actualizar recovery entre versiones Android 8/9/10 e integrar root Magisk.',
    notes: 'Permite saltar entre versiones mayores de Android actualizando el recovery stock compatible sin PC.',
  },
  {
    id: 'malaysk-px5-xda',
    title: 'Malaysk Custom ROMs & Root PX5 MTCD/MTCE (XDA)',
    category: 'rom-installer',
    androidVersions: ['Android 6', 'Android 8', 'Android 9', 'Android 10'],
    mcuScope: 'MTCD / MTCE PX5',
    author: 'Malaysk (XDA Developers)',
    url: 'https://xdaforums.com/f/mtcd-software-development.7869/',
    riskLevel: 'medio',
    summary: 'Compilaciones dedicadas para PX5 con soporte root preintegrado, ajuste térmico y opciones de recuperación.',
    notes: 'Verifica siempre el hilo exacto correspondiente a tu versión de Android y procesador PX5 (RK3368).',
  },
  {
    id: 'twrp-px5-mtcd',
    title: 'Hilos de TWRP & Recovery personalizado Rockchip PX5 (XDA)',
    category: 'recovery',
    androidVersions: ['Android 6', 'Android 8', 'Android 9'],
    mcuScope: 'MTCD / MTCE RK3368 (verificar tabla de particiones)',
    author: 'Comunidad XDA MTCD',
    url: 'https://xdaforums.com/f/mtcd-android-head-units-qa.7868/',
    riskLevel: 'alto',
    summary: 'Imágenes TWRP compiladas para pantallas 1024x600 y 1280x720 en unidades Rockchip PX5.',
    notes: 'Muchos paneles PX5 carecen de controlador táctil en TWRP; ten siempre un ratón o teclado USB conectado.',
  },
  {
    id: 'rockchip-rkdevtool',
    title: 'Rockchip RKDevTool / AndroidTool & Drivers (Recuperación Maskrom)',
    category: 'herramienta-pc',
    androidVersions: ['Android 6', 'Android 8', 'Android 9', 'Android 10'],
    mcuScope: 'Rockchip RK3368 (USB OTG / Modo Loader)',
    author: 'Rockchip / Comunidad XDA',
    url: 'https://xdaforums.com/t/px5-mtcd-e-unbrick-recovery-rkdevtool.3822100/',
    riskLevel: 'alto',
    summary: 'Herramienta de PC para flashear recovery.img, boot.img o update.img por USB cuando la radio no arranca.',
    notes: 'Requiere cable USB-A a USB-A macho conectado al puerto OTG específico de la radio y drivers Rockchip.',
  },
];

export const CRITICAL_SYSTEM_PATHS: Array<{ prefix: string; reason: string }> = [
  { prefix: '/system/build.prop', reason: 'Propiedades base de arranque; un error de sintaxis o permisos distintos de 644 provoca bootloop.' },
  { prefix: '/system/priv-app', reason: 'Aplicaciones privilegiadas del sistema (Launcher, SystemUI, MTCManager).' },
  { prefix: '/system/framework', reason: 'Librerías centrales de Android; no reemplazar sin copia completa previa.' },
  { prefix: '/vendor/etc', reason: 'Configuración de audio, mezclador ALSA y parámetros del SoC Rockchip.' },
  { prefix: '/oem', reason: 'Personalizaciones de fabricante y módulos de CANBUS/radio.' },
  { prefix: '/dev/block', reason: 'Nodos de bloque directos (boot, recovery, system). Escritura directa puede dejar la unidad inutilizable.' },
];

export const SAMPLE_SYSTEM_ENTRIES: Record<string, SystemEntry[]> = {
  '/system': [
    { path: '/system/build.prop', name: 'build.prop', type: 'file', permissions: '-rw-r--r--', octalMode: '644', owner: 'root:root', sizeBytes: 6840, modifiedAt: '2024-03-12 09:14', isCritical: true, warningReason: 'Archivo maestro de propiedades del sistema (requiere chmod 644).' },
    { path: '/system/app', name: 'app', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:10', isCritical: true, warningReason: 'Aplicaciones del sistema.' },
    { path: '/system/priv-app', name: 'priv-app', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:10', isCritical: true, warningReason: 'Aplicaciones privilegiadas MTC/Android.' },
    { path: '/system/bin', name: 'bin', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:shell', sizeBytes: 8192, modifiedAt: '2024-03-12 09:10', isCritical: true, warningReason: 'Binarios ejecutables del sistema.' },
    { path: '/system/etc', name: 'etc', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:10', isCritical: true, warningReason: 'Configuración de red, permisos XML y arranque.' },
    { path: '/system/xbin', name: 'xbin', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:shell', sizeBytes: 4096, modifiedAt: '2024-03-12 09:10', isCritical: false },
  ],
  '/system/priv-app': [
    { path: '/system/priv-app/MTCManager', name: 'MTCManager', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:11', isCritical: true, warningReason: 'Gestor de hardware MCU/volante/radio.' },
    { path: '/system/priv-app/SystemUI', name: 'SystemUI', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:11', isCritical: true, warningReason: 'Barra de estado y navegación.' },
  ],
  '/system/etc': [
    { path: '/system/etc/hosts', name: 'hosts', type: 'file', permissions: '-rw-r--r--', octalMode: '644', owner: 'root:root', sizeBytes: 56, modifiedAt: '2024-03-12 09:12', isCritical: false },
    { path: '/system/etc/permissions', name: 'permissions', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:12', isCritical: true, warningReason: 'Permisos XML de plataforma.' },
  ],
  '/vendor': [
    { path: '/vendor/build.prop', name: 'build.prop', type: 'file', permissions: '-rw-r--r--', octalMode: '644', owner: 'root:root', sizeBytes: 3120, modifiedAt: '2024-03-12 09:14', isCritical: true, warningReason: 'Propiedades de hardware Rockchip.' },
    { path: '/vendor/etc', name: 'etc', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:14', isCritical: true, warningReason: 'Rutas de audio y firmware vendor.' },
  ],
  '/oem': [
    { path: '/oem/app', name: 'app', type: 'directory', permissions: 'drwxr-xr-x', octalMode: '755', owner: 'root:root', sizeBytes: 4096, modifiedAt: '2024-03-12 09:15', isCritical: true, warningReason: 'Apps preinstaladas OEM.' },
  ],
  '/sdcard': [
    { path: '/sdcard/Download', name: 'Download', type: 'directory', permissions: 'drwxrwx--x', octalMode: '771', owner: 'root:sdcard_rw', sizeBytes: 4096, modifiedAt: '2026-11-15 18:20', isCritical: false },
    { path: '/sdcard/Documents', name: 'Documents', type: 'directory', permissions: 'drwxrwx--x', octalMode: '771', owner: 'root:sdcard_rw', sizeBytes: 4096, modifiedAt: '2026-11-15 18:20', isCritical: false },
    { path: '/sdcard/PX5_Backup', name: 'PX5_Backup', type: 'directory', permissions: 'drwxrwx--x', octalMode: '771', owner: 'root:sdcard_rw', sizeBytes: 4096, modifiedAt: '2026-11-16 10:05', isCritical: false },
    { path: '/sdcard/dmcu.cfg', name: 'dmcu.cfg', type: 'file', permissions: '-rw-rw----', octalMode: '660', owner: 'root:sdcard_rw', sizeBytes: 512, modifiedAt: '2026-11-10 14:32', isCritical: false },
  ],
  '/data/local/tmp': [
    { path: '/data/local/tmp/diagnostico_px5.sh', name: 'diagnostico_px5.sh', type: 'file', permissions: '-rwxr-xr-x', octalMode: '755', owner: 'shell:shell', sizeBytes: 1240, modifiedAt: '2026-11-16 12:00', isCritical: false },
  ],
};

export const DIAGNOSTIC_SCRIPT_LINES = [
  'echo "=== PX5 CONSOLE DIAGNOSTIC ==="',
  'echo "ANDROID_VERSION=$(getprop ro.build.version.release)"',
  'echo "SDK_LEVEL=$(getprop ro.build.version.sdk)"',
  'echo "MODEL=$(getprop ro.product.model)"',
  'echo "BOARD=$(getprop ro.board.platform)"',
  'echo "CPU_ABI=$(getprop ro.product.cpu.abi)"',
  'echo "BUILD_ID=$(getprop ro.build.display.id)"',
  'echo "FINGERPRINT=$(getprop ro.build.fingerprint)"',
  'echo "MCU_PROP=$(getprop persist.sys.mcu_version)$(getprop ro.product.mcu)"',
  'echo "SELINUX=$(getenforce 2>/dev/null || echo unknown)"',
  'echo "ADB_TCP=$(getprop persist.adb.tcp.port)"',
  'echo "SU_PATH=$(which su 2>/dev/null || echo none)"',
  'echo "MAGISK_VER=$(magisk -v 2>/dev/null || /sbin/magisk -v 2>/dev/null || echo none)"',
  'echo "MOUNT_SYS=$(mount | grep -E " /system | / " | head -n 1)"',
  'echo "=== PARTITIONS ==="',
  'ls -l /dev/block/by-name 2>/dev/null || ls -l /dev/block/platform/*/by-name 2>/dev/null',
];

export function buildXdaSearchUrl(androidVer: string, mcuPrefix: string, topic: 'recovery' | 'root' | 'rom'): string {
  const cleanAndroid = androidVer && androidVer !== 'Desconocido' ? androidVer : 'Android 9';
  const cleanMcu = mcuPrefix && mcuPrefix !== 'Desconocido' ? mcuPrefix : 'MTCE';
  const topicKeywords =
    topic === 'recovery'
      ? 'PX5 TWRP recovery.img restore'
      : topic === 'root'
        ? 'PX5 Magisk root boot.img'
        : 'PX5 Hal9k Malaysk firmware';
  const q = encodeURIComponent(`site:xdaforums.com ${cleanMcu} ${cleanAndroid} ${topicKeywords}`);
  return `https://www.google.com/search?q=${q}`;
}
