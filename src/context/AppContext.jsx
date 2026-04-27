import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { projectsApi, sessionsApi, tasksApi, settingsApi } from '../services/api';
import {
  getProjects, saveProjects, 
  getSessions, saveSessions, 
  getActiveSession, setActiveSession, clearActiveSession,
  getTasks, saveTasks,
  getSettings, saveSettings as storageSaveSettings,
  generateId,
} from '../utils/storage';

const AppContext = createContext(null);

const initialState = {
  isInitialized: false,
  projects: [],
  sessions: [],
  tasks: [],
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
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const syncTimeoutRef = useRef(null);

  // Uygulama başladığında ve kullanıcı değiştiğinde verileri yükle
  useEffect(() => {
    const initData = async () => {
      // 1. Önce localStorage'dan yükle (hızlı başlangıç / offline)
      const localProjects = getProjects();
      const localSessions = getSessions();
      const localTasks = getTasks();
      const localSettings = getSettings();
      const localActive = getActiveSession();

      dispatch({
        type: 'INIT',
        payload: {
          projects: localProjects,
          sessions: localSessions,
          tasks: localTasks,
          activeSession: localActive,
          settings: localSettings,
        },
      });

      // 2. Online ise Supabase'den çek (doğru mapping ile)
      if (isAuthenticated && user) {
        dispatch({ type: 'SET_SYNCING', payload: true });
        try {
          const [sbProjects, sbSessions, sbTasks, sbSettings] = await Promise.all([
            projectsApi.fetchAll(user.id),
            sessionsApi.fetchAll(user.id),
            tasksApi.fetchAll(user.id),
            settingsApi.fetch(user.id),
          ]);

          dispatch({
            type: 'INIT',
            payload: {
              projects: sbProjects.length > 0 ? sbProjects : localProjects,
              sessions: sbSessions.length > 0 ? sbSessions : localSessions,
              tasks: sbTasks.length > 0 ? sbTasks : localTasks,
              settings: sbSettings || localSettings,
              activeSession: localActive,
            },
          });
        } catch (error) {
          console.error('Supabase fetch error:', error);
        } finally {
          dispatch({ type: 'SET_SYNCING', payload: false });
        }
      }
    };

    initData();
  }, [isAuthenticated, user]);

  // State değiştikçe localStorage'a ve Supabase'e yaz (offline-first)
  useEffect(() => {
    if (state.isInitialized) {
      // Her zaman localStorage'a yaz (offline fallback)
      saveProjects(state.projects);
      saveSessions(state.sessions);
      saveTasks(state.tasks);
      storageSaveSettings(state.settings);
      if (state.activeSession) setActiveSession(state.activeSession);
      else clearActiveSession();

      // Supabase'e debounced sync (doğru mapping ile)
      if (isAuthenticated && user) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
          dispatch({ type: 'SET_SYNCING', payload: true });
          try {
            await Promise.all([
              projectsApi.upsert(state.projects, user.id),
              sessionsApi.upsert(state.sessions, user.id),
              tasksApi.upsert(state.tasks, user.id),
              settingsApi.upsert(state.settings, user.id),
            ]);
          } catch (err) {
            console.error('Sync error:', err);
          } finally {
            dispatch({ type: 'SET_SYNCING', payload: false });
          }
        }, 1500); // 1.5 saniye debounce
      }
    }
  }, [state.projects, state.sessions, state.tasks, state.settings, state.activeSession, state.isInitialized, isAuthenticated, user]);

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
    return project;
  }, []);

  const editProject = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
  }, []);

  const removeProject = useCallback(async (id) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    if (isAuthenticated) {
      try { await projectsApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated]);

  const startTimer = useCallback((projectId, description = '') => {
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
  }, [state.activeSession]);

  const pauseTimer = useCallback(() => {
    if (!state.activeSession) return;
    dispatch({ type: 'PAUSE_TIMER' });
  }, [state.activeSession]);

  const resumeTimer = useCallback(() => {
    if (!state.activeSession) return;
    dispatch({ type: 'RESUME_TIMER' });
  }, [state.activeSession]);

  const stopTimer = useCallback(() => {
    if (!state.activeSession) return;
    const sessionId = state.activeSession.sessionId;
    dispatch({ type: 'STOP_TIMER' });
    return sessionId;
  }, [state.activeSession]);

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
    dispatch({ type: 'DELETE_TASK', payload: id });
    if (isAuthenticated) {
      try { await tasksApi.remove(id); } catch (e) { console.error(e); }
    }
  }, [isAuthenticated]);

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
    addTask: addTaskAction,
    editTask: editTaskAction,
    removeTask: removeTaskAction,
    updateSettings,
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
