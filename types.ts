
export enum NodeType {
  IDEA = 'idea',
  TASK = 'task',
  RESPONSIBILITY = 'responsibility',
  MILESTONE = 'milestone'
}

export interface NodeData {
  id: string;
  label: string;
  description?: string;
  type: NodeType;
  color?: string;
  assignee?: string;
  attachments?: string[];
  links?: string[];
  isCollapsed?: boolean;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface MindMap {
  id: string;
  title: string;
  nodes: NodeData[];
  edges: MindMapEdge[];
  createdAt: number;
}

export interface ProjectSource {
  type: 'text' | 'file' | 'url' | 'mixed';
  content: string;
  fileInfo?: string;
}

export type ViewMode = 'edit' | 'zen' | 'presentation';
