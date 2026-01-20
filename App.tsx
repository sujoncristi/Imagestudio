
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

  // Fixed: handleAiAnalyze now correctly converts blob URL to base64
  const handleAiAnalyze = async () => {
    if (!activeProject) return;
    startTask('AI Specialist is analyzing metadata...');
    try {
      // Fetch the image data from the blob URL
      const response = await fetch(activeProject.url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const jsonStr = await geminiService.analyzeImage(base64, activeProject.metadata.format);
      const result = JSON.parse(jsonStr) as AiSuggestions;
      setAiAnalysis(result);
      setActiveTool(null);
    } catch (e) {
      console.error(e);
      alert('AI analysis failed. Please check your API configuration or internet connection.');
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
    
    startTask('AI Studio is rendering enhancements...');
    try {
      const { adjustments, suggested_filter } = aiAnalysis;
      
      let filterStr = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
      
      if (suggested_filter !== "None") {
        const preset = lookPresets.find(p => p.name === suggested_filter);
        if (preset) {
          filterStr += ` ${preset.f}`;
        }
      }

      const img = await imageService.loadImage(activeProject.url);
      const url = await imageService.applyFilter(img, filterStr);
      const finalImg = await imageService.loadImage(url);
      const blob = await (await fetch(url)).blob();
      
      addToHistory(url, { ...activeProject.metadata, width: finalImg.width, height: finalImg.height, size: blob.size, format: blob.type });
      
      setBrightness(adjustments.brightness);
      setContrast(adjustments.contrast);
      setSaturate(adjustments.saturation);
      
      setAiAnalysis(null);
    } catch (e) {
      console.error(e);
      alert('AI render engine failed.');
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"></div>
          <div className="relative bg-[#1c1c1e]/80 ios-blur p-12 rounded-[3rem] ios-shadow-lg flex flex-col items-center gap-8 border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 border-[6px] border-[#007aff]/10 border-t-[#007aff] rounded-full animate-spin"></div>
            <p className="text-[#007aff] font-bold text-xl tracking-tight uppercase tracking-[0.2em]">{loadingMessage}</p>
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
            <button title="Hold to Compare" onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 active:bg-[#007aff] active:text-white transition-all"><EyeIcon className="w-5 h-5" /></button>
            <button title="Tech Specs" onClick={() => setShowDetails(!showDetails)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${showDetails ? 'bg-[#007aff] text-white shadow-lg' : 'bg-white/5 text-white/60'}`}><InfoIcon className="w-5 h-5" /></button>
            <button title="Revert to Native" onClick={handleResetToOriginal} className="w-11 h-11 rounded-full bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10"><ResetIcon className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={handleUndo} disabled={activeProject.historyIndex <= 0} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-20 active:scale-90 transition-transform"><UndoIcon className="w-5 h-5" /></button>
            <button onClick={handleRedo} disabled={activeProject.historyIndex >= activeProject.history.length - 1} className="w-11 h-11 rounded-full text-[#007aff] disabled:opacity-20 active:scale-90 transition-transform"><RedoIcon className="w-5 h-5" /></button>
            <button title="Clear Canvas" onClick={() => setProjects(prev => prev.filter((_, i) => i !== activeIndex))} className="w-11 h-11 rounded-full bg-[#ff3b30]/20 text-[#ff3b30] flex items-center justify-center active:scale-90 transition-transform"><XIcon className="w-5 h-5" /></button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
        {projects.length === 0 ? (
          <div className="mt-4 space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[#007aff] font-black text-xs uppercase tracking-[0.3em]">Studio 4.1 Gold</div>
              <h2 className="text-7xl font-black tracking-tight leading-[0.9]">Transform your <span className="bg-gradient-to-r from-[#007aff] to-[#af52de] bg-clip-text text-transparent">Vision.</span></h2>
              <p className="text-[#8e8e93] text-2xl font-medium max-w-xl mx-auto">Non-destructive editing with neural analysis for the professional creator.</p>
            </div>
            <Uploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Batch Strip */}
            <div className="flex items-center gap-4 overflow-x-auto pb-6 no-scrollbar px-1">
              <button onClick={() => { startTask('Exporting Batch...'); projects.forEach(p => { const a = document.createElement('a'); a.href = p.url; a.download = p.metadata.name; a.click(); }); endTask(); }} className="w-24 h-24 bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] rounded-3xl flex-shrink-0 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all group hover:bg-[#34c759]/20"><DownloadIcon className="w-7 h-7 mb-2 group-hover:translate-y-0.5 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Zip All</span></button>
              {projects.map((proj, idx) => (
                <div key={proj.id} 
                     draggable onDragStart={() => setDraggedIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => { 
                       if (draggedIdx === null) return;
                       const newPs = [...projects]; const item = newPs.splice(draggedIdx, 1)[0]; newPs.splice(idx, 0, item);
                       setProjects(newPs); setActiveIndex(idx); setDraggedIdx(null);
                     }}
                     onClick={() => { setActiveIndex(idx); setZoom(1); setPanOffset({x:0,y:0}); setActiveTool(null); setAiAnalysis(null); }}
                     className={`relative w-24 h-24 rounded-[2.2rem] flex-shrink-0 overflow-hidden border-4 transition-all cursor-pointer ${activeIndex === idx ? 'border-[#007aff] scale-105 shadow-2xl shadow-[#007aff]/30' : 'border-white/5 opacity-50'} ${draggedIdx === idx ? 'opacity-20' : ''}`}>
                  <img src={proj.url} className="w-full h-full object-cover pointer-events-none" />
                </div>
              ))}
            </div>

            {/* AI Expert Studio Report */}
            {aiAnalysis && (
              <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border-2 border-[#007aff]/30 space-y-8 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#007aff]/10 blur-[60px] rounded-full"></div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#007aff] rounded-2xl flex items-center justify-center shadow-xl shadow-[#007aff]/40 animate-pulse"><SparklesIcon className="text-white w-8 h-8" /></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">Expert Diagnostic</h3>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Studio Engine v4.0</p>
                    </div>
                  </div>
                  <button onClick={() => setAiAnalysis(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#007aff]"></div>
                        <p className="text-[#007aff] text-[10px] font-black uppercase tracking-widest">Analysis Summary</p>
                      </div>
                      <p className="text-white font-bold text-xl leading-snug">{aiAnalysis.aesthetic_review}</p>
                    </div>
                    
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5">
                       <p className="text-sm font-medium text-white/70 italic leading-relaxed">
                        "{aiAnalysis.narrative}"
                       </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#007aff]/10 p-6 rounded-[2.5rem] border border-[#007aff]/20">
                      <p className="text-[#007aff] text-[9px] font-black uppercase tracking-widest mb-4">Neural Tuning</p>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase">Light</span><span className="text-xs font-black text-[#007aff]">{aiAnalysis.adjustments.brightness}%</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase">Contrast</span><span className="text-xs font-black text-[#007aff]">{aiAnalysis.adjustments.contrast}%</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-white/40 uppercase">Palette</span><span className="text-xs font-black text-[#007aff]">{aiAnalysis.suggested_filter}</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                       <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Framing Insight</p>
                       <p className="text-[11px] font-medium text-white/60 leading-tight">{aiAnalysis.crop_advice}</p>
                    </div>
                  </div>
                </div>

                <button onClick={handleAutoApply} className="w-full bg-[#007aff] py-6 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#007aff]/30 active:scale-[0.98] hover:scale-[1.01] transition-all relative z-10 flex items-center justify-center gap-3">
                  <SparklesIcon className="w-5 h-5" />
                  Apply Studio Enhancements
                </button>
              </div>
            )}

            {/* Tech Details Overlay */}
            {showDetails && (
              <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><InfoIcon className="text-[#007aff]" /> Metadata Inspector</h3>
                  <button onClick={() => setShowDetails(false)} className="text-white/20 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {[
                    { l: 'Native Res', v: `${activeProject.metadata.width} × ${activeProject.metadata.height}` },
                    { l: 'Payload', v: formatFileSize(activeProject.metadata.size) },
                    { l: 'Mime', v: activeProject.metadata.format.split('/')[1].toUpperCase() },
                    { l: 'Steps', v: activeProject.history.length },
                    { l: 'Index', v: activeProject.historyIndex },
                    { l: 'Delta', v: `${Math.round((activeProject.metadata.size / activeProject.metadata.originalSize) * 100)}%` }
                  ].map(item => (
                    <div key={item.l} className="bg-black/40 p-6 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{item.l}</p>
                      <p className="text-base font-bold text-white/90">{item.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Canvas */}
            <div className="bg-[#1c1c1e]/60 p-1 rounded-[3.5rem] border border-white/10 shadow-2xl overflow-hidden group">
              <div ref={previewRef} className="relative w-full aspect-auto min-h-[45vh] max-h-[75vh] overflow-hidden rounded-[3rem] bg-black/40 flex items-center justify-center border border-white/5">
                <img src={isComparing ? activeProject.history[0].url : activeProject.url} style={{ transform: `scale(${zoom}) translate(${panOffset.x/zoom}px, ${panOffset.y/zoom}px)` }} className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-300 ease-out" />
                
                {isComparing && (
                  <div className="absolute top-8 left-8 bg-white text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.3em] animate-pulse shadow-2xl z-10">Native Source</div>
                )}

                {!activeTool && (
                  <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-black/40 ios-blur border border-white/10 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <button onClick={() => setZoom(Math.max(1, zoom-0.5))} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
                    <span className="text-[11px] font-black w-10 text-center tracking-tighter">{Math.round(zoom*100)}%</span>
                    <button onClick={() => setZoom(Math.min(4, zoom+0.5))} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
              <div className="p-10 flex items-center justify-between">
                <div className="max-w-[60%]">
                  <h3 className="text-2xl font-black truncate leading-tight mb-1">{activeProject.metadata.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-white/10 text-white/50 px-3 py-1 rounded-full uppercase tracking-widest">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${activeProject.metadata.size > activeProject.metadata.originalSize ? 'bg-orange-500/10 text-orange-400' : 'bg-[#34c759]/10 text-[#34c759]'}`}>{formatFileSize(activeProject.metadata.size)}</span>
                  </div>
                </div>
                <a href={activeProject.url} download={activeProject.metadata.name} className="bg-white text-black px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 hover:bg-[#007aff] hover:text-white transition-all">Export</a>
              </div>
            </div>

            {/* Tool Adjustment Panels */}
            <div className="min-h-[220px] pb-16">
              {activeTool === ToolType.ADJUST && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-10 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Neural Grading</h3>
                    <button onClick={() => { setBrightness(100); setContrast(100); setSaturate(100); }} className="text-[#007aff] text-xs font-black uppercase tracking-widest border-b border-[#007aff]/30">Reset</button>
                  </div>
                  <div className="space-y-8">
                    {[
                      {l:'Exposure',v:brightness,s:setBrightness, icon: <SparklesIcon className="w-4 h-4" />}, 
                      {l:'Contrast',v:contrast,s:setContrast, icon: <MirrorIcon className="w-4 h-4" />}, 
                      {l:'Saturation',v:saturate,s:setSaturate, icon: <AdjustmentsIcon className="w-4 h-4" />}
                    ].map(a => (
                      <div key={a.l} className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest opacity-40">
                             {a.icon} {a.l}
                          </div>
                          <span className="text-sm font-black text-[#007aff]">{a.v}%</span>
                        </div>
                        <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 py-6 rounded-3xl text-xs font-black uppercase tracking-widest text-white/40">Discard</button>
                    <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Developing')} className="flex-[2] bg-[#007aff] py-6 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#007aff]/30">Apply Grade</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.RESIZE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-10 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Canvas Scale</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Horizontal</label>
                      <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-colors" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Vertical</label>
                      <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-2xl font-black outline-none focus:border-[#007aff] transition-colors" />
                    </div>
                  </div>
                  <button onClick={() => applyTool((img) => imageService.resizeImage(img, parseInt(width), parseInt(height)), 'Re-sampling')} className="w-full bg-[#007aff] py-6 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-[#007aff]/30">Confirm Dimensions</button>
                </div>
              )}

              {activeTool === ToolType.FILTER && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-10 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Artistic Looks</h3>
                    <button onClick={() => setShowCustomFilterInput(!showCustomFilterInput)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${showCustomFilterInput ? 'bg-[#007aff] border-[#007aff] text-white shadow-lg' : 'border-white/20 text-white/40'}`}>{showCustomFilterInput ? 'Presets' : 'Custom CSS'}</button>
                  </div>
                  {showCustomFilterInput ? (
                    <div className="space-y-6 animate-in fade-in">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 px-1">Advanced CSS Filter Pipeline</p>
                      <input type="text" placeholder="e.g. contrast(1.2) hue-rotate(180deg) blur(2px)" value={customFilterInput} onChange={e => setCustomFilterInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm outline-none focus:border-[#007aff] text-[#007aff]" />
                      <div className="flex gap-4">
                        <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 py-5 rounded-3xl text-xs font-black uppercase tracking-widest text-white/30">Cancel</button>
                        <button onClick={() => applyTool((img) => imageService.applyFilter(img, customFilterInput), 'Rendering Custom')} className="flex-[2] bg-[#007aff] py-5 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl">Apply Pipeline</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-6 max-h-[45vh] overflow-y-auto no-scrollbar pb-2">
                      {lookPresets.map(p => (
                        <button key={p.name} onClick={() => applyTool((img) => imageService.applyFilter(img, p.f), `Applying ${p.name}`)} className="flex flex-col items-center gap-3 group">
                          <div className="w-14 h-14 rounded-full border-2 border-white/5 overflow-hidden relative group-hover:border-[#007aff] transition-all"><img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} /></div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover:text-white transition-colors text-center leading-tight">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTool === ToolType.ROTATE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-10 animate-in slide-in-from-top-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase text-center">Spatial Transform</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <button onClick={() => handleQuickRotate(-90)} className="bg-black/40 p-8 rounded-[2rem] flex flex-col items-center gap-3 border border-white/5 hover:border-[#007aff]/40 transition-all active:scale-95 group"><RotateIcon className="w-8 h-8 -scale-x-100 group-hover:text-[#007aff]" /><span className="text-[10px] font-black uppercase tracking-widest">-90°</span></button>
                    <button onClick={() => handleQuickRotate(90)} className="bg-black/40 p-8 rounded-[2rem] flex flex-col items-center gap-3 border border-white/5 hover:border-[#007aff]/40 transition-all active:scale-95 group"><RotateIcon className="w-8 h-8 group-hover:text-[#007aff]" /><span className="text-[10px] font-black uppercase tracking-widest">+90°</span></button>
                    <button onClick={() => applyTool((img) => imageService.flipImage(img, 'horizontal'), 'Reflecting')} className="bg-black/40 p-8 rounded-[2rem] flex flex-col items-center gap-3 border border-white/5 hover:border-[#007aff]/40 transition-all active:scale-95 group"><MirrorIcon className="w-8 h-8 group-hover:text-[#007aff]" /><span className="text-[10px] font-black uppercase tracking-widest">Flip H</span></button>
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between text-[11px] font-black opacity-30 uppercase tracking-widest px-1"><span>Precision Angle</span><span className="text-[#007aff]">{rotationAngle}°</span></div>
                    <input type="range" min="-180" max="180" value={rotationAngle} onChange={e => setRotationAngle(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <button onClick={() => applyTool((img) => imageService.rotateImage(img, rotationAngle), 'Rotating')} className="w-full bg-[#007aff] py-6 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl">Confirm Transform</button>
                </div>
              )}

              {activeTool === ToolType.AI_ANALYZE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border-2 border-[#007aff]/30 space-y-8 animate-in slide-in-from-top-4 shadow-3xl shadow-[#007aff]/10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-2xl flex items-center justify-center shadow-lg"><SparklesIcon className="w-8 h-8 text-white" /></div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter uppercase">AI Studio Expert</h3>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">High-fidelity Image Analysis</p>
                    </div>
                  </div>
                  <p className="text-[#8e8e93] text-lg font-medium leading-relaxed max-w-2xl">Deploy neural processing to analyze composition, lighting, and palette. Gemini will craft a professional studio report with actionable enhancements.</p>
                  <button onClick={handleAiAnalyze} className="w-full bg-[#007aff] py-7 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-2xl shadow-[#007aff]/40 active:scale-[0.98] transition-all">Launch Studio Analysis</button>
                </div>
              )}

              {!activeTool && (
                <div className="text-center py-24 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 animate-in fade-in duration-1000">
                  <p className="text-xs font-black uppercase tracking-[0.6em] opacity-10">Select Engine to Begin Studio Flow</p>
                </div>
              )}

              {/* Add support for other tool views here if needed (Crop, Border, etc) */}
              {[ToolType.BORDER, ToolType.COMPRESS, ToolType.CONVERT, ToolType.PIXELATE, ToolType.CROP, ToolType.BW].includes(activeTool as ToolType) && (
                 <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 space-y-8 animate-in slide-in-from-top-4">
                    <h3 className="text-2xl font-black uppercase tracking-widest text-[#007aff] text-center">{activeTool} Studio</h3>
                    <p className="text-white/40 text-center text-sm font-bold uppercase tracking-widest">Interactive controls for {activeTool.toLowerCase()} coming in v4.2</p>
                    <button onClick={() => {
                        if (activeTool === ToolType.BW) applyTool((img) => imageService.grayscaleImage(img), 'Mono-conversion');
                        else setActiveTool(null);
                    }} className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase text-xs">Run Quick Action</button>
                 </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-16 px-6 border-t border-white/5 bg-black/40 ios-blur mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 opacity-40">
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em]">IMAGERIZE STUDIO • ENGINEERED BY SUJON</p>
          <div className="flex gap-10 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
            <span className="hover:text-white transition-colors cursor-default">FB: SUJONWORLD0</span>
            <span className="hover:text-white transition-colors cursor-default">EMAIL: CLASSICALSUJON@GMAIL.COM</span>
          </div>
        </div>
      </footer>

      {activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => {
          if (activeTool === t) {
            setActiveTool(null);
          } else {
            setActiveTool(t);
            setZoom(1); 
            setPanOffset({x:0,y:0}); 
            setShowDetails(false); 
            setAiAnalysis(null);
          }
        }} />
      )}
    </div>
  );
}
