
export enum ItemStatus {
  OK = 'OK',
  MISSING = 'FALTA',
  DEFECTIVE = 'DEFEITUOSO'
}

export interface ChecklistItem {
  id: number;
  label: string;
  surveyed: boolean;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'OPERADOR' | 'MANUTENCAO' | 'OPERACAO';
  matricula: string;
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  current_km: number;
  current_horimetro: number;
  active: boolean;
}

export interface DBChecklistItem {
  id: number;
  label: string;
  category: string;
}

export interface ChecklistEntry {
  id: string;
  date: string;
  shift: string;
  type: 'Saída' | 'Retorno';
  driver_name: string;
  prefix: string;
  vehicle_id: string;
  km: number;
  horimetro: number;
  items: Record<string, { status: ItemStatus; observations?: string; surveyed: boolean }>;
  general_observations: string;
  created_at: number;
  user_id: string;
  has_issues: boolean;
}
