import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
const isSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

/**
 * Aktif timer varken sekmeden ayrılınca otomatik Document PiP açar,
 * sekmeye dönülünce kapatır. Kullanıcı PiP'i manuel kapatırsa, aynı
 * "hidden" oturumunda tekrar açılmaz; sekmeye dönüp tekrar ayrılınca
 * yeniden açılır.
 *
 * Sadece web app — native (Capacitor) ortamlarda devre dışıdır.
 */
export default function AutoPipController() {
  const { activeSession, projects, pauseTimer, resumeTimer, stopTimer } = useApp();
  const pipWindowRef = useRef(null);
  const intervalRef = useRef(null);
  const manuallyClosedRef = useRef(false);
  // Tüm callback'lere stale closure olmadan erişebilmek için ref'te tut
  const stateRef = useRef({ activeSession, projects, pauseTimer, resumeTimer, stopTimer });

  useEffect(() => {
    stateRef.current = { activeSession, projects, pauseTimer, resumeTimer, stopTimer };
  }, [activeSession, projects, pauseTimer, resumeTimer, stopTimer]);

  useEffect(() => {
    if (isNative || !isSupported) return;

    const closePip = () => {
      if (pipWindowRef.current) {
        try { pipWindowRef.current.close(); } catch {}
        pipWindowRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const openPip = async () => {
      const { activeSession: session, projects: projs } = stateRef.current;
      if (!session || pipWindowRef.current) return;
      const project = projs.find(p => p.id === session.projectId);
      if (!project) return;

      let pipWindow;
      try {
        pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 320,
          height: 120,
        });
      } catch (err) {
        console.warn('[AutoPiP] requestWindow failed:', err);
        return;
      }
      pipWindowRef.current = pipWindow;

      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex; flex-direction: column; height: 100vh;
          background: linear-gradient(135deg, ${project.color}, ${project.color}dd);
          color: white; font-family: 'Inter', system-ui, sans-serif; overflow: hidden;
        }
        .name { padding: 12px 16px 4px; font-size: 13px; font-weight: 600; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .timer { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
        .controls { display: flex; gap: 8px; padding: 8px 16px 12px; justify-content: center; }
        .btn { border: none; background: rgba(255,255,255,0.2); color: white; padding: 6px 16px; border-radius: 999px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; display: flex; align-items: center; gap: 4px; }
        .btn:hover { background: rgba(255,255,255,0.35); }
        .btn.stop { background: rgba(255,60,60,0.5); }
        .btn.stop:hover { background: rgba(255,60,60,0.7); }
      `;
      pipWindow.document.head.appendChild(style);

      const nameEl = pipWindow.document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = project.name;
      pipWindow.document.body.appendChild(nameEl);

      const timerEl = pipWindow.document.createElement('div');
      timerEl.className = 'timer';
      pipWindow.document.body.appendChild(timerEl);

      const controlsEl = pipWindow.document.createElement('div');
      controlsEl.className = 'controls';

      const toggleBtn = pipWindow.document.createElement('button');
      toggleBtn.className = 'btn';
      const stopBtn = pipWindow.document.createElement('button');
      stopBtn.className = 'btn stop';
      stopBtn.textContent = '⏹ Stop';

      const refreshToggleLabel = () => {
        const s = stateRef.current.activeSession;
        toggleBtn.textContent = s?.isPaused ? '▶ Resume' : '⏸ Pause';
      };
      refreshToggleLabel();

      toggleBtn.addEventListener('click', () => {
        const s = stateRef.current.activeSession;
        if (s?.isPaused) stateRef.current.resumeTimer();
        else stateRef.current.pauseTimer();
        setTimeout(refreshToggleLabel, 100);
      });
      stopBtn.addEventListener('click', () => {
        stateRef.current.stopTimer();
        try { pipWindow.close(); } catch {}
      });

      controlsEl.appendChild(toggleBtn);
      controlsEl.appendChild(stopBtn);
      pipWindow.document.body.appendChild(controlsEl);

      const updateTimer = () => {
        const s = stateRef.current.activeSession;
        if (!s) { timerEl.textContent = '00:00:00'; return; }
        let currentMs;
        if (!s.isPaused && s.startTime) {
          const lastResumedAt = s.lastResumedAt || new Date(s.startTime).getTime();
          currentMs = (s.accumulatedMs || 0) + (Date.now() - lastResumedAt);
        } else {
          currentMs = s.accumulatedMs || 0;
        }
        const total = Math.floor(currentMs / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const sec = total % 60;
        timerEl.textContent =
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        refreshToggleLabel();
      };
      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      // PiP penceresi kapanırsa (kullanıcı X'e basarsa veya programatik kapanırsa)
      pipWindow.addEventListener('pagehide', () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Eğer ana sekme hâlâ gizliyse → kullanıcı manuel kapatmıştır
        if (document.visibilityState === 'hidden') {
          manuallyClosedRef.current = true;
        }
        pipWindowRef.current = null;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (stateRef.current.activeSession && !manuallyClosedRef.current) {
          openPip();
        }
      } else {
        // Sekmeye geri dönüldü → manuel-kapat bayrağını sıfırla, PiP'i kapat
        manuallyClosedRef.current = false;
        closePip();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      closePip();
    };
  }, []);

  // Aktif session bittiğinde (örn. başka sekmedeyken stop tıklandı)
  // PiP penceresi varsa kapat.
  useEffect(() => {
    if (!activeSession && pipWindowRef.current) {
      try { pipWindowRef.current.close(); } catch {}
      pipWindowRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [activeSession]);

  return null;
}
