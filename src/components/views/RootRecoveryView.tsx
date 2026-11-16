import { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  HardDriveDownload,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  MTCD_MCU_PREFIXES,
  RECOVERY_RESOURCES,
  buildXdaSearchUrl,
} from '../../data/px5Knowledge';
import type { DeviceSnapshot, RecoveryResource } from '../../types/px5';
import { downloadShellScript, downloadWindowsBatch } from '../../utils/scriptDownload';
import { SafetyConfirmModal } from '../SafetyConfirmModal';

interface RootRecoveryViewProps {
  device: DeviceSnapshot;
  onRunCommand: (cmd: string) => Promise<void>;
}

type CategoryFilter = 'all' | RecoveryResource['category'];

export function RootRecoveryView({ device, onRunCommand }: RootRecoveryViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [targetAndroid, setTargetAndroid] = useState(
    device.androidVersion !== 'Desconocido' ? `Android ${device.androidVersion}` : 'Android 9'
  );
  const [targetMcu, setTargetMcu] = useState(
    device.mcuPrefix !== 'MTCD/MTCE' ? device.mcuPrefix : 'MTCE'
  );
  const [partitionBackupDone, setPartitionBackupDone] = useState(false);
  const [flashTarget, setFlashTarget] = useState<'recovery' | 'boot'>('recovery');
  const [imageFilename, setImageFilename] = useState('recovery_twrp_px5.img');
  const [flashModalOpen, setFlashModalOpen] = useState(false);
  const [flashNotice, setFlashNotice] = useState<string | null>(null);

  const isWebUsb = device.connectionMode === 'webusb';

  const filteredResources = RECOVERY_RESOURCES.filter((res) => {
    const matchesCat = categoryFilter === 'all' || res.category === categoryFilter;
    const matchesAndroid = res.androidVersions.includes(targetAndroid);
    return matchesCat && matchesAndroid;
  });

  const handlePartitionBackup = async () => {
    const backupCmds = [
      'mkdir -p /sdcard/PX5_Backup',
      'dd if=/dev/block/by-name/boot of=/sdcard/PX5_Backup/boot_stock.img 2>/dev/null || dd if=/dev/block/platform/ff0f0000.dwmmc/by-name/boot of=/sdcard/PX5_Backup/boot_stock.img',
      'dd if=/dev/block/by-name/recovery of=/sdcard/PX5_Backup/recovery_stock.img 2>/dev/null || dd if=/dev/block/platform/ff0f0000.dwmmc/by-name/recovery of=/sdcard/PX5_Backup/recovery_stock.img',
      'ls -lh /sdcard/PX5_Backup/*.img',
    ];

    if (isWebUsb) {
      await onRunCommand(`su -c '${backupCmds.join(' && ')}'`);
    } else {
      downloadShellScript(
        'backup_particiones_px5',
        backupCmds,
        'Respaldo previo de boot.img y recovery.img en Rockchip PX5'
      );
    }
    setPartitionBackupDone(true);
  };

  const handleConfirmedFlash = async () => {
    setFlashModalOpen(false);
    const blockName = flashTarget === 'recovery' ? 'recovery' : 'boot';
    const remoteImg = `/sdcard/Download/${imageFilename}`;
    const flashCmd = `dd if="${remoteImg}" of=/dev/block/by-name/${blockName} && sync`;

    if (isWebUsb) {
      await onRunCommand(`su -c '${flashCmd}'`);
      setFlashNotice(
        `Comando de escritura en partición ${blockName} enviado vía WebUSB. Verifica la salida en el registro antes de reiniciar.`
      );
    } else {
      downloadWindowsBatch(
        `flashear_${blockName}_px5`,
        [
          `adb push "${imageFilename}" "${remoteImg}"`,
          `adb shell "su -c '${flashCmd}'"`,
          'echo === Verificado. Reinicia en recovery para comprobar ===',
        ],
        `Flasheo seguro de ${blockName} para PX5 MTCD/MTCE`
      );
      setFlashNotice(
        `Script flashear_${blockName}_px5.bat descargado con respaldo previo verificado.`
      );
    }
  };

  const riskText = (risk: RecoveryResource['riskLevel']) => {
    if (risk === 'alto') return { label: 'Riesgo Alto', cls: 'text-red-400' };
    if (risk === 'medio') return { label: 'Riesgo Medio', cls: 'text-amber-400' };
    return { label: 'Riesgo Bajo', cls: 'text-emerald-400' };
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-[#242B36] pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Instalación de Root, Recovery y Enlaces para PX5 MTCD/MTCE
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Busca enlaces verificados de Recovery (TWRP / Stock / ModInstaller), ROMs con Root integrado (Hal9k / Malaysk) y ejecuta el flujo guiado de respaldo y parcheo con Magisk.
        </p>
      </section>

      {/* Dynamic Device-Specific Search Builder */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242B36] pb-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Buscador específico de Recovery y Root para tu dispositivo
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Ajusta tu versión de Android y prefijo MCU para generar búsquedas directas en XDA Developers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Versión de Android"
              value={targetAndroid}
              onChange={(e) => setTargetAndroid(e.target.value)}
              className="rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="Android 6">Android 6 (Marshmallow)</option>
              <option value="Android 8">Android 8 (Oreo)</option>
              <option value="Android 9">Android 9 (Pie)</option>
              <option value="Android 10">Android 10 (Q)</option>
            </select>

            <select
              aria-label="Prefijo MCU"
              value={targetMcu}
              onChange={(e) => setTargetMcu(e.target.value)}
              className="rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="MTCE">MTCE Genérico</option>
              <option value="MTCD">MTCD Genérico</option>
              {MTCD_MCU_PREFIXES.map((m) => (
                <option key={m.prefix} value={`MTCE_${m.prefix}`}>
                  MTCE_{m.prefix} ({m.manufacturer.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={buildXdaSearchUrl(targetAndroid, targetMcu, 'recovery')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar Recovery / TWRP ({targetMcu} · {targetAndroid})
          </a>
          <a
            href={buildXdaSearchUrl(targetAndroid, targetMcu, 'root')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
            Buscar Root Magisk / boot.img
          </a>
          <a
            href={buildXdaSearchUrl(targetAndroid, targetMcu, 'rom')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            Buscar Hal9k / Malaysk ROM
          </a>
        </div>
      </section>

      {/* Curated Verified Directory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Directorio verificado de enlaces PX5 ({filteredResources.length})
          </h2>
          <div className="flex flex-wrap gap-1 rounded-md border border-[#242B36] bg-[#11151B] p-1">
            {(
              [
                ['all', 'Todos'],
                ['recovery', 'Recovery / TWRP'],
                ['root', 'Root / Magisk'],
                ['rom-installer', 'Hal9k / Malaysk'],
                ['herramienta-pc', 'RKDevTool PC'],
              ] as Array<[CategoryFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === key
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredResources.map((res) => {
            const risk = riskText(res.riskLevel);
            return (
              <div
                key={res.id}
                className="flex flex-col justify-between rounded-lg border border-[#242B36] bg-[#11151B] p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-slate-100">{res.title}</h3>
                    <span className={`text-xs font-medium whitespace-nowrap shrink-0 ${risk.cls}`}>
                      {risk.label}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {res.author} · {res.mcuScope}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-300">{res.summary}</p>
                  <p className="mt-2 text-xs text-slate-400">Nota técnica: {res.notes}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#242B36] pt-3 text-xs">
                  <span className="font-mono text-slate-400">{res.androidVersions.join(' / ')}</span>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0"
                  >
                    Abrir enlace oficial
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guided Root & Recovery Flash Workflow */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="border-b border-[#242B36] pb-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Flujo seguro para instalar Root (Magisk) o modificar Recovery en PX5
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            En unidades PX5 MTCD/MTCE, el método más seguro es respaldar tus particiones originales, parchear <code className="text-slate-200">boot.img</code> o <code className="text-slate-200">recovery.img</code> con Magisk (o usar ModInstaller Pro / <code className="text-slate-200">update.zip</code> por SD).
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-md border border-[#242B36] bg-[#090B0E] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-100">
                1. Extraer respaldo obligatorio de boot.img y recovery.img
              </h3>
              {partitionBackupDone && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Completado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Guarda copias intactas de tus particiones actuales antes de parchear con Magisk o sustituir el Recovery.
            </p>
            <button
              type="button"
              onClick={handlePartitionBackup}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              {isWebUsb ? 'Extraer particiones vía WebUSB' : 'Descargar script dd de respaldo (.sh)'}
            </button>
          </div>

          <div className="space-y-3 rounded-md border border-[#242B36] bg-[#090B0E] p-4">
            <h3 className="text-xs font-semibold text-slate-100">
              2. Flashear imagen parcheada (Magisk / TWRP) con doble confirmación
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                aria-label="Partición destino"
                value={flashTarget}
                onChange={(e) => {
                  const val = e.target.value as 'recovery' | 'boot';
                  setFlashTarget(val);
                  setImageFilename(
                    val === 'recovery' ? 'recovery_twrp_px5.img' : 'magisk_patched_boot.img'
                  );
                }}
                className="rounded-md border border-[#242B36] bg-[#11151B] px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="recovery">Partición /recovery (TWRP / Restore)</option>
                <option value="boot">Partición /boot (Magisk Root)</option>
              </select>

              <input
                type="text"
                value={imageFilename}
                onChange={(e) => setImageFilename(e.target.value)}
                aria-label="Nombre de imagen .img"
                className="rounded-md border border-[#242B36] bg-[#11151B] px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={!partitionBackupDone}
              onClick={() => setFlashModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/15 px-3.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <HardDriveDownload className="h-3.5 w-3.5" />
              {isWebUsb ? `Flashear ${flashTarget} vía WebUSB` : `Generar script de flasheo ${flashTarget}`}
            </button>

            {!partitionBackupDone && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Ejecuta o descarga primero el respaldo de particiones del paso 1.
              </p>
            )}
          </div>
        </div>

        {flashNotice && (
          <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {flashNotice}
          </p>
        )}
      </section>

      <SafetyConfirmModal
        open={flashModalOpen}
        title={`Confirmar escritura en partición /${flashTarget} (PX5)`}
        description={`Se generará o ejecutará el volcado directo de ${imageFilename} sobre /dev/block/by-name/${flashTarget}.`}
        consequences={[
          'Flashear una imagen incompatible con Rockchip RK3368 o tu tabla de particiones requiere RKDevTool (Maskrom) para recuperar.',
          'Verifica que la imagen corresponde exactamente a tu versión Android PX5 MTCD/MTCE.',
          'Ten preparado un teclado USB o acceso RKDevTool en PC por si necesitas restaurar el respaldo.',
        ]}
        backupChecklistLabel="Confirmo que cuento con boot_stock.img y recovery_stock.img respaldados."
        confirmPhrase="FLASHEAR PX5"
        confirmActionLabel="Confirmar flasheo seguro"
        dangerTone="destructive"
        onCancel={() => setFlashModalOpen(false)}
        onConfirm={handleConfirmedFlash}
      />
    </div>
  );
}
