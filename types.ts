
export enum ItemStatus {
  OK = 'OK',
  MISSING = 'FALTA',
  DEFECTIVE = 'DEFEITO'
}

export interface Company {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'OPERADOR' | 'MANUTENCAO' | 'OPERACAO';
  matricula: string;
  active: boolean;
  company_id: string; // Vínculo obrigatório com a empresa
}

export interface Vehicle {
  id: string;
  company_id: string;
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
  company_id: string;
  label: string;
  category: string;
  active?: boolean;
}

export interface ServiceOrder {
  id: string;
  company_id: string;
  os_number: number;
  vehicle_id: string;
  prefix: string;
  km: number;
  horimetro: number;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  created_at: string;
  user_id: string;
  user_name?: string;
  closing_observations?: string;
  closed_at?: string;
  closed_by?: string;
}

export interface MaintenanceSession {
  id: string;
  company_id: string;
  user_id: string;
  vehicle_id: string;
  prefix: string;
  opening_reason: string;
  start_time: string;
  end_time?: string;
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  total_effective_seconds: number;
  user_name?: string;
}

/**
 * Interface updated to include validation fields used by HistoryView
 */
export interface ChecklistEntry {
  id: string;
  company_id: string;
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
  operation_checked?: boolean;
  operation_user_id?: string;
  maintenance_checked?: boolean;
  maintenance_user_id?: string;
}

/**
 * Interface for Fuel Categories
 */
export interface FuelType {
  id: number;
  company_id?: string;
  name: string;
  active: boolean;
}

/**
 * Interface for Lubricant/Fluid types
 */
export interface LubricantType {
  id: number;
  company_id?: string;
  name: string;
  active: boolean;
}

/**
 * Interface for Maintenance Pause events
 */
export interface MaintenancePause {
  id: string;
  session_id: string;
  reason: string;
  pause_start: string;
  pause_end?: string;
}

export interface RefuelingEntry {
  id: string;
  company_id: string;
  event_at: string;
  vehicle_id: string;
  prefix: string;
  km: number;
  horimetro: number;
  fuel_type_id: number;
  quantity: number;
  arla_quantity?: number;
  user_id: string;
}

export interface LubricantEntry {
  id: string;
  company_id: string;
  event_at: string;
  vehicle_id: string;
  prefix: string;
  km: number;
  horimetro: number;
  lubricant_type_id: number;
  quantity: number;
  user_id: string;
}
