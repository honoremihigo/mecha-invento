// components/dashboard/category/CategoryManagement.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Check, AlertTriangle, Folder } from 'lucide-react';
import UpsertCategoryModal from '../../components/dashboard/category/UpsertCategoryModal';
import DeleteCategoryModal from '../../components/dashboard/category/DeleteCategoryModal';
import categoryService from '../../services/categoryService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';

const CategoryManagement = ({ role }) => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  // Load categories from server on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories based on search term
  useEffect(() => {
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await categoryService. getAllCategories();
      const fetchedCategories = response.categories || response || [];
      setCategories(fetchedCategories);
      setFilteredCategories(fetchedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      showNotification('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      if (role === 'admin') categoryData.adminId = adminData.id;
      if (role === 'employee') categoryData.employeeId = employeeData.id;

      const response = await categoryService.createCategory(categoryData);
      const newCategory = response.category;

      setCategories(prev => [newCategory, ...prev]);
      showNotification('Category added successfully!');
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding category:', error);
      showNotification(`Failed to add category: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      if (role === 'admin') categoryData.adminId = adminData.id;
      if (role === 'employee') categoryData.employeeId = employeeData.id;

      const response = await categoryService.updateCategory(selectedCategory.id, categoryData);
      const updatedCategory = response.category;

      setCategories(prev =>
        prev.map(cat => (cat.id === selectedCategory.id ? updatedCategory : cat))
      );

      showNotification('Category updated successfully!');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification(`Failed to update category: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    setIsLoading(true);
    try {
      await categoryService.deleteCategory(selectedCategory.id);

      setCategories(prev => prev.filter(cat => cat.id !== selectedCategory.id));
      showNotification('Category deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification(`Failed to delete category: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
            </div>
          </div>
          <p className="text-gray-600">Manage your product categories</p>
        </div>

        {/* Search and Add */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Category
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first category.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {category.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(category)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(category)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Description:</span>{' '}
                    {category.description || 'No description'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <UpsertCategoryModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={isEditModalOpen ? handleEditCategory : handleAddCategory}
        category={selectedCategory}
        isLoading={isLoading}
        title={isEditModalOpen ? 'Edit Category' : 'Add New Category'}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        category={selectedCategory}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CategoryManagement;
