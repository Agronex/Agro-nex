import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { CropRecord } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate, getDaysDifference } from '../utils/dateUtils';

const FarmLogbook: React.FC = () => {
  const [records, setRecords] = useLocalStorage<CropRecord[]>('farm-records', []);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CropRecord | null>(null);
  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    plantingDate: '',
    expectedHarvest: '',
    area: '',
    location: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRecord: CropRecord = {
      id: editingRecord?.id || Date.now().toString(),
      cropName: formData.cropName,
      variety: formData.variety,
      plantingDate: formData.plantingDate,
      expectedHarvest: formData.expectedHarvest,
      area: parseFloat(formData.area),
      location: formData.location,
      status: new Date() > new Date(formData.expectedHarvest) ? 'harvested' : 'growing',
      notes: formData.notes
    };

    if (editingRecord) {
      setRecords(records.map(record => 
        record.id === editingRecord.id ? newRecord : record
      ));
    } else {
      setRecords([newRecord, ...records]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      cropName: '',
      variety: '',
      plantingDate: '',
      expectedHarvest: '',
      area: '',
      location: '',
      notes: ''
    });
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleEdit = (record: CropRecord) => {
    setFormData({
      cropName: record.cropName,
      variety: record.variety,
      plantingDate: record.plantingDate,
      expectedHarvest: record.expectedHarvest,
      area: record.area.toString(),
      location: record.location,
      notes: record.notes
    });
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter(record => record.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planted': return 'bg-blue-100 text-blue-800';
      case 'growing': return 'bg-green-100 text-green-800';
      case 'harvested': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysToHarvest = (expectedHarvest: string) => {
    return getDaysDifference(new Date(), expectedHarvest);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">Farm Logbook</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Record</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">
            {editingRecord ? 'Edit Record' : 'Add New Record'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cropName}
                  onChange={(e) => setFormData({...formData, cropName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety
                </label>
                <input
                  type="text"
                  value={formData.variety}
                  onChange={(e) => setFormData({...formData, variety: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planting Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.plantingDate}
                  onChange={(e) => setFormData({...formData, plantingDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Harvest *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expectedHarvest}
                  onChange={(e) => setFormData({...formData, expectedHarvest: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (hectares) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Add any additional notes..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingRecord ? 'Update Record' : 'Add Record'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records List */}
      {records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-800">
                      {record.cropName}
                      {record.variety && <span className="text-gray-600"> ({record.variety})</span>}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Area:</span> {record.area} hectares
                    </div>
                    <div>
                      <span className="font-medium">Planted:</span> {formatDate(record.plantingDate)}
                    </div>
                    <div>
                      <span className="font-medium">Expected Harvest:</span> {formatDate(record.expectedHarvest)}
                    </div>
                    <div>
                      <span className="font-medium">Days to Harvest:</span> 
                      <span className={`ml-1 ${getDaysToHarvest(record.expectedHarvest) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {getDaysToHarvest(record.expectedHarvest) < 0 ? 'Overdue' : `${getDaysToHarvest(record.expectedHarvest)} days`}
                      </span>
                    </div>
                  </div>
                  {record.location && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Location:</span> {record.location}
                    </div>
                  )}
                  {record.notes && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {record.notes}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(record)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">No records yet</h4>
          <p className="text-gray-500">
            Start tracking your crops by adding your first record
          </p>
        </div>
      )}
    </div>
  );
};

export default FarmLogbook;