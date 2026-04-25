import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { msToHours, calculateTotalDuration } from '../utils/timeUtils';

/**
 * Proje kartı — Dashboard ve Projects sayfasında kullanılır
 */
export default function ProjectCard({ project }) {
  const { sessions } = useApp();
  const navigate = useNavigate();

  const projectSessions = sessions.filter(s => s.projectId === project.id && s.endTime);
  const allProjectSessions = sessions.filter(s => s.projectId === project.id);
  const totalMs = calculateTotalDuration(projectSessions);
  const totalHours = msToHours(totalMs);

  let currentStatusLabel = 'In Progress';
  let currentStatusColor = 'bg-primary-fixed text-on-primary-fixed-variant';

  if (project.status === 'completed') {
    currentStatusLabel = 'Completed';
    currentStatusColor = 'bg-surface-container-high text-on-surface-variant';
  } else if (allProjectSessions.length === 0) {
    currentStatusLabel = 'Draft';
    currentStatusColor = 'bg-surface-container-highest text-on-surface-variant';
  }

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between mb-3">
        {/* Type badge instead of icon */}
        <div
          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: project.color + '20', color: project.color }}
        >
          {project.type || 'General'}
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${currentStatusColor}`}
        >
          {currentStatusLabel}
        </span>
      </div>

      <h3 className="font-headline text-base font-semibold text-on-surface mb-0.5 group-hover:text-primary transition-colors">
        {project.name}
      </h3>
      <p className="text-xs text-on-surface-variant mb-4">
        {project.clientName || 'No client'}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-on-surface">
          {totalHours} <span className="text-xs font-normal text-on-surface-variant">hrs</span>
        </span>
        {project.status === 'active' && project.estimatedHours > 0 && (
          <div className="h-1.5 flex-1 mx-4 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalHours / project.estimatedHours) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
