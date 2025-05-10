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

  // Status options for different resource types
  const statusOptions = {
    personal: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'on_leave', label: 'On Leave' }
    ],
    machines: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'maintenance', label: 'Maintenance' }
    ],
    materials: [
      { value: 'available', label: 'Available' },
      { value: 'ordered', label: 'Ordered' },
      { value: 'unavailable', label: 'Unavailable' }
    ]
  };

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
      Header: ['Material', 'Quantity', 'Unit', 'Status', 'Last Delivery', 'Actions'],
      accessors: ['material', 'quantity', 'unit', 'status', 'lastDelivery', 'actions']
    }
  };

  // State management
  const [selectedOption, setSelectedOption] = useState('personal');
  const [data, setData] = useState([]);
  const [formData, setFormData] = useState({
    personal: { name: '', role: '', status: '' },
    machines: { type: '', status: '', lastMaintenance: '', nextMaintenance: '' },
    materials: { name: '', unit: '', quantity: '', status: '' }
  });
  const [editingItem, setEditingItem] = useState(null);
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [unassignStatus, setUnassignStatus] = useState('');
  const [isUnassigning, setIsUnassigning] = useState(false);

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
              firebaseKey: key
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
          status: formData.materials.status,
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
      } else if (selectedOption === 'materials') {
        updates['status'] = editingItem.status;
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

  // Handle resource assignment
  const assignResources = async () => {
    setIsAssigning(true);
    setAssignmentStatus('Assigning resources...');
    
    try {
      const response = await fetch('http://localhost:8000/assign-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign resources');
      }
      
      const result = await response.json();
      setAssignmentStatus(`Resources assigned! ${result.processing} in progress, ${result.on_hold} on hold`);
      
      // Refresh data after assignment
      const dataRef = ref(database, `DataQuery/${selectedOption}`);
      onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        const dataArray = data 
          ? Object.entries(data).map(([key, value]) => ({
              ...value,
              firebaseKey: key
            })) 
          : [];
        setData(dataArray);
      });
      
    } catch (error) {
      console.error('Error assigning resources:', error);
      setAssignmentStatus(`Error: ${error.message}`);
    } finally {
      setIsAssigning(false);
      setTimeout(() => setAssignmentStatus(''), 5000);
    }
  };

  // Handle unassigning completed resources
  const unassignCompleted = async () => {
    setIsUnassigning(true);
    setUnassignStatus('Unassigning completed resources...');
    
    try {
      const response = await fetch('http://localhost:8000/unassign-completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to unassign resources');
      }
      
      const result = await response.json();
      setUnassignStatus(result.message || 'Completed resources unassigned successfully!');
      
      // Refresh data
      const dataRef = ref(database, `DataQuery/${selectedOption}`);
      onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        const dataArray = data 
          ? Object.entries(data).map(([key, value]) => ({
              ...value,
              firebaseKey: key
            })) 
          : [];
        setData(dataArray);
      });
      
    } catch (error) {
      console.error('Error unassigning resources:', error);
      setUnassignStatus(`Error: ${error.message}`);
    } finally {
      setIsUnassigning(false);
      setTimeout(() => setUnassignStatus(''), 5000);
    }
  };

  return (
    <div>
      <Navbar id={1} />
      <div className="admin-dashboard">
        <div className="h1-top">
          <h2>Resource Management</h2>
          <div className="button-group">
            <button onClick={() => window.location.reload()}>Refresh Data</button>
            <button 
              onClick={assignResources}
              disabled={isAssigning}
              className={isAssigning ? 'assigning' : ''}
            >
              {isAssigning ? 'Assigning...' : 'Assign Resources'}
            </button>
            <button 
              onClick={unassignCompleted}
              disabled={isUnassigning}
              className={`unassign-btn ${isUnassigning ? 'unassigning' : ''}`}
            >
              {isUnassigning ? 'Unassigning...' : 'Unassign Completed'}
            </button>
          </div>
          {assignmentStatus && (
            <div className={`assignment-status ${assignmentStatus.includes('Error') ? 'error' : 'success'}`}>
              {assignmentStatus}
            </div>
          )}
          {unassignStatus && (
            <div className={`unassign-status ${unassignStatus.includes('Error') ? 'error' : 'success'}`}>
              {unassignStatus}
            </div>
          )}
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
                              statusOptions[selectedOption].map((status, idx) => (
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
                    {statusOptions.personal.map((status, index) => (
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
                    {statusOptions.machines.map((status, index) => (
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
                  <h3>Status</h3>
                  <select
                    value={formData.materials.status}
                    onChange={(e) => handleInputChange('materials', 'status', e.target.value)}
                    required
                  >
                    <option value="">Select Status</option>
                    {statusOptions.materials.map((status, index) => (
                      <option key={index} value={status.value}>{status.label}</option>
                    ))}
                  </select>
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