import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { projectsApi, sessionsApi, tasksApi, settingsApi, paymentsApi } from '../services/api';
import {
  getProjects, saveProjects, 
  getSessions, saveSessions, 
  getActiveSession, setActiveSession, clearActiveSession,
  getTasks, saveTasks,
  getPayments, savePayments,
  getSettings, saveSettings as storageSaveSettings,
  generateId,
} from '../utils/storage';
import { LocalNotifications } from '@capacitor/local-notifications';

const AppContext = createContext(null);

const initialState = {
  isInitialized: false,
  projects: [],
  sessions: [],
  tasks: [],
  payments: [],
  activeSession: null,
  settings: { userName: 'Kullanıcı', defaultHourlyRate: 0, currency: '₺' },
  isSyncing: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, isInitialized: true };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        sessions: state.sessions.filter(s => s.projectId !== action.payload),
        payments: state.payments.filter(p => p.projectId !== action.payload),
        activeSession:
          state.activeSession?.projectId === action.payload
            ? null
            : state.activeSession,
      };
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'START_TIMER': {
      const newSession = action.payload.session;
      return {
        ...state,
        sessions: [...state.sessions, newSession],
        activeSession: {
          projectId: action.payload.projectId,
          sessionId: newSession.id,
          startTime: newSession.startTime,
          isPaused: false,
          accumulatedMs: 0,
          pausedAt: null,
        },
      };
    }
    case 'PAUSE_TIMER': {
      if (!state.activeSession || state.activeSession.isPaused) return state;
      const now = Date.now();
      const sessionStart = new Date(state.activeSession.startTime).getTime();
      const lastResumedAt = state.activeSession.lastResumedAt || sessionStart;
      const segmentMs = now - lastResumedAt;
      
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          isPaused: true,
          pausedAt: now,
          accumulatedMs: state.activeSession.accumulatedMs + segmentMs,
        },
      };
    }
    case 'RESUME_TIMER': {
      if (!state.activeSession || !state.activeSession.isPaused) return state;
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          isPaused: false,
          pausedAt: null,
          lastResumedAt: Date.now(),
        },
      };
    }
    case 'STOP_TIMER': {
      if (!state.activeSession) return state;
      const now = Date.now();
      let finalDuration = state.activeSession.accumulatedMs;
      
      if (!state.activeSession.isPaused) {
        const lastResumedAt = state.activeSession.lastResumedAt || new Date(state.activeSession.startTime).getTime();
        finalDuration += (now - lastResumedAt);
      }
      
      const endTime = new Date(now).toISOString();
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === state.activeSession.sessionId
            ? { ...s, endTime, duration: finalDuration }
            : s
        ),
        activeSession: null,
      };
    }
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.payload),
        activeSession:
          state.activeSession?.sessionId === action.payload
            ? null
            : state.activeSession,
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
      };
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSession: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // ─── Realtime: Başka cihazdan gelen değişiklikler ──────────────
    case 'REMOTE_UPSERT_PROJECT': {
      const exists = state.projects.some(p => p.id === action.payload.id);
      return {
        ...state,
        projects: exists
          ? state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p)
          : [...state.projects, action.payload],
      };
    }
    case 'REMOTE_DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        sessions: state.sessions.filter(s => s.projectId !== action.payload),
        payments: state.payments.filter(p => p.projectId !== action.payload),
      };
    case 'REMOTE_UPSERT_SESSION': {
      const local = state.sessions.find(s => s.id === action.payload.id);
      // Guard: stale echo'nun local stop state'ini ezmesini engelle
      if (local && local.endTime && !action.payload.endTime) {
        return state;
      }
      return {
        ...state,
        sessions: local
          ? state.sessions.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s)
          : [...state.sessions, action.payload],
      };
    }
    case 'REMOTE_DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) };
    case 'REMOTE_UPSERT_TASK': {
      const exists = state.tasks.some(t => t.id === action.payload.id);
      return {
        ...state,
        tasks: exists
          ? state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t)
          : [...state.tasks, action.payload],
      };
    }
    case 'REMOTE_DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };

    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };
    case 'REMOTE_UPSERT_PAYMENT': {
      const exists = state.payments.some(p => p.id === action.payload.id);
      return {
        ...state,
        payments: exists
          ? state.payments.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p)
          : [...state.payments, action.payload],
      };
    }
    case 'REMOTE_DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const syncTimeoutRef = useRef(null);
  // Yakın zamanda silinen ID'ler — uçuştaki upsert'in
  // kaydı geri canlandırmasını engellemek için kullanılır.
  const recentlyDeletedRef = useRef(new Map()); // id -> timeoutId
  // Supabase'e en son sync edilen veri snapshot'ı — diff-based sync için.
  // Bu sayede her state değişiminde tüm tabloyu değil, sadece değişen satırları gönderiyoruz.
  const prevSyncedRef = useRef({
    projects: [],
    sessions: [],
    tasks: [],
    payments: [],
    settings: null,
  });

  const markDeleted = useCallback((id) => {
    if (!id) return;
    const existing = recentlyDeletedRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => recentlyDeletedRef.current.delete(id), 8000);
    recentlyDeletedRef.current.set(id, t);
  }, []);

  // Supabase'den tüm veriyi çek + state'i replace et + sync snapshot'ı tazele.
  // Hem ilk yüklemede hem de manuel "yenile" butonunda çağrılır.
  const refreshFromSupabase = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const localActive = getActiveSession();
      const localSettings = getSettings();

      const [sbProjects, sbSessions, sbTasks, sbPayments, sbSettings] = await Promise.all([
        projectsApi.fetchAll(user.id),
        sessionsApi.fetchAll(user.id),
        tasksApi.fetchAll(user.id),
        paymentsApi.fetchAll(user.id).catch(() => []),
        settingsApi.fetch(user.id),
      ]);

      const activeId = localActive?.sessionId;
      const orphanSessions = sbSessions.filter(s => !s.endTime && s.id !== activeId);
      const healedSessions = sbSessions.map(s => {
        if (s.endTime || s.id === activeId) return s;
        const startMs = new Date(s.startTime).getTime();
        const dur = s.duration || 0;
        return { ...s, endTime: new Date(startMs + dur).toISOString(), duration: dur };
      });

      const nextSettings = sbSettings || localSettings;

      dispatch({
        type: 'INIT',
        payload: {
          projects: sbProjects,
          sessions: healedSessions,
          tasks: sbTasks,
          payments: sbPayments,
          settings: nextSettings,
          activeSession: localActive,
        },
      });

      // Sync snapshot'ı server verisine eşitle — bir sonraki debounced sync diff alırken
      // bütün tabloyu yeniden upsert etmesin.
      prevSyncedRef.current = {
        projects: sbProjects,
        sessions: healedSessions,
        tasks: sbTasks,
        payments: sbPayments,
        settings: nextSettings,
      };

      if (orphanSessions.length > 0) {
        const fixed = orphanSessions.map(s => {
          const startMs = new Date(s.startTime).getTime();
          const dur = s.duration || 0;
          return { ...s, endTime: new Date(startMs + dur).toISOString(), duration: dur };
        });
        try {
          await sessionsApi.upsert(fixed, user.id);
          console.log(`Auto-healed ${fixed.length} orphan session(s)`);
        } catch (e) { console.error('Orphan heal error:', e); }
      }
    } catch (error) {
      console.error('Supabase fetch error:', error);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [isAuthenticated, user]);

  // Uygulama başladığında ve kullanıcı değiştiğinde verileri yükle
  useEffect(() => {
    const initData = async () => {
      // 1. Önce localStorage'dan yükle (hızlı başlangıç / offline)
      const localProjects = getProjects();
      const localSessions = getSessions();
      const localTasks = getTasks();
      const localPayments = getPayments();
      const localSettings = getSettings();
      const localActive = getActiveSession();

      dispatch({
        type: 'INIT',
        payload: {
          projects: localProjects,
          sessions: localSessions,
          tasks: localTasks,
          payments: localPayments,
          activeSession: localActive,
          settings: localSettings,
        },
      });

      // local INIT sonrası snapshot'ı local'e eşitle — auth yoksa diff sync devre dışı kalır.
      prevSyncedRef.current = {
        projects: localProjects,
        sessions: localSessions,
        tasks: localTasks,
        payments: localPayments,
        settings: localSettings,
      };

      // 2. Online ise Supabase'den tazele (server-wins)
      if (isAuthenticated && user) {
        await refreshFromSupabase();
      }
    };

    initData();
  }, [isAuthenticated, user, refreshFromSupabase]);

  // Bildirim izinlerini al
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        await LocalNotifications.requestPermissions();
      } catch (error) {
        console.warn('Local Notifications permission denied/error:', error);
      }
    };
    requestPermissions();
  }, []);


  // State değiştikçe localStorage'a ve Supabase'e yaz (offline-first)
  useEffect(() => {
    if (state.isInitialized) {
      // Her zaman localStorage'a yaz (offline fallback)
      saveProjects(state.projects);
      saveSessions(state.sessions);
      saveTasks(state.tasks);
      savePayments(state.payments);
      storageSaveSettings(state.settings);
      if (state.activeSession) setActiveSession(state.activeSession);
      else clearActiveSession();

      // Supabase'e debounced + diff-based sync — sadece değişen satırları gönder.
      if (isAuthenticated && user) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
          dispatch({ type: 'SET_SYNCING', payload: true });
          try {
            const notDeleted = (item) => !recentlyDeletedRef.current.has(item.id);
            const snap = prevSyncedRef.current;

            // Bir kind için (kind: 'projects'|'sessions'|'tasks'|'payments') diff hesapla.
            const diff = (key) => {
              const current = state[key].filter(notDeleted);
              const prev = snap[key] || [];
              const prevById = new Map(prev.map(r => [r.id, r]));
              const currentIds = new Set(current.map(r => r.id));
              // upsert: yeni veya JSON shape'i değişmiş satırlar
              const changed = current.filter(r => {
                const p = prevById.get(r.id);
                return !p || JSON.stringify(p) !== JSON.stringify(r);
              });
              // delete: snapshot'ta vardı, şu an yok ve recentlyDeleted'a düşmüş
              const removedIds = prev
                .map(r => r.id)
                .filter(id => !currentIds.has(id));
              return { changed, removedIds, current };
            };

            const projectsDiff = diff('projects');
            const sessionsDiff = diff('sessions');
            const tasksDiff = diff('tasks');
            const paymentsDiff = diff('payments');

            const settingsChanged =
              JSON.stringify(snap.settings) !== JSON.stringify(state.settings);

            const ops = [];
            if (projectsDiff.changed.length) ops.push(projectsApi.upsert(projectsDiff.changed, user.id));
            if (sessionsDiff.changed.length) ops.push(sessionsApi.upsert(sessionsDiff.changed, user.id));
            if (tasksDiff.changed.length) ops.push(tasksApi.upsert(tasksDiff.changed, user.id));
            if (paymentsDiff.changed.length)
              ops.push(paymentsApi.upsert(paymentsDiff.changed, user.id).catch(e => console.error('Payments sync error:', e)));
            if (settingsChanged) ops.push(settingsApi.upsert(state.settings, user.id));

            // Silinenler — tek tek delete. Hata olursa diğerleri etkilenmesin.
            for (const id of projectsDiff.removedIds) ops.push(projectsApi.remove(id).catch(e => console.error('Project remove error:', e)));
            for (const id of sessionsDiff.removedIds) ops.push(sessionsApi.remove(id).catch(e => console.error('Session remove error:', e)));
            for (const id of tasksDiff.removedIds) ops.push(tasksApi.remove(id).catch(e => console.error('Task remove error:', e)));
            for (const id of paymentsDiff.removedIds) ops.push(paymentsApi.remove(id).catch(e => console.error('Payment remove error:', e)));

            if (ops.length === 0) return; // değişiklik yoksa hiç yazmayalım

            await Promise.all(ops);

            // Başarılı sync sonrası snapshot'ı güncelle.
            prevSyncedRef.current = {
              projects: projectsDiff.current,
              sessions: sessionsDiff.current,
              tasks: tasksDiff.current,
              payments: paymentsDiff.current,
              settings: state.settings,
            };
          } catch (err) {
            console.error('Sync error:', err);
          } finally {
            dispatch({ type: 'SET_SYNCING', payload: false });
          }
        }, 5000); // 5 saniye debounce — hızlı ardışık değişiklikleri tek pakete birleştir
      }
    }
  }, [state.projects, state.sessions, state.tasks, state.payments, state.settings, state.activeSession, state.isInitialized, isAuthenticated, user]);

  // ─── Action Creators ───────────────────────────────

  const addProject = useCallback((projectData) => {
    const project = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'active',
      type: '',
      estimatedHours: 0,
      files: [],
      color: '#4a7c59',
      ...projectData,
    };
    dispatch({ type: 'ADD_PROJECT', payload: project });

    if (projectData.priorWorkedHours > 0) {
      const durationMs = Math.floor(projectData.priorWorkedHours * 60 * 60 * 1000);
      const dummySession = {
        id: generateId(),
        projectId: project.id,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        description: 'Prior Worked Time',
        duration: durationMs,
      };
      dispatch({ type: 'ADD_SESSION', payload: dummySession });
    }

    return project;
  }, []);

  const editProject = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });

    if (updates.priorWorkedHours !== undefined) {
      const durationMs = Math.floor(updates.priorWorkedHours * 60 * 60 * 1000);
      // Find existing dummy session for prior time
      const existingSession = state.sessions.find(s => s.projectId === id && s.description === 'Prior Worked Time');
      if (existingSession) {
        dispatch({ type: 'UPDATE_SESSION', payload: { id: existingSession.id, updates: { duration: durationMs } } });
      } else if (durationMs > 0) {
        dispatch({ type: 'ADD_SESSION', payload: {
          id: generateId(),
          projectId: id,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          description: 'Prior Worked Time',
          duration: durationMs,
        }});
      }
    }
  }, [state.sessions]);

  const removeProject = useCallback(async (id) => {
    markDeleted(id);
    // İlişkili oturumların ID'lerini de işaretle (cascade silme echo'su için)
    state.sessions.filter(s => s.projectId === id).forEach(s => markDeleted(s.id));
    state.tasks.filter(t => t.projectId === id).forEach(t => markDeleted(t.id));
    state.payments.filter(p => p.projectId === id).forEach(p => markDeleted(p.id));
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    if (isAuthenticated) {
      try { await projectsApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated, markDeleted, state.sessions, state.tasks, state.payments]);

  const startTimer = useCallback(async (projectId, description = '') => {
    if (state.activeSession) {
      dispatch({ type: 'STOP_TIMER' });
    }
    const session = {
      id: generateId(),
      projectId,
      startTime: new Date().toISOString(),
      endTime: null,
      description,
      duration: 0,
    };
    dispatch({ type: 'START_TIMER', payload: { projectId, session } });

    // Bildirim göster
    try {
      const project = state.projects.find(p => p.id === projectId);
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Zaman Sayacı Aktif',
          body: `${project?.name || 'Proje'} için süre işliyor...`,
          id: 1,
          ongoing: true, // silinmeyen bildirim
          autoCancel: false,
        }]
      });
    } catch (e) { console.error('Notification error', e); }
  }, [state.activeSession, state.projects]);

  const pauseTimer = useCallback(async () => {
    if (!state.activeSession) return;
    dispatch({ type: 'PAUSE_TIMER' });
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Sayac Duraklatıldı',
          body: 'Süre duraklatıldı.',
          id: 1,
          ongoing: false,
        }]
      });
    } catch (e) {}
  }, [state.activeSession]);

  const resumeTimer = useCallback(async () => {
    if (!state.activeSession) return;
    dispatch({ type: 'RESUME_TIMER' });
    try {
      const project = state.projects.find(p => p.id === state.activeSession.projectId);
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Zaman Sayacı Aktif',
          body: `${project?.name || 'Proje'} için süre işliyor...`,
          id: 1,
          ongoing: true,
          autoCancel: false,
        }]
      });
    } catch (e) {}
  }, [state.activeSession, state.projects]);

  const stopTimer = useCallback(async () => {
    if (!state.activeSession) return;
    const sessionId = state.activeSession.sessionId;

    const now = Date.now();
    let finalDuration = state.activeSession.accumulatedMs;
    if (!state.activeSession.isPaused) {
      const lastResumedAt = state.activeSession.lastResumedAt || new Date(state.activeSession.startTime).getTime();
      finalDuration += (now - lastResumedAt);
    }
    const endTime = new Date(now).toISOString();

    dispatch({ type: 'STOP_TIMER' });

    if (isAuthenticated && user) {
      const existing = state.sessions.find(s => s.id === sessionId);
      if (existing) {
        try {
          await sessionsApi.upsert([{ ...existing, endTime, duration: finalDuration }], user.id);
        } catch (e) { console.error('Stop sync error:', e); }
      }
    }

    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    } catch (e) {}
    return sessionId;
  }, [state.activeSession, state.sessions, isAuthenticated, user]);

  const completeProject = useCallback((id) => {
    if (state.activeSession?.projectId === id) {
      dispatch({ type: 'STOP_TIMER' });
    }
    dispatch({
      type: 'UPDATE_PROJECT',
      payload: { id, updates: { status: 'completed', completedAt: new Date().toISOString() } },
    });
  }, [state.activeSession]);

  const reopenProject = useCallback((id) => {
    dispatch({
      type: 'UPDATE_PROJECT',
      payload: { id, updates: { status: 'active', completedAt: null } },
    });
  }, []);

  const editSession = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_SESSION', payload: { id, updates } });
  }, []);

  const removeSession = useCallback(async (id) => {
    markDeleted(id);
    dispatch({ type: 'DELETE_SESSION', payload: id });
    if (isAuthenticated) {
      try { await sessionsApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated, markDeleted]);

  const addTaskAction = useCallback((projectId, title) => {
    const task = {
      id: generateId(),
      projectId,
      title,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: 'ADD_TASK', payload: task });
  }, []);

  const editTaskAction = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
  }, []);

  const removeTaskAction = useCallback(async (id) => {
    markDeleted(id);
    dispatch({ type: 'DELETE_TASK', payload: id });
    if (isAuthenticated) {
      try { await tasksApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated, markDeleted]);

  const addPayment = useCallback(({ projectId, amount, note }) => {
    const project = state.projects.find(p => p.id === projectId);
    const payment = {
      id: generateId(),
      projectId,
      amount: Number(amount) || 0,
      currency: project?.currency || state.settings.currency || '₺',
      note: note ?? null,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PAYMENT', payload: payment });
    return payment;
  }, [state.projects, state.settings]);

  const removePayment = useCallback(async (id) => {
    markDeleted(id);
    dispatch({ type: 'DELETE_PAYMENT', payload: id });
    if (isAuthenticated) {
      try { await paymentsApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated, markDeleted]);

  const updateSettings = useCallback((updates) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates });
  }, []);

  const value = {
    ...state,
    addProject,
    editProject,
    removeProject,
    reopenProject,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeProject,
    editSession,
    removeSession,
    addTask: addTaskAction,
    editTask: editTaskAction,
    removeTask: removeTaskAction,
    addPayment,
    removePayment,
    updateSettings,
    refreshFromSupabase,
    dispatch,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
