import { db } from '../../db/database';
import productService from '../productService';
import { isOnline } from '../../utils/networkUtils';

class ProductSyncService {
  constructor() {
    this.isSyncing = false; // Prevent concurrent syncs
  }

  async syncProducts() {
    console.log('🔄 Starting product sync process...');
    
    if (this.isSyncing) {
      console.log('⚠️ Product sync already in progress, skipping...');
      return;
    }

    // Await the async isOnline check
    const online = await isOnline();
    if (!online) {
      console.log('📴 Offline - skipping product sync');
      return;
    }

    this.isSyncing = true;
    
    try {
      console.log('📊 Starting product sync phases...');
      
      // 1. Sync new/updated products and their images
      console.log('🔸 Phase 1: Syncing unsynced products and images...');
      await this.syncUnsyncedProducts();
      
      // 2. Sync deleted products
      console.log('🔸 Phase 2: Syncing deleted products...');
      await this.syncDeletedProducts();
      
      // 3. Fetch latest from server and update local
      console.log('🔸 Phase 3: Fetching product updates from server...');
      await this.fetchAndUpdateLocal();
      
      console.log('✅ Product sync completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Product sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncUnsyncedProducts() {
    console.log('🔍 Looking for unsynced products...');
    
    let unsyncedProducts = [];
    try {
      unsyncedProducts = await db.products
        .where('synced')
        .equals(false)
        .toArray();
    } catch (e) {
      console.warn("⚠️ Failed .where().equals(false), falling back to filter:", e);
      unsyncedProducts = await db.products
        .filter(prod => prod.synced === false || prod.synced === undefined)
        .toArray();
    }

    console.log(`📝 Found ${unsyncedProducts.length} unsynced products`);

    if (unsyncedProducts.length === 0) {
      console.log('✅ No unsynced products found');
      return;
    }

    for (const product of unsyncedProducts) {
      try {
        console.log(`🔄 Syncing product: ${product.productName} (localId: ${product.localId})`);
        
        // Fetch associated unsynced images
        const images = await db.images
          .where('entityLocalId')
          .equals(product.localId)
          .and(img => img.entityType === 'product' && img.synced === false)
          .toArray();

        console.log(`📸 Found ${images.length} unsynced images for product ${product.productName}`);

        // Prepare product data
        const productData = {
          productName: product.productName,
          brand: product.brand,
          categoryId: product.categoryId,
          description: product.description,
          adminId: product.adminId,
          employeeId: product.employeeId,
          images: images.map(img => {
            // Convert Blob to File for upload
            if (img.from === 'local' && img.imageData instanceof Blob) {
              return new File([img.imageData], `image_${img.localId}.${img.imageData.type.split('/')[1] || 'png'}`, { type: img.imageData.type });
            }
            return null;
          }).filter(Boolean),
          keepImages: (await db.images.where('entityLocalId').equals(product.localId).and(img => img.entityType === 'product' && img.synced === true).toArray()).map(img => img.imageData)
        };

        let response;
        
        // Check if this is an update (has server ID) or create (no server ID)
        if (product.id && product.id !== product.localId) {
          console.log(`📝 Updating existing product with ID: ${product.id}`);
          // Update existing product
          response = await productService.updateProduct(product.id, {
            ...productData,
            newImages: productData.images
          });
        } else {
          console.log(`➕ Creating new product: ${product.productName}`);
          // Create new product
          response = await productService.createProduct(productData);
        }

        console.log('📡 Server response:', response);

        // Update local product record
        const updateProductData = {
          id: response.product?.id || response.id, // Handle different response formats
          synced: true,
          lastModified: new Date(),
          updatedAt: response.product?.updatedAt || response.updatedAt || new Date()
        };

        console.log('💾 Updating local product record with:', updateProductData);
        await db.products.update(product.localId, updateProductData);

        // Update images
        const serverImageUrls = response.product?.imageUrls || response.imageUrls || [];
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const serverUrl = serverImageUrls[i] || null;
          if (serverUrl) {
            await db.images.update(image.localId, {
              entityId: updateProductData.id,
              imageData: productService.getFullImageUrl(serverUrl),
              synced: true,
              from: 'server',
              updatedAt: new Date()
            });
            console.log(`✅ Synced image for product ${product.productName}`);
          }
        }

        console.log(`✅ Successfully synced product: ${product.productName}`);
      } catch (error) {
        console.error(`❌ Failed to sync product ${product.productName}:`, error);
        // Mark as failed with retry count
        try {
          await db.products.update(product.localId, {
            syncError: error.message,
            syncRetryCount: (product.syncRetryCount || 0) + 1,
            lastSyncAttempt: new Date()
          });
        } catch (updateError) {
          console.error('Failed to update product sync error info:', updateError);
        }
      }
    }
  }

  async syncDeletedProducts() {
    console.log('🔍 Looking for deleted products to sync...');
    
    const deletedProducts = await db.deletedProducts.toArray();
    console.log(`🗑️ Found ${deletedProducts.length} deleted products to sync`);

    if (deletedProducts.length === 0) {
      console.log('✅ No deleted products to sync');
      return;
    }

    for (const deletedProduct of deletedProducts) {
      try {
        console.log(`🗑️ Syncing deletion of product ID: ${deletedProduct.id}`);
        
        await productService.deleteProduct(deletedProduct.id, {
          adminId: deletedProduct.adminId,
          employeeId: deletedProduct.employeeId
        });

        // Remove associated images
        await db.images.where('entityId').equals(deletedProduct.id).and(img => img.entityType === 'product').delete();
        
        // Remove from deleted queue
        await db.deletedProducts.delete(deletedProduct.id);
        
        console.log(`✅ Successfully synced deletion of product ID: ${deletedProduct.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync product deletion for ID ${deletedProduct.id}:`, error);
        // Keep in queue for retry but mark the attempt
        try {
          await db.deletedProducts.update(deletedProduct.id, {
            syncError: error.message,
            syncRetryCount: (deletedProduct.syncRetryCount || 0) + 1,
            lastSyncAttempt: new Date()
          });
        } catch (updateError) {
          console.error('Failed to update deleted product sync error:', updateError);
        }
      }
    }
  }

  async fetchAndUpdateLocal() {
    console.log('🔍 Fetching latest product data from server...');
    
    try {
      const serverProducts = await productService.getAllProducts();
      console.log(`📡 Received ${serverProducts.length} products from server`);
      
      if (!Array.isArray(serverProducts)) {
        console.error('❌ Server response is not an array:', serverProducts);
        return;
      }

      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const serverProduct of serverProducts) {
        try {
          console.log(`🔍 Processing server product: ${serverProduct.productName} (ID: ${serverProduct.id})`);
          
          const localProduct = await db.products
            .where('id')
            .equals(serverProduct.id)
            .first();

          if (!localProduct) {
            console.log(`➕ Adding new product from server: ${serverProduct.productName}`);
            // New product from server - generate a local ID
            const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await db.products.add({
              ...serverProduct,
              localId: localId,
              synced: true,
              lastModified: new Date(),
              syncedAt: new Date()
            });

            // Add server images
            if (serverProduct.imageUrls && serverProduct.imageUrls.length > 0) {
              for (const url of serverProduct.imageUrls) {
                await db.images.add({
                  entityLocalId: localId,
                  entityId: serverProduct.id,
                  entityType: 'product',
                  imageData: productService.getFullImageUrl(url),
                  synced: true,
                  from: 'server',
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
            newCount++;
          } else {
            // Check if server version is newer
            const serverDate = new Date(serverProduct.updatedAt);
            const localDate = new Date(localProduct.updatedAt);
            
            console.log(`📅 Comparing dates - Server: ${serverDate}, Local: ${localDate}`);
            
            if (serverDate > localDate) {
              console.log(`🔄 Server version newer, updating local: ${serverProduct.productName}`);
              
              await db.products.update(localProduct.localId, {
                ...serverProduct,
                localId: localProduct.localId, // Preserve local ID
                synced: true,
                lastModified: new Date(),
                syncedAt: new Date()
              });

              // Update images
              await db.images.where('entityLocalId').equals(localProduct.localId).and(img => img.entityType === 'product').delete();
              if (serverProduct.imageUrls && serverProduct.imageUrls.length > 0) {
                for (const url of serverProduct.imageUrls) {
                  await db.images.add({
                    entityLocalId: localProduct.localId,
                    entityId: serverProduct.id,
                    entityType: 'product',
                    imageData: productService.getFullImageUrl(url),
                    synced: true,
                    from: 'server',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });
                }
              }
              updatedCount++;
            } else {
              console.log(`✅ Local version up to date: ${serverProduct.productName}`);
              // Update sync status if needed
              if (!localProduct.synced) {
                await db.products.update(localProduct.localId, {
                  synced: true,
                  syncedAt: new Date()
                });
              }
              skippedCount++;
            }
          }
        } catch (productError) {
          console.error(`❌ Error processing product ${serverProduct.id}:`, productError);
        }
      }

      console.log(`📊 Fetch summary: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
      
      // Check for products deleted on server
      await this.checkForServerDeletes(serverProducts);
      
    } catch (error) {
      console.error('❌ Failed to fetch and update products from server:', error);
      throw error; // Re-throw to handle in main sync method
    }
  }

  async checkForServerDeletes(serverProducts) {
    console.log('🔍 Checking for products deleted on server...');
    
    try {
      const serverIds = new Set(serverProducts.map(prod => prod.id));

      let localSyncedProducts = [];
      try {
        localSyncedProducts = await db.products
          .where('synced')
          .equals(true)
          .and(prod => prod.id && prod.id !== prod.localId) // Has server ID
          .toArray();
      } catch (e) {
        console.warn("⚠️ Failed .where().equals(true), falling back to filter:", e);
        localSyncedProducts = await db.products
          .filter(prod => prod.synced === true && prod.id && prod.id !== prod.localId)
          .toArray();
      }

      let deletedCount = 0;

      for (const localProduct of localSyncedProducts) {
        if (!serverIds.has(localProduct.id)) {
          console.log(`🗑️ Product deleted on server: ${localProduct.productName} (ID: ${localProduct.id})`);
          
          // Remove from local database and associated images
          await db.products.delete(localProduct.localId);
          await db.images.where('entityLocalId').equals(localProduct.localId).and(img => img.entityType === 'product').delete();
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Removed ${deletedCount} products deleted on server`);
      } else {
        console.log('✅ No server product deletions found');
      }
    } catch (error) {
      console.error('❌ Error checking for server product deletes:', error);
    }
  }

  async getSyncStatus() {
    let unsyncedProducts = 0;
    let unsyncedImages = 0;
    try {
      unsyncedProducts = await db.products.where('synced').equals(false).count();
      unsyncedImages = await db.images.where('synced').equals(false).and(img => img.entityType === 'product').count();
    } catch (e) {
      console.warn("⚠️ Failed .where().equals(false) in getSyncStatus, falling back to filter");
      unsyncedProducts = await db.products.filter(prod => !prod.synced).count();
      unsyncedImages = await db.images.filter(img => !img.synced && img.entityType === 'product').count();
    }

    const deleted = await db.deletedProducts.count();
    const totalProducts = await db.products.count();
    const totalImages = await db.images.where('entityType').equals('product').count();
    
    // Await the async isOnline check
    const online = await isOnline();
    
    return {
      totalProducts,
      unsyncedProducts,
      pendingDeletes: deleted,
      totalImages,
      unsyncedImages,
      isOnline: online,
      isSyncing: this.isSyncing
    };
  }

  async forceSync() {
    console.log('🔄 Force product sync triggered...');
    this.isSyncing = false; // Reset sync lock
    return await this.syncProducts();
  }

  setupAutoSync() {
    console.log('🔄 Setting up product auto-sync listeners...');
    
    window.removeEventListener('online', this.handleOnline);
    
    this.handleOnline = this.handleOnline.bind(this);
    window.addEventListener('online', this.handleOnline);
    
    window.removeEventListener('focus', this.handleFocus);
    this.handleFocus = this.handleFocus.bind(this);
    window.addEventListener('focus', this.handleFocus);
  }

  handleOnline() {
    console.log('🌐 Network restored - starting product sync...');
    setTimeout(() => {
      this.syncProducts();
    }, 1000); // Small delay to ensure connection is stable
  }

  async handleFocus() {
    console.log('👁️ App focused - checking for product sync...');
    
    // Await the async isOnline check
    const online = await isOnline();
    if (online && !this.isSyncing) {
      setTimeout(() => {
        this.syncProducts();
      }, 500);
    }
  }

  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleFocus);
  }
}

export const productSyncService = new ProductSyncService();