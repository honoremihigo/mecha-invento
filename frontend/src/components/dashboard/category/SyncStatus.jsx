// components/SyncStatus.jsx
import React, { useState, useEffect } from 'react';
import categoryService from '../../../services/categoryService';
import { isOnline, onNetworkStatusChange, removeNetworkStatusListener } from '../../../utils/networkUtils';

const SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({
    totalCategories: 0,
    unsyncedCategories: 0,
    isOnline: true,
    syncInProgress: false
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initial load
    loadSyncStatus();

    // Network status listener
    const handleNetworkChange = (online) => {
      setSyncStatus(prev => ({ ...prev, isOnline: online }));
      if (online) {
        loadSyncStatus();
      }
    };

    onNetworkStatusChange(handleNetworkChange);

    // Periodic update
    const interval = setInterval(loadSyncStatus, 10000); // Every 10 seconds

    return () => {
      removeNetworkStatusListener(handleNetworkChange);
      clearInterval(interval);
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await categoryService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleForceSync = async () => {
    try {
      await categoryService.forcSync();
      await loadSyncStatus();
      alert('Sync completed successfully');
    } catch (error) {
      alert('Sync failed: ' + error.message);
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-500';
    if (syncStatus.unsyncedCategories > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.unsyncedCategories > 0) return `${syncStatus.unsyncedCategories} unsynced`;
    return 'All synced';
  };

  return (
    <div className="bg-white shadow-sm border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          <div>
            <p className="font-medium text-gray-900">Sync Status</p>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          {syncStatus.isOnline && syncStatus.unsyncedCategories > 0 && !syncStatus.syncInProgress && (
            <button
              onClick={handleForceSync}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Network:</span>
              <span className={`ml-2 ${syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div>
              <span className="font-medium">Sync Status:</span>
              <span className={`ml-2 ${syncStatus.syncInProgress ? 'text-blue-600' : 'text-gray-600'}`}>
                {syncStatus.syncInProgress ? 'In Progress' : 'Idle'}
              </span>
            </div>
            <div>
              <span className="font-medium">Total Categories:</span>
              <span className="ml-2 text-gray-800">{syncStatus.totalCategories}</span>
            </div>
            <div>
              <span className="font-medium">Unsynced:</span>
              <span className={`ml-2 ${syncStatus.unsyncedCategories > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {syncStatus.unsyncedCategories}
              </span>
            </div>
          </div>

          {syncStatus.unsyncedCategories > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                Some categories are not synced with the server. They will be automatically synced when you're back online.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;