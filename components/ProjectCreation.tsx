
import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { FileText, Link, Upload, ArrowRight, Mic, Loader2, X, File, Video, Music, Film } from 'lucide-react';

interface ProjectCreationProps {
  onStart: (source: { type: string; content: string; fileInfo?: string }) => void;
}

export const ProjectCreation: React.FC<ProjectCreationProps> = ({ onStart }) => {
  const [instructions, setInstructions] = useState('');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Manejo de drag and drop en toda la ventana
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFileSelection = (file: globalThis.File) => {
    const validTypes = [
      // Documentos e Imágenes
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      // Video
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];

    const validExtensions = [
      '.pdf', '.doc', '.docx', '.pptx', '.txt', '.jpg', '.jpeg', '.png', 
      '.mp3', '.wav', '.m4a', 
      '.mp4', '.mov', '.avi', '.webm'
    ];

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    // Comprobamos por MIME type o por extensión (para mayor compatibilidad)
    if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
      setUploadedFile(file.name);
    } else {
      alert("Formato no soportado. Soportamos: Documentos (PDF, Word, PPTX), Audio (MP3, WAV) y Video (MP4, MOV).");
    }
  };

  const getFileIcon = () => {
    if (!uploadedFile) return <File size={20} md:size={24} />;
    const ext = uploadedFile.split('.').pop()?.toLowerCase();
    
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
      return <Film size={20} md:size={24} />;
    }
    if (['mp3', 'wav', 'm4a', 'aac'].includes(ext || '')) {
      return <Music size={20} md:size={24} />;
    }
    if (['pdf', 'doc', 'docx', 'pptx', 'txt'].includes(ext || '')) {
      return <FileText size={20} md:size={24} />;
    }
    return <File size={20} md:size={24} />;
  };

  const handleCreate = () => {
    if (!instructions.trim() && !uploadedFile) return;
    onStart({ 
      type: 'mixed', 
      content: instructions, 
      fileInfo: uploadedFile || undefined 
    });
  };

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Tu navegador no soporta dictado por voz.");

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setInstructions(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center py-6 md:py-12 px-4 bg-slate-50 transition-all overflow-y-auto ${isDragging ? 'bg-blue-100/50' : ''}`}>
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-blue-600/10 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center border-4 border-dashed border-blue-500 animate-in zoom-in duration-300">
            <Upload size={80} strokeWidth={1.5} className="text-blue-600 mb-6 animate-bounce" />
            <h2 className="text-3xl font-black text-blue-900 mb-2">Suelta para importar</h2>
            <p className="text-blue-700 font-medium">Archivos detectados para MORETURISMO</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 p-6 md:p-12 border border-slate-100 relative overflow-hidden my-auto flex flex-col">
        <div className="flex justify-center mb-6 md:mb-10">
          <Logo className="h-10 md:h-16" />
        </div>

        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 mb-2 md:mb-3 tracking-tight break-words">Comienza tu proyecto definiendo un mapa mental</h1>
          <p className="text-slate-500 font-medium text-sm md:text-lg">Sobre tus archivos multimedia e instrucciones</p>
        </div>

        <div className="space-y-6 md:space-y-8 flex-1">
          {/* Instrucciones de texto */}
          <div className="relative group">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 md:mb-3 ml-2">Instrucciones o contexto del proyecto</label>
            <div className="relative">
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Escribe, pega o dicta lo que quieres conseguir. Esta información complementará el archivo que subas."
                className="w-full h-40 md:h-56 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 focus:border-blue-500 focus:ring-4 md:focus:ring-8 focus:ring-blue-50/50 outline-none transition-all resize-y text-slate-700 bg-slate-50 focus:bg-white text-base md:text-xl leading-relaxed pr-16 md:pr-20"
              />
              <button 
                onClick={toggleRecording}
                className={`absolute right-3 bottom-3 md:right-6 md:bottom-6 p-3 md:p-5 rounded-2xl shadow-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'}`}
                title="Dictar instrucciones con voz"
              >
                {isRecording ? <Loader2 className="animate-spin" size={20} md:size={28} /> : <Mic size={20} md:size={28} />}
              </button>
            </div>
          </div>

          {/* Área de Archivo Complementario */}
          <div className="space-y-3 md:space-y-4">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Y documentos para incluir</label>
            {uploadedFile ? (
              <div className="flex items-center justify-between p-4 md:p-6 bg-blue-50 border-2 border-blue-200 rounded-[1.5rem] animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="bg-blue-600 p-2 md:p-3 rounded-xl text-white shadow-lg shrink-0">
                    {getFileIcon()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-blue-900 text-sm md:text-lg truncate">{uploadedFile}</p>
                    <p className="text-blue-600 text-xs md:text-sm font-medium">Información multimedia lista</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUploadedFile(null)}
                  className="p-2 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                >
                  <X size={20} md:size={24} />
                </button>
              </div>
            ) : (
              <div 
                className="border-4 border-dashed border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer group"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors mb-3 md:mb-4 flex gap-2">
                  <Upload size={24} md:size={32} />
                  <div className="w-px h-full bg-slate-200 mx-1"></div>
                  <Film size={24} md:size={32} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  <Music size={24} md:size={32} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-slate-600 font-bold mb-1 text-sm md:text-base text-center">Cargar Docs, Audio o Video</p>
                <p className="text-slate-400 text-xs md:text-sm text-center">Soporta PDF, Word, PPTX, MP4, MP3, MOV, WAV...</p>
                <input 
                  id="file-input"
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.pptx,.txt,.jpg,.jpeg,.png,.mp4,.mov,.avi,.mp3,.wav,.m4a"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                  }}
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleCreate}
            disabled={(!instructions.trim() && !uploadedFile) || isRecording}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-3 md:gap-4 text-lg md:text-2xl mt-4 active:scale-[0.98] uppercase tracking-wide"
          >
            CREAR TU MAPA MENTAL: TURISMO <ArrowRight size={24} md:size={32} />
          </button>
        </div>
      </div>
      
      <div className="mt-6 md:mt-12 opacity-30 flex items-center gap-3 grayscale">
        <Logo className="h-4 md:h-6" />
        <span className="h-3 md:h-4 w-px bg-slate-300"></span>
        <span className="text-[10px] md:text-xs font-black tracking-[0.2em] text-slate-500 uppercase">Ecosistema Estratégico IA</span>
      </div>
    </div>
  );
};
