import React, { useState, useEffect } from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import { ref, push, set, onValue, update, remove } from 'firebase/database';
import { database } from '../../firebase/firebase';
import './AdministratorPage.css';

const AdministratorPage = () => {
  // Dropdown options
  const machineTypes = [
    'Asphalt Paver', 'Road Roller', 'Pothole Patching Machine', 
    'Jackhammer', 'Street Sweeper', 'Bucket Truck', 'Light Tower', 
    'Drill', 'Testing Equipment', 'Excavator', 'Backhoe', 
    'Drain Jet Truck', 'CCTV Inspection Crawler', 'Vactor Truck',
    'Pressure Washer', 'Sandblaster', 'Paint Sprayer'
  ];

  const materialNames = [
    'Asphalt', 'Concrete', 'Gravel', 'Tack Coat', 'Cold Patch',
    'LED Bulbs', 'Wiring', 'Poles', 'Conduit', 'Fuses', 'Photocells',
    'PVC Pipes', 'Catch Basins', 'Grates', 'Geotextile Fabric', 
    'Gravel', 'Concrete', 'Paint', 'Solvents', 'Anti-Graffiti Coating', 
    'Primer', 'Brushes/Rollers'
  ];

  const personnelRoles = [
    { value: 'RoadCrew', label: 'Road Crew' },
    { value: 'DrainageSpecialists', label: 'Drainage Specialists' },
    { value: 'TrafficControllers', label: 'Traffic Controllers' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'on_leave', label: 'On Leave' }
  ];

  // Table headers configuration
  const tableHeaders = {
    personal: {
      Header: ['ID', 'Name', 'Role', 'Status', 'Assigned To', 'Actions'],
      accessors: ['id', 'name', 'role', 'status', 'assignedTo', 'actions']
    },
    machines: {
      Header: ['ID', 'Machine Type', 'Status', 'Last Maintenance', 'Assigned To', 'Actions'],
      accessors: ['id', 'type', 'status', 'lastMaintenance', 'assignedTo', 'actions']
    },
    materials: {
      Header: ['Material', 'Quantity', 'Unit', 'Reorder Level', 'Last Delivery', 'Actions'],
      accessors: ['material', 'quantity', 'unit', 'reorderLevel', 'lastDelivery', 'actions']
    }
  };

  // State management
  const [selectedOption, setSelectedOption] = useState('personal');
  const [data, setData] = useState([]);
  const [formData, setFormData] = useState({
    personal: { name: '', role: '', status: '' },
    machines: { type: '', status: '', lastMaintenance: '', nextMaintenance: '' },
    materials: { name: '', unit: '', quantity: '', reorderLevel: '' }
  });
  const [editingItem, setEditingItem] = useState(null);

  // Format date to DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch data from Firebase
  useEffect(() => {
    if (selectedOption) {
      const dataRef = ref(database, `DataQuery/${selectedOption}`);
      onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        const dataArray = data 
          ? Object.entries(data).map(([key, value]) => ({
              ...value,
              firebaseKey: key // Store the Firebase key for updates/deletes
            })) 
          : [];
        setData(dataArray);
      });
    }
  }, [selectedOption]);
  

  // Handle form input changes
  const handleInputChange = (option, field, value) => {
    setFormData(prev => ({
      ...prev,
      [option]: {
        ...prev[option],
        [field]: value
      }
    }));
  };

  // Generate unique IDs
  const generateId = (prefix) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  // Handle form submission
  const handleSubmit = async (e, option) => {
    e.preventDefault();
    
    try {
      let newItem;
      const newId = generateId(
        option === 'personal' ? 'EMP' : 
        option === 'machines' ? 'MCH' : 'MAT'
      );

      if (option === 'personal') {
        newItem = {
          id: newId,
          name: formData.personal.name,
          role: formData.personal.role,
          status: formData.personal.status,
          assignedTo: 'Unassigned',
          dateAdded: new Date().toISOString()
        };
      } else if (option === 'machines') {
        newItem = {
          id: newId,
          type: formData.machines.type,
          status: formData.machines.status,
          lastMaintenance: formData.machines.lastMaintenance || new Date().toISOString(),
          nextMaintenance: formData.machines.nextMaintenance || '',
          assignedTo: 'Unassigned',
          dateAdded: new Date().toISOString()
        };
      } else {
        newItem = {
          id: newId,
          material: formData.materials.name,
          quantity: parseFloat(formData.materials.quantity) || 0,
          unit: formData.materials.unit,
          reorderLevel: parseFloat(formData.materials.reorderLevel) || 0,
          lastDelivery: new Date().toISOString(),
          dateAdded: new Date().toISOString()
        };
      }

      // Push to Firebase
      const newItemRef = push(ref(database, `DataQuery/${option}`));
      await set(newItemRef, newItem);

      // Reset form
      setFormData(prev => ({
        ...prev,
        [option]: Object.fromEntries(
          Object.keys(prev[option]).map(key => [key, ''])
        )
      }));

      alert(`${option === 'personal' ? 'Employee' : 
              option === 'machines' ? 'Machine' : 'Material'} added successfully!`);
    } catch (error) {
      console.error('Error adding data:', error);
      alert('Failed to add data');
    }
  };

  // Handle edit action
  const handleEdit = (item) => {
    setEditingItem(item);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const updates = {};
      if (selectedOption === 'personal') {
        updates['role'] = editingItem.role;
        updates['status'] = editingItem.status;
        updates['assignedTo'] = editingItem.assignedTo;
      } else if (selectedOption === 'machines') {
        updates['status'] = editingItem.status;
        updates['assignedTo'] = editingItem.assignedTo;
      }

      const itemRef = ref(database, `DataQuery/${selectedOption}/${editingItem.firebaseKey}`);
      await update(itemRef, updates);
      
      setEditingItem(null);
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  // Handle delete action
  const handleDelete = async (firebaseKey) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const itemRef = ref(database, `DataQuery/${selectedOption}/${firebaseKey}`);
        await remove(itemRef);
        alert('Item deleted successfully!');
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  return (
    <div>
      <Navbar id={1} />
      <div className="admin-dashboard">
        <div className="h1-top">
          <h2>Resource Management</h2>
          <button>Refresh Data</button>
        </div>
        
        {/* Options selector */}
        <div className="options">
          <p 
            className={`option ${selectedOption === 'personal' ? 'active' : ''}`}
            onClick={() => setSelectedOption('personal')}
          >
            Personal
          </p>
          <p 
            className={`option ${selectedOption === 'machines' ? 'active' : ''}`}
            onClick={() => setSelectedOption('machines')}
          >
            Machines
          </p>
          <p 
            className={`option ${selectedOption === 'materials' ? 'active' : ''}`}
            onClick={() => setSelectedOption('materials')}
          >
            Materials
          </p>
        </div>

        {/* Data table */}
        {selectedOption && (
          <div className="tables">
            <div className="hold">
              <div className="table-header">
              {tableHeaders[selectedOption].Header.map((header, index) => (
                <div key={index} className="header-cell">{header}</div>
              ))}
            </div>
            <div className="table-items">
              {data.map((item, index) => (
                <div key={index} className="table-row">
                  {tableHeaders[selectedOption].accessors.map((accessor, i) => (
                    <div key={i} className="table-cell">
                      {accessor === 'actions' ? (
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(item.firebaseKey)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : accessor === 'lastMaintenance' || accessor === 'nextMaintenance' || accessor === 'lastDelivery' ? (
                        formatDate(item[accessor])
                      ) : editingItem?.firebaseKey === item.firebaseKey && 
                        (accessor === 'role' || accessor === 'status' || accessor === 'assignedTo') ? (
                        <select
                          value={editingItem[accessor]}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            [accessor]: e.target.value
                          })}
                        >
                          {accessor === 'role' ? (
                            personnelRoles.map((role, idx) => (
                              <option key={idx} value={role.value}>{role.label}</option>
                            ))
                          ) : accessor === 'status' ? (
                            statusOptions.map((status, idx) => (
                              <option key={idx} value={status.value}>{status.label}</option>
                            ))
                          ) : (
                            <option value="Unassigned">Unassigned</option>
                          )}
                        </select>
                      ) : (
                        item[accessor] || '-'
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            </div>
            {editingItem && (
              <div className="edit-controls">
                <button 
                  className="save-btn"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Data Forms */}
        <div className="add-Data">
          {/* Personal Form */}
          {selectedOption === 'personal' && (
            <>
              <h2>Add Personal</h2>
              <form className="add-form" onSubmit={(e) => handleSubmit(e, 'personal')}>
                <div className="form-group">
                  <h3>Name</h3>
                  <input 
                    type="text" 
                    placeholder="Enter name"
                    value={formData.personal.name}
                    onChange={(e) => handleInputChange('personal', 'name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <h3>Role</h3>
                  <select
                    value={formData.personal.role}
                    onChange={(e) => handleInputChange('personal', 'role', e.target.value)}
                    required
                  >
                    <option value="">Select Role</option>
                    {personnelRoles.map((role, index) => (
                      <option key={index} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <h3>Status</h3>
                  <select
                    value={formData.personal.status}
                    onChange={(e) => handleInputChange('personal', 'status', e.target.value)}
                    required
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status, index) => (
                      <option key={index} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <button type="submit" className="submit-btn">Add Personal</button>
              </form>
            </>
          )}

          {/* Machines Form */}
          {selectedOption === 'machines' && (
            <>
              <h2>Add new Machine</h2>
              <form className="add-form" onSubmit={(e) => handleSubmit(e, 'machines')}>
                <div className="form-group">
                  <h3>Machine Type</h3>
                  <select
                    value={formData.machines.type}
                    onChange={(e) => handleInputChange('machines', 'type', e.target.value)}
                    required
                  >
                    <option value="">Select Machine Type</option>
                    {machineTypes.map((type, index) => (
                      <option key={index} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <h3>Status</h3>
                  <select
                    value={formData.machines.status}
                    onChange={(e) => handleInputChange('machines', 'status', e.target.value)}
                    required
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status, index) => (
                      <option key={index} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <h3>Last Maintenance Date</h3>
                  <input 
                    type="date" 
                    value={formData.machines.lastMaintenance}
                    onChange={(e) => handleInputChange('machines', 'lastMaintenance', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <h3>Next Maintenance Date</h3>
                  <input 
                    type="date" 
                    value={formData.machines.nextMaintenance}
                    onChange={(e) => handleInputChange('machines', 'nextMaintenance', e.target.value)}
                  />
                </div>
                
                <button type="submit" className="submit-btn">Add Machine</button>
              </form>
            </>
          )}

          {/* Materials Form */}
          {selectedOption === 'materials' && (
            <>
              <h2>Add new Materials</h2>
              <form className="add-form" onSubmit={(e) => handleSubmit(e, 'materials')}>
                <div className="form-group">
                  <h3>Material Name</h3>
                  <select
                    value={formData.materials.name}
                    onChange={(e) => handleInputChange('materials', 'name', e.target.value)}
                    required
                  >
                    <option value="">Select Material</option>
                    {materialNames.map((material, index) => (
                      <option key={index} value={material}>{material}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <h3>Unit</h3>
                  <input 
                    type="text" 
                    placeholder="tons, kg, liters, etc" 
                    value={formData.materials.unit}
                    onChange={(e) => handleInputChange('materials', 'unit', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <h3>Initial Quantity</h3>
                  <input 
                    type="number" 
                    placeholder="Enter quantity"
                    value={formData.materials.quantity}
                    onChange={(e) => handleInputChange('materials', 'quantity', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <h3>Reorder Level</h3>
                  <input 
                    type="number" 
                    placeholder="Enter reorder level"
                    value={formData.materials.reorderLevel}
                    onChange={(e) => handleInputChange('materials', 'reorderLevel', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <button type="submit" className="submit-btn">Add Material</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdministratorPage;