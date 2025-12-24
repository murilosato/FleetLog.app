
export enum ItemStatus {
  OK = 'OK',
  MISSING = 'FALTA',
  DEFECTIVE = 'DEFEITUOSO'
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
}

export interface DBChecklistItem {
  id: number;
  label: string;
  category: string;
}

// Fixed: Added missing ChecklistSection interface used in constants.tsx
export interface ChecklistSection {
  title: string;
  items: {
    id: number;
    label: string;
    surveyed: boolean;
  }[];
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

// Fixed: Added missing ChecklistSubmission interface used in Dashboard.tsx and HistoryView.tsx
export interface ChecklistSubmission {
  id: string;
  date: string;
  prefix: string;
  shift: string;
  driverName: string;
  driverId: string;
  km: number;
  hourmeter: number;
  departureTime: string;
  sections: {
    title: string;
    items: {
      id: number;
      label: string;
      status: ItemStatus;
      observations?: string;
    }[];
  }[];
  generalObservations?: string;
}
