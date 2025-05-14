import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../componets/Navbar/Navbar';
import { ref, push, set, onValue, update, remove, get } from 'firebase/database';
import { database } from '../../firebase/firebase';
import './AdministratorPage.css';

const AdministratorPage = () => {

  const navigate = useNavigate();

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

  // Table headers configuration
  const tableConfig = {
    personal: {
      headers: ['ID', 'Name', 'Role', 'Status', 'Assigned To', 'Actions'],
      accessors: ['id', 'name', 'role', 'status', 'assignedTo', 'actions']
    },
    machines: {
      headers: ['ID', 'Machine Type', 'Status', 'Last Maintenance', 'Assigned To', 'Actions'],
      accessors: ['id', 'type', 'status', 'lastMaintenance', 'assignedTo', 'actions']
    },
    materials: {
      headers: ['ID', 'Material', 'Quantity', 'Unit', 'Status', 'Actions'],
      accessors: ['id', 'material', 'quantity', 'unit', 'status', 'actions']
    }
  };

  // State
  const [selectedTab, setSelectedTab] = useState('personal');
  const [tableData, setTableData] = useState([]);
  const [assignedResources, setAssignedResources] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [formInputs, setFormInputs] = useState({
    personal: { name: '', role: '', status: '' },
    machines: { type: '', status: '', lastMaintenance: '' },
    materials: { name: '', unit: '', quantity: '', status: '' }
  });
  const [editingRow, setEditingRow] = useState(null);
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
        const dataRef = ref(database, `DataQuery/${selectedTab}`);
        const assignedRef = ref(database, 'Assigned');
        const assessmentsRef = ref(database, 'Assessments');

        const unsubscribeData = onValue(dataRef, (snapshot) => {
          const data = snapshot.val() || {};
          setTableData(Object.entries(data).map(([key, value]) => ({ ...value, firebaseKey: key })))
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
  }, [selectedTab]);

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
  const handleInputChange = (tab, field, value) => {
    setFormInputs(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value
      }
    }));
  };

  // Generate ID
  const generateId = (prefix) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Add new resource
  const handleSubmit = async (e, tab) => {
    e.preventDefault();
    try {
      const newId = generateId(
        tab === 'personal' ? 'EMP' : 
        tab === 'machines' ? 'MCH' : 'MAT'
      );

      const newItem = {
        id: newId,
        ...formInputs[tab],
        assignedTo: "",
        dateAdded: new Date().toISOString()
      };

      if (tab === 'materials') {
        newItem.material = formInputs.materials.name;
        delete newItem.name;
      }

      const newItemRef = push(ref(database, `DataQuery/${tab}`));
      await set(newItemRef, newItem);

      setFormInputs(prev => ({
        ...prev,
        [tab]: Object.fromEntries(Object.keys(prev[tab]).map(key => [key, '']))
      }));

      alert(`${tab.charAt(0).toUpperCase() + tab.slice(1)} added successfully!`);
    } catch (error) {
      console.error('Error adding data:', error);
      alert('Failed to add data');
    }
  };

  // Edit resource
  const handleEdit = (item) => {
    setEditingRow(item);
  };

  // Save edited resource
  const handleSaveEdit = async () => {
    if (!editingRow) return;

    try {
      const updates = {};
      if (selectedTab === 'personal') {
        updates['name'] = editingRow.name;
        updates['role'] = editingRow.role;
        updates['status'] = editingRow.status;
        updates['assignedTo'] = editingRow.assignedTo;
      } else if (selectedTab === 'machines') {
        updates['type'] = editingRow.type;
        updates['status'] = editingRow.status;
        updates['lastMaintenance'] = editingRow.lastMaintenance;
        updates['assignedTo'] = editingRow.assignedTo;
      } else if (selectedTab === 'materials') {
        updates['material'] = editingRow.material;
        updates['quantity'] = editingRow.quantity;
        updates['unit'] = editingRow.unit;
        updates['status'] = editingRow.status;
      }

      await update(ref(database, `DataQuery/${selectedTab}/${editingRow.firebaseKey}`), updates);
      setEditingRow(null);
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
        await remove(ref(database, `DataQuery/${selectedTab}/${firebaseKey}`));
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
    <div className="admin-page">
      <Navbar id={1} />
      <div className="admin-dashboard">
        
        <div className="admin-header">
          <div className="left">
            <h2>Resource Management</h2>
            <button onClick={() => navigate('/AdminSecurity')}>Manage Role(s)</button>
          </div>
          <div className="admin-actions">
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
        
        {/* Tab selector */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${selectedTab === 'personal' ? 'active' : ''}`}
            onClick={() => setSelectedTab('personal')}
          >
            Personnel
          </button>
          <button 
            className={`admin-tab ${selectedTab === 'machines' ? 'active' : ''}`}
            onClick={() => setSelectedTab('machines')}
          >
            Equipment
          </button>
          <button 
            className={`admin-tab ${selectedTab === 'materials' ? 'active' : ''}`}
            onClick={() => setSelectedTab('materials')}
          >
            Materials
          </button>
        </div>

        {/* Current Assignments */}
        <div className="current-assignments">
          <h3>Current Assignments</h3>
          {Object.keys(assignedResources).length === 0 ? (
            <p className="no-assignments">No active assignments</p>
          ) : (
            <div className="assignments-grid">
              {Object.entries(assignedResources).map(([roadName, assignment]) => {
                const assessment = assessments.find(a => a.id === assignment.assessmentId);
                return (
                  <div key={roadName} className="assignment-card">
                    <div className="assignment-header">
                      <h4>{roadName}</h4>
                      {assignment.status && renderStatusBadge(assignment.status)}
                    </div>
                    {assessment && (
                      <div className="assignment-priority">
                        <span>Priority: </span>
                        {renderLocalityBadge(assessment.localityType)}
                      </div>
                    )}
                    <div className="assignment-resources">
                      <h5>Assigned Resources:</h5>
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

        {/* Data table */}
        <div className="admin-table-container">
          <div className="admin-table-header">
            {tableConfig[selectedTab].headers.map((header, index) => (
              <div key={index} className="admin-table-header-cell">{header}</div>
            ))}
          </div>
          <div className="admin-table-body">
            {tableData.map((item, index) => (
              <div key={index} className="admin-table-row">
                {tableConfig[selectedTab].accessors.map((accessor, i) => (
                  <div key={i} className="admin-table-cell">
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
                    ) : editingRow?.firebaseKey === item.firebaseKey ? (
                      accessor === 'status' ? (
                        <select
                          className="edit-dropdown"
                          value={editingRow.status}
                          onChange={(e) => setEditingRow({
                            ...editingRow,
                            status: e.target.value
                          })}
                        >
                          {statusOptions[selectedTab].map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      ) : accessor === 'role' ? (
                        <select
                          className="edit-dropdown"
                          value={editingRow.role}
                          onChange={(e) => setEditingRow({
                            ...editingRow,
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
                          value={editingRow[accessor] || ''}
                          onChange={(e) => setEditingRow({
                            ...editingRow,
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
          {editingRow && (
            <div className="edit-controls">
              <button 
                className="save-btn"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
              <button 
                className="cancel-btn"
                onClick={() => setEditingRow(null)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Add Data Forms */}
        <div className="admin-form-container">
          {selectedTab === 'personal' && (
            <>
              <h3>Add Personnel</h3>
              <form className="admin-form" onSubmit={(e) => handleSubmit(e, 'personal')}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter name"
                    value={formInputs.personal.name}
                    onChange={(e) => handleInputChange('personal', 'name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formInputs.personal.role}
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
                  <label>Status</label>
                  <select
                    value={formInputs.personal.status}
                    onChange={(e) => handleInputChange('personal', 'status', e.target.value)}
                    required
                  >
                    <option value="">Select Status</option>
                    {statusOptions.personal.map((status, index) => (
                      <option key={index} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <button type="submit" className="submit-btn">Add Personnel</button>
              </form>
            </>
          )}

          {selectedTab === 'machines' && (
            <>
              <h3>Add Equipment</h3>
              <form className="admin-form" onSubmit={(e) => handleSubmit(e, 'machines')}>
                <div className="form-group">
                  <label>Machine Type</label>
                  <select
                    value={formInputs.machines.type}
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
                  <label>Status</label>
                  <select
                    value={formInputs.machines.status}
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
                  <label>Last Maintenance Date</label>
                  <input 
                    type="date" 
                    value={formInputs.machines.lastMaintenance}
                    onChange={(e) => handleInputChange('machines', 'lastMaintenance', e.target.value)}
                  />
                </div>
                
                <button type="submit" className="submit-btn">Add Equipment</button>
              </form>
            </>
          )}

          {selectedTab === 'materials' && (
            <>
              <h3>Add Materials</h3>
              <form className="admin-form" onSubmit={(e) => handleSubmit(e, 'materials')}>
                <div className="form-group">
                  <label>Material Name</label>
                  <select
                    value={formInputs.materials.name}
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
                  <label>Unit</label>
                  <input 
                    type="text" 
                    placeholder="tons, kg, liters, etc" 
                    value={formInputs.materials.unit}
                    onChange={(e) => handleInputChange('materials', 'unit', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Initial Quantity</label>
                  <input 
                    type="number" 
                    placeholder="Enter quantity"
                    value={formInputs.materials.quantity}
                    onChange={(e) => handleInputChange('materials', 'quantity', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formInputs.materials.status}
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