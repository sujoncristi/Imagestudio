
import React, { useState, useEffect, useRef } from 'react';
import { ToolType, ImageMetadata, ProjectImage, HistoryItem, ViewType } from './types.ts';
import Uploader from './components/Uploader.tsx';
import ToolBar from './components/ToolBar.tsx';
import { 
  XIcon, DownloadIcon, UndoIcon, RedoIcon, SparklesIcon, 
  ZoomInIcon, ZoomOutIcon, InfoIcon, 
  EyeIcon, ResetIcon, RotateIcon, FilterIcon,
  ResizeIcon, CropIcon, AdjustmentsIcon, UploadIcon, MirrorIcon, PixelIcon, CompressIcon, MagicWandIcon,
  GripVerticalIcon, ConvertIcon
} from './components/Icons.tsx';
import * as imageService from './services/imageService.ts';

const lookPresets = {
  Modern: [
    { name: 'Vivid', f: 'saturate(1.4) contrast(1.1) brightness(1.05)' },
    { name: 'Dramatic', f: 'contrast(1.4) brightness(0.9) saturate(0.8)' },
    { name: 'Mono', f: 'grayscale(100%) contrast(1.2) brightness(1.1)' },
    { name: 'Clean', f: 'brightness(1.05) saturate(1.1)' }
  ],
  Studio: [
    { name: 'Portrait', f: 'brightness(1.05) contrast(1.05) saturate(1.1)' },
    { name: 'Commercial', f: 'contrast(1.2) saturate(1.3)' },
    { name: 'Fashion', f: 'brightness(1.1) contrast(1.1) saturate(0.9) sepia(0.05)' },
    { name: 'Product', f: 'brightness(1.02) contrast(1.1) saturate(1.2)' }
  ],
  Vintage: [
    { name: 'Sepia', f: 'sepia(100%) brightness(0.9) contrast(1.1)' },
    { name: '70s Film', f: 'sepia(0.3) saturate(1.2) contrast(1.1) brightness(1.05) hue-rotate(-10deg)' },
    { name: 'Noir', f: 'grayscale(100%) contrast(1.5) brightness(0.8)' },
    { name: 'Antique', f: 'sepia(0.6) contrast(0.9) brightness(1.1)' }
  ],
  Artistic: [
    { name: 'Cyber', f: 'hue-rotate(180deg) saturate(2) contrast(1.2)' },
    { name: 'Ethereal', f: 'brightness(1.2) saturate(0.5) blur(0.5px) contrast(0.9)' },
    { name: 'Acid', f: 'hue-rotate(90deg) saturate(3) invert(0.1)' },
    { name: 'Velvet', f: 'saturate(1.5) contrast(1.3) hue-rotate(-20deg)' }
  ],
  Glitch: [
    { name: 'Shift', f: 'hue-rotate(240deg) saturate(1.5) contrast(1.5)' },
    { name: 'Invert', f: 'invert(100%)' },
    { name: 'Contrast', f: 'contrast(3) saturate(0)' },
    { name: 'Neon', f: 'hue-rotate(300deg) saturate(2) brightness(1.2)' }
  ],
  Cartoon: [
    { name: 'Poster', f: 'contrast(2) saturate(2) brightness(1.1)' },
    { name: 'Outline', f: 'grayscale(100%) contrast(5) invert(100%)' },
    { name: 'Vibrant', f: 'saturate(3) contrast(1.1)' },
    { name: 'Muted', f: 'saturate(0.4) contrast(1.4) brightness(1.2)' }
  ]
};

const HeroVisual = () => {
  const [step, setStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 4), 4000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };
  
  const getStyle = (s: number) => {
    const isMain = s === step;
    const parallaxX = mousePos.x * 20;
    const parallaxY = mousePos.y * 20;
    
    switch(s) {
      case 1: return { filter: 'brightness(1.1) saturate(1.4) contrast(1.1)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1.1) rotate(2deg)' };
      case 2: return { filter: 'grayscale(100%) contrast(1.25)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(0.95) rotate(-2deg)' };
      case 3: return { filter: 'sepia(0.2) contrast(1.1) brightness(1.05)', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1.05) rotate(1deg)' };
      default: return { filter: 'none', opacity: isMain ? 1 : 0, transform: isMain ? `translate(${parallaxX}px, ${parallaxY}px) scale(1)` : 'scale(1)' };
    }
  };

  const labels = ["RAW CAPTURE", "STUDIO VIVID", "NOIR MONO", "FILM CLASSIC"];

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto aspect-[2.4/1] mb-12 px-4 group cursor-default"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-[#007aff]/30 via-[#5856d6]/10 to-[#af52de]/30 blur-[160px] rounded-full animate-pulse opacity-40 transition-all duration-1000 group-hover:opacity-60"></div>
      
      <div className="relative h-full w-full bg-[#0a0a0c] rounded-[4rem] p-3 border border-white/10 shadow-[0_32px_120px_-30px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center transition-all duration-1000 group-hover:border-white/20">
        <div className="absolute top-12 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <div className="bg-black/80 ios-blur px-8 py-3 rounded-full border border-white/10 text-[11px] font-black uppercase tracking-[0.5em] text-[#007aff] shadow-2xl transition-all duration-700 group-hover:tracking-[0.6em]">
            {labels[step]}
          </div>
        </div>

        {[0, 1, 2, 3].map((s) => (
           <img 
            key={s}
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" 
            className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] object-cover rounded-[3.2rem] transition-all duration-[1500ms] cubic-bezier(0.19, 1, 0.22, 1)" 
            style={getStyle(s)} 
          />
        ))}
        
        <div className="absolute bottom-14 left-20 w-16 h-16 bg-white/5 ios-blur rounded-3xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{ transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)` }}><AdjustmentsIcon className="text-[#007aff] w-8 h-8" /></div>
        <div className="absolute top-24 right-20 w-14 h-14 bg-white/5 ios-blur rounded-2xl border border-white/10 flex items-center justify-center shadow-3xl animate-float pointer-events-none z-20" style={{animationDelay: '1.5s', transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}><CropIcon className="text-[#af52de] w-6 h-6" /></div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
      </div>
    </div>
  );
};

const ShowcaseSection = () => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(x, 0), 100));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 mb-32 animate-in fade-in duration-1000 delay-500">
      <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-6">
        <div className="space-y-2">
          <h4 className="text-[#007aff] text-[11px] font-black tracking-[0.4em] uppercase">Neural Precision</h4>
          <h3 className="text-4xl font-black tracking-tighter">See the Difference</h3>
        </div>
        <p className="text-white/30 font-medium max-w-sm text-sm">Our 32-bit floating point processing engine preserves every bit of data while mastering colors.</p>
      </div>
      
      <div 
        ref={containerRef}
        className="relative aspect-[21/9] rounded-[4rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] cursor-ew-resize group"
        onMouseMove={handleMouseMove}
      >
        <img 
          src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover filter saturate-[2] contrast-[1.2] brightness-[1.1]" 
          alt="After"
        />
        <div 
          className="absolute inset-0 w-full h-full overflow-hidden" 
          style={{ width: `${sliderPos}%` }}
        >
          <img 
            src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop" 
            className="absolute inset-0 w-[100vw] h-full object-cover grayscale" 
            alt="Before"
            style={{ width: containerRef.current?.offsetWidth || '1000px' }}
          />
        </div>
        
        {/* Slider Line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)] z-20 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl">
            <MirrorIcon className="w-5 h-5 text-black" />
          </div>
        </div>
        
        <div className="absolute bottom-10 left-10 z-10 px-6 py-2 bg-black/40 ios-blur border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">Baseline Raw</div>
        <div className="absolute bottom-10 right-10 z-10 px-6 py-2 bg-[#007aff] border border-[#007aff]/50 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Mastered Output</div>
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
  const [draggedThumbnailIndex, setDraggedThumbnailIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Crop specific State
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [activeCropHandle, setActiveCropHandle] = useState<string | null>(null);
  const cropStartPos = useRef({ x: 0, y: 0 });
  const initialCropBox = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Formatting State
  const [targetFormat, setTargetFormat] = useState<string>('image/jpeg');
  const [formatQuality, setFormatQuality] = useState(0.9);

  // Tool specific State
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
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

  const handleFormatUpload = async (files: File[]) => {
    if (files.length === 0) return;
    startTask('Initializing Format Converter...');
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
    endTask();
  };

  const handleAutoEnhance = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    startTask('Intelligent Analysis...');
    setTimeout(() => setLoadingMessage('Balancing Tones...'), 1000);
    setTimeout(() => setLoadingMessage('Polishing Highlights...'), 2000);
    
    try {
      const originalUrl = URL.createObjectURL(file);
      const img = await imageService.loadImage(originalUrl);
      
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

      await new Promise(r => setTimeout(r, 2500));

      setProjects(prev => [...prev, newProject]);
      setActiveIndex(projects.length);
      setView('editor');
    } catch (e) {
      alert("Auto enhance failed.");
    } finally {
      endTask();
    }
  };

  const handleCropOnlyUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    startTask('Initializing Crop...');
    try {
      const url = URL.createObjectURL(file);
      const img = await imageService.loadImage(url);
      const meta: ImageMetadata = {
        width: img.width, height: img.height, format: file.type,
        size: file.size, originalSize: file.size, name: `Crop_${file.name}`
      };
      const newProject: ProjectImage = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        metadata: meta,
        history: [{ url, metadata: meta }],
        historyIndex: 0
      };
      setProjects([newProject]);
      setActiveIndex(0);
      setActiveTool(ToolType.CROP);
      setView('editor');
    } catch (e) {
      alert("Failed to load image for cropping.");
    } finally {
      endTask();
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (activeTool === ToolType.CROP) return;
    e.preventDefault();
    setIsPanning(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { x: panOffset.x, y: panOffset.y };
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setActiveCropHandle(null);
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        window.requestAnimationFrame(() => {
          setPanOffset({ 
            x: panStartOffset.current.x + dx, 
            y: panStartOffset.current.y + dy 
          });
        });
      } else if (activeCropHandle && imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
        const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
        
        const dx = mouseX - cropStartPos.current.x;
        const dy = mouseY - cropStartPos.current.y;
        
        window.requestAnimationFrame(() => {
          let { x, y, w, h } = initialCropBox.current;
          
          if (activeCropHandle === 'move') {
            x = Math.max(0, Math.min(100 - w, x + dx));
            y = Math.max(0, Math.min(100 - h, y + dy));
          } else {
            if (activeCropHandle.includes('top')) {
              const newY = Math.max(0, Math.min(y + h - 5, y + dy));
              h = h + (y - newY);
              y = newY;
            }
            if (activeCropHandle.includes('bottom')) {
              h = Math.max(5, Math.min(100 - y, h + dy));
            }
            if (activeCropHandle.includes('left')) {
              const newX = Math.max(0, Math.min(x + w - 5, x + dx));
              w = w + (x - newX);
              x = newX;
            }
            if (activeCropHandle.includes('right')) {
              w = Math.max(5, Math.min(100 - x, w + dx));
            }
          }
          setCropBox({ x, y, w, h });
        });
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPanning, activeCropHandle]);

  const adjustZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.max(0.5, Math.min(5, prev + delta));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleThumbnailDragStart = (e: React.DragEvent, index: number) => {
    setDraggedThumbnailIndex(index);
    e.dataTransfer.setData('thumbnailIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    const ghost = new Image();
    ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    e.dataTransfer.setDragImage(ghost, 0, 0);
  };

  const handleThumbnailDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndexStr = e.dataTransfer.getData('thumbnailIndex');
    if (!dragIndexStr) return;
    const dragIndex = parseInt(dragIndexStr);
    
    if (dragIndex === dropIndex) {
      setDraggedThumbnailIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newProjects = [...projects];
    const [removed] = newProjects.splice(dragIndex, 1);
    newProjects.splice(dropIndex, 0, removed);
    
    const activeProjectId = projects[activeIndex]?.id;
    const newActiveIndex = newProjects.findIndex(p => p.id === activeProjectId);
    
    setProjects(newProjects);
    setActiveIndex(newActiveIndex === -1 ? 0 : newActiveIndex);
    setDraggedThumbnailIndex(null);
    setDragOverIndex(null);
  };

  const handleCropHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setActiveCropHandle(handle);
    cropStartPos.current = { x: mouseX, y: mouseY };
    initialCropBox.current = { ...cropBox };
  };

  const handleManualCropChange = (key: keyof typeof cropBox, value: number) => {
    if (!activeProject) return;
    let newValue = value;
    if (key === 'x' || key === 'w') {
        newValue = (value / activeProject.metadata.width) * 100;
    } else {
        newValue = (value / activeProject.metadata.height) * 100;
    }
    setCropBox(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, newValue)) }));
  };

  const getCropDisplayValue = (key: keyof typeof cropBox) => {
    if (!activeProject) return 0;
    if (key === 'x' || key === 'w') {
        return Math.round((cropBox[key] / 100) * activeProject.metadata.width);
    } else {
        return Math.round((cropBox[key] / 100) * activeProject.metadata.height);
    }
  };

  const executeFormatConversion = async (project: ProjectImage) => {
    startTask(`Converting ${project.metadata.name}...`);
    try {
      const img = await imageService.loadImage(project.url);
      const convertedUrl = await imageService.compressImage(img, formatQuality, targetFormat);
      const link = document.createElement('a');
      link.href = convertedUrl;
      const extension = targetFormat.split('/')[1];
      link.download = `${project.metadata.name.split('.')[0]}_converted.${extension}`;
      link.click();
    } catch (e) {
      alert("Failed to convert image.");
    } finally {
      endTask();
    }
  };

  const executeBulkConversion = async () => {
    for (const p of projects) {
      await executeFormatConversion(p);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#007aff]/30 overflow-x-hidden">
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl"></div>
          <div className="relative bg-[#1c1c1e]/90 ios-blur p-16 rounded-[4rem] flex flex-col items-center gap-10 border border-white/10 shadow-[0_0_100px_rgba(0,122,255,0.2)] spring-in">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-[6px] border-[#007aff]/10 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-[#007aff] font-black text-2xl tracking-[0.2em] uppercase text-center min-w-[320px] leading-tight transition-all duration-300">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-black/60 ios-blur border-b border-white/5 px-6 md:px-12 py-5 flex items-center justify-between transition-all duration-500">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-all active:scale-95" onClick={() => {setView('home'); setActiveTool(null);}}>
          <div className="w-11 h-11 bg-gradient-to-br from-[#007aff] to-[#5856d6] rounded-xl flex items-center justify-center shadow-xl shadow-[#007aff]/20">
            <SparklesIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter hidden sm:block">Imagerize</h1>
        </div>
        
        {view !== 'home' && (
          <div className="flex items-center gap-3 md:gap-4 spring-in">
            {view === 'editor' && activeProject && (
              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 shadow-inner">
                <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-all active:scale-90"><EyeIcon className="w-5 h-5" /></button>
                <button onClick={() => { setZoom(1); setPanOffset({x:0, y:0}); }} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-all active:scale-90"><ResetIcon className="w-5 h-5" /></button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={undo} disabled={activeProject.historyIndex <= 0} className="w-10 h-10 rounded-full text-[#007aff] disabled:opacity-10 hover:bg-white/5 transition-all active:scale-90"><UndoIcon className="w-5 h-5" /></button>
                <button onClick={redo} disabled={activeProject.historyIndex >= activeProject.history.length - 1} className="w-10 h-10 rounded-full text-[#007aff] disabled:opacity-10 hover:bg-white/5 transition-all active:scale-90"><RedoIcon className="w-5 h-5" /></button>
              </div>
            )}
            <button onClick={() => setView('home')} className="bg-white text-black px-5 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-all hover:bg-white/90">Studio</button>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 transition-all duration-700 overflow-hidden">
        
        {view === 'home' && (
          <div className="py-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <HeroVisual />
            
            <div className="text-center space-y-6 mb-24 px-4">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] max-w-5xl mx-auto">
                Next-Gen Suite. <br/>
                <span className="bg-gradient-to-r from-[#007aff] via-[#af52de] to-[#ff2d55] bg-clip-text text-transparent">Studio Logic.</span>
              </h2>
              <p className="text-[#8e8e93] text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
                The ultimate pro workspace for high-fidelity image mastering, neural grading, and precision formatting.
              </p>
            </div>

            <ShowcaseSection />

            {/* BENTO GRID */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 px-6 mb-32">
              <div 
                className="col-span-1 md:col-span-8 group relative p-12 bg-[#1c1c1e] rounded-[4rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all duration-700 flex flex-col justify-end overflow-hidden min-h-[500px]"
                onClick={() => setView('editor')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute top-14 left-14 w-20 h-20 bg-[#007aff] rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-3 transition-transform duration-500">
                  <AdjustmentsIcon className="w-10 h-10 text-white" />
                </div>
                <div className="z-10">
                  <h3 className="text-5xl font-black tracking-tighter mb-4">Studio Master</h3>
                  <p className="text-white/40 font-bold mb-10 leading-snug max-w-md text-xl">Full non-destructive manual workflow for precision pixel manipulation.</p>
                  <div className="inline-flex bg-white text-black px-10 py-5 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl group-hover:bg-[#007aff] group-hover:text-white transition-all font-bold">Open Canvas</div>
                </div>
              </div>

              <div 
                className="col-span-1 md:col-span-4 group relative p-10 bg-gradient-to-br from-[#af52de]/30 to-[#ff2d55]/30 rounded-[4rem] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-700 flex flex-col items-center text-center overflow-hidden min-h-[500px]"
                onClick={() => setView('crop')}
              >
                <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-auto shadow-2xl group-hover:scale-110 transition-transform">
                  <CropIcon className="w-8 h-8 text-[#af52de]" />
                </div>
                <div className="mt-auto z-10">
                  <h3 className="text-4xl font-black tracking-tighter mb-4">Smart Crop</h3>
                  <p className="text-white/40 font-bold mb-10 leading-snug text-lg px-4">Reframing engine with intelligent social-media presets.</p>
                  <div className="bg-[#af52de] text-white px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl group-hover:bg-white group-hover:text-[#af52de] transition-all font-bold">Start Refit</div>
                </div>
              </div>

              <div 
                className="col-span-1 md:col-span-5 group relative p-12 bg-[#1c1c1e] rounded-[4rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-[1.005] active:scale-[0.99] transition-all duration-700 flex flex-col items-center justify-between overflow-hidden"
                onClick={() => setView('enhance')}
              >
                <div className="w-16 h-16 bg-[#34c759] rounded-2xl flex items-center justify-center shadow-2xl mb-10 group-hover:rotate-12 transition-transform">
                  <MagicWandIcon className="w-8 h-8 text-white" />
                </div>
                <div className="text-center z-10">
                  <h3 className="text-4xl font-black mb-2">Neural Grade</h3>
                  <p className="text-white/40 font-bold leading-snug text-lg max-w-[240px]">AI-driven optimization for lighting, tone, and texture.</p>
                </div>
                <div className="mt-10 bg-[#34c759] text-white px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl group-hover:scale-105 transition-all font-bold">Auto Polish</div>
              </div>

              <div 
                className="col-span-1 md:col-span-7 group relative p-12 bg-gradient-to-br from-[#007aff]/25 to-[#5856d6]/25 rounded-[4rem] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-pointer hover:scale-[1.005] active:scale-[0.99] transition-all duration-700 flex flex-col md:flex-row items-center justify-between overflow-hidden min-h-[300px]"
                onClick={() => setView('format')}
              >
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-20 h-20 bg-white/10 ios-blur rounded-[2.5rem] flex items-center justify-center shadow-3xl group-hover:-rotate-3 transition-transform border border-white/10">
                    <ConvertIcon className="w-10 h-10 text-[#007aff]" />
                  </div>
                  <div className="text-center md:text-left z-10">
                    <h3 className="text-4xl font-black tracking-tighter mb-2">Converter</h3>
                    <p className="text-white/40 font-bold leading-snug text-lg max-w-[320px]">Batch switch between lossy and lossless studio formats.</p>
                  </div>
                </div>
                <div className="mt-8 md:mt-0 bg-[#007aff] text-white px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-xl group-hover:bg-white group-hover:text-[#007aff] transition-all font-bold">Format Lab</div>
              </div>
            </div>

            {/* TECHNICAL INSIGHTS */}
            <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-12 px-12 pb-40">
               {[
                 { t: 'CHROMA V3', d: 'Studio color mapping' },
                 { t: 'NEURAL INF', d: 'ML tone balancing' },
                 { t: 'F32 DEPTH', d: 'Infinite color space' },
                 { t: 'METAL ACCEL', d: 'Hardware rendering' }
               ].map((s, i) => (
                 <div key={s.t} className="text-center md:text-left border-l border-white/5 pl-8 spring-in" style={{animationDelay: `${i*100}ms`}}>
                    <div className="text-[13px] font-black tracking-[0.5em] mb-2 text-white">{s.t}</div>
                    <div className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em]">{s.d}</div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* FORMAT VIEW */}
        {view === 'format' && (
           <div className="py-20 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-12 duration-700 max-w-4xl mx-auto">
             <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-[#007aff] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(0,122,255,0.4)] transition-transform active:scale-95">
                  <ConvertIcon className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-5xl font-black tracking-tight">Format Suite</h2>
                <p className="text-white/40 text-xl font-medium">Batch convert and optimize your studio assets for web or print.</p>
             </div>

             {projects.length === 0 ? (
               <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/10 shadow-3xl text-center group cursor-pointer relative overflow-hidden transition-all hover:border-[#007aff]/50 active:scale-[0.99]">
                  <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFormatUpload(Array.from(e.target.files || []))} accept="image/*" />
                  <div className="flex flex-col items-center gap-8 py-10">
                      <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center group-hover:border-[#007aff] group-hover:scale-110 transition-all">
                        <UploadIcon className="w-8 h-8 opacity-40 group-hover:opacity-100 text-[#007aff]" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-black group-hover:text-[#007aff] transition-colors">Select assets to convert</p>
                        <p className="text-white/20 font-bold uppercase tracking-widest text-sm">PNG • JPG • WEBP</p>
                      </div>
                      <button className="bg-white/5 px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/10 group-hover:bg-[#007aff] group-hover:text-white transition-all">Import Photos</button>
                  </div>
               </div>
             ) : (
               <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-[#1c1c1e] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-6 px-2">Selected Assets</h4>
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {projects.map((p, idx) => (
                            <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                               <img src={p.url} className="w-full h-full object-cover" />
                               <button 
                                 onClick={() => setProjects(prev => prev.filter(item => item.id !== p.id))}
                                 className="absolute top-1 right-1 w-6 h-6 bg-black/60 ios-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <XIcon className="w-3 h-3 text-white" />
                               </button>
                            </div>
                          ))}
                          <label className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                             <input type="file" multiple className="hidden" onChange={(e) => handleFormatUpload(Array.from(e.target.files || []))} />
                             <UploadIcon className="w-6 h-6 opacity-30" />
                          </label>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="bg-[#1c1c1e] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2">Target Format</p>
                          <div className="grid grid-cols-3 gap-3">
                             {['image/jpeg', 'image/png', 'image/webp'].map(fmt => (
                               <button 
                                 key={fmt}
                                 onClick={() => setTargetFormat(fmt)}
                                 className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${targetFormat === fmt ? 'bg-[#007aff] text-white shadow-lg' : 'bg-white/5 text-white/30 hover:text-white'}`}
                               >
                                 {fmt.split('/')[1]}
                               </button>
                             ))}
                          </div>
                       </div>

                       {(targetFormat === 'image/jpeg' || targetFormat === 'image/webp') && (
                         <div className="space-y-4">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 px-2">
                               <span>Output Quality</span>
                               <span className="text-white tabular-nums">{Math.round(formatQuality * 100)}%</span>
                            </div>
                            <input type="range" min="0.1" max="1.0" step="0.05" value={formatQuality} onChange={e => setFormatQuality(parseFloat(e.target.value))} className="w-full" />
                         </div>
                       )}

                       <div className="pt-4">
                         <button 
                           onClick={executeBulkConversion}
                           className="w-full py-6 rounded-3xl bg-[#007aff] text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_20px_40px_rgba(0,122,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold"
                         >
                           Export Assets ({projects.length})
                         </button>
                       </div>
                    </div>
                  </div>
               </div>
             )}
           </div>
        )}

        {view === 'enhance' && (
          <div className="py-20 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-12 duration-700 max-w-3xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-[#34c759] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(52,199,89,0.4)] animate-pulse active:scale-95 transition-transform">
                <MagicWandIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-5xl font-black tracking-tight">Intelligent Mastering</h2>
              <p className="text-white/40 text-xl font-medium">Upload a photo to automatically fix exposure, contrast, and color vibrance.</p>
            </div>
            <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/10 shadow-3xl text-center group cursor-pointer relative overflow-hidden transition-all hover:border-[#34c759]/50 active:scale-[0.99]">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleAutoEnhance(Array.from(e.target.files || []))} accept="image/*" />
               <div className="flex flex-col items-center gap-8 py-10">
                  <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center group-hover:border-[#34c759] group-hover:rotate-12 transition-all">
                    <UploadIcon className="w-8 h-8 opacity-40 group-hover:opacity-100 text-[#34c759]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black group-hover:text-[#34c759] transition-colors">Drop photo to enhance</p>
                    <p className="text-white/20 font-bold uppercase tracking-widest text-sm">Instant studio mastering</p>
                  </div>
                  <button className="bg-white/5 px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/10 group-hover:bg-[#34c759] group-hover:text-white transition-all font-bold">Select Image</button>
               </div>
            </div>
          </div>
        )}

        {view === 'crop' && (
          <div className="py-20 flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-12 duration-700 max-w-3xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-[#af52de] rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(175,82,222,0.4)] transition-transform active:scale-95">
                <CropIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-5xl font-black tracking-tight">Precision Crop</h2>
              <p className="text-white/40 text-xl font-medium">Reframe your shots with pixel-perfect accuracy and social presets.</p>
            </div>
            <div className="w-full bg-[#1c1c1e] p-12 rounded-[4rem] border border-white/10 shadow-3xl text-center group cursor-pointer relative overflow-hidden transition-all hover:border-[#af52de]/50 active:scale-[0.99]">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleCropOnlyUpload(Array.from(e.target.files || []))} accept="image/*" />
               <div className="flex flex-col items-center gap-8 py-10">
                  <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center group-hover:border-[#af52de] group-hover:scale-110 transition-all">
                    <CropIcon className="w-8 h-8 opacity-40 group-hover:opacity-100 text-[#af52de]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black group-hover:text-[#af52de] transition-colors">Select image to reframe</p>
                    <p className="text-white/20 font-bold uppercase tracking-widest text-sm">Instant Aspect Ratios</p>
                  </div>
                  <button className="bg-white/5 px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/10 group-hover:bg-[#af52de] group-hover:text-white transition-all font-bold">Upload Photo</button>
               </div>
            </div>
          </div>
        )}

        {view === 'editor' && (
          <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
            {projects.length === 0 ? (
               <div className="w-full flex flex-col items-center justify-center min-h-[70vh] text-center gap-12 px-6">
                  <div className="w-32 h-32 bg-white/5 rounded-[3.5rem] flex items-center justify-center border border-white/10 shadow-inner group transition-all duration-500 hover:rotate-3">
                    <UploadIcon className="w-14 h-14 text-white/20 group-hover:text-[#007aff] transition-colors" />
                  </div>
                  <div className="space-y-4 max-w-md">
                    <h2 className="text-5xl font-black tracking-tight">Empty Gallery</h2>
                    <p className="text-white/40 text-xl font-medium">Import photos to begin your professional edit session.</p>
                  </div>
                  <Uploader onUpload={handleUpload} onUrlUpload={() => {}} />
               </div>
            ) : (
              <>
                <div className={`flex-1 flex flex-col gap-6 transition-all duration-500 ${activeTool ? 'lg:scale-[0.98]' : 'scale-100'}`}>
                  <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
                    <button onClick={() => {setView('home'); setActiveTool(null);}} className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"><XIcon className="w-7 h-7 opacity-40"/></button>
                    {projects.map((proj, idx) => (
                      <div 
                        key={proj.id} 
                        draggable={true}
                        onDragStart={(e) => handleThumbnailDragStart(e, idx)}
                        onDragOver={(e) => handleThumbnailDragOver(e, idx)}
                        onDrop={(e) => handleThumbnailDrop(e, idx)}
                        onDragEnd={() => { setDraggedThumbnailIndex(null); setDragOverIndex(null); }}
                        onClick={() => { setActiveIndex(idx); setActiveTool(null); }}
                        className={`group relative w-20 h-20 rounded-[2.2rem] flex-shrink-0 border-4 transition-all duration-500 cursor-pointer overflow-visible ${
                          activeIndex === idx ? 'border-[#007aff] scale-110 shadow-[0_20px_40px_rgba(0,122,255,0.4)] z-20' : 'border-transparent opacity-40 hover:opacity-100 z-10'
                        } ${dragOverIndex === idx ? 'scale-125 border-white !opacity-100 ring-8 ring-white/10' : ''} ${draggedThumbnailIndex === idx ? 'opacity-0 scale-50 pointer-events-none' : ''}`}
                      >
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden">
                            <img src={proj.url} className="w-full h-full object-cover transition-transform duration-700 pointer-events-none" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-white text-black rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100 cursor-grab active:cursor-grabbing border border-black/5">
                           <GripVerticalIcon className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                    <label className="w-20 h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-[2rem] flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer active:scale-95 group">
                      <input type="file" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
                      <UploadIcon className="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </label>
                  </div>

                  <div className="relative flex-1 bg-[#1c1c1e] rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden group transition-all duration-700">
                    <div 
                      ref={previewContainerRef} 
                      className={`relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden transition-all duration-500 ${isPanning ? 'bg-black/80 cursor-grabbing scale-[1.02]' : 'bg-black/40 cursor-grab scale-100'}`}
                      onMouseDown={handleImageMouseDown}
                    >
                      <div 
                        className={`relative will-change-transform ${(!isPanning && !activeCropHandle) ? 'transition-transform duration-500' : ''}`} 
                        style={{ 
                          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                          transitionTimingFunction: 'var(--spring-easing)'
                        }}
                      >
                        <img 
                          ref={imageRef} 
                          src={isComparing ? activeProject.history[0].url : activeProject.url} 
                          style={{ 
                            filter: activeTool === ToolType.ADJUST ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)` : 'none'
                          }}
                          className="max-w-[90vw] max-h-[70vh] object-contain shadow-2xl pointer-events-none rounded-lg transition-filter duration-300" 
                        />
                        
                        {activeTool === ToolType.CROP && !isComparing && (
                          <div 
                            className="absolute border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] animate-in fade-in duration-300 group/crop"
                            style={{
                              left: `${cropBox.x}%`,
                              top: `${cropBox.y}%`,
                              width: `${cropBox.w}%`,
                              height: `${cropBox.h}%`
                            }}
                          >
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                              <div className="border-r border-b border-white"></div><div className="border-r border-b border-white"></div><div className="border-b border-white"></div>
                            </div>
                            <div 
                              className="absolute inset-4 cursor-move active:cursor-grabbing"
                              onMouseDown={(e) => handleCropHandleMouseDown(e, 'move')}
                            ></div>
                            {[
                                { id: 'top-left', style: 'top-[-2px] left-[-2px] border-t-4 border-l-4' },
                                { id: 'top-right', style: 'top-[-2px] right-[-2px] border-t-4 border-r-4' },
                                { id: 'bottom-left', style: 'bottom-[-2px] left-[-2px] border-b-4 border-l-4' },
                                { id: 'bottom-right', style: 'bottom-[-2px] right-[-2px] border-b-4 border-r-4' }
                            ].map(h => (
                                <div 
                                    key={h.id}
                                    className={`absolute w-6 h-6 border-white rounded-[2px] cursor-nwse-resize z-10 ${h.style} ${h.id.includes('right') && !h.id.includes('bottom') ? 'cursor-nesw-resize' : ''} ${h.id.includes('left') && h.id.includes('bottom') ? 'cursor-nesw-resize' : ''}`}
                                    onMouseDown={(e) => handleCropHandleMouseDown(e, h.id)}
                                ></div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/60 ios-blur border border-white/10 rounded-full p-2 px-6 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <button onClick={() => adjustZoom(-0.2)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><ZoomOutIcon className="w-6 h-6 text-white/60" /></button>
                        <span className="text-[14px] font-black w-14 text-center tabular-nums">{Math.round(zoom*100)}%</span>
                        <button onClick={() => adjustZoom(0.2)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><ZoomInIcon className="w-6 h-6 text-white/60" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`w-full lg:w-[400px] flex flex-col gap-6 transition-all duration-500 ${activeTool ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none hidden lg:flex'}`}>
                  <div className="bg-[#1c1c1e] p-8 rounded-[4rem] border border-white/10 shadow-2xl space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar spring-in">
                    {activeTool ? (
                      <div className="animate-in slide-in-from-right-8 duration-500 flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-black uppercase tracking-widest text-[#007aff] transition-all">{activeTool}</h3>
                          <button onClick={() => setActiveTool(null)} className="p-3 hover:bg-white/5 rounded-full transition-all active:rotate-90"><XIcon className="w-5 h-5 text-white/40" /></button>
                        </div>
                        {activeTool === ToolType.ADJUST && (
                          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {[{l:'Exposure', v:brightness, s:setBrightness}, {l:'Contrast', v:contrast, s:setContrast}, {l:'Saturate', v:saturate, s:setSaturate}].map(a => (
                              <div key={a.l} className="space-y-4">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                  <span>{a.l}</span>
                                  <span className="text-white tabular-nums">{a.v}%</span>
                                </div>
                                <input type="range" min="0" max="200" value={a.v} onChange={e => a.s(parseInt(e.target.value))} className="w-full" />
                              </div>
                            ))}
                            <div className="flex gap-4 pt-4">
                               <button onClick={() => {setBrightness(100); setContrast(100); setSaturate(100);}} className="flex-1 py-4 rounded-3xl bg-white/5 font-bold uppercase text-[11px] tracking-widest transition-all hover:bg-white/10 active:scale-95">Reset</button>
                               <button onClick={() => applyTool((img) => imageService.applyFilter(img, `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`), 'Baking Grade')} className="flex-[2] py-4 rounded-3xl bg-[#007aff] font-bold uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all hover:bg-[#007aff]/90">Apply</button>
                            </div>
                          </div>
                        )}
                        {activeTool === ToolType.FILTER && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex overflow-x-auto no-scrollbar gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                              {(['Modern', 'Studio', 'Vintage', 'Artistic', 'Glitch', 'Cartoon'] as const).map(cat => (
                                <button key={cat} onClick={() => setLookCategory(cat)} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${lookCategory === cat ? 'bg-[#007aff] text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>{cat}</button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
                              {lookPresets[lookCategory as keyof typeof lookPresets].map((p) => (
                                <button key={p.name} onClick={() => applyTool((img) => imageService.applyFilter(img, p.f), p.name)} className="flex flex-col items-center gap-3 group bg-black/20 p-3 rounded-[2rem] border border-white/5 hover:border-[#007aff] transition-all active:scale-95">
                                  <div className="w-full aspect-square rounded-2xl border-2 border-white/5 overflow-hidden transition-all duration-500 group-hover:scale-105">
                                    <img src={activeProject.url} className="w-full h-full object-cover" style={{filter: p.f}} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-tighter text-white/40 group-hover:text-white transition-colors">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-[400px] flex flex-col items-center justify-center text-center gap-6 animate-in fade-in duration-1000">
                         <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group transition-all duration-500 hover:rotate-6">
                            <SparklesIcon className="w-8 h-8 text-white/10 group-hover:text-[#007aff] transition-colors" />
                         </div>
                         <div className="space-y-2">
                           <h4 className="font-black uppercase tracking-[0.3em] text-[12px] text-white/40">Studio Session</h4>
                           <p className="text-white/20 text-sm font-medium px-12">Select an engine from the toolbar below to start editing.</p>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className={`bg-[#1c1c1e] p-8 rounded-[4rem] border border-white/10 shadow-2xl flex items-center justify-between transition-all duration-500 ${activeTool ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none hidden lg:flex'}`}>
                    <div>
                       <h3 className="text-2xl font-black truncate max-w-[200px] mb-1">{activeProject.metadata.name}</h3>
                       <div className="flex gap-2">
                         <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/5 rounded-full text-white/40 tabular-nums">{activeProject.metadata.width}×{activeProject.metadata.height}</span>
                         <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#007aff]/10 rounded-full text-[#007aff] tabular-nums">{(activeProject.metadata.size / 1024 / 1024).toFixed(2)} MB</span>
                       </div>
                    </div>
                    <a href={activeProject.url} download={`imagerize_${activeProject.metadata.name}`} className="bg-white text-black px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-[#007aff] hover:text-white active:scale-95 transition-all font-bold">Export</a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-24 px-10 border-t border-white/5 bg-[#050505] ios-blur mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-16">
          <div className="flex flex-col items-start gap-6 max-w-sm">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#007aff] rounded-xl flex items-center justify-center shadow-2xl"><SparklesIcon className="w-5 h-5 text-white" /></div>
                <h4 className="text-2xl font-black tracking-tighter">IMAGERIZE</h4>
             </div>
             <p className="text-white/20 font-medium leading-relaxed text-sm">Crafted with a commitment to absolute pixel fidelity and the legendary iOS aesthetic.</p>
             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/10 pt-4">© 2024 IMAGERIZE STUDIO • CORE v5.2</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-6 text-center md:text-right">
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#007aff]">Lead Programmer</p>
             <a href="https://facebook.com/sujonworld0" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 hover:scale-105 transition-all bg-white/5 p-4 rounded-3xl border border-white/10 hover:border-[#007aff]/50">
                <div className="text-right">
                   <span className="block text-2xl font-black tracking-tighter text-white">Sujon Roy</span>
                   <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-white/30">Founder & Studio Head</span>
                </div>
                <div className="w-14 h-14 rounded-2xl border border-white/20 overflow-hidden shadow-2xl transition-transform group-hover:rotate-6"><img src="https://graph.facebook.com/sujonworld0/picture?type=large" className="w-full h-full object-cover" alt="Sujon Roy" /></div>
             </a>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-[11px] font-black uppercase tracking-[0.4em] text-white/20">
            <span className="cursor-pointer hover:text-[#007aff] transition-all">Privacy</span>
            <span className="cursor-pointer hover:text-[#007aff] transition-all">Security</span>
            <span className="cursor-pointer hover:text-[#007aff] transition-all">Cookies</span>
            <span className="cursor-pointer hover:text-[#007aff] transition-all">Contact</span>
          </div>
        </div>
      </footer>

      {view === 'editor' && activeProject && (
        <ToolBar activeTool={activeTool} onSelectTool={(t) => setActiveTool(activeTool === t ? null : t)} />
      )}
    </div>
  );
}

