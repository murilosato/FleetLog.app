
export enum ItemStatus {
  OK = 'OK',
  MISSING = 'FALTA',
  DEFECTIVE = 'DEFEITO'
}

export interface ChecklistItem {
  id: number;
  label: string;
  surveyed: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'OPERADOR' | 'MANUTENCAO' | 'OPERACAO';
  matricula: string;
  active: boolean;
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  current_km: number;
  current_horimetro: number;
  max_km_jump: number;
  max_horimetro_jump: number;
  active: boolean;
}

export interface DBChecklistItem {
  id: number;
  label: string;
  category: string;
  active?: boolean;
}

export interface FuelType {
  id: number;
  name: string;
  active: boolean;
}

export interface LubricantType {
  id: number;
  name: string;
  active: boolean;
}

export interface MaintenanceSession {
  id: string;
  user_id: string;
  vehicle_id: string;
  prefix: string;
  opening_reason: string;
  start_time: string;
  end_time?: string;
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  total_effective_seconds: number;
  user_name?: string;
  plate?: string;
}

export interface MaintenancePause {
  id: string;
  session_id: string;
  pause_start: string;
  pause_end?: string;
  reason: string;
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
  has_divergence?: boolean;
  divergence_details?: string;
  maintenance_checked?: boolean;
  maintenance_user_id?: string;
  operation_checked?: boolean;
  operation_user_id?: string;
}

export interface RefuelingEntry {
  id: string;
  event_at: string;
  vehicle_id: string;
  prefix: string;
  km: number;
  horimetro: number;
  fuel_type_id: number;
  quantity: number;
  arla_quantity?: number;
  user_id: string;
  created_at?: string;
  fuel_name?: string;
  user_name?: string;
}

export interface LubricantEntry {
  id: string;
  event_at: string;
  vehicle_id: string;
  prefix: string;
  km: number;
  horimetro: number;
  lubricant_type_id: number;
  quantity: number;
  user_id: string;
  created_at?: string;
  lubricant_name?: string;
  user_name?: string;
}
