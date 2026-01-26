
import React, { useState, useEffect, useRef } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';

type ViewType = 'home' | 'editor' | 'enhance';

const HeroVisual = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 4), 4000);
    return () => clearInterval(timer);
  }, []);
  
  const getStyle = () => {
    switch(step) {
      case 1: return { filter: 'brightness(1.1) saturate(1.4) contrast(1.1)', transform: 'scale(1.02)' };
      case 2: return { filter: 'grayscale(100%) contrast(1.25)', transform: 'scale(1.05) rotate(1deg)' };
      case 3: return { filter: 'sepia(0.2) contrast(1.1) brightness(1.05)', transform: 'scale(1) rotate(-1deg)' };
      default: return { filter: 'none', transform: 'scale(1)' };
    }
  };

  const labels = ["Raw Capture", "Studio Vivid", "Noir Mono", "Film Classic"];

  return (
    <div className="relative w-full max-w-xl mx-auto aspect-square mb-16 px-4 group">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#007aff]/30 via-[#5856d6]/20 to-[#af52de]/30 blur-[100px] rounded-full animate-pulse opacity-60"></div>
      <div className="relative h-full w-full bg-[#1c1c1e] rounded-[4rem] p-5 border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
        <div className="absolute top-10 left-0 right-0 flex justify-center z-10">
          <div className="bg-black/40 ios-blur px-8 py-2.5 rounded-full border border-white/10 text-[11px] font-black uppercase tracking-[0.4em] text-[#007aff] shadow-xl transition-all duration-700">
            {labels[step]}
          </div>
        </div>
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" 
          className="w-full h-full object-cover rounded-[3.2rem] transition-all duration-[2000ms] cubic-bezier(0.4, 0, 0.2, 1)" 
          style={getStyle()} 
        />
        <div className="absolute bottom-12 left-12 w-14 h-14 bg-white/10 ios-blur rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl animate-float"><AdjustmentsIcon className="text-[#007aff] w-7 h-7" /></div>
        <div className="absolute top-24 right-12 w-12 h-12 bg-white/10 ios-blur rounded-xl border border-white/10 flex items-center justify-center shadow-2xl animate-float" style={{animationDelay: '1.5s'}}><CropIcon className="text-[#af52de] w-6 h-6" /></div>
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

  // Interaction State
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Tool specific State
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pixelScale, setPixelScale] = useState(0.1);
  const [compressQuality, setCompressQuality] = useState(0.8);

  const [lookCategory, setLookCategory] = useState<'Modern' | 'Studio' | 'Vintage' | 'Artistic' | 'Glitch' | 'Cartoon'>('Modern');

  const activeProject = projects[activeIndex] || null;

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
    } catch (e) { 
      console.error(e); 
      alert("An error occurred during processing.");
    } finally { endTask(); }
  };

  const handleUpload = async (files: File[]) => {
    startTask('Preparing Studio...');
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

  const handleAutoEnhance = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    startTask('Analyzing Histogram...');
    try {
      const originalUrl = URL.createObjectURL(file);
      const img = await imageService.loadImage(originalUrl);
      
      // Simulate "Intelligent" Enhance
      const enhancedUrl = await imageService.applyFilter(img, 'brightness(1.05) contrast(1.15) saturate(1.25)');
      const finalImg = await imageService.loadImage(enhancedUrl);
      const finalBlob = await (await fetch(enhancedUrl)).blob();

      const meta: ImageMetadata = {
        width: finalImg.width, height: finalImg.height, format: finalBlob.type,
        size: finalBlob.size, originalSize: file.size, name: `Enhanced_${file.name}`
      };

      const newProject: ProjectImage = {
        id: Math.random().toString(36).substr(2, 9),
        url: enhancedUrl,
        metadata: meta,
        history: [
          { url: originalUrl, metadata: { ...meta, width: img.width, height: img.height, size: file.size, format: file.type } },
          { url: enhancedUrl, metadata: meta, action: 'Auto Enhance' }
        ],
        historyIndex: 1
      };

      setProjects(prev => [...prev, newProject]);
      setActiveIndex(projects.length);
      setView('editor');
    } catch (e) {
      alert("Auto enhance failed.");
    } finally {
      endTask();
    }
  };

  const lookPresets = {
    Modern: [
      { name: 'Vivid', f: 'brightness(1.1) saturate(1.6)' },
      { name: 'Clean', f: 'brightness(1.05) contrast(1.05) saturate(1.1)' },
      { name: 'Sharp', f: 'contrast(1.2) brightness(1.02)' },
      { name: 'Bright', f: 'brightness(1.2) contrast(0.9) saturate(1.1)' },
      { name: 'Deep', f: 'contrast(1.3) brightness(0.9) saturate(1.2)' },
    ],
    Studio: [
      { name: 'Cinematic', f: 'contrast(1.3) saturate(1.2) brightness(0.9) sepia(0.1)' },
      { name: 'Portrait', f: 'saturate(1.2) brightness(1.05) sepia(0.1) contrast(1.1)' },
      { name: 'High Key', f: 'brightness(1.4) contrast(0.8) saturate(0.9)' },
      { name: 'Midnight', f: 'brightness(0.7) contrast(1.3) saturate(0.8) hue-rotate(-20deg)' },
    ],
    Vintage: [
      { name: 'Sepia', f: 'sepia(100%)' },
      { name: 'Film', f: 'contrast(1.2) brightness(1.05) saturate(1.1) sepia(0.2)' },
      { name: 'Retro 80s', f: 'hue-rotate(330deg) saturate(1.4) contrast(0.9) brightness(1.1)' },
      { name: '1970s', f: 'sepia(0.5) hue-rotate(-30deg) saturate(1.2) contrast(0.8)' },
    ],
    Artistic: [
      { name: 'Noir', f: 'grayscale(100%) contrast(1.4) brightness(0.9)' },
      { name: 'Blueprint', f: 'grayscale(100%) invert(1) sepia(1) hue-rotate(200deg) saturate(3)' },
      { name: 'Infrared', f: 'invert(1) hue-rotate(180deg) saturate(2)' },
      { name: 'Ethereal', f: 'brightness(1.2) blur(1px) saturate(0.8) contrast(0.9)' },
    ],
    Glitch: [
      { name: 'Chromatic', f: 'contrast(1.3) saturate(2) hue-rotate(15deg) brightness(1.1)' },
      { name: 'Shift', f: 'hue-rotate(180deg) contrast(1.2) brightness(1.2) saturate(1.5)' },
      { name: 'Static', f: 'contrast(3) grayscale(0.4) brightness(1.1)' },
      { name: 'Digital', f: 'invert(0.05) hue-rotate(240deg) saturate(3) brightness(1.1)' },
      { name: 'Interference', f: 'contrast(1.5) saturate(1.8) hue-rotate(-45deg)' },
    ],
    Cartoon: [
      { name: 'Toon', f: 'saturate(2.2) contrast(1.4) brightness(1.1)' },
      { name: 'Ink', f: 'grayscale(100%) contrast(10) brightness(1.1)' },
      { name: 'Sketch', f: 'grayscale(100%) contrast(4) brightness(1.3) sepia(0.1)' },
      { name: 'Pop Art', f: 'saturate(4) contrast(1.6) brightness(1.1)' },
      { name: 'Poster', f: 'contrast(2.5) saturate(1.2) brightness(1.05)' },
    ]
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { x: panOffset.x, y: panOffset.y };
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      setPanOffset({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy });
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPanning]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30 overflow-x-hidden">
      {/* PROCESSING OVERLAY */}
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl"></div>
          <div className="relative bg-[#1c1c1e]/90 ios-blur p-16 rounded-[4rem] flex flex-col items-center gap-10 border border-white/10 shadow-[0_0_100px_rgba(0,122,255,0.2)]">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-[6px] border-[#007aff]/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#007aff] font-black text-2xl tracking-[0.2em] uppercase text-center max-w-[320px] leading-tight">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/60 ios-blur border-b border-white/5 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('home')}>
          <div className="w-12 h-12 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#007aff]/30">
            <SparklesIcon className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter hidden sm:block">Imagerize</h1>
        </div>
        
        {view !== 'home' && (
          <div className="flex items-center gap-2 md:gap-4">
            {view === 'editor' && activeProject && (
              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-all"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => { setZoom(1); setPanOffset({x:0, y:0}); }} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-all"><ResetIcon className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={undo} disabled={activeProject.historyIndex <= 0} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-10 hover:bg-white/5 transition-all"><UndoIcon className="w-5 h-5" /></button>
                <button onClick={redo} disabled={activeProject.historyIndex >= activeProject.history.length - 1} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-10 hover:bg-white/5 transition-all"><RedoIcon className="w-5 h-5" /></button>
              </div>
            )}
            <button onClick={() => setView('home')} className="bg-white text-black px-6 py-2.5 rounded-full text-[13px] font-bold active:scale-95 transition-all">Home</button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 transition-all duration-700">
        
        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="py-12 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <HeroVisual />
            <div className="text-center space-y-6 mb-16 px-4">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] max-w-4xl mx-auto">
                Studio Quality. <br/>
                <span className="bg-gradient-to-r from-[#007aff] via-[#af52de] to-[#ff2d55] bg-clip-text text-transparent">Simply Crafted.</span>
              </h2>
              <p className="text-[#8e8e93] text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
                Professional image mastering suite designed for absolute control.
              </p>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              {/* STUDIO EDITOR CARD */}
              <div 
                className="group relative p-12 bg-[#1c1c1e] rounded-[4rem] border border-white/5 shadow-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 bg-[#1c1c1e] border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-xl group-hover:bg-[#007aff] transition-all">
                  <AdjustmentsIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black mb-3">Studio Editor</h3>
                <p className="text-white/40 font-bold mb-8 leading-snug">Full manual control over every pixel with high-end grading tools.</p>
                <div className="bg-white/5 text-white/60 border border-white/10 px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] group-hover:bg-white group-hover:text-black transition-all">Open Suite</div>
              </div>

              {/* AUTO ENHANCE CARD */}
              <div 
                className="group relative p-12 bg-gradient-to-br from-[#007aff]/20 to-[#af52de]/20 rounded-[4rem] border border-white/10 shadow-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
                onClick={() => setView('enhance')}
              >
                <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform">
                  <MagicWandIcon className="w-10 h-10 text-[#007aff]" />
                </div>
                <h3 className="text-3xl font-black mb-3">Auto Enhance</h3>
                <p className="text-white/40 font-bold mb-8 leading-snug">Single-tap mastering using intelligent histogram balancing.</p>
                <div className="bg-[#007aff] text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl group-hover:bg-white group-hover:text-[#007aff] transition-all">Magic Polish</div>
              </div>
            </div>
          </div>
        )}

        {/* ENHANCE VIEW */}
        {view === 'enhance' && (
          <div className="py-20 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-12 duration-700 max-w-3xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-[#007aff] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(0,122,255,0.4)] animate-pulse">
                <MagicWandIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-5xl font-black tracking-tight">Intelligent Mastering</h2>
              <p className="text-white/40 text-xl font-medium">Upload a photo to automatically fix exposure, contrast, and color vibrance.</p>
            </div>

            <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/10 shadow-3xl text-center group cursor-pointer relative overflow-hidden transition-all hover:border-[#007aff]/50">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleAutoEnhance(Array.from(e.target.files || []))} accept="image/*" />
               <div className="flex flex-col items-center gap-8 py-10">
                  <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center group-hover:border-[#007aff] transition-colors">
                    <UploadIcon className="w-8 h-8 opacity-40 group-hover:opacity-100 text-[#007aff]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black">Drop photo to enhance</p>
                    <p className="text-white/20 font-bold uppercase tracking-widest text-sm">Instant studio mastering</p>
                  </div>
                  <button className="bg-white/5 px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/10 group-hover:bg-[#007aff] group-hover:text-white transition-all">Select Image</button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
               {[
                 { t: 'Luminance', d: 'Perfects shadow recovery and highlights.' },
                 { t: 'Vibrance', d: 'Boosts dull colors without clipping.' },
                 { t: 'Definition', d: 'Intelligently sharpens natural textures.' }
               ].map(f => (
                 <div key={f.t} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 text-center">
                    <h4 className="text-[#007aff] font-black uppercase tracking-widest text-xs mb-3">{f.t}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{f.d}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === 'editor' && (
          <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
            {projects.length === 0 ? (
               <div className="w-full flex flex-col items-center justify-center min-h-[70vh] text-center gap-12 px-6">
                  <div className="w-32 h-32 bg-white/5 rounded-[3.5rem] flex items-center justify-center border border-white/10 shadow-inner">
                    <UploadIcon className="w-14 h-14 text-white/20" />
                  </div>
                  <div className="space-y-4 max-w-md">
                    <h2 className="text-5xl font-black tracking-tight">Empty Gallery</h2>
                    <p className="text-white/40 text-xl font-medium">Import photos to begin your professional edit session.</p>
                  </div>
                  <Uploader onUpload={handleUpload} onUrlUpload={() => {}} />
               </div>
            ) : (
              <>
                {/* LEFT SIDE: PREVIEW & ASSETS */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* PROJECT SWITCHER */}
                  <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                    <button onClick={() => setView('home')} className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all"><XIcon className="w-7 h-7 opacity-40"/></button>
                    {projects.map((proj, idx) => (
                      <div 
                        key={proj.id} 
                        onClick={() => { setActiveIndex(idx); setActiveTool(null); }}
                        className={`relative w-20 h-20 rounded-[2rem] flex-shrink-0 overflow-hidden border-4 transition-all duration-300 cursor-pointer ${activeIndex === idx ? 'border-[#007aff] scale-110 shadow-[0_20px_40px_rgba(0,122,255,0.3)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                      >
                        <img src={proj.url} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <label className="w-20 h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
                      <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                      <UploadIcon className="w-6 h-6 opacity-40" />
                    </label>
                  </div>

                  {/* MAIN CANVAS */}
                  <div className="relative flex-1 bg-[#1c1c1e] rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden group">
                    <div 
                      ref={previewContainerRef} 
                      className={`relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden transition-colors ${isPanning ? 'bg-black/60 cursor-grabbing' : 'bg-black/40 cursor-grab'}`}
                      onMouseDown={handleImageMouseDown}
                    >
                      <div 
                        className="relative transition-transform duration-300 ease-out will-change-transform" 
                        style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)` }}
                      >
                        <img 
                          ref={imageRef} 
                          src={isComparing ? activeProject.history[0].url : activeProject.url} 
                          style={{ 
                            filter: activeTool === ToolType.ADJUST ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)` : 'none'
                          }}
                          className="max-w-[90vw] max-h-[70vh] object-contain shadow-2xl pointer-events-none rounded-lg" 
                        />
                        
                        {activeTool === ToolType.CROP && !isComparing && (
                          <div className="absolute inset-0 pointer-events-none border-2 border-[#007aff] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* ZOOM CONTROLS */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 ios-blur border border-white/10 rounded-full p-2 px-6 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <button onClick={() => setZoom(Math.max(0.5, zoom-0.2))} className="p-3 hover:bg-white/10 rounded-full transition-colors"><ZoomOutIcon className="w-6 h-6 text-white/60" /></button>
                        <span className="text-[14px] font-black w-14 text-center tabular-nums">{Math.round(zoom*100)}%</span>
                        <button onClick={() => setZoom(Math.min(5, zoom+0.2))} className="p-3 hover:bg-white/10 rounded-full transition-colors"><ZoomInIcon className="w-6 h-6 text-white/60" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: TOOLS PANEL */}
                <div className="w-full lg:w-[400px] flex flex-col gap-6">
                  <div className="bg-[#1c1c1e] p-8 rounded-[4rem] border border-white/10 shadow-2xl space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
                    {activeTool ? (
                      <div className="animate-in slide-in-from-right-8 duration-500 flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black uppercase tracking-widest text-[#007aff]">{activeTool}</h3>
                          <button onClick={() => setActiveTool(null)} className="p-3 hover:bg-white/5 rounded-full transition-colors"><XIcon className="w-5 h-5 text-white/40" /></button>
                        </div>

                        {/* ADJUST TOOL */}
                        {activeTool === ToolType.ADJUST && (
                          <div className="space-y-10">
                            {[{l:'Exposure', v:brightness, s:setBrightness}, {l:'Contrast', v:contrast, s:setContrast}, {l:'Saturate', v:saturate, s:setSaturate}].map(a => (
                              <div key={a.l} className="space-y-4">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                  <span>{a.l}</span>
                                  <span className="text-white">{a.v}%</span>
                                </div>
                                <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                              </div>
                            ))}
                            <div className="flex gap-4 pt-4">
                               <button onClick={() => {setBrightness(100); setContrast(100); setSaturate(100);}} className="flex-1 py-4 rounded-3xl bg-white/5 font-bold uppercase text-[11px] tracking-widest transition-all hover:bg-white/10">Reset</button>
                               <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Baking Grade')} className="flex-[2] py-4 rounded-3xl bg-[#007aff] font-bold uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all">Apply</button>
                            </div>
                          </div>
                        )}

                        {/* FILTER TOOL */}
                        {activeTool === ToolType.FILTER && (
                          <div className="space-y-8">
                            <div className="flex overflow-x-auto no-scrollbar gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                              {(['Modern', 'Studio', 'Vintage', 'Artistic', 'Glitch', 'Cartoon'] as const).map(cat => (
                                <button key={cat} onClick={() => setLookCategory(cat)} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lookCategory === cat ? 'bg-[#007aff] text-white' : 'text-white/30 hover:text-white'}`}>{cat}</button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {lookPresets[lookCategory as keyof typeof lookPresets].map((p) => (
                                <button key={p.name} onClick={() => applyTool((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col items-center gap-3 group bg-black/20 p-3 rounded-[2rem] border border-white/5 hover:border-[#007aff] transition-all">
                                  <div className="w-full aspect-square rounded-2xl border-2 border-white/5 overflow-hidden transition-all duration-300 group-hover:scale-105">
                                    <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-tighter text-white/40 group-hover:text-white transition-colors">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CROP TOOL */}
                        {activeTool === ToolType.CROP && (
                           <div className="space-y-8">
                             <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-2">Aspect Ratio</p>
                                <div className="grid grid-cols-3 gap-3">
                                   {[
                                     { label: 'Free', r: null },
                                     { label: 'Square', r: 1 },
                                     { label: '4:5', r: 0.8 },
                                     { label: '9:16', r: 0.5625 },
                                     { label: '3:4', r: 0.75 },
                                     { label: '16:9', r: 1.777 }
                                   ].map(ratio => (
                                     <button 
                                       key={ratio.label} 
                                       className="py-4 bg-white/5 rounded-2xl text-[11px] font-black uppercase hover:bg-white/10 active:scale-95 transition-all"
                                       onClick={() => {
                                          if (ratio.r) {
                                            const w = 80;
                                            const h = (80 / ratio.r) * (activeProject.metadata.width / activeProject.metadata.height);
                                            setCropBox({ ...cropBox, w, h: Math.min(h, 80) });
                                          }
                                       }}
                                     >
                                       {ratio.label}
                                     </button>
                                   ))}
                                </div>
                             </div>
                             <button onClick={() => applyTool((img) => imageService.cropImage(img, (cropBox.x/100)*img.width, (cropBox.y/100)*img.height, (cropBox.w/100)*img.width, (cropBox.h/100)*img.height), 'Studio Reframe')} className="w-full py-6 rounded-3xl bg-[#007aff] font-bold uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Apply Crop</button>
                           </div>
                        )}

                        {/* RESIZE TOOL */}
                        {activeTool === ToolType.RESIZE && (
                          <div className="space-y-8">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-2">Common Presets</p>
                                <div className="grid grid-cols-2 gap-3">
                                   {[
                                     { label: 'IG Square', w: 1080, h: 1080 },
                                     { label: 'IG Story', w: 1080, h: 1920 },
                                     { label: 'HD 1080', w: 1920, h: 1080 },
                                     { label: '4K Ultra', w: 3840, h: 2160 }
                                   ].map(preset => (
                                     <button 
                                       key={preset.label} 
                                       className="py-4 bg-white/5 rounded-2xl text-[11px] font-black uppercase hover:bg-white/10 active:scale-95 transition-all"
                                       onClick={() => { setWidth(preset.w.toString()); setHeight(preset.h.toString()); }}
                                     >
                                       {preset.label}
                                     </button>
                                   ))}
                                </div>
                             </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Width</label>
                                <input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder={activeProject.metadata.width.toString()} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-all" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Height</label>
                                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder={activeProject.metadata.height.toString()} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-all" />
                              </div>
                            </div>
                            <button onClick={() => applyTool((img) => imageService.resizeImage(img, parseInt(width) || img.width, parseInt(height) || img.height), 'Resampling')} className="w-full py-6 rounded-3xl bg-[#007aff] font-bold uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Confirm Rescale</button>
                          </div>
                        )}

                        {/* ROTATE TOOL */}
                        {activeTool === ToolType.ROTATE && (
                           <div className="space-y-10">
                              <div className="space-y-6">
                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                    <span>Precision Rotation</span>
                                    <span className="text-white">{rotation}°</span>
                                 </div>
                                 <input type="range" min="-45" max="45" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-full" />
                                 <div className="flex gap-4">
                                    <button onClick={() => applyTool(img => imageService.rotateImage(img, -90), 'Rotate Left')} className="flex-1 py-4 bg-white/5 rounded-2xl flex flex-col items-center gap-2"><RotateIcon className="w-5 h-5 -scale-x-100" /><span className="text-[9px] font-black uppercase">-90°</span></button>
                                    <button onClick={() => applyTool(img => imageService.rotateImage(img, 90), 'Rotate Right')} className="flex-1 py-4 bg-white/5 rounded-2xl flex flex-col items-center gap-2"><RotateIcon className="w-5 h-5" /><span className="text-[9px] font-black uppercase">+90°</span></button>
                                 </div>
                              </div>
                              <button onClick={() => applyTool(img => imageService.rotateImage(img, rotation), 'Fine Rotate')} className="w-full py-6 rounded-3xl bg-[#007aff] font-bold uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Apply Rotation</button>
                           </div>
                        )}

                        {/* MIRROR TOOL */}
                        {activeTool === ToolType.MIRROR && (
                           <div className="space-y-8">
                              <p className="text-white/40 text-center font-medium">Flip image across axes</p>
                              <div className="grid grid-cols-2 gap-4">
                                 <button onClick={() => applyTool(img => imageService.flipImage(img, 'horizontal'), 'Horizontal Flip')} className="py-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:border-[#007aff] transition-all">
                                    <MirrorIcon className="w-8 h-8 text-[#007aff]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Horizontal</span>
                                 </button>
                                 <button onClick={() => applyTool(img => imageService.flipImage(img, 'vertical'), 'Vertical Flip')} className="py-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:border-[#af52de] transition-all">
                                    <MirrorIcon className="w-8 h-8 text-[#af52de] rotate-90" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Vertical</span>
                                 </button>
                              </div>
                           </div>
                        )}

                        {/* COMPRESS TOOL */}
                        {activeTool === ToolType.COMPRESS && (
                           <div className="space-y-10">
                              <div className="space-y-4">
                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                    <span>Quality Profile</span>
                                    <span className="text-white">{Math.round(compressQuality*100)}%</span>
                                 </div>
                                 <input type="range" min="0.1" max="1.0" step="0.05" value={compressQuality} onChange={e => setCompressQuality(parseFloat(e.target.value))} className="w-full" />
                              </div>
                              <button onClick={() => applyTool(img => imageService.compressImage(img, compressQuality), 'Shrinking')} className="w-full py-6 rounded-3xl bg-[#34c759] text-white font-bold uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Execute Compression</button>
                           </div>
                        )}

                        {/* PIXELATE TOOL */}
                        {activeTool === ToolType.PIXELATE && (
                           <div className="space-y-10">
                              <div className="space-y-4">
                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                    <span>Pixel Density</span>
                                    <span className="text-white">{Math.round(pixelScale*100)}%</span>
                                 </div>
                                 <input type="range" min="0.01" max="0.5" step="0.01" value={pixelScale} onChange={e => setPixelScale(parseFloat(e.target.value))} className="w-full" />
                              </div>
                              <button onClick={() => applyTool(img => imageService.pixelateImage(img, pixelScale), 'Retro Engine')} className="w-full py-6 rounded-3xl bg-[#ff9500] text-white font-bold uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all">Apply Pixelation</button>
                           </div>
                        )}

                      </div>
                    ) : (
                      <div className="h-[400px] flex flex-col items-center justify-center text-center gap-6 animate-in fade-in duration-1000">
                         <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                            <SparklesIcon className="w-8 h-8 text-white/10" />
                         </div>
                         <div className="space-y-2">
                           <h4 className="font-black uppercase tracking-[0.3em] text-[12px] text-white/40">Studio Session</h4>
                           <p className="text-white/20 text-sm font-medium px-12">Select an engine from the toolbar below to start editing.</p>
                         </div>
                      </div>
                    )}
                  </div>

                  {/* PROJECT INFO CARD */}
                  <div className="bg-[#1c1c1e] p-8 rounded-[4rem] border border-white/10 shadow-2xl flex items-center justify-between">
                    <div>
                       <h3 className="text-2xl font-black truncate max-w-[200px] mb-1">{activeProject.metadata.name}</h3>
                       <div className="flex gap-2">
                         <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/5 rounded-full text-white/40">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                         <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#007aff]/10 rounded-full text-[#007aff]">{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                       </div>
                    </div>
                    <a href={activeProject.url} download={`imagerize_${activeProject.metadata.name}`} className="bg-white text-black px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-[#007aff] hover:text-white active:scale-95 transition-all">Export</a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-16 px-8 border-t border-white/5 bg-black/40 ios-blur mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
          <p className="text-[11px] font-black uppercase tracking-[0.4em]">© 2024 IMAGERIZE STUDIO • CORE v4.8</p>
          <div className="flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.5em]">
            <span className="cursor-pointer hover:text-white transition-colors">Privacy</span>
            <span className="cursor-pointer hover:text-white transition-colors">Terms</span>
            <span className="cursor-pointer hover:text-white transition-colors">Support</span>
          </div>
        </div>
      </footer>

      {/* BOTTOM TOOLBAR */}
      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}
