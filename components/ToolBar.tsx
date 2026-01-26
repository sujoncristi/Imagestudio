
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
    { id: ToolType.GRAIN, label: 'Texture', icon: GrainIcon, tooltip: 'Analog Grain' },
    { id: ToolType.BW, label: 'Mono', icon: BWIcon, tooltip: 'Black & White' },
    { id: ToolType.ROTATE, label: 'Turn', icon: RotateIcon, tooltip: 'Rotate 90°' },
    { id: ToolType.MIRROR, label: 'Flip', icon: MirrorIcon, tooltip: 'Mirror Flip' },
    { id: ToolType.COMPRESS, label: 'Shrink', icon: CompressIcon, tooltip: 'Minimize Size' },
    { id: ToolType.PIXELATE, label: '8-Bit', icon: PixelIcon, tooltip: 'Retro Pixels' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center z-50 pointer-events-none pb-safe">
      <div className="relative flex flex-col items-center max-w-full">
        <div className={`absolute -top-14 bg-white text-black text-[11px] font-black px-4 py-2 rounded-full shadow-2xl transition-all duration-300 pointer-events-none uppercase tracking-widest ${hoveredTool ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'}`}>
          {tools.find(t => t.id === hoveredTool)?.tooltip}
        </div>

        <div className="bg-white/10 ios-blur border border-white/10 rounded-[2.5rem] p-3 flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar pointer-events-auto shadow-2xl shadow-black/50">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`flex flex-col items-center justify-center min-w-[72px] h-16 rounded-[1.8rem] transition-all group active:scale-90 ${
                  isActive ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6 mb-1.5" />
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-black' : 'text-white/30'}`}>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToolBar;