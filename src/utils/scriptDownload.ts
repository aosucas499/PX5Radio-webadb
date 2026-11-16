export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadShellScript(filename: string, lines: string[], headerTitle: string): void {
  const normalizedName = filename.endsWith('.sh') ? filename : `${filename}.sh`;
  const script = [
    '#!/system/bin/sh',
    `# ${headerTitle}`,
    '# Generado por PX5 Console MTCD/MTCE',
    '',
    ...lines,
    '',
  ].join('\n');
  downloadTextFile(normalizedName, script, 'application/x-sh;charset=utf-8');
}

export function downloadWindowsBatch(filename: string, adbCommands: string[], headerTitle: string): void {
  const normalizedName = filename.endsWith('.bat') ? filename : `${filename}.bat`;
  const batch = [
    '@echo off',
    `REM ${headerTitle}`,
    'REM Generado por PX5 Console MTCD/MTCE',
    'echo === Verificando conexion ADB ===',
    'adb devices',
    '',
    ...adbCommands,
    '',
    'echo.',
    'echo Operacion finalizada.',
    'pause',
  ].join('\r\n');
  downloadTextFile(normalizedName, batch, 'application/bat;charset=utf-8');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
