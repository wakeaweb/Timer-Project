import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  getProjects, saveProjects, addProject as storageAddProject,
  updateProject as storageUpdateProject, deleteProject as storageDeleteProject,
  getSessions, saveSessions, addSession as storageAddSession,
  updateSession as storageUpdateSession,
  getActiveSession, setActiveSession, clearActiveSession,
  getTasks, saveTasks,
  getSettings, saveSettings as storageSaveSettings,
  seedDemoData, generateId,
} from '../utils/storage';

const AppContext = createContext(null);

const initialState = {
  isInitialized: false,
  projects: [],
  sessions: [],
  tasks: [],
  activeSession: null,
  settings: { userName: 'Kullanıcı', defaultHourlyRate: 0, currency: '₺' },
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, isInitialized: true };
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
      // Calculate how long it was running since it was last resumed (or started)
      // Actually we just calculate total elapsed if it hasn't been paused before,
      // but wait, if it was resumed, we need to know when it was resumed to add to accumulatedMs.
      // Let's store lastResumedAt in activeSession.
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

  // Uygulama başladığında localStorage'dan yükle
  useEffect(() => {
    seedDemoData();
    dispatch({
      type: 'INIT',
      payload: {
        projects: getProjects(),
        sessions: getSessions(),
        tasks: getTasks(),
        activeSession: getActiveSession(),
        settings: getSettings(),
      },
    });
  }, []);

  // State değiştiğinde localStorage'a yaz
  useEffect(() => {
    if (state.isInitialized) {
      saveProjects(state.projects);
    }
  }, [state.projects, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized) {
      saveSessions(state.sessions);
    }
  }, [state.sessions, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized) {
      saveTasks(state.tasks);
    }
  }, [state.tasks, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized) {
      if (state.activeSession) {
        setActiveSession(state.activeSession);
      } else {
        clearActiveSession();
      }
    }
  }, [state.activeSession, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized) {
      storageSaveSettings(state.settings);
    }
  }, [state.settings, state.isInitialized]);

  // beforeunload — aktif seansı koru
  useEffect(() => {
    function handleBeforeUnload() {
      if (state.activeSession) {
        const now = Date.now();
        let finalDuration = state.activeSession.accumulatedMs;
        
        if (!state.activeSession.isPaused) {
          const lastResumedAt = state.activeSession.lastResumedAt || new Date(state.activeSession.startTime).getTime();
          finalDuration += (now - lastResumedAt);
        }
        
        const endTime = new Date(now).toISOString();
        const sessions = getSessions().map(s =>
          s.id === state.activeSession.sessionId
            ? { ...s, endTime, duration: finalDuration }
            : s
        );
        saveSessions(sessions);
        clearActiveSession();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.activeSession]);

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

  const removeProject = useCallback((id) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const startTimer = useCallback((projectId, description = '') => {
    // Mevcut aktif seans varsa onu tamamen durdur (Stop)
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
    return sessionId; // Geriye sessionId dön, böylece log güncellenebilsin
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

  const removeTaskAction = useCallback((id) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

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
