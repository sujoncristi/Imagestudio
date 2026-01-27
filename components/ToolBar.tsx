
import React, { useState } from 'react';
import { ToolType } from '../types.ts';
import { 
  ResizeIcon, CropIcon, RotateIcon, 
  MirrorIcon, BWIcon, PixelIcon, CompressIcon, FilterIcon, AdjustmentsIcon, GrainIcon, BorderIcon, InfoIcon
} from './Icons.tsx';

interface ToolBarProps {
  activeTool: ToolType | null;
  onSelectTool: (tool: ToolType) => void;
}

const ToolBar: React.FC<ToolBarProps> = ({ activeTool, onSelectTool }) => {
  const [hoveredTool, setHoveredTool] = useState<ToolType | null>(null);

  const tools = [
    { id: ToolType.ADJUST, label: 'Adjust', icon: AdjustmentsIcon, tooltip: 'Grade Colors' },
    { id: ToolType.FILTER, label: 'Look', icon: FilterIcon, tooltip: 'Artistic Prets' },
    { id: ToolType.CROP, label: 'Crop', icon: CropIcon, tooltip: 'Aspect Ratios' },
    { id: ToolType.RESIZE, label: 'Resize', icon: ResizeIcon, tooltip: 'Rescale Spec' },
    { id: ToolType.BW, label: 'Mono', icon: BWIcon, tooltip: 'Monochrome' },
    { id: ToolType.ROTATE, label: 'Rotate', icon: RotateIcon, tooltip: 'Straighten' },
    { id: ToolType.MIRROR, label: 'Flip', icon: MirrorIcon, tooltip: 'Reflect' },
    { id: ToolType.COMPRESS, label: 'Shrink', icon: CompressIcon, tooltip: 'Optimize' },
    { id: ToolType.PIXELATE, label: '8-Bit', icon: PixelIcon, tooltip: 'Digitize' },
    { id: ToolType.GRAIN, label: 'Grain', icon: GrainIcon, tooltip: 'Analog Noise' },
    { id: ToolType.BORDER, label: 'Frame', icon: BorderIcon, tooltip: 'Mounting' },
    { id: ToolType.INFO, label: 'Info', icon: InfoIcon, tooltip: 'Asset Specs' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 flex justify-center z-50 pointer-events-none pb-safe">
      <div className="relative flex flex-col items-center w-full max-w-fit">
        {/* TOOLTIP */}
        <div className={`absolute -top-14 bg-white text-black text-[10px] font-black px-4 py-1.5 rounded-full shadow-2xl transition-all duration-300 pointer-events-none uppercase tracking-widest ${hoveredTool ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'}`}>
          {tools.find(t => t.id === hoveredTool)?.tooltip}
        </div>

        {/* TOOLBAR BODY */}
        <div className="bg-[#1c1c1e]/90 ios-blur border border-white/10 rounded-full p-2.5 flex items-center gap-1.5 max-w-[95vw] overflow-x-auto no-scrollbar pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-full transition-all duration-300 group active:scale-90 ${
                  isActive 
                    ? 'bg-white text-black scale-110 -translate-y-1' 
                    : 'text-white/20 hover:bg-white/5 hover:text-white/60'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-40'}`}>
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
