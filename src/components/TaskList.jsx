import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function TaskList({ projectId }) {
  const { tasks, addTask, editTask, removeTask } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const textareaRef = useRef(null);
  const editRef = useRef(null);

  const projectTasks = tasks
    .filter(t => t.projectId === projectId)
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  const incompleteTasks = projectTasks.filter(t => !t.isCompleted);

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id !== dragOverId) setDragOverId(id);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const target = incompleteTasks.find(t => t.id === targetId);
    if (!target || target.isCompleted) return;
    const reordered = [...incompleteTasks];
    const fromIdx = reordered.findIndex(t => t.id === sourceId);
    const toIdx = reordered.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newIdx = reordered.findIndex(t => t.id === sourceId);
    const prev = reordered[newIdx - 1];
    const next = reordered[newIdx + 1];
    let newMs;
    if (prev && next) newMs = (new Date(prev.createdAt).getTime() + new Date(next.createdAt).getTime()) / 2;
    else if (prev) newMs = new Date(prev.createdAt).getTime() + 1000;
    else if (next) newMs = new Date(next.createdAt).getTime() - 1000;
    else newMs = Date.now();
    editTask(sourceId, { createdAt: new Date(newMs).toISOString() });
  };

  // Auto-resize textarea
  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [newTaskTitle]);

  useEffect(() => {
    if (editRef.current) {
      autoResize(editRef.current);
      editRef.current.focus();
    }
  }, [editingId]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask(projectId, newTaskTitle.trim());
    setNewTaskTitle('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditText(task.title);
  };

  const saveEdit = () => {
    if (editText.trim() && editingId) {
      editTask(editingId, { title: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg font-semibold text-on-surface">Project Tasks</h2>
        <span className="text-xs font-semibold px-2 py-1 bg-surface-container-high rounded-full text-on-surface-variant">
          {projectTasks.filter(t => t.isCompleted).length} / {projectTasks.length} Done
        </span>
      </div>

      {/* Add Task — chatbox style */}
      <div className="flex gap-2 mb-6 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task... (Shift+Enter for new line)"
            className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm resize-none overflow-hidden"
            style={{ minHeight: '40px' }}
          />
        </div>
        <button
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim()}
          className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-sm disabled:opacity-50 transition-all shadow-card hover:bg-primary/90 shrink-0 h-10"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>

      {projectTasks.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-[32px] text-outline-variant mb-2">
            checklist
          </span>
          <p className="text-on-surface-variant text-sm">No tasks added yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projectTasks.map(task => (
            <li
              key={task.id}
              draggable={!task.isCompleted && editingId !== task.id}
              onDragStart={() => handleDragStart(task.id)}
              onDragOver={(e) => !task.isCompleted && handleDragOver(e, task.id)}
              onDrop={(e) => !task.isCompleted && handleDrop(e, task.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-start gap-2 p-3 rounded-xl transition-all border ${
                task.isCompleted ? 'bg-surface-container-low/50 border-transparent opacity-60' : 'bg-surface-container border-outline-variant/20 shadow-sm hover:shadow-md'
              } ${dragId === task.id ? 'opacity-40' : ''} ${dragOverId === task.id && dragId !== task.id ? 'ring-2 ring-primary/40' : ''}`}
            >
              {!task.isCompleted && (
                <span
                  className="mt-1 text-outline-variant cursor-grab active:cursor-grabbing select-none shrink-0"
                  title="Drag to reorder"
                >
                  <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                </span>
              )}
              <button
                onClick={() => editTask(task.id, { isCompleted: !task.isCompleted })}
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  task.isCompleted
                    ? 'bg-primary border-primary text-on-primary'
                    : 'border-outline hover:border-primary'
                }`}
              >
                {task.isCompleted && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>

              {editingId === task.id ? (
                <textarea
                  ref={editRef}
                  rows={1}
                  value={editText}
                  onChange={(e) => { setEditText(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 px-2 py-1 rounded-lg bg-surface-container-lowest border border-primary/30 text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ minHeight: '24px' }}
                />
              ) : (
                <span className={`flex-1 text-sm whitespace-pre-wrap ${task.isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface font-medium'}`}>
                  {task.title}
                </span>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editingId !== task.id && (
                  <button
                    onClick={() => startEditing(task)}
                    className="text-outline-variant hover:text-primary transition-colors"
                    title="Edit task"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                )}
                <button
                  onClick={() => removeTask(task.id)}
                  className="text-outline-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
