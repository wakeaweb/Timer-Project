import React, { useEffect, useState } from 'react';

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

// "336666" -> "336.666"  ;  "336666,5" -> "336.666,5"
function formatThousands(raw) {
  if (!raw) return '';
  const [intPart, decPart] = raw.split(',');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${withDots},${decPart}` : withDots;
}

export default function PaymentModal({
  project,
  totalBilled = 0,
  totalPaid = 0,
  payments = [],
  onClose,
  onSubmit,
  onDelete,
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const currency = project?.currency || '₺';
  const remaining = Math.max(totalBilled - totalPaid, 0);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Body scroll kilit
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // amount state'i ham string (sadece rakam ve opsiyonel virgül) — ekranda formatla göster
  const handleAmountChange = (e) => {
    let v = e.target.value.replace(/\./g, '');           // önce thousand-sep noktaları kaldır
    v = v.replace(/[^\d,]/g, '');                         // rakam ve virgül dışını at
    const firstComma = v.indexOf(',');
    if (firstComma !== -1) {
      v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, '');
    }
    setAmount(v);
  };

  const numericAmount = Number((amount || '').replace(',', '.'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) return;
    onSubmit?.({ amount: numericAmount, note: note.trim() || null });
    setAmount('');
    setNote('');
  };

  const sortedPayments = [...payments].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        {/* Header */}
        <div
          className="flex items-start gap-3 p-5 border-b border-outline-variant/20"
          style={{ borderTopColor: project?.color, borderTopWidth: 3 }}
        >
          <div className="flex-1 min-w-0">
            <h2 className="font-headline text-sm sm:text-base font-bold text-on-surface leading-tight break-words">{project?.name}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Record a Payment</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Billed</p>
              <p className="text-[13px] font-bold text-on-surface mt-1 font-mono-tabular">
                {currency}{Math.round(totalBilled).toLocaleString()}
              </p>
            </div>
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Paid</p>
              <p className="text-[13px] font-bold text-on-surface mt-1 font-mono-tabular">
                {currency}{Math.round(totalPaid).toLocaleString()}
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Remaining</p>
              <p className="text-base font-bold text-primary mt-1 font-mono-tabular">
                {currency}{Math.round(remaining).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Payment Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-on-surface-variant pointer-events-none">
                  {currency}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatThousands(amount)}
                  onChange={handleAmountChange}
                  placeholder="0"
                  required
                  autoFocus
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-medium font-mono-tabular focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Bank transfer, advance, etc."
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!numericAmount || numericAmount <= 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              Submit Payment
            </button>
          </form>

          {/* Payment History */}
          {sortedPayments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Payment History
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sortedPayments.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface font-mono-tabular">
                        {p.currency}{Math.round(p.amount).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {fmtDate(p.paidAt)}
                        {p.note && <span> · {p.note}</span>}
                      </p>
                    </div>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(p.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors shrink-0"
                        title="Delete payment"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
