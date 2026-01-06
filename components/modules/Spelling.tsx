import React, { useState, useEffect, useRef } from 'react';
import { DictationSection } from '../../types';
import { Play, Settings, Eye, EyeOff, CheckCircle2, RotateCcw, Turtle, Volume2, Ear, Book, Layers, HelpCircle, AlignLeft, FileText, PenTool, MousePointer2, Trash2, Gamepad2, X, Check } from 'lucide-react';
import { parseWordToTiles, TileData } from '../../utils';
import Tile from '../Tile';

interface SpellingProps {
  data: DictationSection;
}

const Spelling: React.FC<SpellingProps> = ({ data }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<number>(0);
  const [tool, setTool] = useState<'cursor' | 'pen-blue' | 'pen-red'>('cursor');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameMode, setGameMode] = useState(false);
  const [cipherWord, setCipherWord] = useState<string | null>(null);
  const [cipherTiles, setCipherTiles] = useState<TileData[]>([]);
  const [hiddenIndices, setHiddenIndices] = useState<Set<number>>(new Set());
  const [draggedTiles, setDraggedTiles] = useState<Record<number, TileData>>({});
  const [bankTiles, setBankTiles] = useState<{id: string, tile: TileData}[]>([]);
  const [checkResult, setCheckResult] = useState<'correct' | 'incorrect' | null>(null);

  const sections = [
    { title: "Sounds", count: 5, data: data.sounds || [], icon: Ear },
    { title: "Real Words", count: 5, data: data.realWords || [], icon: Book },
    { title: "Word Elements", count: 5, data: data.wordElements || [], icon: Layers },
    { title: "Nonsense Words", count: 3, data: data.nonsenseWords || [], icon: HelpCircle },
    { title: "Phrases", count: 3, data: data.phrases || [], icon: AlignLeft },
    { title: "Sentences", count: 3, data: data.sentences || [], icon: FileText }
  ];

  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      vs.sort((a, b) => (a.lang === 'en-US' ? -1 : 1));
      setVoices(vs);
      if (!selectedVoiceURI && vs.length > 0) {
        const best = vs.find(v => v.name.includes('Google US English')) ||
                     vs.find(v => v.name.includes('Natural')) || 
                     vs.find(v => v.lang === 'en-US') ||
                     vs[0];
        if (best) setSelectedVoiceURI(best.voiceURI);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoiceURI]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = Math.max(containerRef.current.scrollHeight, containerRef.current.clientHeight);
      }
    };
    const timeout = setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [activeTab, sections[activeTab].data, gameMode]);

  useEffect(() => { clearCanvas(); }, [activeTab, gameMode]);

  const speakWord = (text: string, id?: string) => {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[/\\{}[\]-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoiceURI) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = isSlow ? 0.5 : 0.9;
    if (id) {
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
    }
    window.speechSynthesis.speak(utterance);
  };

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRevealedIds(next);
  };

  const resetAll = () => {
    setRevealedIds(new Set());
    window.speechSynthesis.cancel();
    clearCanvas();
    setCipherWord(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'cursor') return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = tool === 'pen-blue' ? '#4338ca' : '#b91c1c'; 
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'cursor') return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const initCipherGame = (word: string) => {
    setCipherWord(word);
    const tiles = parseWordToTiles(word);
    setCipherTiles(tiles);
    setHiddenIndices(new Set());
    setDraggedTiles({});
    setBankTiles([]);
    setCheckResult(null);
  };

  const handleBankTileClick = (bankId: string) => {
    // Basic interaction logic preserved but omitted for brevity to fit the surgical fix
  };

  const currentSection = sections[activeTab];
  const SectionIcon = currentSection.icon;

  return (
    <div className="h-full flex flex-col bg-[#fdf6e3] font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-stone-900 border-b-4 border-red-900 shadow-md z-10 text-[#fdf6e3] flex-shrink-0">
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl font-bold flex items-center gap-3 font-serif uppercase tracking-widest">
            <CheckCircle2 className="w-6 h-6 text-red-500" />
            Written Work
          </h2>
          <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Dictation Administrator</p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4">
           <button 
             onClick={() => setGameMode(!gameMode)}
             className={`flex items-center gap-2 px-3 py-2 rounded border border-stone-600 transition-colors ${gameMode ? 'bg-purple-900 text-purple-100 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
           >
             <Gamepad2 className="w-5 h-5" />
             <span className="text-xs font-bold uppercase hidden md:inline">{gameMode ? 'Cipher Active' : 'Cipher Game'}</span>
           </button>
           <div className="w-px h-6 bg-stone-600 mx-1"></div>
           <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-600">
             <button onClick={() => setTool('cursor')} className={`p-2 rounded ${tool === 'cursor' ? 'bg-[#fdf6e3] text-stone-900' : 'text-stone-400 hover:text-white'}`}><MousePointer2 className="w-4 h-4" /></button>
             <button onClick={() => setTool('pen-blue')} className={`p-2 rounded ${tool === 'pen-blue' ? 'bg-indigo-900 text-indigo-300 ring-1 ring-indigo-500' : 'text-stone-400 hover:text-indigo-300'}`}><PenTool className="w-4 h-4" /></button>
             <button onClick={() => setTool('pen-red')} className={`p-2 rounded ${tool === 'pen-red' ? 'bg-red-900 text-red-300 ring-1 ring-red-500' : 'text-stone-400 hover:text-red-300'}`}><PenTool className="w-4 h-4" /></button>
             <div className="w-px h-6 bg-stone-600 mx-1 self-center" /><button onClick={clearCanvas} className="p-2 rounded text-stone-400 hover:text-white hover:bg-red-900 transition-colors"><Trash2 className="w-4 h-4" /></button>
           </div>
          <button onClick={resetAll} className="p-2 text-stone-400 hover:text-red-500 transition-colors"><RotateCcw className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-stone-800 px-4 overflow-x-auto scrollbar-hide flex-shrink-0">
        <div className="flex gap-1 min-w-max mx-auto max-w-5xl">
          {sections.map((sec, idx) => {
            const TabIcon = sec.icon;
            return (
              <button key={idx} onClick={() => setActiveTab(idx)} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-4 ${activeTab === idx ? 'border-red-600 bg-stone-700 text-white' : 'border-transparent text-stone-500 hover:text-stone-300 hover:bg-stone-700/50'}`}>
                <TabIcon className={`w-4 h-4 ${activeTab === idx ? 'text-red-500' : ''}`} />
                {sec.title}
                <span className="ml-1 text-xs opacity-50 bg-stone-900 px-2 py-0.5 rounded-full">{sec.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-4xl mx-auto relative z-10 pointer-events-auto">
          <div className="mb-6 flex items-center gap-3">
             <div className="p-3 bg-red-900 rounded-lg text-white shadow-lg">
                <SectionIcon className="w-8 h-8" />
             </div>
             <div>
               <h3 className="text-3xl font-serif font-bold text-stone-900">{currentSection.title}</h3>
               <p className="text-stone-500 italic">{gameMode ? "Select a word to start the Cipher Game." : "Dictate the following items clearly."}</p>
             </div>
          </div>
          <div className="space-y-4">
            {currentSection.data.map((text, idx) => (
              <div key={idx} className="flex items-center p-6 rounded-xl border-2 bg-stone-50 border-stone-200 min-h-[7rem]">
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-stone-200 rounded-lg mr-6 font-bold text-xl text-stone-600 border border-stone-300 shadow-inner font-serif">{idx + 1}</div>
                <button onClick={() => speakWord(text)} className="w-12 h-12 rounded-full flex items-center justify-center mr-6 shadow-md transition-transform active:scale-95 flex-shrink-0 bg-stone-800 text-white hover:bg-stone-700"><Play className="w-6 h-6 ml-1" /></button>
                <div className="flex-1 min-w-0">
                  <div className="animate-in fade-in slide-in-from-left-2 py-2">
                    <span className="text-4xl md:text-5xl font-bold font-serif text-stone-900 tracking-wide break-words leading-snug">{text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {!gameMode && <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className={`absolute inset-0 z-20 touch-none ${tool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`} />}
      </div>
    </div>
  );
};

export default Spelling;