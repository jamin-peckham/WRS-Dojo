import React, { useState, useEffect, useRef } from 'react';
import { X, Save as SaveIcon, FolderOpen, Trash2, Clock, HardDrive, Download, Upload } from 'lucide-react';
import { listSaves, getSave, createSave, updateSave, deleteSave, restoreLocalStorage, SaveInfo, captureLocalStorage } from '../saveApi';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSaveId: string | null;
  autoSaveEnabled: boolean;
  onSetCurrentSave: (id: string | null) => void;
  onToggleAutoSave: (enabled: boolean) => void;
  lastAutoSaveTime: number | null;
  hasBackend: boolean;
}

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  currentSaveId,
  autoSaveEnabled,
  onSetCurrentSave,
  onToggleAutoSave,
  lastAutoSaveTime,
  hasBackend
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [saves, setSaves] = useState<SaveInfo[]>([]);
  const [maxSaves, setMaxSaves] = useState(100);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentSaveName, setCurrentSaveName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && hasBackend) {
      loadSaves();
    }
  }, [isOpen, hasBackend]);

  useEffect(() => {
    if (currentSaveId && saves.length > 0) {
      const current = saves.find(s => s.id === currentSaveId);
      setCurrentSaveName(current?.name || null);
    } else {
      setCurrentSaveName(null);
    }
  }, [currentSaveId, saves]);

  const loadSaves = async () => {
    if (!hasBackend) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await listSaves();
      setSaves(response.saves);
      setMaxSaves(response.maxSaves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saves');
    } finally {
      setLoading(false);
    }
  };

  // File-based save (download JSON)
  const handleFileSave = () => {
    if (!saveName.trim()) {
      setError('Please enter a save name');
      return;
    }

    const localStorageData = captureLocalStorage();
    const saveData = {
      name: saveName.trim(),
      data: localStorageData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `wrs_save_${saveName.trim().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    setSaveName('');
    setError(null);
  };

  // File-based load (upload JSON)
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const saveData = JSON.parse(event.target?.result as string);
        if (saveData.data) {
          restoreLocalStorage(saveData.data);
          window.location.reload();
        } else {
          setError('Invalid save file format');
        }
      } catch (err) {
        setError('Error parsing save file');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSave = async () => {
    if (!saveName.trim()) {
      setError('Please enter a save name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newSave = await createSave(saveName.trim());
      onSetCurrentSave(newSave.id);
      setSaveName('');
      await loadSaves();
      setActiveTab('load');
      alert('Save created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create save');
    } finally {
      setLoading(false);
    }
  };

  const handleOverwriteSave = async () => {
    if (!currentSaveId) {
      setError('No save is currently loaded');
      return;
    }

    if (!confirm(`Overwrite "${currentSaveName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateSave(currentSaveId);
      await loadSaves();
      alert('Save updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update save');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSave = async (id: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const save = await getSave(id);
      restoreLocalStorage(save.data);
      
      // Update current save state in localStorage directly (not through React state)
      const saveState = {
        currentSaveId: id,
        autoSaveEnabled: autoSaveEnabled,
        lastAutoSaveTime: null
      };
      localStorage.setItem('wrs_current_save_state', JSON.stringify(saveState));
      
      // Force localStorage to sync before reload
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load save');
      setLoading(false);
    }
  };

  const handleDeleteSave = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteSave(id);
      if (currentSaveId === id) {
        onSetCurrentSave(null);
      }
      await loadSaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete save');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-wider text-stone-900">Save/Load System</h2>
            <p className="text-sm text-stone-500 mt-1">Manage your dojo save states</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Save Info */}
        {hasBackend && currentSaveId && currentSaveName && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-bold text-blue-900">Current Save: {currentSaveName}</p>
                  {lastAutoSaveTime && autoSaveEnabled && (
                    <p className="text-xs text-blue-600">
                      Auto-saved {formatTimeSince(lastAutoSaveTime)}
                    </p>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => onToggleAutoSave(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-blue-900">Auto-save (5 min)</span>
              </label>
            </div>
          </div>
        )}

        {/* No Backend Warning */}
        {!hasBackend && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-100">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-bold text-yellow-900">File-based Mode</p>
                <p className="text-xs text-yellow-700">Server not detected. Using file download/upload for saves.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 px-6 py-3 font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'save'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <SaveIcon className="w-4 h-4 inline mr-2" />
            Save
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`flex-1 px-6 py-3 font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'load'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            Load
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'save' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Save Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Enter a name for this save..."
                  className="w-full px-4 py-2 border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-stone-500"
                  disabled={loading}
                />
              </div>
              {hasBackend ? (
                <>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateSave}
                      disabled={loading || !saveName.trim()}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded font-bold uppercase tracking-wider hover:bg-green-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Create New Save
                    </button>
                    {currentSaveId && (
                      <button
                        onClick={handleOverwriteSave}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded font-bold uppercase tracking-wider hover:bg-blue-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Overwrite Current
                      </button>
                    )}
                  </div>
                  <div className="text-center text-sm text-stone-500">
                    {saves.length} / {maxSaves} saves
                    {saves.length >= maxSaves - 5 && (
                      <span className="text-orange-600 font-bold ml-2">⚠️ Approaching limit!</span>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={handleFileSave}
                  disabled={!saveName.trim()}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded font-bold uppercase tracking-wider hover:bg-green-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Save File
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!hasBackend ? (
                <div className="text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileLoad}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Save File
                  </button>
                  <p className="text-sm text-stone-500 mt-4">Select a save file (.json) to restore your data</p>
                </div>
              ) : loading && saves.length === 0 ? (
                <p className="text-center text-stone-500 py-8">Loading saves...</p>
              ) : saves.length === 0 ? (
                <p className="text-center text-stone-500 py-8">No saves yet. Create your first save!</p>
              ) : (
                saves.map((save) => (
                  <div
                    key={save.id}
                    className={`border rounded p-4 hover:shadow-md transition-shadow ${
                      save.id === currentSaveId ? 'border-blue-500 bg-blue-50' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-stone-900">
                          {save.name}
                          {save.id === currentSaveId && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              CURRENT
                            </span>
                          )}
                        </h3>
                        <div className="text-sm text-stone-600 mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Created: {formatDate(save.createdAt)}</span>
                          </div>
                          {save.updatedAt !== save.createdAt && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>Updated: {formatDate(save.updatedAt)}</span>
                            </div>
                          )}
                          {save.metadata && (
                            <div className="text-xs text-stone-500">
                              {save.metadata.groupCount !== undefined && `${save.metadata.groupCount} groups`}
                              {save.metadata.studentCount !== undefined && ` • ${save.metadata.studentCount} students`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleLoadSave(save.id, save.name)}
                          disabled={loading}
                          className="px-4 py-2 bg-stone-900 text-white rounded text-sm font-bold uppercase hover:bg-stone-700 disabled:bg-stone-300 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteSave(save.id, save.name)}
                          disabled={loading}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-stone-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-stone-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-stone-200 text-stone-900 rounded font-bold uppercase tracking-wider hover:bg-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadModal;
