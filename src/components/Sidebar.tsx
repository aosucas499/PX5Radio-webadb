import {
  Activity,
  FolderLock,
  HardDriveDownload,
  RotateCcw,
  ShieldAlert,
  TerminalSquare,
} from 'lucide-react';
import type { DeviceSnapshot, ModuleId } from '../types/px5';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  device: DeviceSnapshot;
}

const NAV_ITEMS: Array<{ id: ModuleId; label: string; icon: typeof Activity }> = [
  { id: 'diagnostics', label: 'Diagnóstico PX5', icon: Activity },
  { id: 'magisk-terminal', label: 'Magisk y Terminal', icon: TerminalSquare },
  { id: 'system-files', label: 'Archivos del Sistema', icon: FolderLock },
  { id: 'restore-developer', label: 'Restore y Desarrollador', icon: RotateCcw },
  { id: 'factory-wipe', label: 'Borrado de Fábrica', icon: ShieldAlert },
  { id: 'root-recovery', label: 'Root y Recovery', icon: HardDriveDownload },
];

export function Sidebar({ activeModule, onSelectModule, device }: SidebarProps) {
  const rootLabel =
    device.rootStatus === 'rooted-magisk'
      ? `Magisk ${device.magiskVersion}`
      : device.rootStatus === 'rooted-su'
        ? 'Root su detectado'
        : device.rootStatus === 'unrooted'
          ? 'Sin Root'
          : 'Sin verificar';

  return (
    <>
      {/* Desktop fixed left sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#242B36] bg-[#0C0F14] lg:flex">
        <div className="p-4">
          <p className="px-3 pb-2 text-xs font-medium text-slate-500">Módulos de ingeniería</p>
          <nav className="space-y-1" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#171C24] text-amber-400 border border-[#2C3543]'
                      : 'text-slate-300 border border-transparent hover:bg-[#11151B] hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#242B36] p-4 text-xs text-slate-400">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Enlace</span>
              <span
                className={`font-medium ${
                  device.connectionMode === 'webusb'
                    ? 'text-emerald-400'
                    : device.connectionMode === 'imported'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {device.connectionMode === 'webusb'
                  ? 'WebUSB Activo'
                  : device.connectionMode === 'imported'
                    ? 'Informe Importado'
                    : 'Modo Scripts'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Android</span>
              <span className="font-mono tabular-nums text-slate-200">{device.androidVersion}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Root</span>
              <span className="truncate font-mono text-slate-200">{rootLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">MCU</span>
              <span className="truncate font-mono text-slate-200">{device.mcuPrefix}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile compact horizontal navigation */}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-[#242B36] bg-[#0C0F14] px-4 py-2 lg:hidden"
        aria-label="Navegación móvil"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#171C24] text-amber-400 border border-[#2C3543]'
                  : 'text-slate-300 hover:bg-[#11151B]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
