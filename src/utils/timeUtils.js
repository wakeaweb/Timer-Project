// Süre hesaplama ve formatlama fonksiyonları

/**
 * Milisaniyeyi HH:MM:SS formatına çevir
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');

  return `${hStr}:${mStr}:${sStr}`;
}

/**
 * Milisaniyeyi insan okunabilir kısa formata çevir (ör. "42h 15m")
 */
export function formatDurationShort(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Milisaniyeyi sadece saat olarak döndür (ör. "14.5")
 */
export function msToHours(ms) {
  if (!ms || ms < 0) return 0;
  return Math.round((ms / 3600000) * 10) / 10;
}

/**
 * Bir proje için toplam süreyi hesapla
 */
export function calculateTotalDuration(sessions) {
  return sessions.reduce((total, session) => {
    // Tamamlanmış seans (Stop edilmiş)
    if (session.endTime) {
      return total + session.duration; // Doğrudan duration kullan, PAUSE sonrası düzeltilmiş değer.
    }
    // Aktif seans (AppContext'ten calculate edilen logic gibi düşün, ama bu util fonksiyonu sadece sessions array alır,
    // activeSession state'i almaz. Fakat session.endTime yoksa duration 0 gelir.
    // Aslında activeSession state'ini bilmeden o anki timer'ı hesaplamak için bu fonksiyonu kullanan yerlerde,
    // total duration hesaplaması "geçmiş" sessionları toplar, aktif olanı ayrıca hesaplar.
    // Ancak session array içindeki aktif session'ın duration'ı hep güncelleniyorsa o da kullanılabilir.
    // En iyisi activeSession.endTime yoksa şimdilik duration'ı kullanalım veya state.activeSession üzerinden hesaplayalım.
    return total + (session.duration || 0);
  }, 0);
}

/**
 * Tarih formatlama (ör. "Nov 15, 2023")
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Tarih formatlama kısa (ör. "Today", "Yesterday", veya tarih)
 */
export function formatDateRelative(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(isoString);
}

/**
 * Saat aralığı formatlama (ör. "09:00 AM - 11:30 AM")
 */
export function formatTimeRange(startIso, endIso) {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: true };
  const start = new Date(startIso).toLocaleTimeString('en-US', opts);
  const end = endIso
    ? new Date(endIso).toLocaleTimeString('en-US', opts)
    : 'Running...';
  return `${start} - ${end}`;
}

/**
 * Günün saatine göre selamlaşma
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Son 7 gün verisi çıkar (haftalık dağılım)
 */
export function getWeeklyData(sessions) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Pazartesi
  weekStart.setHours(0, 0, 0, 0);

  const data = days.map((dayName, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(weekStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const daySessions = sessions.filter(s => {
      const sDate = new Date(s.startTime);
      return sDate >= dayStart && sDate < dayEnd;
    });

    const totalMs = calculateTotalDuration(daySessions);
    return {
      day: dayName,
      hours: msToHours(totalMs),
      ms: totalMs,
    };
  });

  return data;
}

/**
 * Benzersiz aktif gün sayısını hesapla
 */
export function countActiveDays(sessions) {
  const uniqueDays = new Set();
  sessions.forEach(s => {
    const date = new Date(s.startTime).toDateString();
    uniqueDays.add(date);
  });
  return uniqueDays.size;
}

/**
 * Seansları çalışma günlerine göre grupla
 * Döndürülen: [{ date: 'Nov 15, 2023', totalMs: 14000000, sessions: [...] }, ...]
 */
export function getWorkingDays(sessions) {
  const daysMap = new Map();

  sessions.forEach(session => {
    const dateStr = new Date(session.startTime).toDateString();
    if (!daysMap.has(dateStr)) {
      daysMap.set(dateStr, {
        dateString: dateStr,
        formattedDate: formatDate(session.startTime),
        totalMs: 0,
        sessions: []
      });
    }
    const day = daysMap.get(dateStr);
    day.sessions.push(session);
    day.totalMs += session.duration || 0;
  });

  return Array.from(daysMap.values()).sort(
    (a, b) => new Date(b.dateString) - new Date(a.dateString)
  );
}

/**
 * Bugünkü tamamlanmış seansları filtrele
 */
export function getTodaySessions(sessions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return sessions.filter(s => {
    if (!s.endTime) return false;
    const d = new Date(s.startTime);
    return d >= today && d < tomorrow;
  });
}

/**
 * Bu haftaki tamamlanmış seansları filtrele (Pazartesi başlangıçlı)
 */
export function getThisWeekSessions(sessions) {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  weekStart.setHours(0, 0, 0, 0);
  return sessions.filter(s => {
    if (!s.endTime) return false;
    return new Date(s.startTime) >= weekStart;
  });
}

/**
 * Bu aydaki tamamlanmış seansları filtrele
 */
export function getThisMonthSessions(sessions) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return sessions.filter(s => {
    if (!s.endTime) return false;
    return new Date(s.startTime) >= monthStart;
  });
}

/**
 * Son 30 gündeki tamamlanmış seansları filtrele
 */
export function getLast30DaysSessions(sessions) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);
  return sessions.filter(s => {
    if (!s.endTime) return false;
    return new Date(s.startTime) >= cutoff;
  });
}

/**
 * Son aktif zamanı güzel formatla
 */
export function getLastActiveTime(sessions) {
  if (sessions.length === 0) return null;
  const sorted = [...sessions]
    .filter(s => s.endTime)
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
  if (sorted.length === 0) return null;
  return sorted[0].endTime;
}
