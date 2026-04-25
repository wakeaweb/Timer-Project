import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const CURRENCIES = ['₺', '$', '€', '£'];

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings({ ...form, defaultHourlyRate: parseFloat(form.defaultHourlyRate) || 0 });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      <div className="mt-4 mb-8">
        <h1 className="font-headline text-[2rem] font-bold text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Manage your preferences</p>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Display Name</label>
          <input id="input-username" type="text" value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Default Hourly Rate</label>
          <input id="input-default-rate" type="number" min="0" step="0.01" value={form.defaultHourlyRate} onChange={e => setForm({ ...form, defaultHourlyRate: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1.5">Currency</label>
          <div className="flex gap-2">
            {CURRENCIES.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, currency: c })} className={`w-12 h-12 rounded-xl text-lg font-semibold transition-all ${form.currency === c ? 'bg-primary text-on-primary shadow-card' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
          {saved && <span className="text-sm text-primary font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Saved!</span>}
          {!saved && <span />}
          <button id="btn-save-settings" onClick={handleSave} className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-sm font-semibold hover:bg-primary/90 transition-all shadow-card">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
