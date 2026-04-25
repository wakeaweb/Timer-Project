import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const PROJECT_COLORS = [
  '#4a7c59', '#705c30', '#78a886', '#6b6358',
  '#b83230', '#c4a66a', '#4a6b7c', '#7c4a6b',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default function NewProjectPage() {
  const { id } = useParams(); // edit modunda id gelir
  const { addProject, editProject, projects, settings } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const existingProject = id ? projects.find(p => p.id === id) : null;
  const isEditMode = !!existingProject;

  const [form, setForm] = useState({
    name: existingProject?.name || '',
    clientName: existingProject?.clientName || '',
    hourlyRate: existingProject?.hourlyRate || settings.defaultHourlyRate || '',
    currency: existingProject?.currency || settings.currency || '₺',
    type: existingProject?.type || '',
    estimatedHours: existingProject?.estimatedHours || '',
    description: existingProject?.description || '',
    color: existingProject?.color || '#4a7c59',
    files: existingProject?.files || [],
  });

  const isValid = form.name.trim().length > 0;

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [];

    selectedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" dosyası 2MB sınırını aşıyor.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: ev.target.result,
          addedAt: new Date().toISOString(),
        });
        if (newFiles.length === selectedFiles.filter(f => f.size <= MAX_FILE_SIZE).length) {
          setForm(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
        }
      };
      reader.readAsDataURL(file);
    });
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    link.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const projectData = {
      ...form,
      hourlyRate: parseFloat(form.hourlyRate) || 0,
      estimatedHours: parseFloat(form.estimatedHours) || 0,
    };

    if (isEditMode) {
      editProject(id, projectData);
      navigate(`/project/${id}`);
    } else {
      const project = addProject(projectData);
      navigate(`/project/${project.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 shadow-card">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: form.color + '20' }}
          >
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ color: form.color }}
            >
              {isEditMode ? 'edit' : 'add_circle'}
            </span>
          </div>
          <div>
            <h1 className="font-headline text-[2rem] font-bold text-on-surface">
              {isEditMode ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isEditMode ? 'Update project details and settings.' : 'Set up a new workspace to track time and deliverables.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              id="input-project-name"
              type="text"
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
              autoFocus
            />
          </div>

          {/* Client Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Client Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">
                  person
                </span>
                <input
                  id="input-client-name"
                  type="text"
                  placeholder="Select or type client"
                  value={form.clientName}
                  onChange={e => setForm({ ...form, clientName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Project Type
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">
                  category
                </span>
                <input
                  type="text"
                  placeholder="e.g. Web Design, Branding"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Hourly Rate + Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Hourly Rate
              </label>
              <div className="relative flex">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline z-10">
                  payments
                </span>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="pl-10 pr-2 py-3 rounded-l-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm border-r-0"
                >
                  <option value="₺">₺</option>
                  <option value="$">$</option>
                  <option value="€">€</option>
                  <option value="£">£</option>
                </select>
                <input
                  id="input-hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.hourlyRate}
                  onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                  className="w-full pl-3 pr-4 py-3 rounded-r-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1.5">
                Estimated Time (hours)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-outline">
                  hourglass_empty
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 100"
                  value={form.estimatedHours}
                  onChange={e => setForm({ ...form, estimatedHours: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Project Description
            </label>
            <textarea
              id="input-description"
              placeholder="Briefly describe the project scope..."
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Project Files
            </label>
            <p className="text-xs text-on-surface-variant mb-2">Upload important documents (max 2MB per file)</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-outline-variant/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-[28px] text-outline-variant mb-1">cloud_upload</span>
              <p className="text-sm text-on-surface-variant">Click to upload files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {form.files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {form.files.map((file, i) => (
                  <li key={i} className="flex items-center gap-3 p-2.5 bg-surface-container rounded-lg border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
                      <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                    </div>
                    <button type="button" onClick={() => downloadFile(file)} className="text-primary hover:text-primary/70 transition-colors" title="Download">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                    <button type="button" onClick={() => removeFile(i)} className="text-outline-variant hover:text-error transition-colors" title="Remove">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">
              Project Color
            </label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color
                      ? 'ring-2 ring-on-surface ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-create-project"
              type="submit"
              disabled={!isValid}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-on-primary hover:bg-primary/90 shadow-card hover:shadow-lg active:scale-[0.98]"
            >
              {isEditMode ? 'Save Changes' : 'Create Project'}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
