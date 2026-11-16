import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Terminal,
  Usb,
} from 'lucide-react';
import { DIAGNOSTIC_SCRIPT_LINES, MTCD_MCU_PREFIXES } from '../../data/px5Knowledge';
import type { CommandLogEntry, DeviceSnapshot } from '../../types/px5';
import { copyTextToClipboard, downloadShellScript, downloadWindowsBatch } from '../../utils/scriptDownload';

interface DiagnosticsViewProps {
  device: DeviceSnapshot;
  webUsbSupported: boolean;
  statusMessage: string | null;
  commandLogs: CommandLogEntry[];
  onConnectWebUsb: () => void;
  onRescanWebUsb: () => void;
  onImportRawOutput: (rawText: string) => void;
  onRunCustomCommand: (cmd: string) => Promise<void>;
}

export function DiagnosticsView({
  device,
  webUsbSupported,
  statusMessage,
  commandLogs,
  onConnectWebUsb,
  onRescanWebUsb,
  onImportRawOutput,
  onRunCustomCommand,
}: DiagnosticsViewProps) {
  const [pasteText, setPasteText] = useState('');
  const [customCmd, setCustomCmd] = useState('getprop ro.build.version.release && which su');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [wifiIp, setWifiIp] = useState('192.168.1.50');

  const isWebUsb = device.connectionMode === 'webusb';

  const handleCopy = async (key: string, text: string) => {
    await copyTextToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadSh = () => {
    downloadShellScript('diagnostico_px5', DIAGNOSTIC_SCRIPT_LINES, 'Diagnóstico completo Rockchip PX5 MTCD/MTCE');
  };

  const handleDownloadBat = () => {
    downloadWindowsBatch(
      'diagnostico_px5_adb',
      [
        `adb connect ${wifiIp}:5555`,
        ...DIAGNOSTIC_SCRIPT_LINES.map((line) => `adb shell "${line.replace(/"/g, '\\"')}"`),
      ],
      'Diagnóstico ADB para PX5 MTCD/MTCE'
    );
  };

  const rootBadge = (() => {
    if (device.rootStatus === 'rooted-magisk') {
      return {
        label: `Root activo (Magisk ${device.magiskVersion})`,
        tone: 'text-emerald-400',
        Icon: ShieldCheck,
      };
    }
    if (device.rootStatus === 'rooted-su') {
      return {
        label: `Root su activo (${device.suPath})`,
        tone: 'text-emerald-400',
        Icon: ShieldCheck,
      };
    }
    if (device.rootStatus === 'unrooted') {
      return {
        label: 'Sin permisos Root detectados',
        tone: 'text-amber-400',
        Icon: ShieldOff,
      };
    }
    return {
      label: 'Pendiente de lectura',
      tone: 'text-slate-400',
      Icon: ShieldOff,
    };
  })();

  const RootIcon = rootBadge.Icon;

  return (
    <div className="space-y-8">
      {/* Header & primary status */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#242B36] pb-6 xl:flex-row xl:items-end">
        <div className="max-w-2xl space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Diagnóstico de Radio Android PX5 MTCD/MTCE
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Detecta en tiempo real la versión exacta de Android, binario Root/Magisk, prefijo MCU y particiones del SoC Rockchip RK3368 mediante WebUSB o importando la salida del script local.
          </p>
          {statusMessage && (
            <p className="text-xs font-medium text-amber-400" role="status">
              {statusMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isWebUsb ? (
            <button
              type="button"
              onClick={onRescanWebUsb}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Re-escanear radio
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnectWebUsb}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              <Usb className="h-4 w-4" />
              Conectar vía WebUSB
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadSh}
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#11151B] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#171C24] whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-amber-400" />
            Descargar .sh
          </button>
          <button
            type="button"
            onClick={handleDownloadBat}
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#11151B] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#171C24] whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-slate-400" />
            Descargar .bat (ADB)
          </button>
        </div>
      </section>

      {!webUsbSupported && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
          Tu navegador actual no expone WebUSB en este contexto. Puedes utilizar Chrome o Edge por USB-OTG, o bien descargar el script <code className="text-amber-300">diagnostico_px5.sh</code> / <code className="text-amber-300">.bat</code> y pegar abajo su salida.
        </div>
      )}

      {/* Primary KPI Grid - 4 clean single-elevation cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-5">
          <p className="text-xs font-medium text-slate-400">Versión de Android</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">
            {device.androidVersion}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            SDK <span className="font-mono tabular-nums text-slate-200">{device.sdkLevel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{device.cpuAbi}</span>
          </p>
        </div>

        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-5">
          <p className="text-xs font-medium text-slate-400">Estado de Root / Magisk</p>
          <div className={`mt-2 flex items-center gap-2 text-base font-semibold ${rootBadge.tone}`}>
            <RootIcon className="h-5 w-5 shrink-0" />
            <span className="truncate">{rootBadge.label}</span>
          </div>
          <p className="mt-2 truncate font-mono text-xs text-slate-400">
            su: {device.suPath}
          </p>
        </div>

        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-5">
          <p className="text-xs font-medium text-slate-400">Placa y MCU</p>
          <p className="mt-2 font-mono text-xl font-semibold text-slate-100">
            {device.mcuPrefix}
          </p>
          <p className="mt-2 truncate font-mono text-xs text-slate-400">
            {device.mcuVersion}
          </p>
        </div>

        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-5">
          <p className="text-xs font-medium text-slate-400">SELinux y Montaje /system</p>
          <p className="mt-2 font-mono text-xl font-semibold text-slate-100">
            {device.selinuxMode}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Sistema:{' '}
            <span className="font-mono text-slate-200">
              {device.systemMountMode === 'rw'
                ? 'RW (Escritura)'
                : device.systemMountMode === 'ro'
                  ? 'RO (Solo lectura)'
                  : 'Sin lectura'}
            </span>
          </p>
        </div>
      </section>

      {/* Two-column workspace: Detailed Specs & Offline Import/ADB Terminal */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-6">
          <div className="flex items-center justify-between gap-4 border-b border-[#242B36] pb-4">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Ficha técnica de la unidad
            </h2>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {device.lastScannedAt ? `Lectura ${device.lastScannedAt}` : 'Sin escaneo reciente'}
            </span>
          </div>

          <dl className="mt-4 divide-y divide-[#1D232D] text-sm">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-400">Modelo / Unidad</dt>
              <dd className="truncate font-mono text-xs text-slate-100">{device.deviceName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-400">Plataforma SoC</dt>
              <dd className="truncate font-mono text-xs text-slate-100">{device.socPlatform}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-400">Compilación (Build ID)</dt>
              <dd className="truncate font-mono text-xs text-slate-100">{device.buildId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-400">ADB TCP/IP (Puerto)</dt>
              <dd className="font-mono text-xs tabular-nums text-slate-100">{device.adbTcpPort}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-400">Serial / Canal</dt>
              <dd className="truncate font-mono text-xs text-slate-100">{device.serial}</dd>
            </div>
          </dl>

          {device.partitions.length > 0 && (
            <div className="mt-5 border-t border-[#242B36] pt-4">
              <h3 className="text-xs font-semibold text-slate-300">Particiones detectadas (/dev/block/by-name)</h3>
              <div className="mt-3 max-h-44 overflow-y-auto rounded-md border border-[#242B36] bg-[#090B0E]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#242B36] text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Partición</th>
                      <th className="px-3 py-2 font-medium">Nodo de bloque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181D25] font-mono">
                    {device.partitions.map((part) => (
                      <tr key={part.name} className="hover:bg-[#11151B]">
                        <td className="px-3 py-1.5 text-amber-300">{part.name}</td>
                        <td className="px-3 py-1.5 text-slate-300">{part.blockPath}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Paste output / ADB Wi-Fi Helper + Live Shell */}
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-6">
          <div className="flex items-center justify-between gap-4 border-b border-[#242B36] pb-4">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Importar salida o ejecutar sonda ADB
            </h2>
            <button
              type="button"
              onClick={() => handleCopy('probe', DIAGNOSTIC_SCRIPT_LINES.join(' && '))}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0"
            >
              {copiedKey === 'probe' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedKey === 'probe' ? 'Copiado' : 'Copiar comando único'}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="wifi-ip-input" className="block text-xs font-medium text-slate-400">
                IP de la radio en tu red Wi-Fi / Hotspot (para script .bat ADB inalámbrico):
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="wifi-ip-input"
                  type="text"
                  value={wifiIp}
                  onChange={(e) => setWifiIp(e.target.value)}
                  className="w-48 rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <code className="truncate font-mono text-xs text-slate-400">
                  adb connect {wifiIp}:5555
                </code>
              </div>
            </div>

            <div>
              <label htmlFor="paste-diag" className="block text-xs font-medium text-slate-400">
                ¿Ejecutaste <code className="text-slate-200">diagnostico_px5.sh</code> o <code className="text-slate-200">getprop</code> en la radio? Pega aquí el resultado:
              </label>
              <textarea
                id="paste-diag"
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'ANDROID_VERSION=9\nSDK_LEVEL=28\nMODEL=PX5\nMCU_PROP=MTCE_HCT_V3.45\nSU_PATH=/sbin/su\nMAGISK_VER=27.0:MAGISK'}
                className="mt-2 w-full rounded-md border border-[#242B36] bg-[#090B0E] p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (pasteText.trim()) {
                      onImportRawOutput(pasteText);
                    }
                  }}
                  disabled={!pasteText.trim()}
                  className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  Analizar salida y actualizar ficha
                </button>
              </div>
            </div>

            <div className="border-t border-[#242B36] pt-4">
              <label htmlFor="live-shell-cmd" className="block text-xs font-medium text-slate-400">
                Consola rápida de lectura (solo comandos de diagnóstico en conexión WebUSB):
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="live-shell-cmd"
                  type="text"
                  value={customCmd}
                  onChange={(e) => setCustomCmd(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!isWebUsb || !customCmd.trim()}
                  onClick={() => onRunCustomCommand(customCmd)}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-[#171C24] disabled:text-slate-500 whitespace-nowrap shrink-0"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  Ejecutar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MCU Identification Reference Table */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="border-b border-[#242B36] pb-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Referencia de prefijos MCU en radios Rockchip PX5 (MTCD / MTCE)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            La ROM Android es común para plataformas MTCD/MTCE, pero el archivo de MCU (<code className="text-slate-300">dmcu.img</code>) debe coincidir exactamente con tu fabricante.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#242B36] text-slate-400">
              <tr>
                <th className="py-2.5 pr-4 font-medium">Prefijo</th>
                <th className="py-2.5 pr-4 font-medium">Fabricante / Placa</th>
                <th className="py-2.5 pr-4 font-medium">Compatibilidad</th>
                <th className="py-2.5 font-medium">Observación técnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D232D]">
              {MTCD_MCU_PREFIXES.map((item) => (
                <tr key={item.prefix} className="hover:bg-[#171C24]/60">
                  <td className="py-3 pr-4 font-mono font-semibold text-amber-400">{item.prefix}</td>
                  <td className="py-3 pr-4 font-medium text-slate-200">{item.manufacturer}</td>
                  <td className="py-3 pr-4 font-mono text-slate-300">{item.compatibility}</td>
                  <td className="py-3 text-slate-400">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Session Command Log */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="flex items-center justify-between border-b border-[#242B36] pb-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Registro de operaciones de la sesión
          </h2>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {commandLogs.length} entradas
          </span>
        </div>

        {commandLogs.length === 0 ? (
          <p className="py-6 text-xs text-slate-500">
            Aún no se han ejecutado comandos en esta sesión. Conecta la radio por WebUSB o analiza una salida de diagnóstico.
          </p>
        ) : (
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {commandLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-[#242B36] bg-[#090B0E] p-3 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-400">
                  <span className="font-mono tabular-nums">{log.timestamp}</span>
                  <span
                    className={
                      log.status === 'error'
                        ? 'font-medium text-red-400'
                        : log.status === 'warn'
                          ? 'font-medium text-amber-400'
                          : 'font-medium text-emerald-400'
                    }
                  >
                    {log.source.toUpperCase()} · {log.status.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 font-mono text-amber-300">$ {log.command}</p>
                {log.output && (
                  <pre className="mt-1.5 max-h-28 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                    {log.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
