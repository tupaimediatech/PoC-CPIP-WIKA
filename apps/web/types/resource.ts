export interface Resource {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_category: string;
  project_name: string;
}

export interface ResourceFilterOptionsResponse {
  resource_category?: string[];
  project_name?: string[];
}

export interface Resource {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_category: string;
  project_name: string;
}

export interface ResourceListResponse {
  data: Resource[];
}

export interface ResourceFilterOptionsResponse {
  resource_category?: string[];
  project_name?: string[];
}
