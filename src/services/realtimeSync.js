import { supabase } from '../lib/supabase';
import { fromDbProject, fromDbSession, fromDbTask } from './api';

/**
 * Supabase Realtime subscription — başka cihazdan yapılan değişiklikleri anlık yansıtır.
 *
 * @param {string} userId  — Supabase auth user ID
 * @param {function} dispatch — AppContext dispatch
 * @returns {function} unsubscribe — cleanup için çağır
 */
export function subscribeToChanges(userId, dispatch) {
  const channel = supabase
    .channel(`realtime-user-${userId}`)

    // ─── Projects ────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_PROJECT', payload: fromDbProject(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_PROJECT', payload: fromDbProject(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
      ({ old: row }) => {
        dispatch({ type: 'REMOTE_DELETE_PROJECT', payload: row.id });
      }
    )

    // ─── Sessions ────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_SESSION', payload: fromDbSession(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_SESSION', payload: fromDbSession(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
      ({ old: row }) => {
        dispatch({ type: 'REMOTE_DELETE_SESSION', payload: row.id });
      }
    )

    // ─── Tasks ───────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_TASK', payload: fromDbTask(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      ({ new: row }) => {
        dispatch({ type: 'REMOTE_UPSERT_TASK', payload: fromDbTask(row) });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      ({ old: row }) => {
        dispatch({ type: 'REMOTE_DELETE_TASK', payload: row.id });
      }
    )

    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Bağlantı kuruldu — canlı senkronizasyon aktif.');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Kanal hatası, yeniden bağlanılıyor...');
      }
    });

  // Cleanup: component unmount veya kullanıcı çıkış yaptığında çağrılır
  return () => {
    supabase.removeChannel(channel);
    console.log('[Realtime] Bağlantı kapatıldı.');
  };
}
