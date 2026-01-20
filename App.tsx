
import React, { useState, useEffect, useRef } from 'react';
import { ToolType, ImageMetadata, ProjectImage } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, MirrorIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, BorderIcon, ConvertIcon, CompressIcon, PixelIcon, AdjustmentsIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';
import * as geminiService from './services/geminiService.ts';

interface AiSuggestions {
  aesthetic_review: string;
  narrative: string;
  suggested_filter: string;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  crop_advice: string;
}

export default function App() {
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<AiSuggestions | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // View state
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Tool specific state
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [quality, setQuality] = useState(0.85);
  const [targetFormat, setTargetFormat] = useState<string>('image/png');
  const [rotationAngle, setRotationAngle] = useState(0);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [borderWidth, setBorderWidth] = useState(5);
  const [customFilterInput, setCustomFilterInput] = useState('');
  const [showCustomFilterInput, setShowCustomFilterInput] = useState(false);
  const [pixelScale, setPixelScale] = useState(0.1);

  // Reordering state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Adjustment state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [exposure, setExposure] = useState(100);
  const [hue, setHue] = useState(0);

  const activeProject = projects[activeIndex] || null;

  const updateActiveProject = (updated: ProjectImage) => {
    const newProjects = [...projects];
    newProjects[activeIndex] = updated;
    setProjects(newProjects);
  };

  const addToHistory = (url: string, meta: ImageMetadata) => {
    if (!activeProject) return;
    const newHistory = activeProject.history.slice(0, activeProject.historyIndex + 1);
    newHistory.push({ url, metadata: meta });
    updateActiveProject({
      ...activeProject,
      url,
      metadata: meta,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  };

  const handleUndo = () => {
    if (activeProject && activeProject.historyIndex > 0) {
      const idx = activeProject.historyIndex - 1;
      const prev = activeProject.history[idx];
      updateActiveProject({ ...activeProject, url: prev.url, metadata: prev.metadata, historyIndex: idx });
    }
  };

  const handleRedo = () => {
    if (activeProject && activeProject.historyIndex < activeProject.history.length - 1) {
      const idx = activeProject.historyIndex + 1;
      const next = activeProject.history[idx];
      updateActiveProject({ ...activeProject, url: next.url, metadata: next.metadata, historyIndex: idx });
    }
  };

  const handleResetToOriginal = () => {
    if (activeProject && activeProject.history.length > 0) {
      const original = activeProject.history[0];
      updateActiveProject({ ...activeProject, url: original.url, metadata: original.metadata, historyIndex: 0 });
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setActiveTool(null);
    }
  };

  const handleUpload = async (files: File[]) => {
    const newProjects: ProjectImage[] = await Promise.all(files.map(async (file) => {
      const url = URL.createObjectURL(file);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: file.type,
        size: file.size, originalSize: file.size, name: file.name
      };
      return {
        id: Math.random().toString(36).substr(2, 9),
        url, metadata: meta, history: [{ url, metadata: meta }], historyIndex: 0
      };
    }));
    setProjects(prev => [...prev, ...newProjects]);
    setActiveIndex(projects.length);
  };

  const handleUrlUpload = async (url: string) => {
    startTask('Fetching remote image...');
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);
      const img = await imageService.loadImage(imgUrl);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: blob.type,
        size: blob.size, originalSize: blob.size, name: url.split('/').pop() || 'Remote'
      };
      const newProj = { id: Math.random().toString(36).substr(2, 9), url: imgUrl, metadata: meta, history: [{ url: imgUrl, metadata: meta }], historyIndex: 0 };
      setProjects(prev => [...prev, newProj]);
      setActiveIndex(projects.length);
    } catch (e) { alert('CORS or Network Error'); } finally { endTask(); }
  };

  const startTask = (msg: string) => { setProcessing(true); setLoadingMessage(msg); };
  const endTask = () => { setProcessing(false); setLoadingMessage(''); };

  const applyTool = async (task: (img: HTMLImageElement) => Promise<string>, actionName: string) => {
    if (!activeProject) return;
    startTask(`${actionName}...`);
    try {
      const img = await imageService.loadImage(activeProject.url);
      const url = await task(img);
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      addToHistory(url, { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type });
      setActiveTool(null);
    } catch (e) { console.error(e); } finally { endTask(); }
  };

  const handleQuickRotate = (degrees: number) => {
    applyTool((img) => imageService.rotateImage(img, degrees), 'Rotating');
  };

  const handleAiAnalyze = async () => {
    if (!activeProject) return;
    startTask('AI Specialist is analyzing...');
    try {
      const jsonStr = await geminiService.analyzeImage(activeProject.url, activeProject.metadata.format);
      const result = JSON.parse(jsonStr) as AiSuggestions;
      setAiAnalysis(result);
      setActiveTool(null);
    } catch (e) {
      console.error(e);
      alert('AI analysis failed. Please verify your connection.');
    } finally {
      endTask();
    }
  };

  const lookPresets = [
    { name: 'Vivid', f: 'brightness(1.1) saturate(1.6)' },
    { name: 'Dramatic', f: 'contrast(1.5) brightness(0.9)' },
    { name: 'Mono', f: 'grayscale(100%)' },
    { name: 'Sepia', f: 'sepia(100%)' },
    { name: 'Cyber', f: 'hue-rotate(280deg) saturate(2) brightness(1.2)' },
    { name: 'Ethereal', f: 'blur(1px) brightness(1.2) contrast(0.9) saturate(0.8)' },
    { name: 'Acid', f: 'hue-rotate(90deg) invert(0.2) contrast(1.5)' },
    { name: 'Velvet', f: 'contrast(1.4) saturate(0.5) sepia(0.2)' },
    { name: 'Frost', f: 'hue-rotate(190deg) brightness(1.1) saturate(0.4)' },
    { name: 'Golden', f: 'sepia(0.5) saturate(1.8) brightness(1.1) contrast(1.1)' },
    { name: 'Ocean', f: 'hue-rotate(200deg) saturate(1.5) brightness(0.9)' },
    { name: 'Forest', f: 'hue-rotate(100deg) saturate(1.2) contrast(1.1)' },
    { name: 'Midnight', f: 'brightness(0.5) contrast(1.6) hue-rotate(240deg) saturate(0.8)' },
    { name: 'Ghost', f: 'grayscale(100%) brightness(1.8) contrast(0.5) blur(2px)' },
    { name: 'Cinematic', f: 'contrast(1.3) saturate(1.2) brightness(0.9) sepia(0.1)' },
    { name: 'Blueprint', f: 'grayscale(100%) invert(1) sepia(1) hue-rotate(200deg) saturate(5)' }
  ];

  const borderPresets = [
    { name: 'White', color: '#ffffff' }, { name: 'Black', color: '#000000' },
    { name: 'Red', color: '#ff3b30' }, { name: 'Blue', color: '#007aff' },
    { name: 'Green', color: '#34c759' }, { name: 'Purple', color: '#af52de' }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleAutoApply = async () => {
    if (!aiAnalysis || !activeProject) return;
    
    startTask('Applying AI Enhancements...');
    try {
      const { adjustments, suggested_filter } = aiAnalysis;
      
      // Calculate filter string
      let filterStr = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
      
      if (suggested_filter !== "None") {
        const preset = lookPresets.find(p => p.name === suggested_filter);
        if (preset) {
          filterStr += ` ${preset.f}`;
        }
      }

      // Apply the mega-filter
      const img = await imageService.loadImage(activeProject.url);
      const url = await imageService.applyFilter(img, filterStr);
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      
      addToHistory(url, { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type });
      
      // Reset local adjustment state to match applied AI values for consistency
      setBrightness(adjustments.brightness);
      setContrast(adjustments.contrast);
      setSaturate(adjustments.saturation);
      
      setAiAnalysis(null);
    } catch (e) {
      console.error(e);
      alert('Failed to apply AI suggestions.');
    } finally {
      endTask();
    }
  };

  useEffect(() => {
    if (activeProject) {
      setWidth(activeProject.metadata.width.toString());
      setHeight(activeProject.metadata.height.toString());
      setTargetFormat(activeProject.metadata.format);
    }
  }, [activeProject?.id]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] pb-48 flex flex-col overflow-x-hidden transition-all duration-500">
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
          <div className="relative bg-[#1c1c1e]/80 ios-blur p-12 rounded-[3rem] ios-shadow-lg flex flex-col items-center gap-8 border border-white/10 animate-in zoom-in-95">
            <div className="w-20 h-20 border-[6px] border-[#007aff]/10 border-t-[#007aff] rounded-full animate-spin"></div>
            <p className="text-[#007aff] font-bold text-xl tracking-tight">{loadingMessage}</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/60 ios-blur border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-xl flex items-center justify-center shadow-lg"><SparklesIcon className="text-white w-6 h-6" /></div>
          <h1 className="text-2xl font-black tracking-tighter text-white">Imagerize</h1>
        </div>
        {activeProject && (
          <div className="flex items-center gap-3">
            <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60"><EyeIcon className="w-5 h-5" /></button>
            <button onClick={() => setShowDetails(!showDetails)} className={`w-11 h-11 rounded-full flex items-center justify-center ${showDetails ? 'bg-[#007aff] text-white' : 'bg-white/5 text-white/60'}`}><InfoIcon className="w-5 h-5" /></button>
            <button onClick={handleResetToOriginal} className="w-11 h-11 rounded-full bg-white/5 text-white/60 flex items-center justify-center"><ResetIcon className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={handleUndo} disabled={activeProject.historyIndex <= 0} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-20"><UndoIcon className="w-5 h-5" /></button>
            <button onClick={handleRedo} disabled={activeProject.historyIndex >= activeProject.history.length - 1} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-20"><RedoIcon className="w-5 h-5" /></button>
            <button onClick={() => setProjects(prev => prev.filter((_, i) => i !== activeIndex))} className="w-11 h-11 rounded-full bg-[#ff3b30]/20 text-[#ff3b30] flex items-center justify-center"><XIcon className="w-5 h-5" /></button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
        {projects.length === 0 ? (
          <div className="mt-4 space-y-16 animate-in fade-in duration-700">
            <div className="text-center space-y-6">
              <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[#007aff] font-bold text-xs uppercase tracking-widest">Studio 4.0 Pro</div>
              <h2 className="text-7xl font-black tracking-tight leading-[0.9]">Reimagine Your <span className="text-[#007aff]">Pixels.</span></h2>
              <p className="text-[#8e8e93] text-2xl font-medium max-w-xl mx-auto">Modern image processing, refined for the next generation of creators.</p>
            </div>
            <Uploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Batch Strip */}
            <div className="flex items-center gap-4 overflow-x-auto pb-6 no-scrollbar px-1">
              <button onClick={() => { startTask('Exporting...'); projects.forEach(p => { const a = document.createElement('a'); a.href = p.url; a.download = p.metadata.name; a.click(); }); endTask(); }} className="w-24 h-24 bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] rounded-3xl flex-shrink-0 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"><DownloadIcon className="w-7 h-7 mb-2" /><span className="text-[10px] font-bold uppercase tracking-widest">All</span></button>
              {projects.map((proj, idx) => (
                <div key={proj.id} 
                     draggable onDragStart={() => setDraggedIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => { 
                       if (draggedIdx === null) return;
                       const newPs = [...projects]; const item = newPs.splice(draggedIdx, 1)[0]; newPs.splice(idx, 0, item);
                       setProjects(newPs); setActiveIndex(idx); setDraggedIdx(null);
                     }}
                     onClick={() => { setActiveIndex(idx); setZoom(1); setPanOffset({x:0,y:0}); setActiveTool(null); }}
                     className={`relative w-24 h-24 rounded-3xl flex-shrink-0 overflow-hidden border-4 transition-all cursor-pointer ${activeIndex === idx ? 'border-[#007aff] scale-105 shadow-2xl' : 'border-white/5 opacity-50'} ${draggedIdx === idx ? 'opacity-20' : ''}`}>
                  <img src={proj.url} className="w-full h-full object-cover pointer-events-none" />
                </div>
              ))}
            </div>

            {/* AI Analysis Result View */}
            {aiAnalysis && (
              <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border-2 border-[#007aff]/30 space-y-6 animate-in zoom-in-95 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6">
                  <button onClick={() => setAiAnalysis(null)} className="text-white/20 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#007aff] rounded-2xl flex items-center justify-center shadow-lg shadow-[#007aff]/40"><SparklesIcon className="text-white w-7 h-7" /></div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">AI Studio Insights</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[#007aff] text-[10px] font-black uppercase tracking-widest mb-2">Aesthetic Review</p>
                    <p className="text-white font-bold text-lg leading-tight">{aiAnalysis.aesthetic_review}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[#34c759] text-[10px] font-black uppercase tracking-widest mb-2">Proposed Adjustments</p>
                       <div className="flex flex-wrap gap-3">
                          <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold">Brightness: {aiAnalysis.adjustments.brightness}%</span>
                          <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold">Contrast: {aiAnalysis.adjustments.contrast}%</span>
                          <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold">Filter: {aiAnalysis.suggested_filter}</span>
                       </div>
                    </div>
                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[#af52de] text-[10px] font-black uppercase tracking-widest mb-2">Framing Tip</p>
                       <p className="text-xs font-medium text-white/60">{aiAnalysis.crop_advice}</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5">
                    <p className="text-sm font-medium text-white/80 leading-relaxed mb-6 italic">"{aiAnalysis.narrative}"</p>
                    <button onClick={handleAutoApply} className="w-full bg-[#007aff] py-5 rounded-3xl text-sm font-black uppercase shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Auto-Apply Enhancements</button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Area */}
            <div className="bg-[#1c1c1e]/60 p-1 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
              <div ref={previewRef} className="relative w-full aspect-auto min-h-[40vh] max-h-[70vh] overflow-hidden rounded-[2rem] bg-black/40 flex items-center justify-center">
                <img src={isComparing ? activeProject.history[0].url : activeProject.url} style={{ transform: `scale(${zoom}) translate(${panOffset.x/zoom}px, ${panOffset.y/zoom}px)` }} className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-300" />
                {!activeTool && (
                  <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-white/10 ios-blur border border-white/10 rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => setZoom(Math.max(1, zoom-0.5))} className="p-2"><ZoomOutIcon className="w-5 h-5" /></button>
                    <span className="text-xs font-black">{Math.round(zoom*100)}%</span>
                    <button onClick={() => setZoom(Math.min(3, zoom+0.5))} className="p-2"><ZoomInIcon className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
              <div className="p-8 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black truncate max-w-xs">{activeProject.metadata.name}</h3>
                  <p className="text-xs text-[#8e8e93] font-bold uppercase tracking-widest">{activeProject.metadata.width}x{activeProject.metadata.height} • {formatFileSize(activeProject.metadata.size)}</p>
                </div>
                <a href={activeProject.url} download={activeProject.metadata.name} className="bg-white text-black px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Export</a>
              </div>
            </div>

            {/* Tool Area */}
            <div className="min-h-[200px] pb-12">
              {activeTool === ToolType.ADJUST && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Color Grading</h3>
                  <div className="space-y-6">
                    {[{l:'Brightness',v:brightness,s:setBrightness}, {l:'Contrast',v:contrast,s:setContrast}, {l:'Saturation',v:saturate,s:setSaturate}].map(a => (
                      <div key={a.l} className="space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-40"><span>{a.l}</span><span>{a.v}%</span></div>
                        <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 py-5 rounded-3xl text-xs font-black uppercase">Cancel</button>
                    <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Adjusting')} className="flex-[2] bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase shadow-lg shadow-[#007aff]/30">Render</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.RESIZE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Scale Dimensions</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Width (px)</label>
                      <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xl font-black outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Height (px)</label>
                      <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xl font-black outline-none" />
                    </div>
                  </div>
                  <button onClick={() => applyTool((img) => imageService.resizeImage(img, parseInt(width), parseInt(height)), 'Resizing')} className="w-full bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase">Apply Size</button>
                </div>
              )}

              {activeTool === ToolType.CROP && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Reframe Frame</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['X', 'Y', 'W', 'H'].map(l => (
                      <div key={l} className="space-y-1">
                        <label className="text-[9px] font-black opacity-40 uppercase">{l}</label>
                        <input type="number" placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-black outline-none" id={`crop-${l.toLowerCase()}`} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    const x = parseInt((document.getElementById('crop-x') as HTMLInputElement).value) || 0;
                    const y = parseInt((document.getElementById('crop-y') as HTMLInputElement).value) || 0;
                    const w = parseInt((document.getElementById('crop-w') as HTMLInputElement).value) || activeProject.metadata.width;
                    const h = parseInt((document.getElementById('crop-h') as HTMLInputElement).value) || activeProject.metadata.height;
                    applyTool((img) => imageService.cropImage(img, x, y, w, h), 'Cropping');
                  }} className="w-full bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase">Apply Crop</button>
                </div>
              )}

              {activeTool === ToolType.FILTER && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Artistic Looks</h3>
                    <button onClick={() => setShowCustomFilterInput(!showCustomFilterInput)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${showCustomFilterInput ? 'bg-[#007aff] border-[#007aff]' : 'border-white/20 opacity-50'}`}>Custom Engine</button>
                  </div>
                  {showCustomFilterInput ? (
                    <div className="space-y-6">
                      <input type="text" placeholder="e.g. contrast(2) blur(1px) sepia(0.5)" value={customFilterInput} onChange={e => setCustomFilterInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm outline-none focus:border-[#007aff]" />
                      <div className="flex gap-4">
                        <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 py-5 rounded-3xl text-xs font-black uppercase">Cancel</button>
                        <button onClick={() => applyTool((img) => imageService.applyFilter(img, customFilterInput), 'Custom Look')} className="flex-[2] bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase">Apply Engine</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                      {lookPresets.map(p => (
                        <button key={p.name} onClick={() => applyTool((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col items-center gap-2 group">
                          <div className="w-14 h-14 rounded-full border border-white/10 overflow-hidden relative"><img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} /></div>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTool === ToolType.ROTATE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase text-center">Rotate & Flip</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => handleQuickRotate(-90)} className="bg-black/40 p-6 rounded-3xl flex flex-col items-center gap-2 border border-white/5 hover:border-[#007aff]/30 transition-all"><RotateIcon className="w-6 h-6 -scale-x-100" /><span className="text-[10px] font-bold">-90°</span></button>
                    <button onClick={() => handleQuickRotate(90)} className="bg-black/40 p-6 rounded-3xl flex flex-col items-center gap-2 border border-white/5 hover:border-[#007aff]/30 transition-all"><RotateIcon className="w-6 h-6" /><span className="text-[10px] font-bold">+90°</span></button>
                    <button onClick={() => applyTool((img) => imageService.flipImage(img, 'horizontal'), 'Flipping')} className="bg-black/40 p-6 rounded-3xl flex flex-col items-center gap-2 border border-white/5 hover:border-[#007aff]/30 transition-all"><MirrorIcon className="w-6 h-6" /><span className="text-[10px] font-bold">Flip H</span></button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black opacity-40 uppercase tracking-widest"><span>Precision</span><span>{rotationAngle}°</span></div>
                    <input type="range" min="-180" max="180" value={rotationAngle} onChange={e => setRotationAngle(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => applyTool((img) => imageService.rotateImage(img, rotationAngle), 'Rotating')} className="w-full bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase">Apply Transform</button>
                </div>
              )}

              {activeTool === ToolType.BW && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4 text-center">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Monochrome</h3>
                  <p className="text-[#8e8e93] text-sm font-medium leading-relaxed mb-6">Instantly convert your photo into a high-contrast black and white masterpiece.</p>
                  <button onClick={() => applyTool((img) => imageService.grayscaleImage(img), 'Converting to BW')} className="w-full bg-white text-black py-5 rounded-3xl text-xs font-black uppercase shadow-xl hover:bg-white/90">Apply Mono</button>
                </div>
              )}

              {activeTool === ToolType.BORDER && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Stylized Borders</h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                    {borderPresets.map(p => (
                      <button key={p.name} onClick={() => setBorderColor(p.color)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 ${borderColor === p.color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: p.color }} />
                    ))}
                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-12 h-12 bg-transparent border-0 rounded-full cursor-pointer" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black opacity-40 uppercase tracking-widest"><span>Thickness</span><span>{borderWidth}%</span></div>
                    <input type="range" min="1" max="20" value={borderWidth} onChange={e => setBorderWidth(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => applyTool((img) => imageService.addBorder(img, borderColor, borderWidth), 'Adding Border')} className="w-full bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase">Apply Border</button>
                </div>
              )}

              {activeTool === ToolType.COMPRESS && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">File Optimization</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black opacity-40 uppercase tracking-widest"><span>Quality</span><span>{Math.round(quality * 100)}%</span></div>
                    <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={e => setQuality(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => applyTool((img) => imageService.compressImage(img, quality), 'Compressing')} className="w-full bg-[#34c759] py-5 rounded-3xl text-xs font-black uppercase">Optimize File</button>
                </div>
              )}

              {activeTool === ToolType.PIXELATE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Retro Pixels</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black opacity-40 uppercase tracking-widest"><span>Resolution</span><span>{Math.round(pixelScale * 100)}%</span></div>
                    <input type="range" min="0.01" max="0.5" step="0.01" value={pixelScale} onChange={e => setPixelScale(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => applyTool((img) => imageService.pixelateImage(img, pixelScale), 'Pixelating')} className="w-full bg-[#af52de] py-5 rounded-3xl text-xs font-black uppercase">Render 8-Bit</button>
                </div>
              )}

              {activeTool === ToolType.CONVERT && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Export Formats</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['image/png', 'image/jpeg', 'image/webp'].map(fmt => (
                      <button key={fmt} onClick={() => setTargetFormat(fmt)} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${targetFormat === fmt ? 'bg-white text-black border-white' : 'border-white/10 opacity-50'}`}>{fmt.split('/')[1]}</button>
                    ))}
                  </div>
                  <button onClick={() => applyTool((img) => imageService.applyFilter(img, 'none', targetFormat), 'Converting')} className="w-full bg-white text-black py-5 rounded-3xl text-xs font-black uppercase">Finalize Format</button>
                </div>
              )}

              {activeTool === ToolType.AI_ANALYZE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border-2 border-[#007aff]/30 space-y-8 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-4">
                    <SparklesIcon className="w-8 h-8 text-[#007aff]" />
                    <h3 className="text-2xl font-black tracking-tighter uppercase">AI Photo Assistant</h3>
                  </div>
                  <p className="text-[#8e8e93] text-sm font-medium leading-relaxed">Let Gemini analyze your photo and suggest professional-grade enhancements based on lighting, composition, and subject.</p>
                  <button onClick={handleAiAnalyze} className="w-full bg-gradient-to-r from-[#007aff] to-[#5856d6] py-6 rounded-3xl text-sm font-black uppercase shadow-xl shadow-[#007aff]/30 active:scale-[0.98] transition-all">Start Intelligent Analysis</button>
                </div>
              )}

              {!activeTool && (
                <div className="text-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 animate-in fade-in">
                  <p className="text-xs font-black uppercase tracking-[0.4em] opacity-20">Select an engine from the studio bar</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-12 px-6 border-t border-white/5 bg-black/40 ios-blur mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 opacity-40">
          <p className="text-[11px] font-black uppercase tracking-[0.3em]">Built by Sujon • Imagerize Studio 2025</p>
          <div className="flex gap-8 text-[9px] font-bold uppercase tracking-widest">
            <span>facebook: sujonworld0</span>
            <span>email: classicalsujon@gmail.com</span>
          </div>
        </div>
      </footer>

      {activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => {
          setActiveTool(activeTool === t ? null : t);
          setZoom(1); setPanOffset({x:0,y:0}); setShowDetails(false);
        }} />
      )}
    </div>
  );
}
