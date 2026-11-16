import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  PackagePlus,
  TerminalSquare,
  Upload,
} from 'lucide-react';
import type { DeviceSnapshot } from '../../types/px5';
import { copyTextToClipboard, downloadWindowsBatch } from '../../utils/scriptDownload';

interface MagiskTerminalViewProps {
  device: DeviceSnapshot;
  onInstallApk: (file: File, onProgress: (msg: string) => void) => Promise<string>;
  onRunCommand: (cmd: string) => Promise<void>;
}

export function MagiskTerminalView({
  device,
  onInstallApk,
  onRunCommand,
}: MagiskTerminalViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [installProgress, setInstallProgress] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apkPathForBatch, setApkPathForBatch] = useState('Magisk-v27.0.apk');

  const isWebUsb = device.connectionMode === 'webusb';

  const handleCopy = async (id: string, text: string) => {
    await copyTextToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleInstallSelected = async () => {
    if (!selectedFile) return;
    setInstallError(null);
    setInstallProgress('Iniciando transferencia APK...');
    try {
      const output = await onInstallApk(selectedFile, setInstallProgress);
      setInstallProgress(`Resultado: ${output || 'Success'}`);
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : 'Error al instalar APK por WebUSB.');
      setInstallProgress(null);
    }
  };

  const handleDownloadInstallBatch = () => {
    downloadWindowsBatch(
      'instalar_magisk_y_terminal',
      [
        `echo Instalando ${apkPathForBatch}...`,
        `adb install -r -d "${apkPathForBatch}"`,
        'echo Verificando paquetes instalados...',
        'adb shell pm list packages | findstr /I "magisk termux jackpal"',
      ],
      'Instalador ADB para Magisk y Android Terminal en PX5'
    );
  };

  const quickApps = [
    {
      id: 'magisk',
      name: 'Magisk Manager (Oficial)',
      packageId: 'com.topjohnwu.magisk',
      compatibility: 'Android 6.0 – 10+ (PX5 ARM64)',
      url: 'https://github.com/topjohnwu/Magisk/releases',
      description:
        'Gestor oficial de root systemless, módulos MagiskHide/Zygisk y parcheo de boot.img / recovery.img para Rockchip PX5.',
      launchCmd: 'monkey -p com.topjohnwu.magisk -c android.intent.category.LAUNCHER 1',
    },
    {
      id: 'termux',
      name: 'Termux (Terminal Android moderna)',
      packageId: 'com.termux',
      compatibility: 'Android 7.0 – 10+ (Descarga APK universal o arm64-v8a)',
      url: 'https://github.com/termux/termux-app/releases',
      description:
        'Terminal Linux completa con bash, utilidades coreutils y acceso directo a su, getprop, dd y scripts .sh en la radio.',
      launchCmd: 'monkey -p com.termux -c android.intent.category.LAUNCHER 1',
    },
    {
      id: 'jackpal',
      name: 'Terminal Emulator for Android',
      packageId: 'jackpal.androidterm',
      compatibility: 'Android 6.0 / 8.0 / 9.0 (Ligera y universal)',
      url: 'https://f-droid.org/packages/jackpal.androidterm/',
      description:
        'Alternativa ultraligera recomendada si tu radio PX5 ejecuta Android 6 Marshmallow o dispone de poca memoria RAM.',
      launchCmd: 'monkey -p jackpal.androidterm -c android.intent.category.LAUNCHER 1',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="border-b border-[#242B36] pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Magisk y Terminal Android para PX5
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Accede a los repositorios oficiales verificados para descargar los APK de Magisk y Terminal Android, e instálalos directamente en tu unidad PX5 mediante WebUSB o script ADB.
        </p>
      </section>

      {/* Official Links & Direct Actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {quickApps.map((app) => (
          <div
            key={app.id}
            className="flex flex-col justify-between rounded-lg border border-[#242B36] bg-[#11151B] p-5"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-base font-semibold text-slate-100">{app.name}</h2>
                <TerminalSquare className="h-4 w-4 shrink-0 text-amber-400" />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-400">
                {app.packageId} · {app.compatibility}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">{app.description}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#242B36] pt-4">
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Descargar APK oficial
              </a>
              <button
                type="button"
                disabled={!isWebUsb}
                onClick={() => onRunCommand(app.launchCmd)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                Abrir en radio
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* WebUSB Sideloader + Batch Generator */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-7">
          <div className="flex items-center gap-2 border-b border-[#242B36] pb-4">
            <PackagePlus className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-base font-semibold text-slate-100">
              Instalador directo de APK por WebUSB
            </h2>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Selecciona el archivo <code className="text-slate-200">.apk</code> de Magisk o Termux descargado en tu equipo para transferirlo a <code className="text-slate-200">/data/local/tmp</code> y ejecutar <code className="text-slate-200">pm install -r -d</code> en la radio.
          </p>

          <div className="mt-4 rounded-md border border-dashed border-[#2C3543] bg-[#090B0E] p-5">
            <label
              htmlFor="apk-upload-input"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
            >
              <Upload className="h-6 w-6 text-amber-400" />
              <span className="text-sm font-medium text-slate-200">
                {selectedFile ? selectedFile.name : 'Seleccionar archivo .apk local (Magisk / Termux / Terminal)'}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB listos para transferir`
                  : 'Formato admitido: .apk'}
              </span>
              <input
                id="apk-upload-input"
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  if (file) setApkPathForBatch(file.name);
                  setInstallProgress(null);
                  setInstallError(null);
                }}
                className="sr-only"
              />
            </label>
          </div>

          {installProgress && (
            <p className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-300">
              {installProgress}
            </p>
          )}
          {installError && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {installError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!isWebUsb || !selectedFile}
              onClick={handleInstallSelected}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-[#171C24] disabled:text-slate-500 whitespace-nowrap shrink-0"
            >
              <PackagePlus className="h-4 w-4" />
              Instalar APK vía WebUSB
            </button>

            <button
              type="button"
              disabled={!isWebUsb}
              onClick={() =>
                onRunCommand('pm list packages | grep -E "magisk|termux|androidterm" || echo "Ninguno instalado"')
              }
              className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              Comprobar paquetes instalados
            </button>
          </div>
        </div>

        {/* Offline / ADB Wi-Fi Install Script */}
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Instalación por ADB desde PC o Terminal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Si instalas por Wi-Fi (<code className="text-slate-300">adb connect IP:5555</code>) o USB en Windows, utiliza el comando generado o descarga el archivo <code className="text-slate-300">.bat</code>.
          </p>

          <div className="mt-4">
            <label htmlFor="apk-name-batch" className="block text-xs font-medium text-slate-400">
              Nombre del archivo APK local:
            </label>
            <input
              id="apk-name-batch"
              type="text"
              value={apkPathForBatch}
              onChange={(e) => setApkPathForBatch(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 rounded-md border border-[#242B36] bg-[#090B0E] p-3 font-mono text-xs text-slate-300">
            <p className="text-amber-300">adb install -r -d &quot;{apkPathForBatch}&quot;</p>
            <p className="mt-1 text-slate-400">adb shell pm grant com.termux android.permission.WRITE_SECURE_SETTINGS</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCopy('adb-install', `adb install -r -d "${apkPathForBatch}"`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
            >
              {copiedId === 'adb-install' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === 'adb-install' ? 'Copiado' : 'Copiar comando'}
            </button>
            <button
              type="button"
              onClick={handleDownloadInstallBatch}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              Descargar .bat
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
