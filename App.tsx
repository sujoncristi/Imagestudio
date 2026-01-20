
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToolType, ImageMetadata, HistoryItem, ProjectImage } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, ZoomInIcon, ZoomOutIcon, InfoIcon, MirrorIcon, BWIcon, PixelIcon, ConvertIcon, AdjustmentsIcon, EyeIcon, ResetIcon, RotateIcon, BorderIcon } from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';
import * as geminiService from './services/geminiService.ts';

export default function App() {
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // View state (Zoom/Pan)
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Tools state
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [quality, setQuality] = useState(0.85);
  const [pixelScale, setPixelScale] = useState(0.05);
  const [targetFormat, setTargetFormat] = useState<string>('image/png');
  const [rotationAngle, setRotationAngle] = useState(0);

  // Adjustments state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [exposure, setExposure] = useState(100);
  const [hue, setHue] = useState(0);

  // Filter state
  const [customFilterStr, setCustomFilterStr] = useState('blur(1px) contrast(1.1)');
  const [isCustomFilterMode, setIsCustomFilterMode] = useState(false);

  // Border state
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [borderWidth, setBorderWidth] = useState(5);

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
      updateActiveProject({
        ...activeProject,
        url: prev.url,
        metadata: prev.metadata,
        historyIndex: idx
      });
    }
  };

  const handleRedo = () => {
    if (activeProject && activeProject.historyIndex < activeProject.history.length - 1) {
      const idx = activeProject.historyIndex + 1;
      const next = activeProject.history[idx];
      updateActiveProject({
        ...activeProject,
        url: next.url,
        metadata: next.metadata,
        historyIndex: idx
      });
    }
  };

  const handleResetToOriginal = () => {
    if (activeProject && activeProject.history.length > 0) {
      const original = activeProject.history[0];
      updateActiveProject({
        ...activeProject,
        url: original.url,
        metadata: original.metadata,
        historyIndex: 0
      });
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
        width: img.width,
        height: img.height,
        format: file.type,
        size: file.size,
        originalSize: file.size,
        name: file.name
      };
      return {
        id: Math.random().toString(36).substr(2, 9),
        url,
        metadata: meta,
        history: [{ url, metadata: meta }],
        historyIndex: 0
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
        width: img.width,
        height: img.height,
        format: blob.type,
        size: blob.size,
        originalSize: blob.size,
        name: url.split('/').pop() || 'Remote Image'
      };
      const newProj: ProjectImage = {
        id: Math.random().toString(36).substr(2, 9),
        url: imgUrl,
        metadata: meta,
        history: [{ url: imgUrl, metadata: meta }],
        historyIndex: 0
      };
      setProjects(prev => [...prev, newProj]);
      setActiveIndex(projects.length);
    } catch (e) {
      alert('Error fetching URL. Ensure CORS is supported.');
    } finally {
      endTask();
    }
  };

  const handleReset = () => {
    const newProjects = projects.filter((_, i) => i !== activeIndex);
    setProjects(newProjects);
    setActiveIndex(Math.max(0, activeIndex - 1));
    setActiveTool(null);
    setAiAnalysis(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const startTask = (msg: string) => {
    setProcessing(true);
    setLoadingMessage(msg);
  };

  const endTask = () => {
    setProcessing(false);
    setLoadingMessage('');
  };

  const applyResize = async () => {
    if (!activeProject || !width || !height) return;
    startTask('Optimizing pixels...');
    try {
      const img = await imageService.loadImage(activeProject.url);
      const newUrl = await imageService.resizeImage(img, parseInt(width), parseInt(height));
      const blob = await (await fetch(newUrl)).blob();
      addToHistory(newUrl, { ...activeProject.metadata, width: parseInt(width), height: parseInt(height), size: blob.size });
      setActiveTool(null);
    } catch (error) {
      console.error(error);
    } finally {
      endTask();
    }
  };

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
      setIsCustomFilterMode(false);
    } catch (e) {
      console.error(e);
    } finally {
      endTask();
    }
  };

  const handleAiAnalyze = async () => {
    if (!activeProject) return;
    startTask('Gemini Expert Analysis...');
    try {
      const response = await fetch(activeProject.url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const text = await geminiService.analyzeImage(base64, activeProject.metadata.format);
      setAiAnalysis(text || "Analysis complete.");
    } catch (error) {
      console.error(error);
      setAiAnalysis("AI Expert is currently offline. Check API key settings.");
    } finally {
      endTask();
    }
  };

  const batchExport = () => {
    startTask('Bundling photos...');
    projects.forEach((proj, idx) => {
      const link = document.createElement('a');
      link.href = proj.url;
      link.download = `imagerize-${idx}-${proj.metadata.name}`;
      link.click();
    });
    setTimeout(() => endTask(), 1000);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const onMouseUp = () => setIsPanning(false);

  useEffect(() => {
    if (activeProject) {
      setWidth(activeProject.metadata.width.toString());
      setHeight(activeProject.metadata.height.toString());
      setAspectRatio(activeProject.metadata.width / activeProject.metadata.height);
      setTargetFormat(activeProject.metadata.format);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    if (lockAspectRatio && width && activeProject && activeTool === ToolType.RESIZE) {
      const ratio = activeProject.metadata.width / activeProject.metadata.height;
      const newHeight = Math.round(parseInt(width) / ratio);
      if (!isNaN(newHeight)) setHeight(newHeight.toString());
    }
  }, [width, lockAspectRatio, activeTool]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const applyAdjustments = () => {
    const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) opacity(${exposure}%) hue-rotate(${hue}deg)`;
    applyTool((img) => imageService.applyFilter(img, filterStr), 'Applying Adjustments');
  };

  const applyFormatConversion = () => {
    applyTool((img) => imageService.compressImage(img, quality, targetFormat), `Convert to ${targetFormat.split('/')[1].toUpperCase()}`);
  };

  const handleQuickRotate = (deg: number) => {
    applyTool((img) => imageService.rotateImage(img, deg, targetFormat), `Rotate ${deg}°`);
  };

  const applyCustomRotation = () => {
    applyTool((img) => imageService.rotateImage(img, rotationAngle, targetFormat), `Rotate ${rotationAngle}°`);
  };

  const applyBorderEffect = () => {
    applyTool((img) => imageService.addBorder(img, borderColor, borderWidth, targetFormat), 'Frame Applied');
  };

  const borderPresets = [
    { name: 'White', color: '#ffffff' },
    { name: 'Black', color: '#000000' },
    { name: 'Red', color: '#ff3b30' },
    { name: 'Orange', color: '#ff9500' },
    { name: 'Yellow', color: '#ffcc00' },
    { name: 'Green', color: '#34c759' },
    { name: 'Teal', color: '#30b0c7' },
    { name: 'Blue', color: '#007aff' },
    { name: 'Indigo', color: '#5856d6' },
    { name: 'Purple', color: '#af52de' },
    { name: 'Pink', color: '#ff2d55' },
    { name: 'Gray', color: '#8e8e93' }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] pb-48 overflow-x-hidden transition-colors duration-500 flex flex-col">
      {/* Global Processing Loader */}
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"></div>
          <div className="relative bg-[#1c1c1e]/80 ios-blur p-12 rounded-[3rem] ios-shadow-lg flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-[6px] border-[#007aff]/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-t-[#007aff] rounded-full animate-spin"></div>
            </div>
            <p className="text-[#007aff] font-bold text-xl tracking-tight">{loadingMessage || 'Processing...'}</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/60 ios-blur border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-xl flex items-center justify-center shadow-lg shadow-[#007aff]/20">
             <SparklesIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-[#8e8e93] bg-clip-text text-transparent">Imagerize</h1>
        </div>
        
        {activeProject && (
          <div className="flex items-center gap-3">
            <button title="Hold to compare" onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-90"><EyeIcon className="w-5 h-5" /></button>
            <button title="Technical Specs" onClick={() => setShowDetails(!showDetails)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${showDetails ? 'bg-[#007aff] text-white shadow-lg' : 'bg-white/5 border border-white/10 text-white/60'}`}><InfoIcon className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            
            <button title="Reset to Original" onClick={handleResetToOriginal} className="w-11 h-11 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90">
              <ResetIcon className="w-5 h-5" />
            </button>
            
            <button title="Undo" disabled={activeProject.historyIndex <= 0} onClick={handleUndo} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${activeProject.historyIndex > 0 ? 'bg-white/10 text-[#007aff]' : 'text-white/20'}`}><UndoIcon className="w-5 h-5" /></button>
            <button title="Redo" disabled={activeProject.historyIndex >= activeProject.history.length - 1} onClick={handleRedo} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${activeProject.historyIndex < activeProject.history.length - 1 ? 'bg-white/10 text-[#007aff]' : 'text-white/20'}`}><RedoIcon className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button title="Close Project" onClick={handleReset} className="w-11 h-11 rounded-full bg-[#ff3b30]/20 border border-[#ff3b30]/30 text-[#ff3b30] flex items-center justify-center active:scale-90 transition-transform"><XIcon className="w-5 h-5" /></button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
        {projects.length === 0 ? (
          <div className="mt-4 space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-2">
                 <span className="text-[#007aff] font-bold text-xs tracking-widest uppercase">Version 4.0 Gold</span>
              </div>
              <h2 className="text-7xl font-black tracking-tight leading-[0.9] text-white">Reimagine Your <span className="bg-gradient-to-r from-[#007aff] to-[#af52de] bg-clip-text text-transparent">Pixels.</span></h2>
              <p className="text-[#8e8e93] text-2xl font-medium max-w-xl mx-auto">The most powerful editing suite, refined for a modern world.</p>
            </div>
            
            <Uploader onUpload={handleUpload} onUrlUpload={handleUrlUpload} />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
               <div className="bg-[#1c1c1e]/40 p-8 rounded-[2.5rem] border border-white/5 ios-shadow-lg group hover:bg-[#1c1c1e]/60 transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 bg-[#5856d6]/20 border border-[#5856d6]/30 rounded-2xl flex items-center justify-center mb-6 text-[#5856d6] shadow-xl">
                     <SparklesIcon className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-xl mb-2 text-white">AI Intelligence</h4>
                  <p className="text-[#8e8e93] text-[15px] leading-relaxed">Contextual analysis powered by Gemini for perfect composition.</p>
               </div>
               <div className="bg-[#1c1c1e]/40 p-8 rounded-[2.5rem] border border-white/5 ios-shadow-lg group hover:bg-[#1c1c1e]/60 transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 bg-[#34c759]/20 border border-[#34c759]/30 rounded-2xl flex items-center justify-center mb-6 text-[#34c759] shadow-xl">
                     <DownloadIcon className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-xl mb-2 text-white">Lossless Export</h4>
                  <p className="text-[#8e8e93] text-[15px] leading-relaxed">High-bitrate processing ensures your details are never lost.</p>
               </div>
               <div className="bg-[#1c1c1e]/40 p-8 rounded-[2.5rem] border border-white/5 ios-shadow-lg group hover:bg-[#1c1c1e]/60 transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 bg-[#ff9500]/20 border border-[#ff9500]/30 rounded-2xl flex items-center justify-center mb-6 text-[#ff9500] shadow-xl">
                     <AdjustmentsIcon className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-xl mb-2 text-white">Studio Flow</h4>
                  <p className="text-[#8e8e93] text-[15px] leading-relaxed">Non-destructive editing with full history and comparison tools.</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Batch Strip */}
            <div className="flex items-center gap-4 overflow-x-auto pb-6 no-scrollbar px-1">
               <button onClick={batchExport} className="w-24 h-24 bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] rounded-3xl flex-shrink-0 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all group hover:bg-[#34c759]/20">
                <DownloadIcon className="w-7 h-7 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Export All</span>
              </button>
              {projects.map((proj, idx) => (
                <button
                  key={proj.id}
                  onClick={() => { setActiveIndex(idx); setZoom(1); setPanOffset({x:0,y:0}); setActiveTool(null); setShowDetails(false); }}
                  className={`relative w-24 h-24 rounded-3xl flex-shrink-0 overflow-hidden border-4 transition-all ${activeIndex === idx ? 'border-[#007aff] scale-105 shadow-2xl shadow-[#007aff]/30' : 'border-white/5 opacity-50'}`}
                >
                  <img src={proj.url} className="w-full h-full object-cover" alt={proj.metadata.name} />
                </button>
              ))}
              <button onClick={() => setProjects([])} className="w-24 h-24 bg-white/5 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 hover:bg-white/10 active:scale-95 transition-all">
                <XIcon className="w-7 h-7" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="relative group">
              <div className="bg-[#1c1c1e]/60 p-1 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center overflow-hidden">
                <div 
                  ref={previewRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  className={`relative w-full aspect-auto min-h-[40vh] max-h-[75vh] overflow-hidden rounded-[2rem] bg-black/40 flex items-center justify-center border border-white/5 transition-all duration-300 ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                >
                  <img 
                    src={isComparing ? activeProject.history[0].url : activeProject.url} 
                    alt="Preview" 
                    draggable={false}
                    className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out pointer-events-none"
                    style={{ transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)` }}
                  />
                  
                  {isComparing && (
                    <div className="absolute top-8 left-8 bg-white text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-[0.2em] animate-pulse shadow-xl">Original View</div>
                  )}

                  {/* Resolution Badge Overlay */}
                  <div className="absolute top-6 right-6 px-4 py-1.5 bg-black/40 ios-blur border border-white/10 rounded-full pointer-events-none z-10 flex items-center gap-2 animate-in fade-in duration-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759]"></div>
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                      {activeProject.metadata.width} × {activeProject.metadata.height}
                    </span>
                  </div>

                  {activeTool === ToolType.CROP && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-[#007aff]/40 grid grid-cols-3 grid-rows-3 opacity-40">
                      {[...Array(8)].map((_, i) => <div key={i} className="border border-white/10" />)}
                    </div>
                  )}

                  {/* Zoom Controls Overlay */}
                  {!activeTool && (
                    <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-white/10 ios-blur border border-white/10 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setZoom(Math.max(1, zoom - 0.5)); if(zoom <= 1.5) setPanOffset({x:0,y:0}); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
                      <span className="text-[11px] font-black w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(Math.min(3, zoom + 0.5))} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>
                
                <div className="w-full flex items-center justify-between p-8">
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-white line-clamp-1 mb-1">{activeProject.metadata.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black bg-white/10 text-white/60 px-3 py-1 rounded-full uppercase tracking-widest">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${activeProject.metadata.size > activeProject.metadata.originalSize ? 'bg-orange-500/10 text-orange-500' : 'bg-[#34c759]/10 text-[#34c759]'}`}>
                        {formatFileSize(activeProject.metadata.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={activeProject.url} download={`imagerize-${activeProject.metadata.name}`} className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-black shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest">
                      <DownloadIcon className="w-5 h-5" />
                      Export
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Panel */}
            {showDetails && (
              <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                    <InfoIcon className="text-[#007aff] w-6 h-6" />
                    Technical Specs
                  </h3>
                  <button onClick={() => setShowDetails(false)} className="text-white/40 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Filename', value: activeProject.metadata.name },
                    { label: 'Format', value: activeProject.metadata.format.split('/')[1].toUpperCase() },
                    { label: 'Canvas', value: `${activeProject.metadata.width} × ${activeProject.metadata.height}` },
                    { label: 'Aspect Ratio', value: (activeProject.metadata.width / activeProject.metadata.height).toFixed(2) },
                    { label: 'Memory', value: formatFileSize(activeProject.metadata.size) },
                    { label: 'Status', value: activeProject.metadata.size > activeProject.metadata.originalSize ? 'Extended' : 'Native' }
                  ].map(item => (
                    <div key={item.label} className="bg-black/40 p-6 rounded-3xl border border-white/5">
                      <span className="block text-[10px] font-black text-white/40 uppercase mb-2 tracking-[0.2em]">{item.label}</span>
                      <span className="block text-base font-bold truncate text-white/90">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis Result Display */}
            {aiAnalysis && (
              <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-[#007aff]/30 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                   <button onClick={() => setAiAnalysis(null)} className="text-white/20 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-[#007aff] rounded-2xl flex items-center justify-center shadow-lg shadow-[#007aff]/30">
                     <SparklesIcon className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">AI Expert Analysis</h3>
                </div>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-white/90 bg-transparent border-none p-0 selection:bg-[#007aff]/30">
                    {aiAnalysis}
                  </pre>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                   Powered by Gemini Flash
                </div>
              </div>
            )}

            {/* Tool Logic (Darker Theme Adjustments) */}
            <div className="min-h-[200px] pb-12">
              {activeTool === ToolType.ADJUST && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Color Grading</h3>
                    <button onClick={() => { setBrightness(100); setContrast(100); setSaturate(100); setExposure(100); setHue(0); }} className="text-[#007aff] text-xs font-black uppercase tracking-widest border-b border-[#007aff]/30 pb-1">Reset All</button>
                  </div>
                  <div className="space-y-8 mb-12">
                    {[
                      { label: 'Brightness', val: brightness, set: setBrightness, min: 0, max: 200, unit: '%' },
                      { label: 'Contrast', val: contrast, set: setContrast, min: 0, max: 200, unit: '%' },
                      { label: 'Saturation', val: saturate, set: setSaturate, min: 0, max: 200, unit: '%' },
                      { label: 'Exposure', val: exposure, set: setExposure, min: 50, max: 150, unit: '%' },
                      { label: 'Hue', val: hue, set: setHue, min: 0, max: 360, unit: '°' }
                    ].map(s => (
                      <div key={s.label} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">{s.label}</span>
                          <span className="text-sm font-bold text-white">{s.val}{s.unit}</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step="1" value={s.val} onChange={(e) => s.set(parseInt(e.target.value))} className="w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Discard</button>
                    <button onClick={applyAdjustments} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#007aff]/30 active:scale-95 transition-all">Update Pixels</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.RESIZE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                   <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Precision Resize</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Constraint</span>
                      <button onClick={() => setLockAspectRatio(!lockAspectRatio)} className={`w-14 h-7 rounded-full p-1.5 transition-colors ${lockAspectRatio ? 'bg-[#34c759]' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${lockAspectRatio ? 'translate-x-7' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="space-y-3">
                      <span className="ml-2 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Width (px)</span>
                      <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 font-black text-2xl focus:border-[#007aff]/50 outline-none transition-all text-white" />
                    </div>
                    <div className="space-y-3">
                      <span className="ml-2 text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Height (px)</span>
                      <input type="number" value={height} onChange={(e) => { setHeight(e.target.value); setLockAspectRatio(false); }} className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 font-black text-2xl focus:border-[#007aff]/50 outline-none transition-all text-white" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button onClick={applyResize} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Confirm Scale</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.ROTATE && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Orientation Tool</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                    <button onClick={() => handleQuickRotate(-90)} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#007aff]/10 hover:border-[#007aff]/50 transition-all active:scale-95 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#007aff] transition-colors">
                        <RotateIcon className="w-6 h-6 -scale-x-100" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">-90°</span>
                    </button>
                    <button onClick={() => handleQuickRotate(90)} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#007aff]/10 hover:border-[#007aff]/50 transition-all active:scale-95 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#007aff] transition-colors">
                        <RotateIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">90°</span>
                    </button>
                    <button onClick={() => handleQuickRotate(180)} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#007aff]/10 hover:border-[#007aff]/50 transition-all active:scale-95 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#007aff] transition-colors">
                        <RotateIcon className="w-6 h-6 rotate-180" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">180°</span>
                    </button>
                    <button onClick={() => applyTool((img) => imageService.flipImage(img, 'horizontal', targetFormat), 'Mirror')} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-3 hover:bg-[#007aff]/10 hover:border-[#007aff]/50 transition-all active:scale-95 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-[#007aff] transition-colors">
                        <MirrorIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Flip H</span>
                    </button>
                  </div>

                  <div className="space-y-6 mb-10">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Fine Adjustment</span>
                      <span className="text-sm font-bold text-[#007aff]">{rotationAngle}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="-180" 
                      max="180" 
                      step="1" 
                      value={rotationAngle} 
                      onChange={(e) => setRotationAngle(parseInt(e.target.value))} 
                      className="w-full" 
                    />
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button onClick={applyCustomRotation} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#007aff]/30">Apply Custom Rotate</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.BORDER && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Frame Stylist</h3>
                  
                  <div className="space-y-8 mb-10">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Border Thickness</span>
                        <span className="text-sm font-bold text-[#007aff]">{borderWidth}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="20" 
                        step="0.5" 
                        value={borderWidth} 
                        onChange={(e) => setBorderWidth(parseFloat(e.target.value))} 
                        className="w-full" 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Palette Presets</span>
                        <input 
                          type="color" 
                          value={borderColor} 
                          onChange={(e) => setBorderColor(e.target.value)}
                          className="w-8 h-8 rounded-full border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-3">
                        {borderPresets.map(preset => (
                          <button 
                            key={preset.name}
                            onClick={() => setBorderColor(preset.color)}
                            className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${borderColor.toLowerCase() === preset.color.toLowerCase() ? 'border-[#007aff] scale-110' : 'border-white/10 hover:border-white/30'}`}
                            style={{ backgroundColor: preset.color }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button onClick={applyBorderEffect} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#007aff]/30">Confirm Frame</button>
                  </div>
                </div>
              )}

              {activeTool === ToolType.CONVERT && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Output Engine</h3>
                  <div className="space-y-8">
                    <div className="flex bg-black/40 p-2 rounded-3xl border border-white/5">
                      {['image/png', 'image/jpeg', 'image/webp'].map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setTargetFormat(fmt)}
                          className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${targetFormat === fmt ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white'}`}
                        >
                          {fmt.split('/')[1].toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Compression Quality</span>
                          <span className="text-sm font-bold text-[#007aff]">{Math.round(quality * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="1.0" 
                          step="0.01" 
                          value={quality} 
                          onChange={(e) => setQuality(parseFloat(e.target.value))} 
                          className="w-full" 
                        />
                      </div>
                    )}
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Cancel</button>
                      <button onClick={applyFormatConversion} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#007aff]/30">Apply Conversion</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTool === ToolType.FILTER && (
                <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Artistic Look</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-10 p-1 max-h-[40vh] overflow-y-auto no-scrollbar">
                    {[
                      { name: 'Vivid', f: 'brightness(1.1) saturate(1.6)' },
                      { name: 'Dramatic', f: 'contrast(1.5) brightness(0.9)' },
                      { name: 'Mono', f: 'grayscale(100%)' },
                      { name: 'Sepia', f: 'sepia(100%)' },
                      { name: 'Chrome', f: 'contrast(1.2) saturate(1.4) brightness(1.1)' },
                      { name: 'Fade', f: 'brightness(1.1) contrast(0.8) saturate(0.6)' },
                      { name: 'Noir', f: 'grayscale(100%) contrast(1.8) brightness(0.7)' },
                      { name: 'Process', f: 'contrast(1.2) saturate(1.2) hue-rotate(-15deg)' },
                      { name: 'Transfer', f: 'sepia(0.2) contrast(1.1) brightness(1.1) hue-rotate(10deg)' },
                      { name: 'Instant', f: 'sepia(0.4) saturate(1.3) contrast(0.9)' },
                      { name: 'Arctic', f: 'hue-rotate(30deg) saturate(1.2)' },
                      { name: 'Solar', f: 'sepia(40%) saturate(1.5)' },
                      { name: 'Lush', f: 'saturate(2) contrast(1.1)' },
                      { name: 'Antique', f: 'sepia(0.8) contrast(0.8) brightness(1.2)' },
                      { name: 'Retro', f: 'sepia(0.3) hue-rotate(-10deg) contrast(1.1) saturate(1.4)' },
                      { name: 'Cool', f: 'hue-rotate(15deg) saturate(1.1) brightness(1.05)' },
                      { name: 'Warm', f: 'sepia(0.2) saturate(1.5) brightness(1.05)' },
                      { name: 'High Key', f: 'brightness(1.5) contrast(0.8)' },
                      { name: 'Low Key', f: 'brightness(0.6) contrast(1.4)' },
                      { name: 'Bloom', f: 'blur(0.4px) brightness(1.1) contrast(1.1)' }
                    ].map(filter => (
                      <button 
                        key={filter.name}
                        onClick={() => applyTool((img) => imageService.applyFilter(img, filter.f, targetFormat), `Filter: ${filter.name}`)}
                        className="flex flex-col items-center gap-3 p-4 bg-black/40 rounded-3xl border border-white/5 hover:border-white/20 active:scale-90 transition-all group"
                      >
                        <div className="w-14 h-14 rounded-full border border-white/20 overflow-hidden" style={{ filter: filter.f, backgroundImage: `url(${activeProject.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40 group-hover:text-white transition-colors text-center">{filter.name}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setActiveTool(null)} className="w-full bg-white/5 text-white/40 py-5 rounded-3xl font-black uppercase tracking-widest text-xs">Back to Canvas</button>
                </div>
              )}

              {activeTool === ToolType.AI_ANALYZE && (
                 <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 text-center">
                    <div className="w-20 h-20 bg-[#007aff]/20 border border-[#007aff]/30 rounded-3xl flex items-center justify-center mx-auto mb-8 text-[#007aff] shadow-xl animate-float">
                       <SparklesIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Gemini Intelligence</h3>
                    <p className="text-white/40 mb-10 text-lg font-medium max-w-md mx-auto leading-relaxed">Let our specialized AI model analyze your composition, lighting, and provide professional editing suggestions.</p>
                    <div className="flex gap-4">
                      <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs transition-all active:scale-95">Cancel</button>
                      <button onClick={handleAiAnalyze} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-[#007aff]/40 transition-all active:scale-95">Run Analysis</button>
                    </div>
                 </div>
              )}

              {!activeTool && (
                 <div className="text-center text-white/20 py-24 px-10 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 animate-in fade-in duration-1000">
                    <p className="font-black text-sm uppercase tracking-[0.4em]">Select a mode from the toolbar to begin editing.</p>
                 </div>
              )}

              {[ToolType.BW, ToolType.MIRROR, ToolType.PIXELATE, ToolType.COMPRESS, ToolType.CROP].includes(activeTool as ToolType) && (
                 <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/10 text-center">
                    <h3 className="text-2xl font-black uppercase tracking-widest text-[#007aff] mb-6">{activeTool} Active</h3>
                    <p className="text-white/40 mb-10 text-sm font-bold uppercase tracking-widest">Apply the effect to your image?</p>
                    <div className="flex gap-4">
                      <button onClick={() => setActiveTool(null)} className="flex-1 bg-white/5 text-white/40 py-6 rounded-3xl font-black uppercase tracking-widest text-xs">Cancel</button>
                      <button onClick={() => {
                        if (activeTool === ToolType.BW) applyTool((img) => imageService.grayscaleImage(img, targetFormat), 'Mono');
                        else if (activeTool === ToolType.MIRROR) applyTool((img) => imageService.flipImage(img, 'horizontal', targetFormat), 'Mirror');
                        else if (activeTool === ToolType.PIXELATE) applyTool((img) => imageService.pixelateImage(img, 0.1, targetFormat), 'Pixel');
                        else if (activeTool === ToolType.COMPRESS) applyTool((img) => imageService.compressImage(img, 0.7, targetFormat), 'Shrink');
                      }} className="flex-[2] bg-[#007aff] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl">Confirm Action</button>
                    </div>
                 </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modern iOS Creator Footer */}
      <footer className="w-full py-12 px-6 border-t border-white/5 bg-black/40 ios-blur mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2"></div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
            Created by <span className="text-white/80">Sujon</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Facebook</span>
               <span className="text-[10px] font-bold text-white/60 tracking-wider">sujonworld0</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Email</span>
               <span className="text-[10px] font-bold text-white/60 tracking-wider">classicalsujon@gmail.com</span>
            </div>
          </div>
          <p className="text-[9px] font-bold text-white/10 mt-4 tracking-widest">© 2025 IMAGERIZE • ALL RIGHTS RESERVED</p>
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
          }
        }} />
      )}
    </div>
  );
}
