
import React, { useState, useEffect, useRef } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';

type ViewType = 'home' | 'editor';

interface CustomFilter {
  id: string;
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

const HeroVisual = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 4), 3000);
    return () => clearInterval(timer);
  }, []);
  const getStyle = () => {
    switch(step) {
      case 1: return { filter: 'brightness(1.2) saturate(1.5) contrast(1.1)', transform: 'scale(1)' };
      case 2: return { filter: 'grayscale(100%) contrast(1.2)', transform: 'scale(1.1)' };
      case 3: return { filter: 'sepia(0.3) brightness(1.1)', transform: 'scale(0.9) rotate(-2deg)' };
      default: return { filter: 'none', transform: 'scale(1)' };
    }
  };
  const labels = ["Original", "Vivid Filter", "Deep Mono", "Studio Reframe"];
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square mb-12 group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/20 to-[#af52de]/20 blur-[80px] rounded-full animate-pulse"></div>
      <div className="relative h-full w-full bg-[#1c1c1e] rounded-[3.5rem] p-4 border border-white/10 shadow-3xl overflow-hidden flex items-center justify-center">
        <div className="absolute top-8 left-0 right-0 flex justify-center z-10">
          <div className="bg-black/60 ios-blur px-6 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-[#007aff] shadow-xl">{labels[step]}</div>
        </div>
        <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover rounded-[2.5rem] transition-all duration-1000 ease-in-out" style={getStyle()} />
        <div className="absolute bottom-10 left-10 w-12 h-12 bg-white/10 ios-blur rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl animate-float"><SparklesIcon className="text-[#007aff] w-6 h-6" /></div>
        <div className="absolute top-20 right-10 w-10 h-10 bg-white/10 ios-blur rounded-xl border border-white/10 flex items-center justify-center shadow-2xl animate-float" style={{animationDelay: '1s'}}><CropIcon className="text-[#af52de] w-5 h-5" /></div>
        <div className="absolute bottom-24 right-14 w-14 h-14 bg-white/10 ios-blur rounded-full border border-white/10 flex items-center justify-center shadow-2xl animate-float" style={{animationDelay: '2s'}}><AdjustmentsIcon className="text-[#34c759] w-7 h-7" /></div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isComparing, setIsComparing] = useState(false);

  // View state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Tool state
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  // Filter state
  const [lookCategory, setLookCategory] = useState<'Modern' | 'Studio' | 'Vintage' | 'Artistic'>('Modern');
  const [lastSelectedFilter, setLastSelectedFilter] = useState<{name: string, f: string} | null>(null);

  const [customFilters, setCustomFilters] = useState<CustomFilter[]>(() => {
    const saved = localStorage.getItem('imagerize_custom_filters');
    return saved ? JSON.parse(saved) : [];
  });

  // Interactive state
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });

  const activeProject = projects[activeIndex] || null;

  useEffect(() => {
    localStorage.setItem('imagerize_custom_filters', JSON.stringify(customFilters));
  }, [customFilters]);

  const updateActiveProject = (updated: ProjectImage) => {
    const newProjects = [...projects];
    newProjects[activeIndex] = updated;
    setProjects(newProjects);
  };

  const addToHistory = (url: string, meta: ImageMetadata, action?: string) => {
    if (!activeProject) return;
    const newHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
    newHistory.push({ url, metadata: meta, action });
    updateActiveProject({ ...activeProject, url, metadata: meta, history: newHistory, historyIndex: newHistory.length - 1 });
  };

  const undo = () => {
    if (!activeProject || activeProject.historyIndex <= 0) return;
    const idx = activeProject.historyIndex - 1;
    const prev = activeProject.history[idx];
    updateActiveProject({ ...activeProject, url: prev.url, metadata: prev.metadata, historyIndex: idx });
  };

  const redo = () => {
    if (!activeProject || activeProject.historyIndex >= activeProject.history.length - 1) return;
    const idx = activeProject.historyIndex + 1;
    const next = activeProject.history[idx];
    updateActiveProject({ ...activeProject, url: next.url, metadata: next.metadata, historyIndex: idx });
  };

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

  const applyTool = async (task: (img: HTMLImageElement) => Promise<string>, actionName: string, actionTag?: string) => {
    if (!activeProject) return;
    startTask(`${actionName}...`);
    try {
      const img = await imageService.loadImage(activeProject.url);
      const url = await task(img);
      const finalImg = await imageService.loadImage(url);
      const response = await fetch(url);
      const blob = await response.blob();
      addToHistory(url, { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type }, actionTag);
      setActiveTool(null);
    } catch (e) { console.error(e); } finally { endTask(); }
  };

  const handleUpload = async (files: File[]) => {
    startTask('Optimizing Assets...');
    const newProjects: ProjectImage[] = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: file.type,
        size: file.size, originalSize: file.size, name: file.name
      };
      return { id: Math.random().toString(36).substr(2, 9), url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0 };
    }));
    setProjects(prev => [...prev, ...newProjects]);
    setActiveIndex(projects.length);
    setView('editor');
    endTask();
  };

  const lookPresets = {
    Modern: [
      { name: 'Vivid', f: 'brightness(1.1) saturate(1.6)' },
      { name: 'Clean', f: 'brightness(1.05) contrast(1.05) saturate(1.1)' },
      { name: 'Sharp', f: 'contrast(1.2) brightness(1.02)' },
      { name: 'Bright', f: 'brightness(1.2) contrast(0.9) saturate(1.1)' },
      { name: 'Deep', f: 'contrast(1.3) brightness(0.9) saturate(1.2)' },
      { name: 'Frost', f: 'hue-rotate(180deg) saturate(1.1) brightness(1.1)' },
      { name: 'Velvet', f: 'contrast(1.1) saturate(0.9) brightness(0.95)' },
    ],
    Studio: [
      { name: 'Cinematic', f: 'contrast(1.3) saturate(1.2) brightness(0.9) sepia(0.1)' },
      { name: 'Portrait', f: 'saturate(1.2) brightness(1.05) sepia(0.1) contrast(1.1)' },
      { name: 'High Key', f: 'brightness(1.4) contrast(0.8) saturate(0.9)' },
      { name: 'Low Key', f: 'brightness(0.6) contrast(1.5) saturate(0.7)' },
      { name: 'Editorial', f: 'contrast(1.2) saturate(0.8) brightness(1.05) sepia(0.05)' },
      { name: 'Midnight', f: 'brightness(0.7) contrast(1.3) saturate(0.8) hue-rotate(-20deg)' },
    ],
    Vintage: [
      { name: 'Sepia', f: 'sepia(100%)' },
      { name: 'Antique', f: 'sepia(0.6) contrast(0.8) brightness(1.1)' },
      { name: 'Film', f: 'contrast(1.2) brightness(1.05) saturate(1.1) sepia(0.2)' },
      { name: 'Retro 80s', f: 'hue-rotate(330deg) saturate(1.4) contrast(0.9) brightness(1.1)' },
      { name: 'Instant', f: 'contrast(1.4) saturate(0.8) brightness(1.1) sepia(0.2)' },
      { name: 'Faded', f: 'opacity(0.8) contrast(0.8) saturate(0.7) brightness(1.1)' },
      { name: '1970s', f: 'sepia(0.5) hue-rotate(-30deg) saturate(1.2) contrast(0.8)' },
    ],
    Artistic: [
      { name: 'Mono', f: 'grayscale(100%) contrast(1.2)' },
      { name: 'Cyber', f: 'hue-rotate(280deg) saturate(2) brightness(1.2)' },
      { name: 'Blueprint', f: 'grayscale(100%) invert(1) sepia(1) hue-rotate(200deg) saturate(3)' },
      { name: 'Pop Art', f: 'saturate(5) contrast(2) hue-rotate(45deg)' },
      { name: 'Infrared', f: 'invert(1) hue-rotate(180deg) saturate(2)' },
      { name: 'DuoTone', f: 'grayscale(100%) sepia(1) hue-rotate(200deg) saturate(4) contrast(1.2)' },
      { name: 'Solarize', f: 'invert(0.5) contrast(2) saturate(1.5)' },
      { name: 'Ghost', f: 'opacity(0.6) blur(2px) contrast(2) brightness(1.2)' },
      { name: 'Ethereal', f: 'brightness(1.2) blur(1px) saturate(0.8) contrast(0.9)' },
      { name: 'Acid', f: 'hue-rotate(90deg) saturate(3) invert(0.1)' },
    ]
  };

  const DragHandle = ({ id, className }: { id: string, className: string }) => (
    <div 
      onMouseDown={(e) => {
          e.preventDefault(); e.stopPropagation();
          setActiveHandle(id);
          dragStartPos.current = { x: e.clientX, y: e.clientY };
      }}
      className={`absolute w-10 h-10 flex items-center justify-center pointer-events-auto z-30 transition-all ${className} ${activeHandle === id ? 'scale-125' : 'hover:scale-110'}`}
    >
      <div className={`w-5 h-5 border-[#007aff] ${id.includes('top') ? 'border-t-[4px]' : 'border-b-[4px]'} ${id.includes('left') ? 'border-l-[4px]' : 'border-r-[4px]'} drop-shadow-md`} />
    </div>
  );

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (activeHandle) return; e.preventDefault(); setIsPanning(true); dragStartPos.current = { x: e.clientX, y: e.clientY }; panStartOffset.current = { x: panOffset.x, y: panOffset.y };
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] flex flex-col overflow-x-hidden transition-all duration-500">
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300"></div>
          <div className="relative bg-[#1c1c1e]/80 ios-blur p-12 rounded-[4rem] ios-shadow-lg flex flex-col items-center gap-10 border border-white/10 animate-in zoom-in-95 duration-500">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-[6px] border-[#007aff]/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#007aff] font-black text-2xl tracking-widest uppercase text-center max-w-[300px] leading-tight">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-black/60 ios-blur border-b border-white/5 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-12 h-12 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#007aff]/30">
            <SparklesIcon className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white">Imagerize</h1>
        </div>
        
        {view !== 'home' && (
          <div className="flex items-center gap-4">
             {view === 'editor' && activeProject && (
               <>
                <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 active:scale-90 transition-all"><EyeIcon className="w-6 h-6" /></button>
                <button onClick={() => { setZoom(1); setPanOffset({x:0, y:0}); }} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 active:scale-90 transition-all"><ResetIcon className="w-6 h-6" /></button>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <button onClick={undo} disabled={activeProject.historyIndex <= 0} className="w-12 h-12 rounded-full text-[#007aff] disabled:opacity-20 active:scale-90 transition-transform"><UndoIcon className="w-6 h-6" /></button>
                <button onClick={redo} disabled={activeProject.historyIndex >= activeProject.history.length - 1} className="w-12 h-12 rounded-full text-[#007aff] disabled:opacity-20 active:scale-90 transition-transform"><RedoIcon className="w-6 h-6" /></button>
               </>
             )}
             <button onClick={() => setView('home')} className="bg-white/10 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all">Home</button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 transition-all duration-700">
        
        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="py-12 flex flex-col items-center animate-in fade-in duration-1000">
            <HeroVisual />
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-7xl font-black tracking-tighter leading-[0.95]">Crafted for <br/><span className="bg-gradient-to-r from-[#007aff] via-[#af52de] to-[#ff2d55] bg-clip-text text-transparent">Perfection.</span></h2>
              <p className="text-[#8e8e93] text-2xl font-medium max-w-xl mx-auto">Advanced image processing engine with pro-grade studio tools.</p>
            </div>

            <div className="w-full max-w-xl flex justify-center">
              <div 
                className="group relative w-full p-10 bg-[#1c1c1e] rounded-[4rem] border border-white/5 ios-shadow-lg cursor-pointer hover:scale-[1.02] transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 group-hover:rotate-12 transition-transform">
                  <AdjustmentsIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black mb-3">Studio Editor</h3>
                <p className="text-white/40 font-bold mb-8">Professional grade resizing, cropping, and color grading suite.</p>
                <div className="bg-white text-black px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl group-hover:bg-[#007aff] group-hover:text-white transition-all">Launch Studio</div>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === 'editor' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            {projects.length === 0 ? (
               <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-12">
                  <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center border border-white/10">
                    <UploadIcon className="w-16 h-16 text-white/20" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black">No Active Projects</h2>
                    <p className="text-white/40 text-xl font-medium">Import photos to start your professional edit session.</p>
                  </div>
                  <Uploader onUpload={handleUpload} onUrlUpload={() => {}} />
               </div>
            ) : (
              <>
                {/* PROJECT SWITCHER */}
                <div className="flex items-center gap-5 overflow-x-auto pb-6 no-scrollbar">
                  <button onClick={() => setView('home')} className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex-shrink-0 flex items-center justify-center active:scale-95 transition-all"><XIcon className="w-8 h-8 opacity-40"/></button>
                  {projects.map((proj, idx) => (
                    <div 
                      key={proj.id} 
                      onClick={() => { setActiveIndex(idx); setActiveTool(null); }}
                      className={`relative w-24 h-24 rounded-[2.5rem] flex-shrink-0 overflow-hidden border-4 transition-all cursor-pointer ${activeIndex === idx ? 'border-[#007aff] scale-110 shadow-2xl' : 'border-white/5 opacity-50'}`}
                    >
                      <img src={proj.url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                {/* PREVIEW CONTAINER */}
                <div className="bg-[#1c1c1e] p-2 rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden group relative">
                  <div 
                    ref={previewContainerRef} 
                    className={`relative w-full aspect-video min-h-[50vh] max-h-[70vh] overflow-hidden rounded-[3.5rem] bg-black/40 flex items-center justify-center ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={handleImageMouseDown}
                  >
                    <div className="relative transition-transform duration-300 ease-out" style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)` }}>
                      <img 
                        ref={imageRef} 
                        src={isComparing ? activeProject.history[0].url : activeProject.url} 
                        style={{ 
                          filter: activeTool === ToolType.ADJUST ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)` : 'none'
                        }}
                        className="max-w-full max-h-[65vh] object-contain pointer-events-none" 
                      />
                      
                      {activeTool === ToolType.CROP && !isComparing && (
                        <div className="absolute z-20 pointer-events-none" style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' }}>
                          <div className="absolute inset-0 border-2 border-[#007aff]">
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                            </div>
                          </div>
                          <DragHandle id="top-left" className="-top-2 -left-2 cursor-nw-resize" />
                          <DragHandle id="top-right" className="-top-2 -right-2 cursor-ne-resize" />
                          <DragHandle id="bottom-left" className="-bottom-2 -left-2 cursor-sw-resize" />
                          <DragHandle id="bottom-right" className="-bottom-2 -right-2 cursor-se-resize" />
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-8 right-8 flex items-center gap-4 bg-black/50 ios-blur border border-white/10 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <button onClick={() => setZoom(Math.max(1, zoom-0.5))} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ZoomOutIcon className="w-6 h-6" /></button>
                      <span className="text-[12px] font-black w-10 text-center">{Math.round(zoom*100)}%</span>
                      <button onClick={() => setZoom(Math.min(4, zoom+0.5))} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ZoomInIcon className="w-6 h-6" /></button>
                    </div>
                  </div>

                  {/* INFO BAR */}
                  <div className="p-10 flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black truncate max-w-[300px] leading-tight">{activeProject.metadata.name}</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-white/50">{activeProject.metadata.width} × {activeProject.metadata.height}</span>
                        <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-white/50">{activeProject.metadata.format.split('/')[1]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <a href={activeProject.url} download={activeProject.metadata.name} className="bg-white text-black px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 hover:bg-[#007aff] hover:text-white transition-all">Export</a>
                    </div>
                  </div>
                </div>

                {/* TOOL INTERFACE SECTION */}
                <div className="min-h-[300px] pb-20">
                  {activeTool === ToolType.FILTER && (
                    <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-10 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black tracking-tighter uppercase">Studio Looks</h3>
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                          {(['Modern', 'Studio', 'Vintage', 'Artistic'] as const).map(cat => (
                            <button 
                              key={cat} 
                              onClick={() => setLookCategory(cat)}
                              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookCategory === cat ? 'bg-[#007aff] text-white' : 'text-white/40'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-8 overflow-y-auto no-scrollbar pb-4 max-h-[40vh]">
                        {lookPresets[lookCategory as keyof typeof lookPresets].map((p) => (
                          <button 
                            key={p.name} 
                            onClick={() => {
                              setLastSelectedFilter({ name: p.name, f: p.f });
                              applyTool((img) => imageService.applyFilter(img, p.f), p.name);
                            }}
                            className="flex flex-col items-center gap-4 group"
                          >
                            <div className={`w-20 h-20 rounded-3xl border-4 overflow-hidden relative transition-all duration-300 ${lastSelectedFilter?.name === p.name ? 'border-[#007aff] scale-110 shadow-2xl' : 'border-white/5 group-hover:border-white/20'}`}>
                                <img src={activeProject!.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors text-center ${lastSelectedFilter?.name === p.name ? 'text-[#007aff]' : 'text-white/30 group-hover:text-white'}`}>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTool === ToolType.ADJUST && (
                    <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-12 animate-in slide-in-from-top-4 duration-500">
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black tracking-tighter uppercase">Live Image Grading</h3>
                        <button onClick={() => { setBrightness(100); setContrast(100); setSaturate(100); }} className="text-[#007aff] text-xs font-black uppercase">Reset</button>
                      </div>
                      <div className="space-y-10">
                        {[{l:'Exposure',v:brightness,s:setBrightness}, {l:'Contrast',v:contrast,s:setContrast}, {l:'Saturation',v:saturate,s:setSaturate}].map(a => (
                          <div key={a.l} className="space-y-4">
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest opacity-40"><span>{a.l}</span><span>{a.v}%</span></div>
                            <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-5">
                        <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 py-6 rounded-3xl text-xs font-black uppercase tracking-widest">Cancel</button>
                        <button 
                          onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Baking Grade')}
                          className="flex-[2] bg-[#007aff] py-6 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl"
                        >Render Permanently</button>
                      </div>
                    </div>
                  )}

                  {!activeTool && <div className="text-center py-32 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 animate-in fade-in duration-1000"><p className="text-xs font-black uppercase tracking-[0.8em] opacity-10">Select Engine to Begin Studio Session</p></div>}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-20 px-8 border-t border-white/5 bg-black/60 ios-blur mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 opacity-40">
          <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.5em]">
            <span>Privacy</span><span>Terms</span><span>Legal</span>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em]">IMAGERIZE STUDIO • CORE v4.8</p>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => {
          if (t === ToolType.BW) { applyTool((img) => imageService.grayscaleImage(img), 'Mono'); return; }
          if (activeTool === t) setActiveTool(null); else setActiveTool(t);
        }} />
      )}
    </div>
  );
}
