import { useState } from 'react';
import type { CommandLogEntry, DeviceSnapshot, ModuleId } from './types/px5';
import {
  EMPTY_DEVICE_SNAPSHOT,
  connectWebUsb,
  disconnectWebUsb,
  installLocalApkViaWebUsb,
  isWebUsbSupported,
  parseDiagnosticOutput,
  probeConnectedDevice,
  rebootDeviceMode,
  runShell,
} from './services/webAdbClient';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { MagiskTerminalView } from './components/views/MagiskTerminalView';
import { SystemFilesView } from './components/views/SystemFilesView';
import { RestoreDeveloperView } from './components/views/RestoreDeveloperView';
import { FactoryWipeView } from './components/views/FactoryWipeView';
import { RootRecoveryView } from './components/views/RootRecoveryView';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('diagnostics');
  const [device, setDevice] = useState<DeviceSnapshot>(EMPTY_DEVICE_SNAPSHOT);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [commandLogs, setCommandLogs] = useState<CommandLogEntry[]>([]);
  const webUsbSupported = isWebUsbSupported();

  const appendLog = (
    source: CommandLogEntry['source'],
    command: string,
    output: string,
    status: CommandLogEntry['status'] = 'ok'
  ) => {
    const entry: CommandLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      source,
      command,
      output,
      status,
    };
    setCommandLogs((prev) => [entry, ...prev].slice(0, 40));
  };

  const handleConnectWebUsb = async () => {
    setDevice((prev) => ({ ...prev, connectionMode: 'connecting' }));
    setStatusMessage('Iniciando conexión WebUSB...');
    try {
      const { snapshot, rawOutput } = await connectWebUsb((msg) => setStatusMessage(msg));
      setDevice(snapshot);
      setStatusMessage(`Conectado a ${snapshot.deviceName} (${snapshot.serial})`);
      appendLog('webusb', 'probeConnectedDevice()', rawOutput, 'ok');
    } catch (err) {
      setDevice((prev) => ({ ...prev, connectionMode: 'disconnected' }));
      const message = err instanceof Error ? err.message : 'Error de conexión WebUSB.';
      setStatusMessage(message);
      appendLog('webusb', 'connectWebUsb()', message, 'error');
    }
  };

  const handleDisconnectWebUsb = async () => {
    await disconnectWebUsb();
    setDevice(EMPTY_DEVICE_SNAPSHOT);
    setStatusMessage('Sesión WebUSB cerrada de forma segura.');
    appendLog('webusb', 'disconnectWebUsb()', 'Enlace USB cerrado.', 'ok');
  };

  const handleRescanWebUsb = async () => {
    setStatusMessage('Re-escaneando propiedades y estado Root de la radio PX5...');
    try {
      const { snapshot, rawOutput } = await probeConnectedDevice();
      setDevice(snapshot);
      setStatusMessage(`Lectura actualizada (${snapshot.lastScannedAt})`);
      appendLog('webusb', 'probeConnectedDevice()', rawOutput, 'ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo re-escanear el dispositivo.';
      setStatusMessage(message);
      appendLog('webusb', 'probeConnectedDevice()', message, 'error');
    }
  };

  const handleImportRawOutput = (rawText: string) => {
    const parsed = parseDiagnosticOutput(rawText);
    setDevice(parsed);
    setStatusMessage(`Informe analizado: Android ${parsed.androidVersion} · ${parsed.mcuPrefix}`);
    appendLog('parser', 'parseDiagnosticOutput()', `Android ${parsed.androidVersion} / Root: ${parsed.rootStatus}`, 'ok');
  };

  const handleRunCommand = async (cmd: string) => {
    try {
      const output = await runShell(cmd);
      appendLog('webusb', cmd, output || '(sin salida)', 'ok');
      setStatusMessage(`Comando ejecutado: ${cmd.slice(0, 56)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar comando ADB.';
      appendLog('webusb', cmd, message, 'error');
      setStatusMessage(message);
    }
  };

  const handleInstallApk = async (file: File, onProgress: (msg: string) => void) => {
    const output = await installLocalApkViaWebUsb(file, onProgress);
    appendLog('webusb', `pm install -r -d ${file.name}`, output || 'Success', 'ok');
    return output;
  };

  const handleReboot = async (mode: 'normal' | 'recovery' | 'bootloader') => {
    try {
      await rebootDeviceMode(mode);
      appendLog('webusb', `adb reboot ${mode}`, `Reinicio solicitado en modo ${mode}.`, 'warn');
      setStatusMessage(`La radio PX5 se está reiniciando en modo ${mode}...`);
      await disconnectWebUsb();
      setDevice(EMPTY_DEVICE_SNAPSHOT);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reiniciar la radio.';
      appendLog('webusb', `adb reboot ${mode}`, message, 'error');
      setStatusMessage(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090B0E] text-slate-100">
      <TopBar
        activeModule={activeModule}
        connectionMode={device.connectionMode}
        onConnectWebUsb={handleConnectWebUsb}
        onDisconnectWebUsb={handleDisconnectWebUsb}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          device={device}
        />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">
            {activeModule === 'diagnostics' && (
              <DiagnosticsView
                device={device}
                webUsbSupported={webUsbSupported}
                statusMessage={statusMessage}
                commandLogs={commandLogs}
                onConnectWebUsb={handleConnectWebUsb}
                onRescanWebUsb={handleRescanWebUsb}
                onImportRawOutput={handleImportRawOutput}
                onRunCustomCommand={handleRunCommand}
              />
            )}

            {activeModule === 'magisk-terminal' && (
              <MagiskTerminalView
                device={device}
                onInstallApk={handleInstallApk}
                onRunCommand={handleRunCommand}
              />
            )}

            {activeModule === 'system-files' && (
              <SystemFilesView device={device} onRunCommand={handleRunCommand} />
            )}

            {activeModule === 'restore-developer' && (
              <RestoreDeveloperView
                device={device}
                onReboot={handleReboot}
                onRunCommand={handleRunCommand}
              />
            )}

            {activeModule === 'factory-wipe' && (
              <FactoryWipeView device={device} onRunCommand={handleRunCommand} />
            )}

            {activeModule === 'root-recovery' && (
              <RootRecoveryView device={device} onRunCommand={handleRunCommand} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
