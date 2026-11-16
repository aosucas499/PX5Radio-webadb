import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface SafetyConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  consequences: string[];
  backupChecklistLabel: string;
  confirmPhrase: string;
  confirmActionLabel: string;
  dangerTone?: 'destructive' | 'caution';
  onCancel: () => void;
  onConfirm: () => void;
}

export function SafetyConfirmModal({
  open,
  title,
  description,
  consequences,
  backupChecklistLabel,
  confirmPhrase,
  confirmActionLabel,
  dangerTone = 'destructive',
  onCancel,
  onConfirm,
}: SafetyConfirmModalProps) {
  const [backupChecked, setBackupChecked] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState('');

  useEffect(() => {
    if (open) {
      setBackupChecked(false);
      setTypedPhrase('');
    }
  }, [open]);

  if (!open) return null;

  const phraseMatches = typedPhrase.trim().toUpperCase() === confirmPhrase.toUpperCase();
  const canProceed = backupChecked && phraseMatches;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-[#242B36] bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                dangerTone === 'destructive'
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              }`}
            >
              {dangerTone === 'destructive' ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 id="safety-modal-title" className="text-lg font-semibold text-slate-100">
                {title}
              </h2>
              <p className="text-xs text-slate-400">Protocolo de doble confirmación PX5 MTCD/MTCE</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-[#171C24] hover:text-slate-100"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">{description}</p>

        <ul className="mt-4 space-y-2 rounded-md border border-[#242B36] bg-[#090B0E] p-3.5 text-xs text-slate-300">
          {consequences.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-400" aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-[#242B36] bg-[#171C24] p-3 text-xs text-slate-200 transition-colors hover:border-slate-600">
          <input
            type="checkbox"
            checked={backupChecked}
            onChange={(e) => setBackupChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-500"
          />
          <span>{backupChecklistLabel}</span>
        </label>

        <div className="mt-4">
          <label htmlFor="safety-confirm-input" className="block text-xs font-medium text-slate-300">
            Escribe <code className="rounded bg-[#171C24] px-1.5 py-0.5 text-amber-300">{confirmPhrase}</code> para desbloquear la operación:
          </label>
          <input
            id="safety-confirm-input"
            type="text"
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            className="mt-2 w-full rounded-md border border-[#242B36] bg-[#090B0E] px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#242B36] bg-[#171C24] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-[#1E2530] whitespace-nowrap shrink-0"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canProceed}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              canProceed
                ? dangerTone === 'destructive'
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'cursor-not-allowed bg-[#171C24] text-slate-500 border border-[#242B36]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {confirmActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
