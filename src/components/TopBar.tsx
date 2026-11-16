import { Usb, Unplug } from 'lucide-react';
import type { ConnectionMode, ModuleId } from '../types/px5';

interface TopBarProps {
  activeModule: ModuleId;
  connectionMode: ConnectionMode;
  onConnectWebUsb: () => void;
  onDisconnectWebUsb: () => void;
}

const MODULE_BREADCRUMBS: Record<ModuleId, string> = {
  diagnostics: 'Diagnóstico Android, Root y MCU',
  'magisk-terminal': 'Magisk y Terminal Android',
  'system-files': 'Gestor Seguro de Archivos del Sistema',
  'restore-developer': 'Modo Restore y Permisos de Desarrollador',
  'factory-wipe': 'Restablecimiento de Fábrica y Borrado Total',
  'root-recovery': 'Root, Recovery y Buscador MTCD/MTCE',
};

export function TopBar({
  activeModule,
  connectionMode,
  onConnectWebUsb,
  onDisconnectWebUsb,
}: TopBarProps) {
  const isConnected = connectionMode === 'webusb';
  const isConnecting = connectionMode === 'connecting';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-[#242B36] bg-[#090B0E]/95 px-6 backdrop-blur-sm">
      <div className="flex items-center shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          PX5 Console
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-slate-400 md:flex">
        <span className="whitespace-nowrap shrink-0">Rockchip PX5 MTCD/MTCE</span>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-slate-200">{MODULE_BREADCRUMBS[activeModule]}</span>
      </div>

      <div className="flex items-center shrink-0">
        {isConnected ? (
          <button
            type="button"
            onClick={onDisconnectWebUsb}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 whitespace-nowrap shrink-0"
          >
            <Unplug className="h-4 w-4" />
            Desconectar WebUSB
          </button>
        ) : (
          <button
            type="button"
            disabled={isConnecting}
            onClick={onConnectWebUsb}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Usb className="h-4 w-4" />
            {isConnecting ? 'Conectando...' : 'Conectar Radio USB'}
          </button>
        )}
      </div>
    </header>
  );
}
