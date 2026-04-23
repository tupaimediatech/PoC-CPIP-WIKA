export interface Material {
  id: string;
  material_id: string;
  material_name: string;
  material_category: string;
  project_name: string;
}

export interface MaterialFilterOptionsResponse {
  material_category?: string[];
  project_name?: string[];
}

export interface Material {
  id: string;
  material_id: string;
  material_name: string;
  material_category: string;
  project_name: string;
}

export interface MaterialListResponse {
  data: Material[];
}

export interface MaterialFilterOptionsResponse {
  material_category?: string[];
  project_name?: string[];
}
