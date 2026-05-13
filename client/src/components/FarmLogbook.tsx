import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { CropRecord } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatDate, getDaysDifference } from '../utils/dateUtils';
import { addActivity } from '../utils/activityStore';
import Button from './Button';
import Input from './Input';
import Card from './Card';

const FarmLogbook: React.FC = () => {
  const [records, setRecords] = useLocalStorage<CropRecord[]>('farm-records', []);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CropRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    plantingDate: '',
    expectedHarvest: '',
    area: '',
    location: '',
    notes: ''
  });

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

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
      showSuccess('Record updated successfully');
      addActivity({ type: 'logbook_edit', title: 'Crop record updated', detail: `${newRecord.cropName} (${newRecord.area} ha)`, color: 'blue' });
    } else {
      setRecords([newRecord, ...records]);
      showSuccess('Record added successfully');
      addActivity({ type: 'logbook_add', title: 'New crop record added', detail: `${newRecord.cropName} — ${newRecord.area} ha at ${newRecord.location || 'unknown location'}`, color: 'green' });
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
    setDeleteConfirm(id);
  };

  const confirmDelete = (id: string) => {
    const rec = records.find(r => r.id === id);
    setRecords(records.filter(record => record.id !== id));
    setDeleteConfirm(null);
    showSuccess('Record deleted successfully');
    if (rec) addActivity({ type: 'logbook_delete', title: 'Crop record removed', detail: rec.cropName, color: 'red' });
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
    <Card>
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-green-800 font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">Farm Logbook</h3>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
          size="md"
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Record</span>
        </Button>
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
              <Button
                type="submit"
                variant="primary"
                size="md"
              >
                {editingRecord ? 'Update Record' : 'Add Record'}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
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
                <div className="flex gap-3 ml-4">
                  <button
                    onClick={() => handleEdit(record)}
                    className="px-3 py-2 min-h-12 min-w-12 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="px-3 py-2 min-h-12 min-w-12 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {deleteConfirm === record.id && (
                  <div className="absolute top-0 right-0 bg-white border border-red-200 rounded-lg shadow-lg p-3 z-10 mt-8">
                    <p className="text-sm text-gray-800 mb-2 font-medium">Delete this record?</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => confirmDelete(record.id)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                      <Button
                        onClick={() => setDeleteConfirm(null)}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-600 mb-2">No records yet. Start logging!</h4>
          <p className="text-gray-500">
            Start tracking your crops by adding your first record
          </p>
        </div>
      )}
    </Card>
  );
};

export default FarmLogbook;
