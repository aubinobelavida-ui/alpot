'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCcw, 
  RotateCw, 
  Save, 
  Send, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Sliders, 
  Check, 
  Layers, 
  Palette, 
  ExternalLink,
  Sparkles,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import SectionRenderer from '@/components/editor/SectionRenderer';

function VisualEditorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const siteId = params.siteId as string;
  const initialPageId = searchParams.get('pageId');

  // Loading & site state
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');

  // Sections AST state for active page
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Responsive mode
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Undo / Redo history stacks
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save & Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add section modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Publish modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishSuccessData, setPublishSuccessData] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // 1. Initial Load of Site & Pages
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const res = await fetch(`/api/sites/${siteId}`);
        const data = await res.json();
        if (!res.ok) {
          router.push('/dashboard');
          return;
        }

        setSite(data.site);
        setPages(data.pages || []);

        const targetPage = initialPageId && data.pages.some((p: any) => p.id === initialPageId)
          ? initialPageId
          : data.pages[0]?.id;

        if (targetPage) {
          setCurrentPageId(targetPage);
          await loadPageSections(targetPage);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [siteId, router, initialPageId]);

  // Load sections for selected page
  const loadPageSections = async (pageId: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}/pages/${pageId}`);
      const data = await res.json();
      if (res.ok) {
        const secs = data.sections || [];
        setSections(secs);
        setHistory([secs]);
        setHistoryIndex(0);
        setSelectedSectionId(secs[0]?.id || null);
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchPage = async (pageId: string) => {
    if (pageId === currentPageId) return;
    setCurrentPageId(pageId);
    await loadPageSections(pageId);
  };

  // State mutator with history tracking and autosave debounce
  const updateSectionsState = (newSections: any[], saveImmediately = false) => {
    setSections(newSections);
    setSaveStatus('dirty');

    // Update history stack (truncate forward history if branched)
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newSections);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);

    // Debounced autosave
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    if (saveImmediately) {
      savePageSections(newSections);
    } else {
      autosaveTimeoutRef.current = setTimeout(() => {
        savePageSections(newSections);
      }, 1500);
    }
  };

  // Save sections to backend
  const savePageSections = async (secsToSave = sections) => {
    if (!currentPageId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/sites/${siteId}/pages/${currentPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: secsToSave })
      });
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('dirty');
      }
    } catch {
      setSaveStatus('dirty');
    }
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetSecs = history[historyIndex - 1];
      setSections(targetSecs);
      setHistoryIndex(historyIndex - 1);
      savePageSections(targetSecs);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetSecs = history[historyIndex + 1];
      setSections(targetSecs);
      setHistoryIndex(historyIndex + 1);
      savePageSections(targetSecs);
    }
  };

  // Section actions
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    updateSectionsState(copy, true);
  };

  const toggleHideSection = (secId: string) => {
    const updated = sections.map(s => s.id === secId ? { ...s, is_hidden: !s.is_hidden } : s);
    updateSectionsState(updated);
  };

  const duplicateSection = (secId: string) => {
    const idx = sections.findIndex(s => s.id === secId);
    if (idx === -1) return;
    const original = sections[idx];
    const cloned = {
      ...original,
      id: `sec-${currentPageId}-${Date.now()}`,
      name: `${original.name} (Copie)`,
      settings: JSON.parse(JSON.stringify(original.settings)),
      styles: JSON.parse(JSON.stringify(original.styles))
    };
    const copy = [...sections];
    copy.splice(idx + 1, 0, cloned);
    updateSectionsState(copy, true);
    setSelectedSectionId(cloned.id);
  };

  const deleteSection = (secId: string) => {
    if (sections.length <= 1) {
      alert('Une page doit comporter au moins une section.');
      return;
    }
    const updated = sections.filter(s => s.id !== secId);
    updateSectionsState(updated, true);
    setSelectedSectionId(updated[0]?.id || null);
  };

  const handleAddSection = (type: string, name: string, defaultSettings: any, defaultStyles: any) => {
    const newSection = {
      id: `sec-${currentPageId}-${Date.now()}`,
      type,
      name,
      is_hidden: false,
      settings: defaultSettings,
      styles: defaultStyles
    };
    const updated = [...sections, newSection];
    updateSectionsState(updated, true);
    setSelectedSectionId(newSection.id);
    setIsAddModalOpen(false);
  };

  // Selected section properties mutation
  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const updateSelectedSetting = (key: string, value: any) => {
    if (!selectedSectionId) return;
    const updated = sections.map(s => {
      if (s.id === selectedSectionId) {
        return {
          ...s,
          settings: {
            ...s.settings,
            [key]: value
          }
        };
      }
      return s;
    });
    updateSectionsState(updated);
  };

  const updateSelectedStyle = (key: string, value: any) => {
    if (!selectedSectionId) return;
    const updated = sections.map(s => {
      if (s.id === selectedSectionId) {
        return {
          ...s,
          styles: {
            ...s.styles,
            [key]: value
          }
        };
      }
      return s;
    });
    updateSectionsState(updated);
  };

  // Publication Trigger
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // First save current draft
      await savePageSections();
      const res = await fetch(`/api/sites/${siteId}/publish`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setPublishSuccessData(data);
      } else {
        alert(data.error || 'Erreur lors de la publication');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading || !site) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm font-semibold text-slate-300">Initialisation du studio HELPot...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      
      {/* TOPBAR */}
      <header className="h-14 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-4 z-30">
        
        {/* Left: Back to dashboard & Site Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Quitter l'éditeur et revenir au tableau de bord"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white tracking-tight">{site.name}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700">
              Studio No-Code
            </span>
          </div>

          {/* Page Selector dropdown */}
          <div className="hidden sm:flex items-center gap-2 pl-2">
            <span className="text-xs text-slate-400">Page :</span>
            <select
              value={currentPageId}
              onChange={(e) => handleSwitchPage(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold px-2.5 py-1 text-slate-200 outline-none focus:border-blue-500"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.is_home ? '(Accueil)' : `(/${p.slug})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Responsive Breakpoints Buttons */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewportMode('desktop')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewportMode === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Vue Desktop (100%)"
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden md:inline">Desktop</span>
          </button>

          <button
            onClick={() => setViewportMode('tablet')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewportMode === 'tablet' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Vue Tablette (768px)"
          >
            <Tablet className="w-4 h-4" />
            <span className="hidden md:inline">Tablette</span>
          </button>

          <button
            onClick={() => setViewportMode('mobile')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewportMode === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Vue Mobile (375px)"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Undo/Redo, Autosave status, Save, Publish */}
        <div className="flex items-center gap-3">
          
          {/* Undo / Redo */}
          <div className="flex items-center text-slate-400">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Autosave status indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Enregistré
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-400 animate-pulse font-medium">
                Enregistrement...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-slate-400">Modifié</span>
            )}
          </div>

          {/* Manual Save Button */}
          <button
            onClick={() => savePageSections()}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Enregistrer immédiatement"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Sauvegarder</span>
          </button>

          {/* Publish Trigger Button */}
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publier mon site</span>
          </button>
        </div>

      </header>

      {/* MAIN 3-PANEL LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL A: LEFT SIDEBAR (STRUCTURE & WIDGET TREE) */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm">
          
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Structure de la page
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {sections.length} sections
            </span>
          </div>

          {/* Sections list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {sections.map((sec, idx) => {
              const isSelected = sec.id === selectedSectionId;
              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`group rounded-xl p-2.5 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                  } ${sec.is_hidden ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="truncate">{sec.name || sec.type}</span>
                  </div>

                  {/* Actions on section item */}
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }}
                      disabled={idx === 0}
                      className="p-1 hover:text-blue-600 disabled:opacity-20"
                      title="Monter"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }}
                      disabled={idx === sections.length - 1}
                      className="p-1 hover:text-blue-600 disabled:opacity-20"
                      title="Descendre"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleHideSection(sec.id); }}
                      className="p-1 hover:text-amber-600"
                      title={sec.is_hidden ? 'Afficher' : 'Masquer temporairement'}
                    >
                      {sec.is_hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateSection(sec.id); }}
                      className="p-1 hover:text-blue-600"
                      title="Dupliquer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }}
                      className="p-1 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Section Button */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une section</span>
            </button>
          </div>

        </aside>

        {/* PANEL B: CENTER CANVAS (INTERACTIVE REALTIME PREVIEW) */}
        <main className="flex-1 bg-slate-200/80 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div 
            className={`bg-white transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden min-h-[90vh] ${
              viewportMode === 'mobile' 
                ? 'w-[375px] my-4 ring-8 ring-slate-900 rounded-[36px]' 
                : viewportMode === 'tablet' 
                ? 'w-[768px] my-4 ring-8 ring-slate-800 rounded-[24px]' 
                : 'w-full max-w-6xl'
            }`}
          >
            {sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isSelected={section.id === selectedSectionId}
                onSelect={() => setSelectedSectionId(section.id)}
                siteTheme={site.globalTheme}
                isEditor={true}
              />
            ))}
          </div>
        </main>

        {/* PANEL C: RIGHT SIDEBAR (PROPERTY INSPECTOR) */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shadow-sm">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Propriétés de la section
              </span>
            </div>
            {selectedSection && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {selectedSection.type}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {selectedSection ? (
              <div className="space-y-4">
                
                {/* Section Display Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom dans la structure</label>
                  <input
                    type="text"
                    value={selectedSection.name}
                    onChange={(e) => {
                      const updated = sections.map(s => s.id === selectedSectionId ? { ...s, name: e.target.value } : s);
                      updateSectionsState(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Main Title if section has title */}
                {selectedSection.settings.title !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Titre principal</label>
                    <textarea
                      rows={2}
                      value={selectedSection.settings.title || ''}
                      onChange={(e) => updateSelectedSetting('title', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Subtitle / Description */}
                {selectedSection.settings.subtitle !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sous-titre / Description</label>
                    <textarea
                      rows={3}
                      value={selectedSection.settings.subtitle || ''}
                      onChange={(e) => updateSelectedSetting('subtitle', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Hero / Banner CTA Buttons */}
                {selectedSection.settings.ctaPrimaryText !== undefined && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-800 block">Bouton Principal</span>
                    <input
                      type="text"
                      placeholder="Texte du bouton"
                      value={selectedSection.settings.ctaPrimaryText || ''}
                      onChange={(e) => updateSelectedSetting('ctaPrimaryText', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Lien (ex: /contact)"
                      value={selectedSection.settings.ctaPrimaryLink || ''}
                      onChange={(e) => updateSelectedSetting('ctaPrimaryLink', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-mono"
                    />
                  </div>
                )}

                {/* Background Image URL */}
                {selectedSection.settings.bgImageUrl !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Image d'arrière-plan (URL)</label>
                    <input
                      type="text"
                      value={selectedSection.settings.bgImageUrl || ''}
                      onChange={(e) => updateSelectedSetting('bgImageUrl', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}

                {/* Overlay Opacity */}
                {selectedSection.settings.overlayOpacity !== undefined && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Assombrissement ({selectedSection.settings.overlayOpacity}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      value={selectedSection.settings.overlayOpacity || 0}
                      onChange={(e) => updateSelectedSetting('overlayOpacity', parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-blue-600"
                    />
                  </div>
                )}

                {/* Background Color Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Couleur de fond</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.styles?.bgColor || '#ffffff'}
                      onChange={(e) => updateSelectedStyle('bgColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={selectedSection.styles?.bgColor || '#ffffff'}
                      onChange={(e) => updateSelectedStyle('bgColor', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Quick actions on this section */}
                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => duplicateSection(selectedSection.id)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Dupliquer
                  </button>
                  <button
                    onClick={() => deleteSection(selectedSection.id)}
                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs"
                  >
                    Supprimer
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                Cliquez sur une section dans le canvas pour afficher ses paramètres.
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* MODAL 1: ADD SECTION (WIDGET LIBRARY) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Bibliothèque de Widgets & Sections</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {/* Widget 1: Hero */}
              <button
                onClick={() => handleAddSection(
                  'hero',
                  'Hero Bannière',
                  { title: 'Titre de votre nouvelle section', subtitle: 'Une phrase d’accroche captivante pour convaincre vos visiteurs.', ctaPrimaryText: 'En savoir plus', ctaPrimaryLink: '/contact', bgImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', overlayOpacity: 50 },
                  { paddingTop: '80px', paddingBottom: '80px' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Hero Section</div>
                <p className="text-xs text-slate-500">Grande bannière visuelle avec titre, sous-titre et appels à l'action.</p>
              </button>

              {/* Widget 2: Features */}
              <button
                onClick={() => handleAddSection(
                  'features',
                  'Nos Engagements',
                  { tagline: 'POURQUOI NOUS CHOISIR', heading: 'Nos atouts majeurs', items: [{ title: 'Qualité Artisanale', description: 'Finitions soignées selon les règles de l’art.' }, { title: 'Accompagnement Dédié', description: 'Un interlocuteur unique à votre écoute.' }, { title: 'Devis Rapide & Clair', description: 'Transparence totale et respect des délais.' }] },
                  { bgColor: '#f8fafc' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Points Forts & Engagements</div>
                <p className="text-xs text-slate-500">Grille de 3 arguments clés avec icônes distinctives.</p>
              </button>

              {/* Widget 3: Showcase Grid */}
              <button
                onClick={() => handleAddSection(
                  'showcase_grid',
                  'Galerie Photos',
                  { tagline: 'RÉALISATIONS', heading: 'Nos derniers chantiers', items: [{ title: 'Projet Contemporain', category: 'Sur-mesure', imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' }, { title: 'Création Signature', category: 'Mobilier', imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80' }] },
                  { bgColor: '#ffffff' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Portfolio & Réalisations</div>
                <p className="text-xs text-slate-500">Grille visuelle de photos avec catégories et titres.</p>
              </button>

              {/* Widget 4: Testimonials */}
              <button
                onClick={() => handleAddSection(
                  'testimonials',
                  'Témoignages Clients',
                  { tagline: 'AVIS VÉRIFIÉS', heading: 'Ce que pensent nos clients', items: [{ author: 'Jean-Pierre M.', role: 'Client vérifié', content: 'Un travail irréprochable et un grand professionnalisme !' }] },
                  { bgColor: '#f8fafc' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Avis & Témoignages</div>
                <p className="text-xs text-slate-500">Blocs de réassurance sociale avec étoiles et citations.</p>
              </button>

              {/* Widget 5: CTA Banner */}
              <button
                onClick={() => handleAddSection(
                  'cta_banner',
                  'Bannière d’Appel à l’Action',
                  { title: 'Prêt à démarrer votre projet ?', subtitle: 'Prenez contact avec notre équipe dès aujourd’hui.', buttonText: 'Demander un devis' },
                  { bgColor: '#0f172a' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Bannière Appel à l’Action (CTA)</div>
                <p className="text-xs text-slate-500">Bannière percutante pour inciter à la prise de contact.</p>
              </button>

              {/* Widget 6: Contact Form */}
              <button
                onClick={() => handleAddSection(
                  'contact_form',
                  'Formulaire de Devis',
                  { submitButtonText: 'Envoyer ma demande' },
                  { bgColor: '#ffffff' }
                )}
                className="p-4 text-left rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all space-y-1"
              >
                <div className="font-bold text-sm text-slate-900">Formulaire de Contact / Devis</div>
                <p className="text-xs text-slate-500">Champs nom, email, téléphone et message reliés au CRM.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PUBLISH SITE MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            
            {publishSuccessData ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Votre site est en ligne !</h3>
                <p className="text-xs text-slate-600">
                  La version snapshot v{publishSuccessData.version} a été générée avec succès. Votre site est accessible publiquement à l'adresse suivante :
                </p>

                <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs text-blue-600 font-bold break-all">
                  {publishSuccessData.subdomain}.helpot.fr
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href={publishSuccessData.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visiter mon site en ligne</span>
                  </a>
                  <button
                    onClick={() => { setIsPublishModalOpen(false); setPublishSuccessData(null); }}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Send className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Publier votre site web</h3>
                  <p className="text-xs text-slate-500">
                    Cette action fige la version actuelle de votre site et la rend immédiatement accessible à vos visiteurs.
                  </p>
                </div>

                {/* Verification checklist */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Vérifications automatiques :</span>
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <Check className="w-4 h-4" /> Nom commercial renseigné ({site.name})
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <Check className="w-4 h-4" /> Sous-domaine réservé ({site.subdomain_slug}.helpot.fr)
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <Check className="w-4 h-4" /> Pages et sections validées ({sections.length} sections)
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Continuer d'éditer
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    {isPublishing ? 'Publication en cours...' : 'Confirmer la publication'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default function VisualEditorPage() {
  return (
    <React.Suspense fallback={
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm font-semibold text-slate-300">Initialisation du studio...</p>
      </div>
    }>
      <VisualEditorContent />
    </React.Suspense>
  );
}
