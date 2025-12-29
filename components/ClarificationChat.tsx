
import React, { useState, useEffect, useRef } from 'react';
import { clarifyIntent, reformulateQuestions, ClarificationQuestion } from '../services/geminiService';
import { Sparkles, Send, Loader2, Mic, CheckCircle2, Plus, X, MessageCircle, CheckCheck, SkipForward, RefreshCw } from 'lucide-react';
import { Logo } from './Logo';
import { BRAND } from '../constants';

interface ClarificationChatProps {
  source: { type: string; content: string; fileInfo?: string };
  onConfirm: (answers: string) => void;
}

export const ClarificationChat: React.FC<ClarificationChatProps> = ({ source, onConfirm }) => {
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<string[][]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      const fullContext = `${source.content}${source.fileInfo ? ` (Contexto archivo: ${source.fileInfo})` : ''}`;
      const q = await clarifyIntent(fullContext);
      setQuestions(q);
      setSelectedAnswers(new Array(q.length).fill([]));
      setLoading(false);
    };
    fetchQuestions();
  }, [source]);

  const toggleOption = (option: string) => {
    const newAnswers = [...selectedAnswers];
    const current = newAnswers[currentStep];
    if (current.includes(option)) {
      newAnswers[currentStep] = current.filter(a => a !== option);
    } else {
      newAnswers[currentStep] = [...current, option];
    }
    setSelectedAnswers(newAnswers);
  };

  const toggleSelectAll = () => {
    const currentQ = questions[currentStep];
    const currentSelections = selectedAnswers[currentStep];
    const allPredefinedOptions = currentQ.options;

    // Verificamos si todas las opciones predefinidas ya están seleccionadas
    const allSelected = allPredefinedOptions.every(opt => currentSelections.includes(opt));

    const newAnswers = [...selectedAnswers];
    
    if (allSelected) {
      // Si todo está seleccionado, deseleccionamos solo las predefinidas (mantenemos las custom)
      newAnswers[currentStep] = currentSelections.filter(s => !allPredefinedOptions.includes(s));
    } else {
      // Si falta alguna, seleccionamos todas las predefinidas (y mantenemos las custom)
      // Usamos Set para evitar duplicados
      newAnswers[currentStep] = Array.from(new Set([...currentSelections, ...allPredefinedOptions]));
    }
    
    setSelectedAnswers(newAnswers);
  };

  const addOtherResponse = () => {
    if (!otherValue.trim()) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentStep] = [...newAnswers[currentStep], otherValue.trim()];
    setSelectedAnswers(newAnswers);
    setOtherValue('');
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setShowOtherInput(false);
      setOtherValue('');
    } else {
      const combined = questions.map((q, i) => `Pregunta: ${q.text}\nRespuestas: ${selectedAnswers[i].join(', ')}`).join('\n\n');
      onConfirm(combined);
    }
  };

  const handleSkip = () => {
    onConfirm("El usuario ha decidido omitir la entrevista de clarificación. Genera el mapa basándote exclusivamente en el contenido original y las mejores prácticas del sector turístico.");
  };

  const handleRegenerateQuestions = async () => {
    setRegenerating(true);
    const fullContext = `${source.content}${source.fileInfo ? ` (Contexto archivo: ${source.fileInfo})` : ''}`;
    
    // Llamamos a la IA pasándole las preguntas actuales y qué ha respondido el usuario
    const newQuestions = await reformulateQuestions(fullContext, questions, selectedAnswers);
    
    setQuestions(newQuestions);
    setRegenerating(false);
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Dictado no soportado por tu navegador.");

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setOtherValue(prev => prev + (prev ? ' ' : '') + transcript);
      setShowOtherInput(true);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <Logo className="h-16 mb-10 animate-pulse opacity-50" />
        <div className="relative">
          <Loader2 className="animate-spin text-blue-600 mb-6" size={64} strokeWidth={1.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={20} className="text-orange-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight text-center">Analizando tu propuesta...</h2>
        <p className="text-slate-400 mt-2 font-medium text-center text-sm md:text-base">La IA de MORETURISMO está diseñando las preguntas clave</p>
      </div>
    );
  }

  const currentQ = questions[currentStep];
  const currentSelections = selectedAnswers[currentStep];
  const isAllSelected = currentQ?.options?.every(opt => currentSelections.includes(opt)) || false;

  if (regenerating) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white/90 backdrop-blur-sm z-50 fixed inset-0">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
        <h3 className="text-xl font-black text-slate-800">Replanteando estrategia...</h3>
        <p className="text-slate-500 text-sm mt-2">Mantenemos tus respuestas útiles y buscamos nuevos ángulos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-6 md:py-12 px-4 md:px-6 bg-slate-50 overflow-y-auto">
      <div className="max-w-3xl w-full bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-12 border border-slate-100 my-auto flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <Logo className="h-8 md:h-10" />
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 md:h-2 w-8 md:w-12 shrink-0 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-100'}`} />
              ))}
            </div>
            
            <div className="flex items-center gap-2 ml-auto md:ml-0">
              <button 
                onClick={handleRegenerateQuestions}
                className="text-blue-600 hover:bg-blue-50 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-blue-100 hover:border-blue-200 px-3 py-1.5 rounded-lg whitespace-nowrap"
                title="Generar nuevas preguntas manteniendo lo respondido"
              >
                Replantear <RefreshCw size={14} />
              </button>
              
              <button 
                onClick={handleSkip}
                className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors border border-transparent hover:border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap"
                title="Saltar preguntas y generar mapa directamente"
              >
                Omitir <SkipForward size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-10 flex-1">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-100">
              Paso {currentStep + 1} de {questions.length}
            </div>
            {/* Texto de pregunta adaptable */}
            <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight mb-2 md:mb-4 break-words hyphens-auto">
              {currentQ.text}
            </h2>
            
            <div className="flex items-center justify-between">
              <p className="text-slate-500 font-medium text-sm md:text-lg">Selecciona todas las respuestas que encajen.</p>
              
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                  isAllSelected 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                }`}
              >
                <CheckCheck size={14} />
                {isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {currentQ.options.map((option) => (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`group flex items-start justify-between p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 transition-all text-left min-h-[80px] ${
                  currentSelections.includes(option)
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xl shadow-blue-100/50'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-white'
                }`}
              >
                <span className="font-bold text-sm md:text-base leading-snug break-words w-full pr-2">{option}</span>
                <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${currentSelections.includes(option) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 group-hover:border-blue-300'}`}>
                  {currentSelections.includes(option) && <CheckCircle2 size={16} />}
                </div>
              </button>
            ))}

            {/* Opciones personalizadas */}
            {currentSelections.filter(s => !currentQ.options.includes(s)).map((custom, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 border-orange-500 bg-orange-50 text-orange-700 shadow-xl shadow-orange-100/50 min-h-[80px]">
                <span className="font-bold text-sm md:text-base truncate break-words">{custom}</span>
                <button onClick={() => toggleOption(custom)} className="p-1 hover:bg-orange-100 rounded-lg transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>
            ))}

            {showOtherInput ? (
              <div className="flex flex-col gap-3 md:col-span-2 bg-slate-50 p-4 rounded-[2rem] border-2 border-blue-200 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col md:flex-row gap-2">
                  <input 
                    autoFocus
                    className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl outline-none text-slate-700 font-bold focus:border-blue-500 shadow-sm text-sm md:text-base"
                    placeholder="Escribe tu respuesta personalizada..."
                    value={otherValue}
                    onChange={(e) => setOtherValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOtherResponse()}
                  />
                  <button 
                    onClick={addOtherResponse} 
                    disabled={!otherValue.trim()}
                    className="bg-blue-600 text-white px-6 py-3 md:py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all font-black flex items-center justify-center gap-2 disabled:bg-slate-300 text-sm md:text-base"
                  >
                    <Plus size={20} /> Añadir
                  </button>
                </div>
                <button onClick={() => setShowOtherInput(false)} className="text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 self-center">Cerrar buscador</button>
              </div>
            ) : (
              <button 
                onClick={() => setShowOtherInput(true)}
                className="flex items-center justify-center gap-3 p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-all md:col-span-2 font-black text-xs md:text-sm uppercase tracking-widest min-h-[60px]"
              >
                <Plus size={20} /> Añadir otra respuesta personalizada
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 pt-6">
            <button 
              onClick={toggleMic}
              className={`w-full md:w-auto p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] transition-all shadow-2xl flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95'}`}
              title="Dictar respuesta personalizada"
            >
              {isRecording ? <Loader2 className="animate-spin" size={24} md:size={32} /> : <Mic size={24} md:size={32} />}
            </button>
            
            <button 
              onClick={handleNext}
              disabled={currentSelections.length === 0}
              className="w-full flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-4 md:py-6 rounded-2xl md:rounded-[1.5rem] shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-4 text-lg md:text-xl active:scale-[0.98]"
            >
              {currentStep === questions.length - 1 ? 'Generar Mapa Estratégico' : 'Siguiente Paso'} <Send size={20} md:size={24} />
            </button>
          </div>
          {isRecording && (
            <div className="flex items-center justify-center gap-3 text-red-500 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Escuchando dictado...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
