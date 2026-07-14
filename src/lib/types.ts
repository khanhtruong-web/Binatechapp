export type FieldType = 'text' | 'date' | 'select' | 'file' | 'number' | 'lookup' | 'textarea';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[]; // for select
  required?: boolean;
}

export interface ModuleSchema {
  id: string;
  name: string;
  fields: FieldDef[];
  primaryKey: string;
}
