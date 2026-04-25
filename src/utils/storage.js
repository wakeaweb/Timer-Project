// localStorage CRUD yardımcı fonksiyonları

const STORAGE_KEYS = {
  PROJECTS: 'terra_time_projects',
  SESSIONS: 'terra_time_sessions',
  ACTIVE_SESSION: 'terra_time_active_session',
  SETTINGS: 'terra_time_settings',
  TASKS: 'terra_time_tasks',
};

// Güvenli parse
function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`localStorage parse hatası [${key}]:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`localStorage yazma hatası [${key}]:`, err);
  }
}

// ─── Projects ────────────────────────────────────────
export function getProjects() {
  return safeParse(STORAGE_KEYS.PROJECTS, []);
}

export function saveProjects(projects) {
  safeSet(STORAGE_KEYS.PROJECTS, projects);
}

export function addProject(project) {
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  return projects;
}

export function updateProject(id, updates) {
  const projects = getProjects().map(p =>
    p.id === id ? { ...p, ...updates } : p
  );
  saveProjects(projects);
  return projects;
}

export function deleteProject(id) {
  const projects = getProjects().filter(p => p.id !== id);
  saveProjects(projects);
  // İlişkili seansları da sil
  const sessions = getSessions().filter(s => s.projectId !== id);
  saveSessions(sessions);
  return { projects, sessions };
}

export function getProjectById(id) {
  return getProjects().find(p => p.id === id) || null;
}

// ─── Tasks ───────────────────────────────────────────
export function getTasks() {
  return safeParse(STORAGE_KEYS.TASKS, []);
}

export function saveTasks(tasks) {
  safeSet(STORAGE_KEYS.TASKS, tasks);
}

export function addTask(task) {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
  return tasks;
}

export function updateTask(id, updates) {
  const tasks = getTasks().map(t =>
    t.id === id ? { ...t, ...updates } : t
  );
  saveTasks(tasks);
  return tasks;
}

export function deleteTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  return tasks;
}

// ─── Sessions ────────────────────────────────────────
export function getSessions() {
  return safeParse(STORAGE_KEYS.SESSIONS, []);
}

export function saveSessions(sessions) {
  safeSet(STORAGE_KEYS.SESSIONS, sessions);
}

export function addSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
  return sessions;
}

export function updateSession(id, updates) {
  const sessions = getSessions().map(s =>
    s.id === id ? { ...s, ...updates } : s
  );
  saveSessions(sessions);
  return sessions;
}

export function getSessionsByProject(projectId) {
  return getSessions()
    .filter(s => s.projectId === projectId)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
}

// ─── Active Session ──────────────────────────────────
export function getActiveSession() {
  return safeParse(STORAGE_KEYS.ACTIVE_SESSION, null);
}

export function setActiveSession(session) {
  safeSet(STORAGE_KEYS.ACTIVE_SESSION, session);
}

export function clearActiveSession() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
}

// ─── Settings ────────────────────────────────────────
const DEFAULT_SETTINGS = {
  userName: 'Kullanıcı',
  defaultHourlyRate: 0,
  currency: '₺',
};

export function getSettings() {
  return safeParse(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings) {
  safeSet(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...settings });
}

// ─── UUID ────────────────────────────────────────────
export function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

// ─── Seed Data (Demo) ────────────────────────────────
export function seedDemoData() {
  if (getProjects().length > 0) return; // Zaten veri var

  const now = new Date();
  const demoProjects = [
    {
      id: generateId(),
      name: 'Eco Packaging Site',
      clientName: 'GreenLife Corp',
      description: 'Eco-friendly packaging brand website redesign with sustainable materials showcase.',
      hourlyRate: 150,
      currency: '$',
      type: 'Web Design',
      estimatedHours: 100,
      files: [],
      status: 'active',
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      color: '#4a7c59',
    },
    {
      id: generateId(),
      name: 'Organic Cafe App',
      clientName: 'Harvest Moon Cafe',
      description: 'Mobile app design for organic cafe ordering and loyalty program.',
      hourlyRate: 200,
      currency: '₺',
      type: 'Mobile App',
      estimatedHours: 80,
      files: [],
      status: 'active',
      createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      color: '#705c30',
    },
    {
      id: generateId(),
      name: 'Wellness Retreat Branding',
      clientName: 'Serene Valley',
      description: 'Complete brand identity for a wellness retreat center.',
      hourlyRate: 175,
      currency: '€',
      type: 'Branding',
      estimatedHours: 60,
      files: [],
      status: 'active',
      createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      color: '#78a886',
    },
  ];

  // Demo sessions for each project
  const demoSessions = [];
  demoProjects.forEach(project => {
    for (let i = 0; i < 5; i++) {
      const dayOffset = (i + 1) * 2;
      const startTime = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
      startTime.setHours(9 + Math.floor(Math.random() * 3), 0, 0);
      const duration = (1 + Math.random() * 3) * 60 * 60 * 1000; // 1-4 saat
      const endTime = new Date(startTime.getTime() + duration);

      demoSessions.push({
        id: generateId(),
        projectId: project.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: [
          'Initial material research and vendor outreach.',
          'Design mockups for key components.',
          'Client sync call regarding brand alignment.',
          'Deep work: creating vector assets.',
          'Accessibility audit and color contrast adjustments.',
        ][i],
        duration,
      });
    }
  });

  // Demo tasks for each project
  const demoTasks = [];
  demoProjects.forEach(project => {
    demoTasks.push(
      { id: generateId(), projectId: project.id, title: 'Initial meeting with client', isCompleted: true, createdAt: new Date(now - 10000000).toISOString() },
      { id: generateId(), projectId: project.id, title: 'Draft project proposal', isCompleted: true, createdAt: new Date(now - 8000000).toISOString() },
      { id: generateId(), projectId: project.id, title: 'Design low-fidelity wireframes', isCompleted: false, createdAt: new Date(now - 5000000).toISOString() },
      { id: generateId(), projectId: project.id, title: 'Client review session', isCompleted: false, createdAt: new Date(now - 2000000).toISOString() }
    );
  });

  saveProjects(demoProjects);
  saveSessions(demoSessions);
  saveTasks(demoTasks);
  saveSettings({ ...DEFAULT_SETTINGS, userName: 'Alex' });
}
