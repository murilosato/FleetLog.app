
export enum ItemStatus {
  OK = 'OK',
  MISSING = 'FALTA',
  DEFECTIVE = 'DEFEITUOSO'
}

export interface ChecklistItem {
  id: number;
  label: string;
  status?: ItemStatus;
  observations?: string;
  surveyed: boolean;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export interface User {
  id: string;
  name: string;
  role: 'driver' | 'inspector' | 'admin';
}

export interface ChecklistSubmission {
  id: string;
  date: string;
  shift: 'Day' | 'Night';
  driverId: string;
  driverName: string;
  prefix: string;
  km: number;
  hourmeter: string;
  departureTime: string;
  sections: ChecklistSection[];
  generalObservations?: string;
}
