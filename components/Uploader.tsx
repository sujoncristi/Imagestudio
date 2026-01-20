
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
    const files = Array.from(e.target.files || []);
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
      alert('Failed to fetch image from URL');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div 
        className="flex flex-col items-center justify-center p-20 bg-[#1c1c1e]/40 rounded-[4rem] ios-shadow-lg border border-white/5 cursor-pointer active:scale-[0.98] transition-all group relative overflow-hidden"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*"
          multiple
        />
        <div className="w-24 h-24 bg-[#007aff] rounded-[2rem] flex items-center justify-center mb-10 shadow-3xl shadow-[#007aff]/40 group-hover:scale-110 transition-transform duration-700 animate-float">
          <UploadIcon className="text-white w-12 h-12" />
        </div>
        <h3 className="text-4xl font-black tracking-tight mb-4 text-white">Import Assets</h3>
        <p className="text-[#8e8e93] text-center font-bold text-xl max-w-[320px] leading-snug">
          Choose from your library or drop files anywhere.
        </p>
      </div>

      <div className="p-3 bg-white/5 border border-white/5 rounded-[2.5rem] flex items-center gap-3">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Remote URL (Paste Here)..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-[2rem] py-5 pl-14 focus:ring-1 focus:ring-[#007aff]/30 outline-none text-[17px] font-bold text-white placeholder:text-[#3a3a3c] transition-all"
          />
          <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#3a3a3c]" />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleFetch(); }}
          disabled={!url || fetching}
          className="bg-white text-black px-10 py-5 rounded-[2rem] font-black text-[15px] disabled:opacity-30 transition-all active:scale-95 shadow-xl hover:bg-[#007aff] hover:text-white uppercase tracking-widest"
        >
          {fetching ? '...' : 'Fetch'}
        </button>
      </div>
    </div>
  );
};

export default Uploader;
