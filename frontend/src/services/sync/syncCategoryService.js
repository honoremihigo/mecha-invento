// services/syncService.js
import { db } from '../../db/database';
import categoryService from '../categoryService';
import { isOnline } from '../../utils/networkUtils';

class SyncService {
  constructor() {
    this.isSyncing = false; // Prevent concurrent syncs
  }

  async syncCategories() {
    console.log('🔄 Starting sync process...');
    
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping...');
      return;
    }

    // Await the async isOnline check
    const online = await isOnline();
    if (!online) {
      console.log('📴 Offline - skipping sync');
      return;
    }

    this.isSyncing = true;
    
    try {
      console.log('📊 Starting sync phases...');
      
      // 1. Sync new/updated categories
      console.log('🔸 Phase 1: Syncing unsynced categories...');
      await this.syncUnsyncedCategories();
      
      // 2. Sync deleted categories
      console.log('🔸 Phase 2: Syncing deleted categories...');
      await this.syncDeletedCategories();
      
      // 3. Fetch latest from server and update local
      console.log('🔸 Phase 3: Fetching updates from server...');
      await this.fetchAndUpdateLocal();
      
      console.log('✅ Sync completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncUnsyncedCategories() {
    console.log('🔍 Looking for unsynced categories...');
    
    let unsyncedCategories = [];
    try {
      unsyncedCategories = await db.categories
        .where('synced')
        .equals(false)
        .toArray();
    } catch (e) {
      console.warn("⚠️ Failed .where().equals(false), falling back to filter:", e);
      unsyncedCategories = await db.categories
        .filter(cat => cat.synced === false || cat.synced === undefined)
        .toArray();
    }

    console.log(`📝 Found ${unsyncedCategories.length} unsynced categories`);

    if (unsyncedCategories.length === 0) {
      console.log('✅ No unsynced categories found');
      return;
    }

    for (const category of unsyncedCategories) {
      try {
        console.log(`🔄 Syncing category: ${category.name} (localId: ${category.localId})`);
        
        let response;
        
        // Check if this is an update (has server ID) or create (no server ID)
        if (category.id && category.id !== category.localId) {
          console.log(`📝 Updating existing category with ID: ${category.id}`);
          // Update existing category
          response = await categoryService.updateCategory(category.id, {
            name: category.name,
            description: category.description,
            adminId: category.adminId,
            employeeId: category.employeeId
          });
        } else {
          console.log(`➕ Creating new category: ${category.name}`);
          // Create new category
          response = await categoryService.createCategory({
            name: category.name,
            description: category.description,
            adminId: category.adminId,
            employeeId: category.employeeId
          });
        }

        console.log('📡 Server response:', response);

        // Update local record with server response
        const updateData = {
          id: response.category?.id || response.id, // Handle different response formats
          synced: true,
          lastModified: new Date(),
          updatedAt: response.category?.updatedAt || response.updatedAt || new Date()
        };

        console.log('💾 Updating local record with:', updateData);
        
        await db.categories.update(category.localId, updateData);

        console.log(`✅ Successfully synced category: ${category.name}`);
      } catch (error) {
        console.error(`❌ Failed to sync category ${category.name}:`, error);
        // Optionally mark as failed with retry count
        try {
          await db.categories.update(category.localId, {
            syncError: error.message,
            syncRetryCount: (category.syncRetryCount || 0) + 1,
            lastSyncAttempt: new Date()
          });
        } catch (updateError) {
          console.error('Failed to update sync error info:', updateError);
        }
      }
    }
  }

  async syncDeletedCategories() {
    console.log('🔍 Looking for deleted categories to sync...');
    
    const deletedCategories = await db.deletedCategories.toArray();
    console.log(`🗑️ Found ${deletedCategories.length} deleted categories to sync`);

    if (deletedCategories.length === 0) {
      console.log('✅ No deleted categories to sync');
      return;
    }

    for (const deletedCategory of deletedCategories) {
      try {
        console.log(`🗑️ Syncing deletion of category ID: ${deletedCategory.id}`);
        
        await categoryService.deleteCategory(deletedCategory.id, {
          adminId: deletedCategory.adminId,
          employeeId: deletedCategory.employeeId
        });

        // Remove from deleted queue
        await db.deletedCategories.delete(deletedCategory.id);
        
        console.log(`✅ Successfully synced deletion of category ID: ${deletedCategory.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync category deletion for ID ${deletedCategory.id}:`, error);
        // Keep in queue for retry but mark the attempt
        try {
          await db.deletedCategories.update(deletedCategory.id, {
            syncError: error.message,
            syncRetryCount: (deletedCategory.syncRetryCount || 0) + 1,
            lastSyncAttempt: new Date()
          });
        } catch (updateError) {
          console.error('Failed to update deleted category sync error:', updateError);
        }
      }
    }
  }

  async fetchAndUpdateLocal() {
    console.log('🔍 Fetching latest data from server...');
    
    try {
      const serverCategories = await categoryService.getAllCategories();
      console.log(`📡 Received ${serverCategories.length} categories from server`);
      
      if (!Array.isArray(serverCategories)) {
        console.error('❌ Server response is not an array:', serverCategories);
        return;
      }

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const serverCategory of serverCategories) {
        try {
          console.log(`🔍 Processing server category: ${serverCategory.name} (ID: ${serverCategory.id})`);
          
          const localCategory = await db.categories
            .where('id')
            .equals(serverCategory.id)
            .first();

          if (!localCategory) {
            console.log(`➕ Adding new category from server: ${serverCategory.name}`);
            // New category from server - generate a local ID
            const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await db.categories.add({
              ...serverCategory,
              localId: localId,
              synced: true,
              lastModified: new Date(),
              syncedAt: new Date()
            });
            newCount++;
          } else {
            // Check if server version is newer
            const serverDate = new Date(serverCategory.updatedAt);
            const localDate = new Date(localCategory.updatedAt);
            
            console.log(`📅 Comparing dates - Server: ${serverDate}, Local: ${localDate}`);
            
            if (serverDate > localDate) {
              console.log(`🔄 Server version newer, updating local: ${serverCategory.name}`);
              
              await db.categories.update(localCategory.localId, {
                ...serverCategory,
                localId: localCategory.localId, // Preserve local ID
                synced: true,
                lastModified: new Date(),
                syncedAt: new Date()
              });
              updatedCount++;
            } else {
              console.log(`✅ Local version up to date: ${serverCategory.name}`);
              // Update sync status if needed
              if (!localCategory.synced) {
                await db.categories.update(localCategory.localId, {
                  synced: true,
                  syncedAt: new Date()
                });
              }
              skippedCount++;
            }
          }
        } catch (categoryError) {
          console.error(`❌ Error processing category ${serverCategory.id}:`, categoryError);
        }
      }

      console.log(`📊 Fetch summary: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
      
      // Also check for categories that exist locally but not on server (potential deletes)
      await this.checkForServerDeletes(serverCategories);
      
    } catch (error) {
      console.error('❌ Failed to fetch and update from server:', error);
      throw error; // Re-throw to handle in main sync method
    }
  }

  async checkForServerDeletes(serverCategories) {
    console.log('🔍 Checking for categories deleted on server...');
    
    try {
      const serverIds = new Set(serverCategories.map(cat => cat.id));

      let localSyncedCategories = [];
      try {
        localSyncedCategories = await db.categories
          .where('synced')
          .equals(true)
          .and(cat => cat.id && cat.id !== cat.localId) // Has server ID
          .toArray();
      } catch (e) {
        console.warn("⚠️ Failed .where().equals(true), falling back to filter:", e);
        localSyncedCategories = await db.categories
          .filter(cat => cat.synced === true && cat.id && cat.id !== cat.localId)
          .toArray();
      }

      let deletedCount = 0;

      for (const localCategory of localSyncedCategories) {
        if (!serverIds.has(localCategory.id)) {
          console.log(`🗑️ Category deleted on server: ${localCategory.name} (ID: ${localCategory.id})`);
          
          // Remove from local database
          await db.categories.delete(localCategory.localId);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Removed ${deletedCount} categories deleted on server`);
      } else {
        console.log('✅ No server deletions found');
      }
    } catch (error) {
      console.error('❌ Error checking for server deletes:', error);
    }
  }

  // Get sync status for debugging
  async getSyncStatus() {
    let unsynced = 0;
    try {
      unsynced = await db.categories.where('synced').equals(false).count();
    } catch (e) {
      console.warn("⚠️ Failed .where().equals(false) in getSyncStatus, fallback to filter");
      unsynced = await db.categories.filter(cat => !cat.synced).count();
    }

    const deleted = await db.deletedCategories.count();
    const total = await db.categories.count();
    
    // Await the async isOnline check
    const online = await isOnline();
    
    return {
      totalCategories: total,
      unsyncedCategories: unsynced,
      pendingDeletes: deleted,
      isOnline: online,
      isSyncing: this.isSyncing
    };
  }

  // Manual trigger with force option
  async forceSync() {
    console.log('🔄 Force sync triggered...');
    this.isSyncing = false; // Reset sync lock
    return await this.syncCategories();
  }

  // Auto sync when coming online
  setupAutoSync() {
    console.log('🔄 Setting up auto-sync listeners...');
    
    // Remove existing listeners to prevent duplicates
    window.removeEventListener('online', this.handleOnline);
    
    // Bind the method to preserve 'this' context
    this.handleOnline = this.handleOnline.bind(this);
    
    window.addEventListener('online', this.handleOnline);
    
    // Also listen for focus events (when user returns to app)
    window.removeEventListener('focus', this.handleFocus);
    this.handleFocus = this.handleFocus.bind(this);
    window.addEventListener('focus', this.handleFocus);
  }

  handleOnline() {
    console.log('🌐 Network restored - starting sync...');
    setTimeout(() => {
      this.syncCategories();
    }, 1000); // Small delay to ensure connection is stable
  }

  async handleFocus() {
    console.log('👁️ App focused - checking for sync...');
    
    // Await the async isOnline check
    const online = await isOnline();
    if (online && !this.isSyncing) {
      setTimeout(() => {
        this.syncCategories();
      }, 500);
    }
  }

  // Cleanup method
  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleFocus);
  }
}

export const syncService = new SyncService();