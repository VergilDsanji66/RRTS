import React, { useState, useEffect } from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import { database } from '../../firebase/firebase';
import { ref, onValue, update, get } from "firebase/database";
import { supervisorAssessment } from '../../firebase/firebaseFunctions';
import './SupervisorPage.css';

const SupervisorPage = () => {
  // State for complaints data
  const [allComplaints, setAllComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedIssueType, setSelectedIssueType] = useState('');

  // Resource options organized by issue type
  const resourceOptions = {
    'pothole': {
      machines: ['Asphalt Paver', 'Road Roller', 'Pothole Patching Machine', 'Jackhammer'],
      materials: ['Asphalt', 'Cold Patch', 'Tack Coat', 'Geotextile Fabric'],
      personnel: ['RoadCrew']
    },
    'streetlight': {
      machines: ['Bucket Truck', 'Light Tower'],
      materials: ['LED Bulbs', 'Wiring', 'Poles', 'Conduit', 'Fuses', 'Photocells'],
      personnel: ['TrafficControllers']
    },
    'drainage': {
      machines: ['Drain Jet Truck', 'CCTV Inspection Crawler', 'Excavator', 'Backhoe'],
      materials: ['PVC Pipes', 'Catch Basins', 'Grates', 'Gravel'],
      personnel: ['DrainageSpecialists', 'RoadCrew']
    },
    'graffiti': {
      machines: ['Pressure Washer', 'Sandblaster'],
      materials: ['Paint', 'Solvents', 'Anti-Graffiti Coating', 'Primer', 'Brushes/Rollers'],
      personnel: ['RoadCrew']
    },
    'default': {
      machines: [],
      materials: [],
      personnel: []
    }
  };

  const personnelOptions = [
    { value: 'RoadCrew', label: 'Road Crew' },
    { value: 'DrainageSpecialists', label: 'Drainage Specialists' },
    { value: 'TrafficControllers', label: 'Traffic Controllers' }
  ];

  // State for assessment form
  const [selectedComplaintRef, setSelectedComplaintRef] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('medium');
  const [selectedLocality, setSelectedLocality] = useState('residential');
  const [repairPriority, setRepairPriority] = useState({
    high: false,
    medium: true,
    low: false
  });
  const [currentResource, setCurrentResource] = useState({
    material: { type: '', quantity: 0 },
    equipment: { type: '', quantity: 0 },
    labour: { type: '', quantity: 0 }
  });
  const [resourceList, setResourceList] = useState([]);
  const [assessmentReport, setAssessmentReport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Get relevant resources based on issue type
  const getRelevantResources = (issueType) => {
    if (!issueType) return resourceOptions.default;
    const type = issueType.toLowerCase();
    if (type.includes('pothole')) return resourceOptions.pothole;
    if (type.includes('streetlight')) return resourceOptions.streetlight;
    if (type.includes('drainage')) return resourceOptions.drainage;
    if (type.includes('graffiti')) return resourceOptions.graffiti;
    return resourceOptions.default;
  };

  // Handle complaint selection
  const handleComplaintSelection = (ref) => {
    setSelectedComplaintRef(ref);
    const selectedComplaint = allComplaints.find(c => c.ref === ref);
    if (selectedComplaint) {
      setSelectedIssueType(selectedComplaint.issueType || '');
      // Reset resource selections when changing complaint
      setCurrentResource({
        material: { type: '', quantity: 0 },
        equipment: { type: '', quantity: 0 },
        labour: { type: '', quantity: 0 }
      });
      setResourceList([]);
    }
  };

  // Fetch all complaints and assigned data
  useEffect(() => {
    const complaintsRef = ref(database, 'Complaints');
    const assignedRef = ref(database, 'Assigned');
    
    const unsubscribeComplaints = onValue(complaintsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const complaintsArray = Object.entries(data).map(([key, value]) => ({
          ...value,
          ref: key
        }));
        setAllComplaints(complaintsArray);
      } else {
        setAllComplaints([]);
      }
    }, (error) => {
      console.error("Error fetching complaints: ", error);
    });

    const unsubscribeAssigned = onValue(assignedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const assignedArray = Object.entries(data).map(([key, value]) => ({
          ...value,
          id: key
        }));
        setAssignedComplaints(assignedArray);
      } else {
        setAssignedComplaints([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching assigned data: ", error);
      setLoading(false);
    });

    return () => {
      unsubscribeComplaints();
      unsubscribeAssigned();
    };
  }, []);

  // Filter complaints based on active tab
  useEffect(() => {
    if (activeTab === 'view schedule') {
      // We'll handle the schedule view separately
      setFilteredComplaints([]);
    } else {
      setFilteredComplaints(
        allComplaints.filter(complaint => 
          complaint.status === activeTab || 
          (activeTab === 'Pending' && !complaint.status)
        )
      );
    }
  }, [allComplaints, activeTab]);

  // Mark complaint as completed
  const markAsCompleted = async (complaintRef) => {
    if (!complaintRef) return;

    try {
      setUpdatingStatus(true);
      const db = database;

      // 1. First, get the assessmentId from the Complaint
      const complaintSnapshot = await get(ref(db, `Complaints/${complaintRef}`));
      if (!complaintSnapshot.exists()) {
        throw new Error("Complaint not found");
      }

      const assessmentId = complaintSnapshot.val().assessmentId;
      if (!assessmentId) {
        throw new Error("No linked assessment found");
      }

      // 2. Update both nodes
      const updates = {};
      updates[`Complaints/${complaintRef}/status`] = 'completed';
      updates[`Assessments/${assessmentId}/status`] = 'completed';
      updates[`Assessments/${assessmentId}/orderStatus`] = 'completed';

      await update(ref(db), updates);

      // 3. Update local state
      setAllComplaints(prev => 
        prev.map(complaint => 
          complaint.ref === complaintRef ? { ...complaint, status: 'completed' } : complaint
        )
      );

    } catch (error) {
      console.error("Update error:", error);
      setErrorMessage(error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle priority checkbox changes
  const handlePriorityChange = (priority) => {
    setRepairPriority({
      high: priority === 'high',
      medium: priority === 'medium',
      low: priority === 'low'
    });
  };

  // Handle resource input changes
  const handleResourceChange = (resourceType, field, value) => {
    setCurrentResource(prev => ({
      ...prev,
      [resourceType]: {
        ...prev[resourceType],
        [field]: field === 'quantity' ? parseInt(value) || 0 : value
      }
    }));
  };

  // Add resource to list
  const addResource = (resourceType) => {
    const resource = currentResource[resourceType];
    if (resource.type && resource.quantity > 0) {
      setResourceList(prev => {
        const existingIndex = prev.findIndex(
          item => item.type === resourceType && item.name === resource.type
        );

        if (existingIndex >= 0) {
          const updatedList = [...prev];
          updatedList[existingIndex] = {
            ...updatedList[existingIndex],
            quantity: updatedList[existingIndex].quantity + resource.quantity
          };
          return updatedList;
        } else {
          return [
            ...prev,
            {
              type: resourceType,
              name: resource.type,
              quantity: resource.quantity
            }
          ];
        }
      });

      setCurrentResource(prev => ({
        ...prev,
        [resourceType]: { type: '', quantity: 0 }
      }));
    }
  };

  // Remove resource from list
  const removeResource = (index) => {
    setResourceList(prev => prev.filter((_, i) => i !== index));
  };

  // Submit assessment
  const handleSubmitAssessment = async () => {
    if (!selectedComplaintRef) {
      setErrorMessage('Please select a valid complaint to assess');
      return;
    }
    
    const selectedComplaint = allComplaints.find(c => c.ref === selectedComplaintRef);
    if (!selectedComplaint) {
      setErrorMessage('Selected complaint not found');
      return;
    }

    if (resourceList.length === 0) {
      setErrorMessage('Please add at least one resource');
      return;
    }

    setErrorMessage('');

    const selectedPriority = Object.entries(repairPriority)
      .find(([_, isChecked]) => isChecked)?.[0] || 'medium';

    const groupedResources = resourceList.reduce((acc, resource) => {
      if (!acc[resource.type]) {
        acc[resource.type] = [];
      }
      acc[resource.type].push({
        name: resource.name,
        quantity: resource.quantity
      });
      return acc;
    }, {});

    const assessmentData = {
      severityConfirmation: selectedSeverity,
      localityType: selectedLocality,
      repairPriority: selectedPriority,
      resources: groupedResources,
      assessmentReport
    };

    try {
      setIsSubmitting(true);
      await supervisorAssessment(selectedComplaintRef, assessmentData);
      
      setSubmitSuccess(true);
      
      setAllComplaints(prev => prev.map(complaint => 
        complaint.ref === selectedComplaintRef ? {...complaint, status: 'assessed'} : complaint
      ));
      
      setSelectedComplaintRef('');
      setSelectedIssueType('');
      setAssessmentReport('');
      setResourceList([]);
      setCurrentResource({
        material: { type: '', quantity: 0 },
        equipment: { type: '', quantity: 0 },
        labour: { type: '', quantity: 0 }
      });
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Assessment submission failed:', error);
      setErrorMessage(error.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get priority score for sorting
  const getPriorityScore = (localityType) => {
    switch (localityType) {
      case 'commercial': return 4;
      case 'industrial': return 3;
      case 'mixed': return 2;
      case 'residential': return 1;
      default: return 0;
    }
  };

  if (loading) return <div className="loading">Loading complaints...</div>;

  const relevantResources = getRelevantResources(selectedIssueType);

  return (
    <div className='supervisor-page'>
      <Navbar id={2} />
      <div className="supervisor-container">
        <div className="h1-top">
          <h1>Complaint Management</h1>
          <div className="status-tabs">
            <button 
              className={`tab-button ${activeTab === 'Pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('Pending')}
            >
              Pending
            </button>
            <button 
              className={`tab-button ${activeTab === 'assessed' ? 'active' : ''}`}
              onClick={() => setActiveTab('assessed')}
            >
              Assessed
            </button>
            <button 
              className={`tab-button ${activeTab === 'view schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('view schedule')}
            >
              View Schedule
            </button>
            <button 
              className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
          </div>
        </div>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        {activeTab !== 'view schedule' && (
          <div className="today-report">
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((complaint) => (
                <div key={complaint.ref} className="report">
                  <div className="report-top">
                    <h3>{complaint.roadName || 'N/A'}, {complaint.issueType || 'N/A'}</h3>
                    <div className="status-container">
                      <span className={`status-badge ${complaint.status || 'Pending'}`}>
                        {complaint.status || 'Pending'}
                      </span>
                      {complaint.status === 'assessed' && (
                        <button 
                          className="complete-btn"
                          onClick={() => markAsCompleted(complaint.ref)}
                          disabled={updatingStatus}
                        >
                          {updatingStatus ? 'Updating...' : 'Mark as Completed'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="location">
                    <p>Ref # {complaint.ref || 'N/A'}</p>
                    <p>Location: {complaint.locationArea || 'N/A'}</p>
                  </div>
                  <div className="description">
                    <p>{complaint.description || 'No description provided'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No {activeTab.toLowerCase()} complaints found</p>
            )}
          </div>
        )}

        {activeTab === 'view schedule' && (
          <div className="schedule-view">
            <h2>Repair Schedule</h2>
            {assignedComplaints.length > 0 ? (
              <div className="schedule-list">
                {assignedComplaints
                  .sort((a, b) => getPriorityScore(b.localityType) - getPriorityScore(a.localityType))
                  .map((assignment) => {
                    // Find the corresponding complaint
                    const complaint = allComplaints.find(c => c.assessmentId === assignment.id);
                    return (
                      <div key={assignment.id} className="schedule-item">
                        <div className="schedule-header">
                          <h3>
                            {complaint ? `REF#${complaint.ref} - ${complaint.roadName}` : `Assignment ID: ${assignment.id}`}
                          </h3>
                          <span className={`priority-badge ${assignment.localityType}`}>
                            {assignment.localityType.toUpperCase()}
                          </span>
                        </div>
                        
                        {complaint && (
                          <div className="schedule-complaint-info">
                            <p><strong>Issue:</strong> {complaint.issueType}</p>
                            <p><strong>Location:</strong> {complaint.locationArea}</p>
                            <p><strong>Description:</strong> {complaint.description}</p>
                          </div>
                        )}
                        
                        <div className="schedule-assignment-info">
                          <h4>Assigned Resources</h4>
                          <div className="resource-cards">
                            {assignment.equipment && assignment.equipment.length > 0 && (
                              <div className="resource-card">
                                <h5>Equipment</h5>
                                <ul>
                                  {assignment.equipment.map((eq, index) => (
                                    <li key={index}>{eq}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {assignment.labour && assignment.labour.length > 0 && (
                              <div className="resource-card">
                                <h5>Personnel</h5>
                                <ul>
                                  {assignment.labour.map((emp, index) => (
                                    <li key={index}>{emp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="schedule-status">
                          <p><strong>Status:</strong> <span className="status-text">{assignment.status}</span></p>
                          <p><strong>Assigned on:</strong> {new Date(assignment.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p>No assigned repairs in the schedule</p>
            )}
          </div>
        )}

        {activeTab !== 'view schedule' && (
          <>
            <div className="h1-mid">
              <h1>Repair Assessment</h1>
            </div>

            <div className="Assessment">
              <div className="complaint-selection">
                <h3>Complaint Selection</h3>
                <select 
                  value={selectedComplaintRef}
                  onChange={(e) => handleComplaintSelection(e.target.value)}
                >
                  <option value="">Select a complaint</option>
                  {allComplaints
                    .filter(c => c.status === 'Pending' || !c.status)
                    .map(complaint => (
                      <option key={complaint.ref} value={complaint.ref}>
                        REF#{complaint.ref} - {complaint.roadName} - {complaint.issueType}
                      </option>
                    ))}
                </select>

                <div className="confirmation-and-type">
                  <div className="confirm">
                    <h3>Severity Confirmation</h3>
                    <select 
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                      <option value="minor">1 - Minor</option>
                      <option value="low">2 - Low</option>
                      <option value="medium">3 - Medium</option>
                      <option value="high">4 - High</option>
                      <option value="critical">5 - Critical</option>
                    </select>
                  </div>

                  <div className="Type">
                    <h3>Locality Type</h3>
                    <select 
                      value={selectedLocality}
                      onChange={(e) => setSelectedLocality(e.target.value)}
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="Repair-Priority">
                <h3>Repair Priority</h3>
                <div className="priority-options">
                  <label>
                    <input
                      type="checkbox"
                      checked={repairPriority.high}
                      onChange={() => handlePriorityChange('high')}
                    />
                    High Priority
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={repairPriority.medium}
                      onChange={() => handlePriorityChange('medium')}
                    />
                    Medium Priority
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={repairPriority.low}
                      onChange={() => handlePriorityChange('low')}
                    />
                    Low Priority
                  </label>
                </div>
              </div>
              
              <div className="Resource">
                <div className="resources">
                  <h3>Materials</h3>
                  <select 
                    name="materials"
                    value={currentResource.material.type}
                    onChange={(e) => handleResourceChange('material', 'type', e.target.value)}
                    disabled={!selectedComplaintRef}
                  >
                    <option value="">Select Material</option>
                    {relevantResources.materials.map((material, index) => (
                      <option key={index} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    min="1"
                    value={currentResource.material.quantity}
                    onChange={(e) => handleResourceChange('material', 'quantity', e.target.value)}
                    disabled={!currentResource.material.type}
                  />
                  <button 
                    className='AMQ'
                    onClick={() => addResource('material')}
                    disabled={!currentResource.material.type || currentResource.material.quantity <= 0}
                  >
                    Add
                  </button>
                </div>

                <div className="resources">
                  <h3>Machines</h3>
                  <select 
                    name="machines"
                    value={currentResource.equipment.type}
                    onChange={(e) => handleResourceChange('equipment', 'type', e.target.value)}
                    disabled={!selectedComplaintRef}
                  >
                    <option value="">Select Machine</option>
                    {relevantResources.machines.map((machine, index) => (
                      <option key={index} value={machine}>
                        {machine}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    min="1"
                    value={currentResource.equipment.quantity}
                    onChange={(e) => handleResourceChange('equipment', 'quantity', e.target.value)}
                    disabled={!currentResource.equipment.type}
                  />
                  <button 
                    className='AMQ'
                    onClick={() => addResource('equipment')}
                    disabled={!currentResource.equipment.type || currentResource.equipment.quantity <= 0}
                  >
                    Add
                  </button>
                </div>

                <div className="resources">
                  <h3>Personal</h3>
                  <select 
                    name="personal"
                    value={currentResource.labour.type}
                    onChange={(e) => handleResourceChange('labour', 'type', e.target.value)}
                    disabled={!selectedComplaintRef}
                  >
                    <option value="">Select Personnel</option>
                    {relevantResources.personnel.map((personType) => {
                      const person = personnelOptions.find(p => p.value === personType);
                      return person ? (
                        <option key={person.value} value={person.value}>
                          {person.label}
                        </option>
                      ) : null;
                    })}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    min="1"
                    value={currentResource.labour.quantity}
                    onChange={(e) => handleResourceChange('labour', 'quantity', e.target.value)}
                    disabled={!currentResource.labour.type}
                  />
                  <button 
                    className='AMQ'
                    onClick={() => addResource('labour')}
                    disabled={!currentResource.labour.type || currentResource.labour.quantity <= 0}
                  >
                    Add
                  </button>
                </div>
                    
                <div className="resource-list">
                  <h3>Resource List</h3>
                  {resourceList.length === 0 ? (
                    <p>No resources added yet</p>
                  ) : (
                    <ul>
                      {resourceList.map((resource, index) => (
                        <li key={index} className="resource-list-item">
                          <span>
                            {resource.type === 'labour' 
                              ? personnelOptions.find(p => p.value === resource.name)?.label || resource.name
                              : resource.name} - {resource.quantity}
                          </span>
                          <button 
                            className="remove-btn"
                            onClick={() => removeResource(index)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="Assessment-Report">
                <h3>Assessment Report</h3>
                <textarea
                  value={assessmentReport}
                  onChange={(e) => setAssessmentReport(e.target.value)}
                  cols="30"
                  rows="10"
                  placeholder="Enter detailed assessment report..."
                ></textarea>
              </div>
            </div>

            <button 
              onClick={handleSubmitAssessment}
              disabled={isSubmitting || !selectedComplaintRef || resourceList.length === 0}
              className="submit-button"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>

            {submitSuccess && (
              <div className="success-message">
                Assessment submitted successfully!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupervisorPage;