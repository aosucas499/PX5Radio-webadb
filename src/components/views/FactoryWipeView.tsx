import { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Download,
  FileWarning,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { DeviceSnapshot } from '../../types/px5';
import { downloadShellScript, downloadWindowsBatch } from '../../utils/scriptDownload';
import { SafetyConfirmModal } from '../SafetyConfirmModal';

interface FactoryWipeViewProps {
  device: DeviceSnapshot;
  onRunCommand: (cmd: string) => Promise<void>;
}

type WipeScope = 'full-factory-and-personal' | 'personal-documents-only';

export function FactoryWipeView({ device, onRunCommand }: FactoryWipeViewProps) {
  const [scope, setScope] = useState<WipeScope>('full-factory-and-personal');
  const [backupPrepared, setBackupPrepared] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const isWebUsb = device.connectionMode === 'webusb';

  const handleDownloadPreBackup = (format: 'bat' | 'sh') => {
    if (format === 'bat') {
      downloadWindowsBatch(
        'respaldo_previo_px5',
        [
          'mkdir PX5_Respaldo_Personal 2>nul',
          'adb pull /sdcard/Documents PX5_Respaldo_Personal/Documents',
          'adb pull /sdcard/Download PX5_Respaldo_Personal/Download',
          'adb pull /sdcard/Music PX5_Respaldo_Personal/Music',
          'adb pull /sdcard/Pictures PX5_Respaldo_Personal/Pictures',
          'adb pull /sdcard/dmcu.cfg PX5_Respaldo_Personal/dmcu.cfg',
          'adb pull /system/build.prop PX5_Respaldo_Personal/build.prop',
        ],
        'Respaldo previo de documentos, música y dmcu.cfg antes de borrar PX5'
      );
    } else {
      downloadShellScript(
        'respaldo_previo_px5',
        [
          'mkdir -p /sdcard/PX5_Backup_PreWipe',
          'cp -r /sdcard/Documents /sdcard/PX5_Backup_PreWipe/ 2>/dev/null',
          'cp -r /sdcard/Download /sdcard/PX5_Backup_PreWipe/ 2>/dev/null',
          'cp /sdcard/dmcu.cfg /sdcard/PX5_Backup_PreWipe/ 2>/dev/null',
          'cp /system/build.prop /sdcard/PX5_Backup_PreWipe/ 2>/dev/null',
          'echo "Respaldo guardado. Copia /sdcard/PX5_Backup_PreWipe a un USB externo antes de formatear."',
        ],
        'Respaldo local previo en radio PX5 (copiar a USB externo antes de borrar)'
      );
    }
    setBackupPrepared(true);
  };

  const getWipeCommands = (): string[] => {
    const personalWipe =
      'rm -rf /sdcard/Documents/* /sdcard/Download/* /sdcard/Music/* /sdcard/Pictures/* /sdcard/Movies/* /sdcard/DCIM/* /sdcard/Android/data/*';
    if (scope === 'personal-documents-only') {
      return [personalWipe, 'echo "Documentos y almacenamiento personal eliminados."'];
    }
    return [
      personalWipe,
      'am broadcast -a android.intent.action.MASTER_CLEAR -f 0x01000000 --ez android.intent.extra.WIPE_EXTERNAL_STORAGE true || (mkdir -p /cache/recovery && echo "--wipe_data" > /cache/recovery/command && reboot recovery)',
    ];
  };

  const handleConfirmWipe = async () => {
    setModalOpen(false);
    const cmds = getWipeCommands();

    if (isWebUsb) {
      await onRunCommand(cmds.join(' && '));
      setActionResult(
        scope === 'full-factory-and-personal'
          ? 'Orden de borrado de documentos y restablecimiento de fábrica enviada vía WebUSB.'
          : 'Orden de eliminación de documentos y archivos personales ejecutada vía WebUSB.'
      );
    } else {
      downloadWindowsBatch(
        scope === 'full-factory-and-personal' ? 'borrado_fabrica_total_px5' : 'borrado_documentos_px5',
        cmds.map((c) => `adb shell "${c.replace(/"/g, '\\"')}"`),
        'Script de borrado total controlado para PX5 MTCD/MTCE'
      );
      setActionResult(
        'Al no haber conexión WebUSB activa, se descargó el script .bat verificado para ejecutar desde PC.'
      );
    }
  };

  return (
    <div className="space-y-8">
      <section className="border-b border-[#242B36] pb-6">
        <div className="flex items-center gap-2 text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-xs font-semibold">Zona de operación irreversible · Doble confirmación obligatoria</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Restablecimiento de Fábrica y Borrado Total
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Restaura los valores de fábrica de Android PX5 y elimina de forma completa todos los documentos, descargas, cuentas, caché de aplicaciones y archivos personales de la unidad.
        </p>
      </section>

      {/* Step 1: Mandatory Pre-Wipe Backup */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242B36] pb-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Paso 1. Respaldo previo obligatorio antes de borrar
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Extrae tus documentos personales y el archivo de configuración hardware <code className="text-slate-200">dmcu.cfg</code> (configuración de CANBUS, volante y sintonizador de radio) antes de limpiar la unidad.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
              backupPrepared ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {backupPrepared ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Respaldo generado
              </>
            ) : (
              <>
                <FileWarning className="h-4 w-4" /> Pendiente de respaldo
              </>
            )}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleDownloadPreBackup('bat')}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            Descargar script respaldo PC (.bat)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPreBackup('sh')}
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-amber-400" />
            Descargar script respaldo local (.sh)
          </button>
          <button
            type="button"
            onClick={() => setBackupPrepared(true)}
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#090B0E] px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 whitespace-nowrap shrink-0"
          >
            Ya tengo copia externa verificada
          </button>
        </div>
      </section>

      {/* Step 2: Wipe Scope */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => setScope('full-factory-and-personal')}
          className={`rounded-lg border p-5 text-left transition-colors ${
            scope === 'full-factory-and-personal'
              ? 'border-red-500/60 bg-[#171C24]'
              : 'border-[#242B36] bg-[#11151B] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Restablecimiento de fábrica + Borrado total personal
            </h3>
            <AlertOctagon className="h-5 w-5 shrink-0 text-red-400" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Elimina todo <code className="text-slate-300">/sdcard/*</code> (Documentos, Descargas, Música, Fotos) y dispara <code className="text-slate-300">MASTER_CLEAR / --wipe_data</code> para dejar el sistema Android PX5 limpio de fábrica (ideal al vender el coche o antes de cambiar de ROM).
          </p>
        </button>

        <button
          type="button"
          onClick={() => setScope('personal-documents-only')}
          className={`rounded-lg border p-5 text-left transition-colors ${
            scope === 'personal-documents-only'
              ? 'border-amber-500/60 bg-[#171C24]'
              : 'border-[#242B36] bg-[#11151B] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-slate-100">
              Solo borrado de documentos y archivos personales
            </h3>
            <Trash2 className="h-5 w-5 shrink-0 text-amber-400" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Limpia las carpetas <code className="text-slate-300">Documents</code>, <code className="text-slate-300">Download</code>, <code className="text-slate-300">Music</code>, <code className="text-slate-300">Pictures</code> y caché de apps sin reiniciar ni borrar la configuración base de la radio.
          </p>
        </button>
      </section>

      {/* Step 3: Action Execution */}
      <section className="rounded-lg border border-red-500/30 bg-[#11151B] p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Paso 3. Ejecución controlada con doble confirmación
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isWebUsb
                ? 'Se enviará la orden directa por WebUSB tras superar la confirmación doble.'
                : 'Sin radio conectada por WebUSB, la confirmación descargará el script .bat listo para ejecutar por ADB.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!backupPrepared}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-[#171C24] disabled:text-slate-500 whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="h-4 w-4" />
              {isWebUsb ? 'Iniciar borrado total ahora' : 'Generar script de borrado verificado'}
            </button>
          </div>
        </div>

        {!backupPrepared && (
          <p className="mt-3 text-xs text-amber-400">
            Completa primero el Paso 1 (descarga o confirmación de copia de seguridad) para desbloquear el borrado.
          </p>
        )}

        {actionResult && (
          <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {actionResult}
          </p>
        )}
      </section>

      <SafetyConfirmModal
        open={modalOpen}
        title={
          scope === 'full-factory-and-personal'
            ? 'Confirmar restablecimiento total de fábrica PX5'
            : 'Confirmar borrado de documentos y datos personales'
        }
        description="Esta operación eliminará de forma permanente todos los documentos, descargas y archivos multimedia del almacenamiento interno."
        consequences={[
          'Los documentos en /sdcard/Documents, Download, Music, DCIM y Pictures no se podrán recuperar.',
          scope === 'full-factory-and-personal'
            ? 'Android borrará partición /data, cuentas, aplicaciones instaladas y reiniciará en configuración inicial.'
            : 'Las carpetas personales quedarán completamente vacías.',
          'Asegúrate de mantener la alimentación del vehículo estable durante el reinicio.',
        ]}
        backupChecklistLabel="Confirmo que ya respaldé mis documentos personales y el archivo dmcu.cfg fuera de la radio."
        confirmPhrase="BORRAR TODO PX5"
        confirmActionLabel="Ejecutar borrado definitivo"
        dangerTone="destructive"
        onCancel={() => setModalOpen(false)}
        onConfirm={handleConfirmWipe}
      />
    </div>
  );
}
