// API client for save/load functionality

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

// Check if backend is available
let backendAvailable: boolean | null = null;

export async function isBackendAvailable(): Promise<boolean> {
  if (backendAvailable !== null) {
    return backendAvailable;
  }
  
  try {
    const response = await fetch(`${API_BASE}/saves`, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    backendAvailable = response.ok;
    return backendAvailable;
  } catch (err) {
    backendAvailable = false;
    return false;
  }
}

export interface SaveMetadata {
  groupCount?: number;
  studentCount?: number;
  activeGroupName?: string;
}

export interface SaveInfo {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  metadata?: SaveMetadata;
}

export interface SaveData {
  [key: string]: string | null;
}

export interface FullSave extends SaveInfo {
  data: SaveData;
}

export interface SavesResponse {
  saves: SaveInfo[];
  total: number;
  maxSaves: number;
}

// Helper to capture all localStorage as an object
export function captureLocalStorage(): SaveData {
  const data: SaveData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

// Helper to restore localStorage from saved data
export function restoreLocalStorage(data: SaveData): void {
  // Clear existing localStorage
  localStorage.clear();
  
  // Restore all keys from save
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== null) {
      localStorage.setItem(key, value);
    }
  });
}

// Helper to extract metadata from localStorage
export function extractMetadata(): SaveMetadata {
  try {
    const masterData = localStorage.getItem('wrs_dojo_master_v2');
    if (masterData) {
      const parsed = JSON.parse(masterData);
      return {
        groupCount: parsed.groups?.length || 0,
        studentCount: parsed.students?.length || 0,
        activeGroupName: parsed.activeSession?.lesson?.title || undefined
      };
    }
  } catch (err) {
    console.error('Error extracting metadata:', err);
  }
  return {};
}

// List all saves
export async function listSaves(): Promise<SavesResponse> {
  const response = await fetch(`${API_BASE}/saves`);
  if (!response.ok) {
    throw new Error(`Failed to list saves: ${response.statusText}`);
  }
  return response.json();
}

// Get a specific save
export async function getSave(id: string): Promise<FullSave> {
  const response = await fetch(`${API_BASE}/saves/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to get save: ${response.statusText}`);
  }
  return response.json();
}

// Create a new save
export async function createSave(name: string): Promise<SaveInfo> {
  const data = captureLocalStorage();
  const metadata = extractMetadata();
  
  const response = await fetch(`${API_BASE}/saves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data, metadata })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create save: ${response.statusText}`);
  }
  
  return response.json();
}

// Update an existing save
export async function updateSave(id: string): Promise<SaveInfo> {
  const data = captureLocalStorage();
  const metadata = extractMetadata();
  
  const response = await fetch(`${API_BASE}/saves/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, metadata })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update save: ${response.statusText}`);
  }
  
  return response.json();
}

// Delete a save
export async function deleteSave(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/saves/${id}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete save: ${response.statusText}`);
  }
}
