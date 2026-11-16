import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Keyboard,
  Power,
  RotateCcw,
  Settings2,
  Shield,
  Terminal,
} from 'lucide-react';
import { DEVELOPER_ACTIONS, MTCD_FACTORY_CODES } from '../../data/px5Knowledge';
import type { DeviceSnapshot } from '../../types/px5';
import { copyTextToClipboard, downloadShellScript, downloadWindowsBatch } from '../../utils/scriptDownload';

interface RestoreDeveloperViewProps {
  device: DeviceSnapshot;
  onReboot: (mode: 'normal' | 'recovery' | 'bootloader') => Promise<void>;
  onRunCommand: (cmd: string) => Promise<void>;
}

export function RestoreDeveloperView({
  device,
  onReboot,
  onRunCommand,
}: RestoreDeveloperViewProps) {
  const [androidBranch, setAndroidBranch] = useState<'8-9-10' | '6-7'>('8-9-10');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedDevActions, setSelectedDevActions] = useState<string[]>([
    'adb-tcp-5555',
    'stay-awake',
    'disable-usb-verifier',
  ]);

  const isWebUsb = device.connectionMode === 'webusb';

  const handleCopy = async (key: string, text: string) => {
    await copyTextToClipboard(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const toggleDevAction = (id: string) => {
    setSelectedDevActions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedCommands = DEVELOPER_ACTIONS.filter((a) => selectedDevActions.includes(a.id)).map(
    (a) => a.command
  );

  const handleDownloadDevBundle = (format: 'sh' | 'bat') => {
    if (selectedCommands.length === 0) return;
    if (format === 'sh') {
      downloadShellScript(
        'permisos_desarrollador_px5',
        selectedCommands,
        'Configuración avanzada de permisos de desarrollador PX5 MTCD/MTCE'
      );
    } else {
      downloadWindowsBatch(
        'permisos_desarrollador_px5',
        selectedCommands.map((cmd) => `adb shell "${cmd.replace(/"/g, '\\"')}"`),
        'Configuración ADB de permisos de desarrollador PX5'
      );
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 border-b border-[#242B36] pb-6 xl:flex-row xl:items-end">
        <div className="max-w-2xl space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Modo Restore (Recovery) y Permisos Avanzados de Desarrollador
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Procedimiento verificado para entrar al modo Restore en radios Rockchip PX5 (botón físico <code className="text-slate-200">RST</code>, teclado USB o ADB) y habilitar depuración ADB/permisos avanzados en placas MTCD/MTCE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!isWebUsb}
            onClick={() => onReboot('recovery')}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-[#171C24] disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar en Restore / Recovery
          </button>
          <button
            type="button"
            disabled={!isWebUsb}
            onClick={() => onReboot('bootloader')}
            className="inline-flex items-center gap-2 rounded-md border border-[#242B36] bg-[#11151B] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-[#171C24] disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Power className="h-4 w-4 text-slate-400" />
            Bootloader / Loader
          </button>
        </div>
      </section>

      {/* Hardware Restore Research & Interactive Schematic */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242B36] pb-4">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Secuencia física de entrada en Modo Restore (Botón RST)
            </h2>
            <div className="flex items-center gap-1 rounded-md border border-[#242B36] bg-[#090B0E] p-1">
              <button
                type="button"
                onClick={() => setAndroidBranch('8-9-10')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  androidBranch === '8-9-10'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Android 8 / 9 / 10
              </button>
              <button
                type="button"
                onClick={() => setAndroidBranch('6-7')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  androidBranch === '6-7'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Android 6 / 7
              </button>
            </div>
          </div>

          {androidBranch === '8-9-10' ? (
            <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">1. Localiza el orificio RST:</span> Usa un clip metálico o extractor SIM en el micro-pulsador <code className="text-slate-200">RST</code> del frontal (habitualmente junto al botón PWR o ranura SD/GPS).
              </li>
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">2. Primera pulsación (5–10 segundos):</span> Con la radio encendida, mantén pulsado <code className="text-slate-200">RST</code> hasta que la pantalla se apague y los LEDs de los botones laterales parpadeen.
              </li>
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">3. Soltar y segunda pulsación (5 segundos):</span> Suelta <code className="text-slate-200">RST</code> durante 1 segundo y vuelve a presionarlo otros 5 segundos (en algunas placas basta mantener 15–20 s continuos hasta ver el logo y el menú Recovery).
              </li>
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">4. Navegación sin táctil:</span> El Recovery stock PX5 desactiva el táctil. Usa pulsaciones cortas de <code className="text-slate-200">RST</code> o <code className="text-slate-200">PWR</code> para bajar de opción y pulsación larga (2–3 s) para confirmar, o conecta un teclado USB.
              </li>
            </ol>
          ) : (
            <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">1. Combinación PWR + RST (Android 6/7):</span> Mantén pulsado el botón físico <code className="text-slate-200">POWER</code> y presiona <code className="text-slate-200">RST</code> con un clip durante 3 segundos.
              </li>
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">2. Soltar RST manteniendo POWER:</span> Suelta primero el clip de <code className="text-slate-200">RST</code> y espera 3–5 segundos hasta que parpadeen las teclas físicas; suelta <code className="text-slate-200">POWER</code> al aparecer el logo de inicio.
              </li>
              <li className="rounded-md border border-[#242B36] bg-[#090B0E] p-3">
                <span className="font-semibold text-amber-400">3. Método alternativo por tarjeta SD:</span> Si colocas un archivo <code className="text-slate-200">update.zip</code> compatible en la raíz de una SD/USB formateada en FAT32, la radio ofrece automáticamente instalar/entrar en modo actualización.
              </li>
            </ol>
          )}
        </div>

        {/* Technical Front Panel Schematic + USB Keyboard / ADB Shortcuts */}
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-[#242B36] bg-[#11151B] p-6 xl:col-span-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Mapa de controles físicos MTCD/MTCE
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Puntos de servicio habituales en el marco frontal y cableado USB trasero.
            </p>

            {/* Clean automotive bezel SVG schematic */}
            <div className="mt-4 rounded-md border border-[#242B36] bg-[#090B0E] p-4">
              <svg viewBox="0 0 360 150" className="h-auto w-full" role="img" aria-label="Esquema de puntos RST, USB1 y tarjeta GPS en radio PX5">
                <rect x="8" y="10" width="344" height="130" rx="8" fill="#11151B" stroke="#2C3543" strokeWidth="1.5" />
                {/* Left control strip */}
                <rect x="16" y="18" width="44" height="114" rx="4" fill="#171C24" stroke="#242B36" />
                <circle cx="38" cy="36" r="7" fill="#090B0E" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="38" y="54" textAnchor="middle" fill="#CBD5E1" fontSize="8" fontFamily="monospace">PWR</text>

                <circle cx="38" cy="76" r="3" fill="#EF4444" />
                <text x="38" y="90" textAnchor="middle" fill="#FCA5A5" fontSize="8" fontFamily="monospace">RST</text>

                <rect x="26" y="102" width="24" height="10" rx="2" fill="#090B0E" stroke="#475569" />
                <text x="38" y="122" textAnchor="middle" fill="#94A3B8" fontSize="7" fontFamily="monospace">GPS/SD</text>

                {/* Main display */}
                <rect x="68" y="18" width="276" height="114" rx="4" fill="#090B0E" stroke="#242B36" />
                <text x="206" y="52" textAnchor="middle" fill="#F59E0B" fontSize="11" fontFamily="monospace" fontWeight="600">
                  Android Recovery (PX5 RK3368)
                </text>
                <text x="206" y="72" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                  1. Reboot system now
                </text>
                <text x="206" y="88" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                  2. Apply update from SD / USB
                </text>
                <text x="206" y="104" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                  3. Wipe data / factory reset
                </text>
              </svg>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-[#242B36] bg-[#090B0E] p-3.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-100">
              <Keyboard className="h-4 w-4 text-amber-400" />
              Atajos con teclado USB en Recovery
            </div>
            <p className="text-slate-400">
              Si la pantalla táctil no responde dentro del modo Restore, conecta un teclado USB:
            </p>
            <p className="font-mono text-amber-300">
              Flechas Arriba/Abajo · Enter (confirmar) · Alt+ImprPant+E
            </p>
            <button
              type="button"
              onClick={() =>
                downloadWindowsBatch(
                  'reiniciar_restore_px5',
                  ['adb reboot recovery'],
                  'Reiniciar radio PX5 en Modo Restore / Recovery'
                )
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1E2530]"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              Descargar script adb reboot recovery (.bat)
            </button>
          </div>
        </div>
      </section>

      {/* Secret Factory Settings Codes */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="border-b border-[#242B36] pb-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Códigos secretos de Ajustes de Fábrica MTCD / MTCE
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            En muchas radios PX5 las Opciones de Desarrollador de Android están ocultas; introduce estos códigos en <span className="text-slate-200">Ajustes &gt; Coche &gt; Ajustes de fábrica</span>.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#242B36] text-slate-400">
              <tr>
                <th className="py-2.5 pr-4 font-medium">Código</th>
                <th className="py-2.5 pr-4 font-medium">Dónde introducirlo</th>
                <th className="py-2.5 pr-4 font-medium">Efecto</th>
                <th className="py-2.5 pr-4 font-medium">Precaución</th>
                <th className="py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D232D]">
              {MTCD_FACTORY_CODES.map((row) => (
                <tr key={row.code} className="hover:bg-[#171C24]/60">
                  <td className="py-3 pr-4 font-mono font-semibold text-amber-400">{row.code}</td>
                  <td className="py-3 pr-4 text-slate-300">{row.target}</td>
                  <td className="py-3 pr-4 text-slate-200">{row.effect}</td>
                  <td className="py-3 pr-4 text-slate-400">{row.caution}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopy(row.code, row.code)}
                      className="inline-flex items-center gap-1 rounded border border-[#242B36] bg-[#090B0E] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-amber-300 whitespace-nowrap shrink-0"
                    >
                      {copiedCode === row.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedCode === row.code ? 'Copiado' : 'Copiar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Advanced Developer Permissions Configurator */}
      <section className="rounded-lg border border-[#242B36] bg-[#11151B] p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#242B36] pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-amber-400" />
              <h2 className="font-display text-base font-semibold text-slate-100">
                Configurador de Permisos Avanzados para Desarrolladores
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Selecciona los permisos y propiedades del sistema para aplicarlos por WebUSB o exportarlos como paquete de configuración.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isWebUsb || selectedCommands.length === 0}
              onClick={() => onRunCommand(selectedCommands.join(' && '))}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-[#171C24] disabled:text-slate-500 whitespace-nowrap shrink-0"
            >
              <Terminal className="h-3.5 w-3.5" />
              Aplicar seleccionados ({selectedCommands.length})
            </button>
            <button
              type="button"
              disabled={selectedCommands.length === 0}
              onClick={() => handleDownloadDevBundle('sh')}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              Exportar .sh
            </button>
            <button
              type="button"
              disabled={selectedCommands.length === 0}
              onClick={() => handleDownloadDevBundle('bat')}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#242B36] bg-[#171C24] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              Exportar .bat
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {DEVELOPER_ACTIONS.map((action) => {
            const checked = selectedDevActions.includes(action.id);
            return (
              <div
                key={action.id}
                className={`rounded-md border p-4 transition-colors ${
                  checked ? 'border-amber-500/40 bg-[#171C24]' : 'border-[#242B36] bg-[#090B0E]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDevAction(action.id)}
                      className="mt-0.5 h-4 w-4 accent-amber-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-100">{action.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{action.description}</p>
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={!isWebUsb}
                    onClick={() => onRunCommand(action.command)}
                    className="rounded border border-[#242B36] bg-[#11151B] px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-[#1E2530] disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    Ejecutar
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#242B36] pt-2.5 font-mono text-[11px] text-slate-400">
                  <span className="truncate">{action.command}</span>
                  <span className="inline-flex items-center gap-1 shrink-0 text-slate-300">
                    <Shield className="h-3 w-3 text-amber-400" />
                    {action.requiresRoot ? 'Requiere Root' : 'ADB estándar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
