export type FieldType = 'text' | 'date' | 'select' | 'file' | 'number' | 'lookup' | 'textarea';

export type UserRole = 'Admin' | 'Manager' | 'Employee';

export interface LookupSource {
  module: string;      // MODULE_SCHEMAS key of the master module
  valueField: string;  // field stored as the value (e.g. 'clientId')
  labelField?: string; // optional display field (e.g. 'companyName')
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[]; // for select
  required?: boolean;
  roles?: UserRole[]; // field-level security: if set, only these roles can view/edit/export this field
  lookupSource?: LookupSource; // for type 'lookup': master-data source powering autosuggest
}

export interface ModuleSchema {
  id: string;
  name: string;
  fields: FieldDef[];
  primaryKey: string;
}
