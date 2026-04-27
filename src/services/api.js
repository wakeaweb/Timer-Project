import { supabase } from '../lib/supabase';

// ─── Mappers: Local (camelCase) ↔ Supabase (snake_case) ──────────────

const toDbProject = (p, userId) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  client_name: p.clientName ?? null,
  description: p.description ?? null,
  hourly_rate: p.hourlyRate ?? 0,
  currency: p.currency ?? '₺',
  type: p.type ?? '',
  estimated_hours: p.estimatedHours ?? 0,
  status: p.status ?? 'active',
  color: p.color ?? '#4a7c59',
  created_at: p.createdAt ?? new Date().toISOString(),
  completed_at: p.completedAt ?? null,
});

const fromDbProject = (p) => ({
  id: p.id,
  name: p.name,
  clientName: p.client_name,
  description: p.description,
  hourlyRate: p.hourly_rate,
  currency: p.currency,
  type: p.type,
  estimatedHours: p.estimated_hours,
  status: p.status,
  color: p.color,
  createdAt: p.created_at,
  completedAt: p.completed_at,
  files: [],
});

const toDbSession = (s, userId) => ({
  id: s.id,
  user_id: userId,
  project_id: s.projectId,
  start_time: s.startTime,
  end_time: s.endTime ?? null,
  description: s.description ?? null,
  duration: s.duration ?? 0,
});

const fromDbSession = (s) => ({
  id: s.id,
  projectId: s.project_id,
  startTime: s.start_time,
  endTime: s.end_time,
  description: s.description,
  duration: s.duration,
});

const toDbTask = (t, userId) => ({
  id: t.id,
  user_id: userId,
  project_id: t.projectId,
  title: t.title,
  is_completed: t.isCompleted ?? false,
  created_at: t.createdAt ?? new Date().toISOString(),
});

const fromDbTask = (t) => ({
  id: t.id,
  projectId: t.project_id,
  title: t.title,
  isCompleted: t.is_completed,
  createdAt: t.created_at,
});

const toDbSettings = (s, userId) => ({
  user_id: userId,
  user_name: s.userName ?? 'Kullanıcı',
  default_hourly_rate: s.defaultHourlyRate ?? 0,
  currency: s.currency ?? '₺',
});

const fromDbSettings = (s) => ({
  userName: s.user_name,
  defaultHourlyRate: s.default_hourly_rate,
  currency: s.currency,
});

// ─── Projects API ─────────────────────────────────────────────────────

export const projectsApi = {
  async fetchAll(userId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbProject);
  },

  async upsert(projects, userId) {
    if (!projects.length) return;
    const { error } = await supabase
      .from('projects')
      .upsert(projects.map(p => toDbProject(p, userId)), { onConflict: 'id' });
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Sessions API ─────────────────────────────────────────────────────

export const sessionsApi = {
  async fetchAll(userId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbSession);
  },

  async upsert(sessions, userId) {
    if (!sessions.length) return;
    const { error } = await supabase
      .from('sessions')
      .upsert(sessions.map(s => toDbSession(s, userId)), { onConflict: 'id' });
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Tasks API ────────────────────────────────────────────────────────

export const tasksApi = {
  async fetchAll(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDbTask);
  },

  async upsert(tasks, userId) {
    if (!tasks.length) return;
    const { error } = await supabase
      .from('tasks')
      .upsert(tasks.map(t => toDbTask(t, userId)), { onConflict: 'id' });
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Settings API ─────────────────────────────────────────────────────

export const settingsApi = {
  async fetch(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found → ok
    return data ? fromDbSettings(data) : null;
  },

  async upsert(settings, userId) {
    const { error } = await supabase
      .from('user_settings')
      .upsert(toDbSettings(settings, userId), { onConflict: 'user_id' });
    if (error) throw error;
  },
};
