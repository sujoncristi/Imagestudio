
import React, { useRef, useState } from 'react';
import { UploadIcon, LinkIcon } from './Icons.tsx';

interface UploaderProps {
  onUpload: (files: File[]) => void;
  onUrlUpload: (url: string) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onUpload, onUrlUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length > 0) {
      onUpload(validImages);
    }
  };

  const handleFetch = async () => {
    if (!url) return;
    setFetching(true);
    try {
      onUrlUpload(url);
      setUrl('');
    } catch (e) {
      alert('Failed to fetch image. Please ensure the URL is direct.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-8 animate-in fade-in zoom-in-95 duration-700 pointer-events-auto">
      <div 
        className="flex flex-col items-center justify-center p-10 md:p-16 bg-[#1c1c1e]/40 rounded-[3rem] ios-shadow-lg border border-white/5 cursor-pointer active:scale-[0.98] transition-all group overflow-hidden"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple />
        <div className="w-16 h-16 bg-[#007aff] rounded-2xl flex items-center justify-center mb-8 shadow-2xl animate-float">
          <UploadIcon className="text-white w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black tracking-tighter mb-2 text-white">Import Assets</h3>
        <p className="text-[#8e8e93] text-center font-bold text-sm max-w-[280px]">Drop high-res originals or browse system.</p>
      </div>

      <div className="p-2.5 bg-[#1c1c1e]/60 ios-blur border border-white/10 rounded-full flex items-center gap-3 transition-all focus-within:border-[#007aff]/40">
        <div className="flex-1 relative ml-4">
          <input 
            type="text" 
            placeholder="Direct Image URL..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            className="w-full bg-transparent outline-none text-[13px] font-bold text-white placeholder:text-[#3a3a3c]"
          />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleFetch(); }}
          disabled={!url || fetching}
          className="bg-white text-black px-6 py-3 rounded-full font-black text-[10px] disabled:opacity-20 transition-all hover:bg-[#007aff] hover:text-white uppercase tracking-widest"
        >
          {fetching ? '...' : 'Fetch'}
        </button>
      </div>
    </div>
  );
};

export default Uploader;
