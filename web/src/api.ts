const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Location {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  location_id: number;
  location_name: string;
  position_detail: string | null;
  original_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchCandidate {
  id: number;
  name: string;
  location_name: string;
  position_detail: string | null;
  reason: string;
}

export interface SearchResult {
  status: "found" | "ambiguous" | "not_found" | "error";
  answer: string;
  item?: {
    id: number;
    name: string;
    description: string | null;
    location_name: string;
    position_detail: string | null;
  };
  candidates?: SearchCandidate[];
}

export interface ExtractionPreview {
  object_name: string;
  object_description: string | null;
  location_name: string;
  location_is_new: boolean;
  position_detail: string | null;
  existing_item_id: number | null;
  is_location_update: boolean;
  original_text: string;
}

export const api = {
  search(query: string): Promise<SearchResult> {
    return request("/api/search", { method: "POST", body: JSON.stringify({ query }) });
  },
  searchItem(id: number): Promise<SearchResult> {
    return request(`/api/search/item/${id}`);
  },
  extractItem(text: string): Promise<ExtractionPreview> {
    return request("/api/items/extract", { method: "POST", body: JSON.stringify({ text }) });
  },
  confirmItem(preview: ExtractionPreview): Promise<Item> {
    return request("/api/items", {
      method: "POST",
      body: JSON.stringify({
        name: preview.object_name,
        description: preview.object_description,
        location_name: preview.location_name,
        location_is_new: preview.location_is_new,
        position_detail: preview.position_detail,
        original_text: preview.original_text,
        existing_item_id: preview.existing_item_id,
        is_location_update: preview.is_location_update,
      }),
    });
  },
  listLocations(): Promise<Location[]> {
    return request("/api/locations");
  },
  createLocation(name: string, description?: string | null): Promise<Location> {
    return request("/api/locations", { method: "POST", body: JSON.stringify({ name, description }) });
  },
  updateLocation(id: number, data: { name?: string; description?: string | null }): Promise<Location> {
    return request(`/api/locations/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteLocation(id: number): Promise<void> {
    return request(`/api/locations/${id}`, { method: "DELETE" });
  },
  listItems(): Promise<Item[]> {
    return request("/api/items");
  },
  deleteItem(id: number): Promise<void> {
    return request(`/api/items/${id}`, { method: "DELETE" });
  },
};
