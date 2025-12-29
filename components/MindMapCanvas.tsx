
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MindMap, NodeType, NodeData, ViewMode } from '../types';
import { expandNodeWithAI } from '../services/geminiService';
import { BRAND } from '../constants';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  User, 
  Share2, 
  PlusCircle, 
  Trash2, 
  Settings2,
  Layers,
  CheckCircle2,
  Calendar,
  X,
  AlignLeft,
  Users,
  UserPlus,
  Briefcase,
  Sparkles,
  Loader2
} from 'lucide-react';

interface MindMapCanvasProps {
  map: MindMap;
  mode: ViewMode;
  onUpdate: (map: MindMap) => void;
}

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ map, mode, onUpdate }) => {
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [teamMembers, setTeamMembers] = useState<string[]>(['Ana', 'Carlos', 'Dirección']);
  const [newMemberName, setNewMemberName] = useState('');

  const nodes = useMemo(() => Array.isArray(map?.nodes) ? map.nodes : [], [map?.nodes]);
  const edges = useMemo(() => Array.isArray(map?.edges) ? map.edges : [], [map?.edges]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Algoritmo de Layout Jerárquico (Árbol Horizontal)
  const nodeLayout = useMemo(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    if (nodes.length === 0) return layout;

    // Construir estructura de árbol
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    nodes.forEach(n => {
      adj[n.id] = [];
      inDegree[n.id] = 0;
    });

    edges.forEach(e => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    // Encontrar raíz (nodo sin padres o el primero si hay ciclos/aislados)
    let rootId = nodes.find(n => inDegree[n.id] === 0)?.id || nodes[0].id;

    // Configuración de espaciado
    const levelSpacing = 300; // Distancia horizontal entre niveles
    const nodeSpacing = 120;  // Distancia vertical mínima entre nodos hermanos

    // Algoritmo recursivo para calcular altura del subárbol
    const calculatePositions = (nodeId: string, depth: number, startY: number): number => {
      const children = adj[nodeId] || [];
      
      if (children.length === 0) {
        layout[nodeId] = { x: depth * levelSpacing, y: startY };
        return startY + nodeSpacing; // Retorna la siguiente Y disponible
      }

      let currentY = startY;
      const childYPositions: number[] = [];

      // Procesar hijos
      children.forEach(childId => {
        const nextY = calculatePositions(childId, depth + 1, currentY);
        childYPositions.push(layout[childId].y);
        currentY = nextY;
      });

      // Centrar el padre respecto a sus hijos
      const firstChildY = childYPositions[0];
      const lastChildY = childYPositions[childYPositions.length - 1];
      const centerY = (firstChildY + lastChildY) / 2;

      layout[nodeId] = { x: depth * levelSpacing, y: centerY };

      return currentY;
    };

    calculatePositions(rootId, 0, 0);

    // Si hay nodos desconectados que no se procesaron, ponerlos aparte (fallback)
    let fallbackY = 0;
    nodes.forEach(n => {
      if (!layout[n.id]) {
        layout[n.id] = { x: 0, y: fallbackY - 200 };
        fallbackY += nodeSpacing;
      }
    });

    return layout;
  }, [nodes, edges]);

  const handleWheel = (e: React.WheelEvent) => {
    if (mode === 'presentation') return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 3));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) setIsPanning(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const updateNodeData = (nodeId: string, updates: Partial<NodeData>) => {
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
    onUpdate({ ...map, nodes: newNodes });
  };

  const addSubNode = (parentId: string) => {
    const newId = `node-${Date.now()}`;
    const newNode: NodeData = {
      id: newId,
      label: 'Nuevo Punto',
      type: NodeType.IDEA,
      description: '',
    };
    const newEdge = { id: `edge-${Date.now()}`, source: parentId, target: newId };
    onUpdate({ ...map, nodes: [...nodes, newNode], edges: [...edges, newEdge] });
    setSelectedNodeId(newId);
  };

  const handleAutoOrganize = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || isOrganizing) return;

    setIsOrganizing(true);
    try {
      // 1. Obtener nuevos sub-nodos sugeridos por la IA
      const newSubNodesData = await expandNodeWithAI(node.label, node.description || '');
      
      if (newSubNodesData && newSubNodesData.length > 0) {
        const timestamp = Date.now();
        const createdNodes: NodeData[] = [];
        const createdEdges: any[] = [];

        // 2. Crear estructuras de datos para los nuevos nodos
        newSubNodesData.forEach((data: any, index: number) => {
          const newId = `node-${timestamp}-${index}`;
          createdNodes.push({
            id: newId,
            label: data.label,
            description: data.description,
            type: data.type as NodeType,
          });
          createdEdges.push({
            id: `edge-${timestamp}-${index}`,
            source: nodeId,
            target: newId
          });
        });

        // 3. Actualizar el mapa
        onUpdate({
          ...map,
          nodes: [...nodes, ...createdNodes],
          edges: [...edges, ...createdEdges]
        });
      }
    } catch (error) {
      console.error("Error auto-organizando:", error);
    } finally {
      setIsOrganizing(false);
    }
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'root' || nodes.length <= 1) return;
    onUpdate({ 
      ...map, 
      nodes: nodes.filter(n => n.id !== nodeId), 
      edges: edges.filter(e => e.source !== nodeId && e.target !== nodeId) 
    });
    setSelectedNodeId(null);
  };

  const handleAddMember = () => {
    if (newMemberName.trim() && !teamMembers.includes(newMemberName.trim())) {
      setTeamMembers([...teamMembers, newMemberName.trim()]);
      setNewMemberName('');
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case NodeType.TASK: return BRAND.colors.secondary;
      case NodeType.RESPONSIBILITY: return BRAND.colors.primary;
      case NodeType.MILESTONE: return '#10b981';
      default: return BRAND.colors.accent;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden transition-all ${mode === 'zen' ? 'bg-white' : 'bg-slate-50'} mindmap-canvas`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className={`absolute bottom-6 right-6 flex flex-col gap-2 z-10 transition-opacity ${mode === 'presentation' ? 'opacity-0' : 'opacity-100'}`}>
        <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="w-8 h-8 bg-white shadow-md rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-700 border border-slate-100"><Plus size={16} /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="w-8 h-8 bg-white shadow-md rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-700 border border-slate-100"><Minus size={16} /></button>
        <button onClick={() => { setPan({x:0, y:0}); setZoom(1); }} className="w-8 h-8 bg-white shadow-md rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-700 border border-slate-100"><Maximize2 size={16} /></button>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <g transform={`translate(${dimensions.width / 2 + pan.x}, ${dimensions.height / 2 + pan.y}) scale(${zoom})`}>
          {edges.map(edge => {
            const sourcePos = nodeLayout[edge.source];
            const targetPos = nodeLayout[edge.target];
            if (!sourcePos || !targetPos) return null;
            
            const isConnected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
            const strokeColor = isConnected ? BRAND.colors.secondary : '#cbd5e1'; // Gris pizarra claro por defecto
            const opacity = isConnected ? "1" : "0.5";
            const width = isConnected ? "3" : "2";

            // Curva Bezier para conectar horizontalmente
            const p1 = { x: (sourcePos.x + targetPos.x) / 2, y: sourcePos.y };
            const p2 = { x: (sourcePos.x + targetPos.x) / 2, y: targetPos.y };

            return (
              <path 
                key={edge.id}
                d={`M ${sourcePos.x} ${sourcePos.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${targetPos.x} ${targetPos.y}`}
                stroke={strokeColor}
                strokeOpacity={opacity}
                fill="none"
                strokeWidth={width}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            );
          })}
        </g>
      </svg>

      <div 
        className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {nodes.map((node) => {
          const pos = nodeLayout[node.id];
          if (!pos) return null;
          const isSelected = selectedNodeId === node.id;
          const color = getNodeColor(node.type);

          return (
            <div 
              key={node.id}
              onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
              className={`absolute pointer-events-auto cursor-pointer p-4 rounded-[1.5rem] shadow-lg border transition-all transform hover:scale-105 active:scale-95 ${isSelected ? 'ring-4 ring-blue-500/10 z-20 scale-105 bg-white' : 'z-10 opacity-95 bg-white/90 backdrop-blur-sm'}`}
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                transform: 'translate(-50%, -50%)',
                borderColor: isSelected ? BRAND.colors.primary : 'transparent',
                width: '200px'
              }}
            >
              <div className="flex flex-col gap-1 text-center">
                <div className="flex justify-center mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100" style={{ color }}>{node.type}</span>
                </div>
                <h3 className="font-bold text-slate-800 leading-tight text-sm line-clamp-3 break-words">{node.label}</h3>
                {node.assignee && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] font-black text-emerald-700 shrink-0">
                      {node.assignee.substring(0,1).toUpperCase()}
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[80px]">{node.assignee}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && mode !== 'presentation' && (
        <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200 flex flex-col z-30 animate-in slide-in-from-left duration-500 overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"/>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">ID: {selectedNode.id.split('-').pop()}</span>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="text-slate-300 hover:text-slate-800 transition-colors"><X size={14} /></button>
            </div>
            <textarea 
              className="text-base font-black text-slate-900 w-full outline-none bg-transparent placeholder:text-slate-300 resize-none overflow-hidden leading-tight"
              value={selectedNode.label}
              rows={2}
              onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            
            {/* Botón de Auto-Organización IA */}
            <button 
              onClick={() => handleAutoOrganize(selectedNode.id)}
              disabled={isOrganizing}
              className={`w-full relative overflow-hidden group p-3 rounded-xl border transition-all shadow-sm ${isOrganizing ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-br from-blue-600 to-blue-500 border-transparent text-white hover:shadow-blue-200 hover:shadow-lg hover:scale-[1.02] active:scale-95'}`}
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                {isOrganizing ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Organizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-orange-300 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Organizar con IA</span>
                  </>
                )}
              </div>
              {!isOrganizing && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <AlignLeft size={10} />
                <label className="text-[8px] font-black uppercase tracking-widest">Detalles</label>
              </div>
              <textarea 
                className="w-full h-20 bg-slate-50 rounded-lg p-2.5 text-[10px] text-slate-700 outline-none border border-slate-100 focus:border-blue-200 focus:bg-white transition-all resize-none shadow-inner leading-relaxed"
                value={selectedNode.description || ''}
                placeholder="Añade contexto breve..."
                onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Layers size={10} />
                <label className="text-[8px] font-black uppercase tracking-widest">Clasificación</label>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: NodeType.IDEA, label: 'Idea', icon: <Plus size={12} /> },
                  { id: NodeType.TASK, label: 'Tarea', icon: <CheckCircle2 size={12} /> },
                  { id: NodeType.RESPONSIBILITY, label: 'Rol', icon: <Briefcase size={12} /> },
                  { id: NodeType.MILESTONE, label: 'Hito', icon: <Calendar size={12} /> }
                ].map(type => (
                  <button 
                    key={type.id}
                    onClick={() => updateNodeData(selectedNode.id, { type: type.id as any })}
                    title={type.label}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border transition-all ${selectedNode.type === type.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200 hover:text-blue-600'}`}
                  >
                    {type.icon}
                    <span className="text-[7px] font-bold uppercase">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Users size={10} />
                <label className="text-[8px] font-black uppercase tracking-widest">Equipo</label>
              </div>
              
              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-slate-200 focus-within:border-blue-300 transition-colors shadow-sm">
                <UserPlus size={10} className="text-slate-400" />
                <input 
                  type="text"
                  placeholder="Añadir..."
                  className="bg-transparent text-[10px] font-semibold w-full outline-none text-slate-700 placeholder:text-slate-300"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                />
                <button 
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-0.5 rounded transition-colors disabled:opacity-50"
                >
                  <Plus size={10} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
                {teamMembers.map(member => {
                  const isActive = selectedNode.assignee === member;
                  return (
                    <button
                      key={member}
                      onClick={() => updateNodeData(selectedNode.id, { assignee: isActive ? undefined : member })}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1 ${
                        isActive 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {member}
                      {isActive && <CheckCircle2 size={6} />}
                    </button>
                  );
                })}
              </div>
              
              {selectedNode.assignee && (
                <div className="mt-1 text-[8px] text-emerald-600 font-bold text-center bg-emerald-50 py-0.5 rounded-md">
                  Asignado: {selectedNode.assignee}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button 
                onClick={() => addSubNode(selectedNode.id)}
                className="flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 font-bold p-2.5 rounded-lg text-[9px] uppercase tracking-wide border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
              >
                <PlusCircle size={12} /> Sub-nodo
              </button>
              <button 
                onClick={() => deleteNode(selectedNode.id)}
                className="flex items-center justify-center gap-1.5 bg-white text-red-500 font-bold p-2.5 rounded-lg text-[9px] uppercase tracking-wide border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>

          </div>

          <div className="p-3 border-t border-slate-100 shrink-0">
            <button className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-black uppercase tracking-[0.15em] text-[9px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-slate-200 active:scale-95">
              <Share2 size={12} /> Sincronizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
