import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Check,
  Download,
  File,
  Folder,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { SAMPLE_SYSTEM_ENTRIES } from '../../data/px5Knowledge';
import type { DeviceSnapshot, SystemEntry } from '../../types/px5';
import { listRemoteDirectory, readRemoteTextFile } from '../../services/webAdbClient';
import { downloadShellScript, downloadTextFile, formatBytes } from '../../utils/scriptDownload';
import { SafetyConfirmModal } from '../SafetyConfirmModal';

interface SystemFilesViewProps {
  device: DeviceSnapshot;
  onRunCommand: (cmd: string) => Promise<void>;
}

const ROOT_BOOKMARKS = ['/system', '/system/priv-app', '/system/etc', '/vendor', '/oem', '/sdcard', '/data/local/tmp'];

export function SystemFilesView({ device, onRunCommand }: SystemFilesViewProps) {
  const [currentPath, setCurrentPath] = useState('/system');
  const [entries, setEntries] = useState<SystemEntry[]>(SAMPLE_SYSTEM_ENTRIES['/system'] ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRwUnlocked, setIsRwUnlocked] = useState(false);
  const [rwModalOpen, setRwModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SystemEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [backedUpPaths, setBackedUpPaths] = useState<Record<string, boolean>>({});

  const isWebUsb = device.connectionMode === 'webusb';

  const loadDirectory = async (targetPath: string) => {
    setCurrentPath(targetPath);
    setSelectedEntry(null);
    setPreviewContent(null);
    setErrorMsg(null);

    if (isWebUsb) {
      setLoading(true);
      try {
        const list = await listRemoteDirectory(targetPath);
        setEntries(list);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'No se pudo listar el directorio remoto.');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    } else {
      setEntries(SAMPLE_SYSTEM_ENTRIES[targetPath] ?? []);
    }
  };

  useEffect(() => {
    if (isWebUsb) {
      loadDirectory(currentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebUsb]);

  const filteredEntries = entries.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSelectEntry = async (entry: SystemEntry) => {
    if (entry.type === 'directory') {
      await loadDirectory(entry.path);
      return;
    }

    setSelectedEntry(entry);
    setPreviewContent(null);
    if (isWebUsb && entry.sizeBytes < 256 * 1024) {
      try {
        const text = await readRemoteTextFile(entry.path);
        setPreviewContent(text);
      } catch (err) {
        setPreviewContent(err instanceof Error ? err.message : 'Archivo binario o acceso restringido sin Root.');
      }
    } else if (!isWebUsb && entry.name === 'build.prop') {
      setPreviewContent(
        '# Vista de referencia PX5 MTCD/MTCE (Conecta WebUSB para leer el archivo real)\nro.build.version.release=9\nro.board.platform=rk3368\npersist.adb.tcp.port=5555'
      );
    }
  };

  const handleBackupFile = async (entry: SystemEntry) => {
    const safeName = entry.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (isWebUsb) {
      await onRunCommand(
        `mkdir -p /sdcard/PX5_Backup && cp -p "${entry.path}" "/sdcard/PX5_Backup/${safeName}.bak"`
      );
    }
    if (previewContent) {
      downloadTextFile(`${safeName}.bak`, previewContent);
    } else {
      downloadShellScript(
        `respaldo_${safeName}`,
        [
          'mkdir -p /sdcard/PX5_Backup',
          `cp -p "${entry.path}" "/sdcard/PX5_Backup/${safeName}.bak"`,
          `ls -la "/sdcard/PX5_Backup/${safeName}.bak"`,
        ],
        `Copia de seguridad previa para ${entry.path}`
      );
    }
    setBackedUpPaths((prev) => ({ ...prev, [entry.path]: true }));
  };

  const handleConfirmRwMount = async () => {
    setRwModalOpen(false);
    setIsRwUnlocked(true);
    if (isWebUsb) {
      await onRunCommand('su -c "mount -o rw,remount /system" || mount -o rw,remount /system');
    }
  };

  const handleLockReadOnly = async () => {
    setIsRwUnlocked(false);
    if (isWebUsb) {
      await onRunCommand('su -c "mount -o ro,remount /system" || mount -o ro,remount /system');
    }
  };

  const parentPath = currentPath.includes('/') && currentPath !== '/'
    ? currentPath.slice(0, currentPath.lastIndexOf('/')) || '/'
    : '/';

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 border-b border-[#242B36] pb-6 xl:flex-row xl:items-end">
        <div className="max-w-2xl space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Gestor Seguro de Archivos del Sistema
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Explorador protegido en modo Solo Lectura por defecto. Exige respaldo previo en <code className="text-slate-200">/sdcard/PX5_Backup</code> y doble confirmación antes de remontar particiones como escritura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isRwUnlocked ? (
            <button
              type="button"
              onClick={handleLockReadOnly}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 whitespace-nowrap shrink-0"
            >
              <Unlock className="h-4 w-4" />
              Modo RW Activo — Volver a Solo Lectura (RO)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRwModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 whitespace-nowrap shrink-0"
            >
              <Lock className="h-4 w-4" />
              Protegido (RO) — Habilitar Escritura RW
            </button>
          )}
        </div>
      </section>

      {/* Path bookmarks & search bar */}
      <section className="flex flex-col justify-between gap-4 rounded-lg border border-[#242B36] bg-[#11151B] p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => loadDirectory(parentPath)}
            className="inline-flex items-center gap-1 rounded-md border border-[#242B36] bg-[#171C24] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
            title="Subir un nivel"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Subir
          </button>
          {ROOT_BOOKMARKS.map((bookmark) => (
            <button
              key={bookmark}
              type="button"
              onClick={() => loadDirectory(bookmark)}
              className={`rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                currentPath === bookmark
                  ? 'bg-amber-500 font-semibold text-slate-950'
                  : 'bg-[#090B0E] text-slate-300 border border-[#242B36] hover:text-slate-100'
              }`}
            >
              {bookmark}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar nombre..."
              className="w-full rounded-md border border-[#242B36] bg-[#090B0E] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => loadDirectory(currentPath)}
            className="rounded-md border border-[#242B36] bg-[#171C24] p-2 text-slate-300 hover:text-slate-100"
            aria-label="Actualizar directorio"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {!isWebUsb && (
        <p className="text-xs text-slate-400">
          Mostrando árbol de referencia PX5 MTCD/MTCE para <code className="text-slate-200">{currentPath}</code>. Al conectar la radio por WebUSB se listarán los archivos reales del dispositivo.
        </p>
      )}

      {errorMsg && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Split Table + Inspector */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-lg border border-[#242B36] bg-[#11151B] xl:col-span-7">
          <div className="flex items-center justify-between border-b border-[#242B36] px-4 py-3 text-xs">
            <span className="font-mono font-semibold text-amber-300">{currentPath}</span>
            <span className="font-mono tabular-nums text-slate-400">{filteredEntries.length} elementos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#242B36] text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-3 py-2.5 font-medium">Permisos</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tamaño</th>
                  <th className="px-4 py-2.5 font-medium">Seguridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D232D]">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No hay elementos que coincidan en esta ruta.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr
                      key={entry.path}
                      onClick={() => handleSelectEntry(entry)}
                      className={`cursor-pointer transition-colors hover:bg-[#171C24] ${
                        selectedEntry?.path === entry.path ? 'bg-[#171C24]' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {entry.type === 'directory' ? (
                            <Folder className="h-4 w-4 shrink-0 text-amber-400" />
                          ) : (
                            <File className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-mono font-medium text-slate-200">{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-slate-400">
                        {entry.octalMode} ({entry.permissions})
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-300">
                        {entry.type === 'directory' ? '—' : formatBytes(entry.sizeBytes)}
                      </td>
                      <td className="px-4 py-2.5">
                        {backedUpPaths[entry.path] ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-3.5 w-3.5" /> Respaldado
                          </span>
                        ) : entry.isCritical ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" /> Ruta crítica
                          </span>
                        ) : (
                          <span className="text-slate-500">Estándar</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* File Safety Inspector & Pre-Edit Backup */}
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Inspector y respaldo previo obligatorio
          </h2>

          {!selectedEntry ? (
            <div className="mt-6 rounded-md border border-[#242B36] bg-[#090B0E] p-6 text-center text-xs text-slate-400">
              Selecciona un archivo de la tabla para inspeccionar permisos (<code className="text-slate-300">chmod</code>), ver contenido seguro o generar una copia de seguridad antes de modificarlo.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-[#242B36] bg-[#090B0E] p-3 text-xs">
                <p className="font-mono font-semibold text-amber-300">{selectedEntry.path}</p>
                <p className="mt-1 font-mono text-slate-400">
                  Permisos: {selectedEntry.octalMode} · Propietario: {selectedEntry.owner} · {formatBytes(selectedEntry.sizeBytes)}
                </p>
              </div>

              {selectedEntry.isCritical && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Archivo protegido del sistema
                  </div>
                  <p className="mt-1">{selectedEntry.warningReason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBackupFile(selectedEntry)}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Respaldar en /sdcard/PX5_Backup
                </button>

                <button
                  type="button"
                  disabled={!isRwUnlocked || !backedUpPaths[selectedEntry.path]}
                  onClick={() =>
                    downloadShellScript(
                      `permisos_${selectedEntry.name}`,
                      [
                        'mount -o rw,remount /system',
                        `chmod ${selectedEntry.octalMode} "${selectedEntry.path}"`,
                        `chown 0:0 "${selectedEntry.path}"`,
                        'mount -o ro,remount /system',
                      ],
                      `Restaurar permisos seguros (${selectedEntry.octalMode}) en ${selectedEntry.path}`
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Script chmod {selectedEntry.octalMode}
                </button>
              </div>

              {!backedUpPaths[selectedEntry.path] && (
                <p className="text-xs text-slate-400">
                  El botón de script de escritura permanecerá bloqueado hasta crear primero el respaldo de este archivo.
                </p>
              )}

              {previewContent !== null && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-400">Vista previa (solo lectura):</p>
                  <pre className="max-h-56 overflow-auto rounded-md border border-[#242B36] bg-[#090B0E] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                    {previewContent}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <SafetyConfirmModal
        open={rwModalOpen}
        title="Desbloquear montaje en lectura/escritura (/system RW)"
        description="Cambiar la partición /system de Solo Lectura (RO) a Escritura (RW) permite alterar archivos críticos de arranque de Android PX5."
        consequences={[
          'Requiere permisos Root (su / Magisk) o sesión ADB con privilegios.',
          'Sustituir archivos en /system/priv-app o build.prop sin chmod 644/755 provoca bootloop.',
          'Al terminar cualquier edición debes volver a montar /system en RO.',
        ]}
        backupChecklistLabel="Confirmo que realizaré copia de seguridad de cada archivo en /sdcard/PX5_Backup antes de modificarlo."
        confirmPhrase="REMONTAJE RW"
        confirmActionLabel="Habilitar modo RW"
        dangerTone="caution"
        onCancel={() => setRwModalOpen(false)}
        onConfirm={handleConfirmRwMount}
      />
    </div>
  );
}
