
import React, { useState, useCallback, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { ThumbnailRequest, Emotion, GenerationResult, ThumbnailDesign, AspectRatio, ThumbnailImage } from './types';
import Button from './components/Button';
import Card from './components/Card';

const MAX_IMAGES = 3;

const App: React.FC = () => {
  const [loadingPhase, setLoadingPhase] = useState<'idle' | 'strategizing' | 'rendering'>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ThumbnailRequest>({
    title: '',
    niche: '',
    emotion: Emotion.SHOCK,
    ratio: '16:9',
    subjectDescription: '',
    subjectImages: []
  });

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        const newImage: ThumbnailImage = { data: dataUrl, mimeType: 'image/jpeg' };
        
        setForm(prev => ({ 
          ...prev, 
          subjectImages: [...prev.subjectImages, newImage].slice(0, MAX_IMAGES)
        }));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = MAX_IMAGES - form.subjectImages.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm(prev => ({
            ...prev,
            subjectImages: [...prev.subjectImages, { data: reader.result as string, mimeType: file.type }].slice(0, MAX_IMAGES)
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      subjectImages: prev.subjectImages.filter((_, i) => i !== index)
    }));
  };

  const handleDownload = () => {
    if (result?.imageUrl) {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderImageOnly = async (strategy: ThumbnailDesign) => {
    setLoadingPhase('rendering');
    setError(null);
    try {
      const service = new GeminiService();
      const imageUrl = await service.generateThumbnailImage(strategy, form.ratio, form.subjectImages);
      setResult(prev => prev ? { ...prev, imageUrl } : { strategy, imageUrl });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Rendering hit a snag. Retrying often fixes this.");
    } finally {
      setLoadingPhase('idle');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!form.title || !form.niche) {
      setError("Please fill in the title and niche.");
      return;
    }

    setResult(null);
    setLoadingPhase('strategizing');
    setError(null);

    try {
      const service = new GeminiService();
      const strategy = await service.generateStrategy(form);
      setResult({ strategy });
      await renderImageOnly(strategy);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate strategy.");
      setLoadingPhase('idle');
    }
  }, [form]);

  const ratios: { label: string; value: AspectRatio; icon: string }[] = [
    { label: 'YouTube', value: '16:9', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { label: 'Shorts/TikTok', value: '9:16', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Instagram', value: '1:1', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
    { label: 'Ads/Classic', value: '4:3', icon: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">THUMBNAIL GENIUS</h1>
            <p className="text-xs text-red-500 font-bold uppercase tracking-widest">Viral Growth Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <div className={`w-2 h-2 rounded-full ${loadingPhase !== 'idle' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
          <span className="text-sm font-medium text-gray-400">
            {loadingPhase === 'strategizing' ? 'Analyzing patterns...' : loadingPhase === 'rendering' ? 'Painting visuals...' : 'System Ready'}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card title="Concept Forge" subtitle="Define your viral hook">
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Select Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {ratios.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setForm({ ...form, ratio: r.value })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${form.ratio === r.value ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={r.icon}></path></svg>
                      <span className="text-[10px] font-bold uppercase">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Video Title</label>
                <input 
                  type="text"
                  placeholder="The 'Aha' moment of your video..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Niche</label>
                  <input 
                    type="text"
                    placeholder="e.g. Tech"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm"
                    value={form.niche}
                    onChange={(e) => setForm({ ...form, niche: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Emotion</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm appearance-none"
                    value={form.emotion}
                    onChange={(e) => setForm({ ...form, emotion: e.target.value as Emotion })}
                  >
                    {Object.values(Emotion).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">Focal Subject ({form.subjectImages.length}/{MAX_IMAGES})</label>
                </div>
                
                {form.subjectImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {form.subjectImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5 aspect-square">
                        <img src={img.data} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 backdrop-blur-md rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isCameraActive ? (
                  <div className="relative rounded-xl overflow-hidden border border-red-600/30 bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover scale-x-[-1]" />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                      <Button variant="primary" onClick={capturePhoto} className="py-1 px-4 text-[10px]">Shoot</Button>
                      <Button variant="secondary" onClick={stopCamera} className="py-1 px-4 text-[10px]">Close</Button>
                    </div>
                  </div>
                ) : form.subjectImages.length < MAX_IMAGES ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 7l-4-4m0 0L8 7m4-4v12"></path></svg>
                      <span className="text-[9px] font-black uppercase text-gray-500">Upload</span>
                    </button>
                    <button onClick={startCamera} className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                      <span className="text-[9px] font-black uppercase text-gray-500">Camera</span>
                    </button>
                  </div>
                ) : null}
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                <canvas ref={canvasRef} className="hidden" />

                <textarea 
                  placeholder="Describe your subject for AI logic..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-sm h-20 resize-none"
                  value={form.subjectDescription}
                  onChange={(e) => setForm({ ...form, subjectDescription: e.target.value })}
                ></textarea>
              </div>

              {error && <div className="text-red-500 text-[10px] font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

              <Button className="w-full shadow-2xl" isLoading={loadingPhase !== 'idle'} onClick={handleGenerate}>
                CREATE VIRAL CONCEPT
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {(result || loadingPhase !== 'idle') ? (
            <>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className={`relative bg-[#111] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all ${form.ratio === '16:9' ? 'aspect-video' : form.ratio === '9:16' ? 'aspect-[9/16] max-h-[600px] mx-auto' : form.ratio === '1:1' ? 'aspect-square max-h-[500px] mx-auto' : 'aspect-[4/3] max-h-[500px] mx-auto'}`}>
                  {loadingPhase === 'rendering' ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-gray-500 tracking-[0.3em]">PIXELATING SUCCESS</p>
                    </div>
                  ) : result?.imageUrl ? (
                    <>
                      <img src={result.imageUrl} alt="CTR Optimized Thumbnail" className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button 
                          onClick={handleDownload}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase shadow-xl transform active:scale-95 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5 5-5M12 4v11"></path></svg>
                          Download
                        </button>
                      </div>
                    </>
                  ) : result?.strategy ? (
                    <div className="p-12 text-center space-y-4">
                      <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      </div>
                      <p className="text-gray-400 text-xs">Visual generation failed, but the strategy is ready.</p>
                      <Button variant="secondary" onClick={() => renderImageOnly(result.strategy)}>Retry Rendering</Button>
                    </div>
                  ) : null}
                  
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${loadingPhase === 'rendering' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {form.ratio === '9:16' ? 'Vertical Short' : 'CTR Mockup'}
                    </span>
                  </div>
                </div>
              </div>

              {result?.strategy && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card title="Viral Hook" className="h-full">
                    <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-xl mb-4">
                      <p className="text-xl font-black text-red-500 italic uppercase">"{result.strategy.mainText || 'READY'}"</p>
                    </div>
                    <p className="text-sm text-gray-200 mb-2 font-black tracking-tight">{result.strategy.concept?.idea || 'Concept loading...'}</p>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{result.strategy.concept?.hook || ''}</p>
                  </Card>

                  <Card title="Design DNA" className="h-full">
                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div className="space-y-1">
                        <span className="text-gray-600 font-black uppercase tracking-widest">Expression</span>
                        <p className="text-gray-200 font-bold">{result.strategy.visualElements?.expression || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-600 font-black uppercase tracking-widest">Aesthetics</span>
                        <div className="flex gap-1 mt-1">
                          <div className="w-4 h-4 rounded border border-white/10" style={{ background: result.strategy.colorPalette?.primary || '#333' }}></div>
                          <div className="w-4 h-4 rounded border border-white/10" style={{ background: result.strategy.colorPalette?.accent || '#666' }}></div>
                        </div>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <span className="text-gray-600 font-black uppercase tracking-widest">Visual Flow</span>
                        <p className="text-gray-400 font-medium">
                          Text on {result.strategy.layoutInstructions?.textPlacement || '...'}, 
                          subject on {result.strategy.layoutInstructions?.subjectPlacement || '...'}. 
                          Arrows point {(result.strategy.layoutInstructions?.arrowDirections || []).join(" & ") || 'strategically'}.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-center p-8 bg-white/[0.01]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 group-hover:border-red-600 transition-colors">
                <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">ENGINEER YOUR CTR</h3>
              <p className="text-gray-500 max-w-sm text-sm font-medium">Capture a scene or describe a hook. Our AI growth engine handles the visual psychology of the click.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 text-center pb-12 flex flex-col items-center gap-2">
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.5em]">MADE BY PRAGYAN</p>
      </footer>
    </div>
  );
};

export default App;
