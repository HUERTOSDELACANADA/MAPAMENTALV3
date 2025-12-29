
import React, { useState, useCallback } from 'react';
import { ProjectCreation } from './components/ProjectCreation';
import { ClarificationChat } from './components/ClarificationChat';
import { MindMapCanvas } from './components/MindMapCanvas';
import { Logo } from './components/Logo';
import { generateMindMap } from './services/geminiService';
import { MindMap, ViewMode } from './types';
import { 
  Presentation, 
  Download, 
  History as HistoryIcon, 
  MessageSquare, 
  Cloud, 
  Ghost, 
  Loader2, 
  RotateCcw, 
  RotateCw,
  LayoutGrid
} from 'lucide-react';
import { BRAND } from './constants';

const App: React.FC = () => {
  const [step, setStep] = useState<'create' | 'clarify' | 'visualize'>('create');
  const [source, setSource] = useState<{ type: string; content: string; fileInfo?: string } | null>(null);
  const [map, setMap] = useState<MindMap | null>(null);
  const [history, setHistory] = useState<MindMap[]>([]);
  const [future, setFuture] = useState<MindMap[]>([]);
  const [mode, setMode] = useState<ViewMode>('edit');
  const [loading, setLoading] = useState(false);

  const handleStartProject = (sourceData: { type: string; content: string; fileInfo?: string }) => {
    setSource(sourceData);
    setStep('clarify');
  };

  const updateMapWithHistory = useCallback((newMap: MindMap) => {
    setMap(currentMap => {
      if (currentMap) {
        setHistory(prev => [...prev, currentMap]);
      }
      setFuture([]);
      return newMap;
    });
  }, []);

  const undo = () => {
    if (history.length === 0 || !map) return;
    const prev = history[history.length - 1];
    setFuture(f => [map, ...f]);
    setHistory(h => h.slice(0, -1));
    setMap(prev);
  };

  const redo = () => {
    if (future.length === 0 || !map) return;
    const next = future[0];
    setHistory(h => [...h, map]);
    setFuture(f => f.slice(1));
    setMap(next);
  };

  const handleConfirmClarification = async (clarifications: string) => {
    if (!source || loading) return;
    
    setLoading(true);
    try {
      const generatedData = await generateMindMap(source.content, clarifications);
      
      const newMap: MindMap = {
        id: `map-${Date.now()}`,
        title: source.fileInfo ? `Plan: ${source.fileInfo.split('.')[0]}` : 'Plan Estratégico MORETURISMO',
        nodes: Array.isArray(generatedData?.nodes) && generatedData.nodes.length > 0 
          ? generatedData.nodes 
          : [{ id: 'root', label: 'Estrategia Central', type: 'idea' as any }],
        edges: Array.isArray(generatedData?.edges) ? generatedData.edges : [],
        createdAt: Date.now(),
      };
      
      setMap(newMap);
      setStep('visualize');
    } catch (error) {
      console.error("Fallo al construir el ecosistema:", error);
      setMap({
        id: 'fallback',
        title: 'Plan Recuperado',
        nodes: [{ id: 'root', label: 'Estrategia MORETURISMO', type: 'idea' as any }],
        edges: [],
        createdAt: Date.now()
      });
      setStep('visualize');
    } finally {
      setLoading(false);
    }
  };

  const toggleZenMode = () => setMode(mode === 'zen' ? 'edit' : 'zen');
  const togglePresentation = () => setMode(mode === 'presentation' ? 'edit' : 'presentation');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="relative mb-16">
           <div className="w-32 h-32 border-[12px] border-blue-50 rounded-[3rem] rotate-45"></div>
           <div className="absolute inset-0 border-[12px] border-blue-600 rounded-[3rem] border-t-transparent animate-spin rotate-45"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <Logo className="h-12 w-auto" />
           </div>
        </div>
        <div className="text-center space-y-6 max-w-lg">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Construyendo tu ecosistema...</h2>
          <p className="text-slate-500 font-medium text-xl leading-relaxed">
            Nuestra IA está transformando tus directrices en una arquitectura estratégica jerárquica para MORETURISMO.
          </p>
          <div className="flex justify-center gap-2 pt-4">
             {[0, 1, 2].map(i => (
               <div key={i} className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
             ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'create') return <ProjectCreation onStart={handleStartProject} />;
  if (step === 'clarify' && source) return <ClarificationChat source={source} onConfirm={handleConfirmClarification} />;

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Barra de Navegación Superior */}
      <header className={`bg-white/80 backdrop-blur-md border-b border-slate-100 h-24 flex items-center justify-between px-10 z-30 transition-all duration-700 ${mode === 'zen' || mode === 'presentation' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-10">
          <Logo className="h-12" />
          <div className="h-10 w-px bg-slate-200" />
          <div className="flex flex-col text-left">
            <h1 className="font-black text-slate-900 text-xl leading-none mb-1.5">{map?.title || 'Estrategia Sin Título'}</h1>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-100">Ecosistema Activo</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Organigrama IA</span>
            </div>
          </div>
        </div>

        {/* Centro: Controles de Historial */}
        <div className="flex items-center bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
          <button 
            onClick={undo}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all disabled:opacity-20 font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm border border-transparent hover:border-slate-200" 
            title="Deshacer Cambio"
          >
            <RotateCcw size={18} /> Deshacer
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button 
            onClick={redo}
            disabled={future.length === 0}
            className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all disabled:opacity-20 font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm border border-transparent hover:border-slate-200" 
            title="Rehacer Cambio"
          >
            Rehacer <RotateCw size={18} />
          </button>
        </div>

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="Ver Comentarios"><MessageSquare size={24} /></button>
            <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="Cronología de Cambios"><HistoryIcon size={24} /></button>
          </div>
          <div className="w-px h-10 bg-slate-100 mr-2" />
          <button onClick={toggleZenMode} className="flex items-center gap-3 px-6 py-4 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
            <Ghost size={20} /> Modo Zen
          </button>
          <button onClick={togglePresentation} className="flex items-center gap-3 px-6 py-4 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
            <Presentation size={20} /> Presentar
          </button>
          <button className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-95">
            <Download size={20} /> Exportar Plan
          </button>
        </div>
      </header>

      {/* Área Principal de Trabajo */}
      <main className="flex-1 relative">
        {map && <MindMapCanvas map={map} mode={mode} onUpdate={updateMapWithHistory} />}
        
        {/* Controles Flotantes para Modos Especiales */}
        {(mode === 'zen' || mode === 'presentation') && (
           <div className="fixed top-10 right-10 flex gap-4 z-40 animate-in fade-in zoom-in duration-500">
              <button 
                onClick={() => setMode('edit')}
                className="bg-white/95 backdrop-blur-2xl shadow-2xl border border-slate-200 px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] text-slate-900 hover:bg-white transition-all flex items-center gap-4 active:scale-95 border-b-4 border-b-blue-600"
              >
                Volver al Editor Estratégico
              </button>
           </div>
        )}
      </main>

      {/* Barra de Estado Inferior */}
      <footer className={`h-14 bg-white border-t border-slate-100 px-10 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 z-30 transition-all duration-700 ${mode === 'zen' || mode === 'presentation' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 group cursor-help">
            <Cloud size={16} className="text-blue-500" /> 
            <span className="group-hover:text-blue-600 transition-colors">Infraestructura Nube MORETURISMO</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
            Sincronización en Tiempo Real
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <LayoutGrid size={14} className="text-slate-400" />
            <span>{(map?.nodes?.length || 0)} Nodos Activos</span>
          </div>
          <span className="text-slate-300 font-medium">Versión 2.5 - MORETURISMO S.A.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
