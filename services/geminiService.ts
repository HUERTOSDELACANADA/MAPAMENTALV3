
import { GoogleGenAI, Type } from "@google/genai";
import { AI_CONFIG } from "../constants";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface ClarificationQuestion {
  text: string;
  options: string[];
}

// Preguntas por defecto orientadas a ESTRUCTURA y FORMATO, no a contenido.
const defaultQuestions: ClarificationQuestion[] = [
  { 
    text: "¿Cómo prefieres que organice la estructura principal del mapa?", 
    options: ["Por Temas/Áreas (Temático)", "Cronológico (Fases/Tiempo)", "Por Responsables/Equipos", "Problema vs Solución"] 
  },
  { 
    text: "¿Qué nivel de granularidad o detalle necesitas en los nodos finales?", 
    options: ["Solo conceptos macro (High-level)", "Ideas con breve descripción", "Tareas accionables y específicas", "Desglose técnico exhaustivo"] 
  },
  { 
    text: "¿Cuál es la prioridad visual para jerarquizar la información?", 
    options: ["Destacar hitos y fechas", "Agrupar por prioridades (Alta/Media/Baja)", "Separar acciones de información", "Flujo de procesos"] 
  }
];

export const clarifyIntent = async (sourceContent: string): Promise<ClarificationQuestion[]> => {
  const ai = getAiClient();
  try {
    const prompt = `
      Actúa como un experto Arquitecto de Información y Facilitador Visual.
      Tu objetivo NO es entender el negocio del usuario, sino entender CÓMO quiere visualizar su información.
      
      Analiza brevemente este contenido: "${sourceContent.substring(0, 3000)}"
      
      Genera 3 preguntas de clarificación para decidir la ESTRUCTURA del mapa mental.
      
      REGLAS:
      1. NO preguntes sobre el tema (ej: "no preguntes cuál es el objetivo de ventas").
      2. PREGUNTA sobre la ORGANIZACIÓN (ej: "¿Prefieres agrupar por fases o por departamentos?", "¿El enfoque debe ser estratégico u operativo?").
      3. Las opciones deben ser estilos de ordenación, formatos o niveles de profundidad.
    `;

    const response = await ai.models.generateContent({
      model: AI_CONFIG.modelFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["text", "options"]
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return defaultQuestions;
    const data = JSON.parse(text);
    return Array.isArray(data) && data.length > 0 ? data : defaultQuestions;
  } catch (e) {
    console.error("Error en clarificación:", e);
    return defaultQuestions;
  }
};

export const reformulateQuestions = async (
  sourceContent: string, 
  currentQuestions: ClarificationQuestion[], 
  currentSelections: string[][]
): Promise<ClarificationQuestion[]> => {
  const ai = getAiClient();

  // Construimos un resumen del estado actual para la IA
  const statusSummary = currentQuestions.map((q, i) => {
    const answered = currentSelections[i] && currentSelections[i].length > 0;
    return `Pregunta ${i + 1}: "${q.text}"
    - Estado: ${answered ? `RESPONDIDA con: ${JSON.stringify(currentSelections[i])}` : "NO RESPONDIDA (El usuario la ignoró)"}
    - Opciones actuales: ${JSON.stringify(q.options)}`;
  }).join('\n\n');

  const prompt = `
  Eres un experto en Metodologías Ágiles y Visual Thinking. El usuario quiere replantear la forma en que vamos a organizar su mapa mental.
  
  CONTEXTO DEL DOCUMENTO (Para saber qué estructuras son posibles): 
  ${sourceContent.substring(0, 2000)}
  
  ESTADO ACTUAL DE LA ENTREVISTA:
  ${statusSummary}
  
  TU MISIÓN:
  Genera un array JSON con 3 objetos (preguntas).
  
  REGLAS CRÍTICAS DE RE-GENERACIÓN:
  1. SI LA PREGUNTA ESTÁ RESPONDIDA:
     - MANTENLA. El usuario ya decidió esa parte de la estructura.
     - OBLIGATORIO: Las opciones seleccionadas (${JSON.stringify(currentSelections.flat())}) deben aparecer LITERALMENTE.
  
  2. SI LA PREGUNTA NO ESTÁ RESPONDIDA:
     - ELIMÍNALA. No era relevante para organizar este contenido.
     - GENERA UNA NUEVA sobre la ARQUITECTURA de la información.
     - Ejemplos válidos: "¿Debemos separar por trimestres?", "¿Quieres nodos especiales para decisiones?", "¿Agrupamos por tipo de recurso?".
     - NUNCA preguntes sobre el contenido del texto (ej: No preguntes "¿Quién es el cliente?").
  
  3. OBJETIVO: Definir el "esqueleto" del mapa mental.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.modelFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["text", "options"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return currentQuestions;
    const data = JSON.parse(text);
    return Array.isArray(data) && data.length === 3 ? data : currentQuestions;
  } catch (e) {
    console.error("Error replanteando preguntas:", e);
    return currentQuestions;
  }
};

export const generateMindMap = async (sourceContent: string, clarifications: string): Promise<any> => {
  const ai = getAiClient();
  
  // Prompt optimizado para JERARQUÍA ESTRICTA
  const prompt = `Eres la IA 'Nanobanana' de MORETURISMO, arquitecta de información experta.
  
  OBJETIVO ÚNICO:
  Crear un MAPA MENTAL JERÁRQUICO ESTRICTO (Estructura de Árbol).
  La función es organizar la información proporcionada según las preferencias de estructura del usuario.
  
  ENTRADA:
  - Contexto Original: ${sourceContent.substring(0, 4000)}
  - Preferencias de Estructura (Clarificaciones): ${clarifications.substring(0, 2000)}
  
  REGLAS DE ORO (OBLIGATORIAS):
  1. ESTRUCTURA DE ÁRBOL:
     - SOLO puede haber 1 Nodo Raíz (Nivel 0).
     - TODO nodo (excepto la raíz) DEBE tener un nodo padre ('source').
     - PROHIBIDO crear nodos aislados o listas planas sin conexión.
  
  2. FLUJO DE INFORMACIÓN (Niveles):
     - Nivel 1 (Raíz): El concepto central o título del proyecto.
     - Nivel 2 (Ramas Principales): Las grandes categorías o pilares (según lo definido en las clarificaciones: fases, temas, departamentos, etc.).
     - Nivel 3 (Sub-categorías): Desglose de las ramas principales.
     - Nivel 4+ (Detalles/Tareas): Acciones específicas, datos concretos o responsables.
  
  3. CONTENIDO ACCIONABLE:
     - No uses textos largos. Usa conceptos breves y claros.
     - Si detectas una tarea, usa type: 'task'.
     - Si detectas una fecha o fase, usa type: 'milestone'.
  
  SALIDA ESPERADA:
  Un JSON con 'nodes' y 'edges' que represente un árbol perfecto donde A conecta con B, y B conecta con C.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.modelPro,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING, description: "Título corto del nodo" },
                  description: { type: Type.STRING, description: "Contexto adicional" },
                  type: { type: Type.STRING, enum: ["idea", "task", "responsibility", "milestone"] }
                },
                required: ["id", "label", "type"]
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  target: { type: Type.STRING }
                },
                required: ["id", "source", "target"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sin respuesta de IA");
    
    const data = JSON.parse(text);
    return {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      edges: Array.isArray(data?.edges) ? data.edges : []
    };
  } catch (error) {
    console.error("Error crítico en generación de mapa:", error);
    return {
      nodes: [
        { id: "root", label: "Error de Generación", type: "idea", description: "Inténtalo de nuevo" }
      ],
      edges: []
    };
  }
};

export const expandNodeWithAI = async (nodeLabel: string, nodeDescription: string): Promise<any[]> => {
  const ai = getAiClient();
  const prompt = `Expande la rama del mapa mental: "${nodeLabel}" (${nodeDescription}).
  Genera 3-5 sub-nodos hijos que dependan jerárquicamente de este concepto.
  Deben ser más específicos que el padre.`;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.modelFlash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["task", "responsibility", "idea", "milestone"] }
            },
            required: ["label", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    console.error("Error expandiendo nodo:", e);
    return [];
  }
};
