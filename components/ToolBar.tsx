import React, { useState } from 'react';
import { ToolType } from '../types.ts';
import { 
  ResizeIcon, CropIcon, RotateIcon, 
  MirrorIcon, BWIcon, PixelIcon, CompressIcon, FilterIcon, AdjustmentsIcon, GrainIcon
} from './Icons.tsx';

interface ToolBarProps {
  activeTool: ToolType | null;
  onSelectTool: (tool: ToolType) => void;
}

const ToolBar: React.FC<ToolBarProps> = ({ activeTool, onSelectTool }) => {
  const [hoveredTool, setHoveredTool] = useState<ToolType | null>(null);

  const tools = [
    { id: ToolType.ADJUST, label: 'Adjust', icon: AdjustmentsIcon, tooltip: 'Grade Colors' },
    { id: ToolType.FILTER, label: 'Look', icon: FilterIcon, tooltip: 'Artistic Presets' },
    { id: ToolType.CROP, label: 'Crop', icon: CropIcon, tooltip: 'Reframing' },
    { id: ToolType.RESIZE, label: 'Resize', icon: ResizeIcon, tooltip: 'Scale Dimensions' },
    { id: ToolType.BW, label: 'Mono', icon: BWIcon, tooltip: 'Black & White' },
    { id: ToolType.ROTATE, label: 'Rotate', icon: RotateIcon, tooltip: 'Rotate 90°' },
    { id: ToolType.MIRROR, label: 'Flip', icon: MirrorIcon, tooltip: 'Mirror Assets' },
    { id: ToolType.COMPRESS, label: 'Shrink', icon: CompressIcon, tooltip: 'Minimize Size' },
    { id: ToolType.PIXELATE, label: '8-Bit', icon: PixelIcon, tooltip: 'Retro Style' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 flex justify-center z-50 pointer-events-none pb-safe">
      <div className="relative flex flex-col items-center max-w-full">
        {/* TOOLTIP */}
        <div className={`absolute -top-16 bg-white text-black text-[12px] font-black px-5 py-2.5 rounded-full shadow-2xl transition-all duration-300 pointer-events-none uppercase tracking-[0.2em] ${hoveredTool ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
          {tools.find(t => t.id === hoveredTool)?.tooltip}
        </div>

        {/* TOOLBAR BODY */}
        <div className="bg-[#1c1c1e]/80 ios-blur border border-white/10 rounded-[3rem] p-3 flex items-center gap-2 max-w-[95vw] overflow-x-auto no-scrollbar pointer-events-auto shadow-[0_40px_80px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-12 duration-700">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`flex flex-col items-center justify-center min-w-[76px] h-[76px] rounded-[2rem] transition-all duration-300 group active:scale-90 ${
                  isActive 
                    ? 'bg-white text-black shadow-2xl scale-110 -translate-y-1' 
                    : 'text-white/30 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-7 h-7 mb-1.5 transition-transform duration-500 ${!isActive && 'group-hover:scale-110'}`} />
                <span className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-300 ${isActive ? 'text-black opacity-100' : 'text-white/20 group-hover:text-white/40'}`}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToolBar;