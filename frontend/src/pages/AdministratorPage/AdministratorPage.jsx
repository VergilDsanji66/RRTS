import React, { useState, useEffect } from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import { ref, push, set, onValue, update, remove, get } from 'firebase/database';
import { database } from '../../firebase/firebase';
import './AdministratorPage.css';

const AdministratorPage = () => {
  // Resource options
  const machineTypes = [
    'Asphalt Paver', 'Road Roller', 'Pothole Patching Machine', 
    'Jackhammer', 'Street Sweeper', 'Bucket Truck', 'Light Tower'
  ];

  const materialNames = [
    'Asphalt', 'Concrete', 'Gravel', 'Tack Coat', 'Cold Patch',
    'LED Bulbs', 'Wiring', 'Poles', 'Conduit'
  ];

  const personnelRoles = [
    { value: 'RoadCrew', label: 'Road Crew' },
    { value: 'DrainageSpecialists', label: 'Drainage Specialists' }, 
    { value: 'TrafficControllers', label: 'Traffic Controllers' }
  ];

  // Status options
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

  // tables headers configuration
  const tablesHeaders = {
    personal: {
      Header: ['ID', 'Name', 'Role', 'Status', 'Assigned To', 'Actions'],
      accessors: ['id', 'name', 'role', 'status', 'assignedTo', 'actions']
    },
    machines: {
      Header: ['ID', 'Machine Type', 'Status', 'Last Maintenance', 'Assigned To', 'Actions'],
      accessors: ['id', 'type', 'status', 'lastMaintenance', 'assignedTo', 'actions']
    },
    materials: {
      Header: ['ID', 'Material', 'Quantity', 'Unit', 'Status', 'Actions'],
      accessors: ['id', 'material', 'quantity', 'unit', 'status', 'actions']
    }
  };

  // State
  const [selectedOption, setSelectedOption] = useState('personal');
  const [data, setData] = useState([]);
  const [assignedResources, setAssignedResources] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [formData, setFormData] = useState({
    personal: { name: '', role: '', status: '' },
    machines: { type: '', status: '', lastMaintenance: '' },
    materials: { name: '', unit: '', quantity: '', status: '' }
  });
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState('');

  // Locality priority
  const localityPriority = {
    'commercial': 1,
    'industrial': 2,
    'mixed': 3,
    'residential': 4
  };

  // Format date to DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const dataRef = ref(database, `DataQuery/${selectedOption}`);
        const assignedRef = ref(database, 'Assigned');
        const assessmentsRef = ref(database, 'Assessments');

        const unsubscribeData = onValue(dataRef, (snapshot) => {
          const data = snapshot.val() || {};
          setData(Object.entries(data).map(([key, value]) => ({ ...value, firebaseKey: key })));
        });

        const unsubscribeAssigned = onValue(assignedRef, (snapshot) => {
          setAssignedResources(snapshot.val() || {});
        });

        const unsubscribeAssessments = onValue(assessmentsRef, (snapshot) => {
          const assessmentsData = snapshot.val() || {};
          const assessmentsArray = Object.entries(assessmentsData).map(([key, value]) => ({
            ...value,
            id: key
          }));
          setAssessments(assessmentsArray);
        });

        return () => {
          unsubscribeData();
          unsubscribeAssigned();
          unsubscribeAssessments();
        };
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedOption]);

  // Auto-unassign completed resources
  useEffect(() => {
    const unassignCompleted = async () => {
      try {
        const updates = {};
        let anyUnassigned = false;

        // Get fresh snapshots
        const [assignedSnapshot, assessmentsSnapshot, machinesSnapshot, personnelSnapshot] = await Promise.all([
          get(ref(database, 'Assigned')),
          get(ref(database, 'Assessments')),
          get(ref(database, 'DataQuery/machines')),
          get(ref(database, 'DataQuery/personal'))
        ]);

        const assignedData = assignedSnapshot.val() || {};
        const assessmentsData = assessmentsSnapshot.val() || {};
        const machinesData = machinesSnapshot.val() || {};
        const personnelData = personnelSnapshot.val() || {};

        // Unassign completed assessments
        for (const [assignmentName, assignment] of Object.entries(assignedData)) {
          const assessment = assessmentsData[assignment.assessmentId];
          
          if (assessment && assessment.status === 'completed') {
            updates[`Assigned/${assignmentName}`] = null;
            
            // Unassign personnel
            if (assignment.labour) {
              assignment.labour.forEach(id => {
                const personEntry = Object.entries(personnelData).find(([_, p]) => p.id === id);
                if (personEntry) {
                  const [firebaseKey] = personEntry;
                  updates[`DataQuery/personal/${firebaseKey}/assignedTo`] = "";
                }
              });
            }
            
            // Unassign equipment
            if (assignment.equipment) {
              assignment.equipment.forEach(id => {
                const machineEntry = Object.entries(machinesData).find(([_, m]) => m.id === id);
                if (machineEntry) {
                  const [firebaseKey] = machineEntry;
                  updates[`DataQuery/machines/${firebaseKey}/assignedTo`] = "";
                }
              });
            }
            
            anyUnassigned = true;
          }
        }

        // Clean up orphaned assignments
        Object.entries(machinesData).forEach(([firebaseKey, machine]) => {
          if (machine.assignedTo && !assignedData[machine.assignedTo]) {
            updates[`DataQuery/machines/${firebaseKey}/assignedTo`] = "";
            anyUnassigned = true;
          }
        });

        if (anyUnassigned) {
          await update(ref(database), updates);
          setAssignmentStatus('Completed resources unassigned automatically');
          setTimeout(() => setAssignmentStatus(''), 3000);
        }
      } catch (error) {
        console.error('Error auto-unassigning resources:', error);
      }
    };

    unassignCompleted();
  }, [assignedResources, assessments]);

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

  // Generate ID
  const generateId = (prefix) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Add new resource
  const handleSubmit = async (e, option) => {
    e.preventDefault();
    try {
      const newId = generateId(
        option === 'personal' ? 'EMP' : 
        option === 'machines' ? 'MCH' : 'MAT'
      );

      const newItem = {
        id: newId,
        ...formData[option],
        assignedTo: "",
        dateAdded: new Date().toISOString()
      };

      if (option === 'materials') {
        newItem.material = formData.materials.name;
        delete newItem.name;
      }

      const newItemRef = push(ref(database, `DataQuery/${option}`));
      await set(newItemRef, newItem);

      setFormData(prev => ({
        ...prev,
        [option]: Object.fromEntries(Object.keys(prev[option]).map(key => [key, '']))
      }));

      alert(`${option.charAt(0).toUpperCase() + option.slice(1)} added successfully!`);
    } catch (error) {
      console.error('Error adding data:', error);
      alert('Failed to add data');
    }
  };

  // Edit resource
  const handleEdit = (item) => {
    setEditingItem(item);
  };

  // Save edited resource
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const updates = {};
      if (selectedOption === 'personal') {
        updates['name'] = editingItem.name;
        updates['role'] = editingItem.role;
        updates['status'] = editingItem.status;
        updates['assignedTo'] = editingItem.assignedTo;
      } else if (selectedOption === 'machines') {
        updates['type'] = editingItem.type;
        updates['status'] = editingItem.status;
        updates['lastMaintenance'] = editingItem.lastMaintenance;
        updates['assignedTo'] = editingItem.assignedTo;
      } else if (selectedOption === 'materials') {
        updates['material'] = editingItem.material;
        updates['quantity'] = editingItem.quantity;
        updates['unit'] = editingItem.unit;
        updates['status'] = editingItem.status;
      }

      await update(ref(database, `DataQuery/${selectedOption}/${editingItem.firebaseKey}`), updates);
      setEditingItem(null);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  // Delete resource
  const handleDelete = async (firebaseKey) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        await remove(ref(database, `DataQuery/${selectedOption}/${firebaseKey}`));
        alert('Resource deleted successfully');
      } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Failed to delete resource');
      }
    }
  };

  // Auto-assign resources based on priority
  const autoAssignResources = async () => {
  setIsLoading(true);
  setAssignmentStatus('Assigning resources...');
  
  try {
    // Get all assessments that need resources
    const pendingAssessments = assessments.filter(
      a => (a.status === 'assessed' || a.status === 'on_hold') && 
            a.resources && 
            (a.resources.labour || a.resources.equipment || a.resources.materials)
    );

    if (pendingAssessments.length === 0) {
      setAssignmentStatus('No assessments need resources or assessments are missing resource requirements');
      return;
    }

    // Get fresh snapshots of all data
    const [machinesSnapshot, personnelSnapshot, materialsSnapshot] = await Promise.all([
      get(ref(database, 'DataQuery/machines')),
      get(ref(database, 'DataQuery/personal')),
      get(ref(database, 'DataQuery/materials'))
    ]);

    let machinesData = machinesSnapshot.val() || {};
    let personnelData = personnelSnapshot.val() || {};
    const materialsData = materialsSnapshot.val() || {};

    // Convert to array and mark which resources are available
    let availableMachines = Object.entries(machinesData)
      .filter(([_, m]) => m.status === 'active' && !m.assignedTo)
      .map(([key, m]) => ({ ...m, firebaseKey: key, assigned: false }));

    let availablePersonnel = Object.entries(personnelData)
      .filter(([_, p]) => p.status === 'active' && !p.assignedTo)
      .map(([key, p]) => ({ ...p, firebaseKey: key, assigned: false }));

    const updates = {};
    let anyAssigned = false;

    // Sort assessments by priority
    const prioritizedAssessments = [...pendingAssessments].sort(
      (a, b) => (localityPriority[a.localityType?.toLowerCase()] || 4) - 
                (localityPriority[b.localityType?.toLowerCase()] || 4)
    );

    for (const assessment of prioritizedAssessments) {
      const { id, resources, roadName } = assessment;
      const assignmentName = roadName || `job-${id}`;

      const assignmentResources = {
        equipment: [],
        labour: [],
        materials: []
      };

      let hasAllResources = true;

      // Check and assign equipment
      if (resources?.equipment) {
        for (const [type, needed] of Object.entries(resources.equipment)) {
          const available = availableMachines
            .filter(m => m.type === type && !m.assigned)
            .slice(0, needed);

          if (available.length < needed) {
            hasAllResources = false;
            break;
          }

          assignmentResources.equipment.push(...available.map(m => m.id));
          
          // Mark machines as assigned
          available.forEach(m => {
            m.assigned = true;
            updates[`DataQuery/machines/${m.firebaseKey}/assignedTo`] = assignmentName;
          });
        }
      }

      // Check and assign personnel
      if (hasAllResources && resources?.labour) {
        for (const [role, needed] of Object.entries(resources.labour)) {
          const available = availablePersonnel
            .filter(p => p.role === role && !p.assigned)
            .slice(0, needed);

          if (available.length < needed) {
            hasAllResources = false;
            break;
          }

          assignmentResources.labour.push(...available.map(p => p.id));
          
          // Mark personnel as assigned
          available.forEach(p => {
            p.assigned = true;
            updates[`DataQuery/personal/${p.firebaseKey}/assignedTo`] = assignmentName;
          });
        }
      }

      // Check and assign materials
      if (hasAllResources && resources?.materials) {
        for (const [material, needed] of Object.entries(resources.materials)) {
          const materialEntry = Object.entries(materialsData).find(
            ([_, m]) => m.material === material && 
                        m.status === 'available' && 
                        m.quantity >= needed
          );

          if (!materialEntry) {
            hasAllResources = false;
            break;
          }

          const [firebaseKey, mat] = materialEntry;
          assignmentResources.materials.push({
            material,
            quantity: needed,
            firebaseKey
          });

          // Update material quantity
          updates[`DataQuery/materials/${firebaseKey}/quantity`] = mat.quantity - needed;
          if (mat.quantity - needed <= 0) {
            updates[`DataQuery/materials/${firebaseKey}/status`] = 'unavailable';
          }
        }
      }

      if (hasAllResources) {
        // Create assignment
        updates[`Assigned/${assignmentName}`] = {
          ...assignmentResources,
          assessmentId: id,
          status: 'active',
          timestamp: new Date().toISOString(),
          localityType: assessment.localityType
        };

        // Update assessment status
        updates[`Assessments/${id}/status`] = 'in_progress';
        anyAssigned = true;
      } else {
        // Not enough resources, mark as on hold
        updates[`Assessments/${id}/status`] = 'on_hold';
      }
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    if (anyAssigned) {
      setAssignmentStatus('Resources assigned based on priority!');
    } else {
      setAssignmentStatus('No assessments could be assigned - insufficient resources');
    }
  } catch (error) {
    console.error('Assignment error:', error);
    setAssignmentStatus(`Error: ${error.message}`);
  } finally {
    setIsLoading(false);
    setTimeout(() => setAssignmentStatus(''), 5000);
  }
};

  // Check resource availability with fresh data
  const checkResourceAvailability = async (assessment, machinesData, personnelData, materialsData) => {
    const { resources, localityType } = assessment;
    const availableResources = {
      equipment: [],
      labour: [],
      materials: []
    };

    // Check equipment
    if (resources?.equipment) {
      for (const [type, needed] of Object.entries(resources.equipment)) {
        const available = Object.values(machinesData).filter(
          machine => machine.type === type && 
                    machine.status === 'active' && 
                    !machine.assignedTo
        ).slice(0, needed);
        
        availableResources.equipment.push(...available.map(m => m.id));
      }
    }

    // Check labour
    if (resources?.labour) {
      for (const [role, needed] of Object.entries(resources.labour)) {
        const available = Object.values(personnelData).filter(
          person => person.role === role && 
                    person.status === 'active' && 
                    !person.assignedTo
        ).slice(0, needed);
        
        availableResources.labour.push(...available.map(p => p.id));
      }
    }

    // Check materials
    if (resources?.materials) {
      for (const [material, needed] of Object.entries(resources.materials)) {
        const available = Object.values(materialsData).find(
          m => m.material === material && 
                m.status === 'available' && 
                m.quantity >= needed
        );
        
        if (available) {
          availableResources.materials.push({
            material,
            quantity: needed,
            firebaseKey: Object.keys(materialsData).find(key => materialsData[key].material === material)
          });
        }
      }
    }

    return {
      ...assessment,
      availableResources,
      localityPriority: localityPriority[localityType?.toLowerCase()] || 4
    };
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const statusMap = {
      'completed': { color: 'green', text: 'Completed' },
      'in_progress': { color: 'blue', text: 'In Progress' },
      'on_hold': { color: 'yellow', text: 'On Hold' },
      'assessed': { color: 'gray', text: 'Assessed' }
    };

    const statusInfo = statusMap[status] || { color: 'gray', text: status };

    return (
      <span className={`status-badge ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  // Render locality badge
  const renderLocalityBadge = (localityType) => {
    const localityMap = {
      'commercial': { color: 'purple', text: 'Commercial' },
      'industrial': { color: 'orange', text: 'Industrial' },
      'mixed': { color: 'teal', text: 'Mixed' },
      'residential': { color: 'blue', text: 'Residential' }
    };

    const localityInfo = localityMap[localityType?.toLowerCase()] || { color: 'gray', text: localityType || 'Unknown' };

    return (
      <span className={`locality-badge ${localityInfo.color}`}>
        {localityInfo.text}
      </span>
    );
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
              onClick={autoAssignResources}
              disabled={isLoading}
              className={isLoading ? 'assigning' : ''}
            >
              {isLoading ? 'Assigning...' : 'Auto Assign Resources'}
            </button>
          </div>
          {assignmentStatus && (
            <div className={`assignment-status ${assignmentStatus.includes('Error') ? 'error' : 'success'}`}>
              {assignmentStatus}
            </div>
          )}
        </div>
        
        {/* Options selector */}
        <div className="options">
          <p 
            className={`option ${selectedOption === 'personal' ? 'active' : ''}`}
            onClick={() => setSelectedOption('personal')}
          >
            Personnel
          </p>
          <p 
            className={`option ${selectedOption === 'machines' ? 'active' : ''}`}
            onClick={() => setSelectedOption('machines')}
          >
            Equipment
          </p>
          <p 
            className={`option ${selectedOption === 'materials' ? 'active' : ''}`}
            onClick={() => setSelectedOption('materials')}
          >
            Materials
          </p>
        </div>

        {/* Current Assignments */}
        <div className="current-assignments">
          <h2>Current Assignments</h2>
          {Object.keys(assignedResources).length === 0 ? (
            <p className="no-assignments">No active assignments</p>
          ) : (
            <div className="assignment-grid">
              {Object.entries(assignedResources).map(([roadName, assignment]) => {
                const assessment = assessments.find(a => a.id === assignment.assessmentId);
                return (
                  <div key={roadName} className="assignment-card">
                    <div className="assignment-header">
                      <h3>{roadName}</h3>
                      {assignment.status && renderStatusBadge(assignment.status)}
                    </div>
                    {assessment && (
                      <div className="assignment-priority">
                        <span>Priority: </span>
                        {renderLocalityBadge(assessment.localityType)}
                      </div>
                    )}
                    <div className="assignment-resources">
                      <h4>Assigned Resources:</h4>
                      {assignment.labour?.length > 0 && (
                        <div className="resource-group">
                          <strong>Personnel:</strong>
                          <ul>
                            {assignment.labour.map(id => (
                              <li key={id}>{id}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {assignment.equipment?.length > 0 && (
                        <div className="resource-group">
                          <strong>Equipment:</strong>
                          <ul>
                            {assignment.equipment.map(id => (
                              <li key={id}>{id}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {assignment.materials?.length > 0 && (
                        <div className="resource-group">
                          <strong>Materials:</strong>
                          <ul>
                            {assignment.materials.map((m, i) => (
                              <li key={i}>{m.material} ({m.quantity})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data tables */}
        {selectedOption && (
          <div className="tabless">
            <div className="hold">
              <div className="tables-header">
                {tablesHeaders[selectedOption].Header.map((header, index) => (
                  <div key={index} className="header-cell">{header}</div>
                ))}
              </div>
              <div className="tables-items">
                {data.map((item, index) => (
                  <div key={index} className="tables-rows">
                    {tablesHeaders[selectedOption].accessors.map((accessor, i) => (
                      <div key={i} className="tables-cell">
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
                        ) : accessor === 'lastMaintenance' ? (
                          formatDate(item[accessor])
                        ) : editingItem?.firebaseKey === item.firebaseKey ? (
                          accessor === 'status' ? (
                            <select
                              className="edit-dropdown"
                              value={editingItem.status}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                status: e.target.value
                              })}
                            >
                              {statusOptions[selectedOption].map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          ) : accessor === 'role' ? (
                            <select
                              className="edit-dropdown"
                              value={editingItem.role}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                role: e.target.value
                              })}
                            >
                              {personnelRoles.map(role => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={accessor === 'quantity' ? 'number' : 'text'}
                              value={editingItem[accessor] || ''}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                [accessor]: e.target.value
                              })}
                              className="edit-input"
                            />
                          )
                        ) : (
                          accessor === 'assignedTo' ? (item[accessor] || 'Unassigned') :
                          accessor === 'material' ? (item.material || item.name || '-') :
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