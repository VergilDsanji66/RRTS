import React, { useState, useEffect } from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import { database } from '../../firebase/firebase';
import { ref, onValue, update } from "firebase/database";
import { supervisorAssessment } from '../../firebase/firebaseFunctions';
import './SupervisorPage.css';

const SupervisorPage = () => {
  // State for complaints data
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Resource options
  const machines = [
    'Asphalt Paver', 'Road Roller', 'Pothole Patching Machine', 
    'Jackhammer', 'Street Sweeper', 'Bucket Truck', 'Light Tower', 
    'Drill', 'Testing Equipment', 'Excavator', 'Backhoe', 
    'Drain Jet Truck', 'CCTV Inspection Crawler', 'Vactor Truck',
    'Pressure Washer', 'Sandblaster', 'Paint Sprayer'
  ];

  const materials = [
    'Asphalt', 'Concrete', 'Gravel', 'Tack Coat', 'Cold Patch',
    'LED Bulbs', 'Wiring', 'Poles', 'Conduit', 'Fuses', 'Photocells',
    'PVC Pipes', 'Catch Basins', 'Grates', 'Geotextile Fabric', 
    'Gravel', 'Concrete', 'Paint', 'Solvents', 'Anti-Graffiti Coating', 
    'Primer', 'Brushes/Rollers'
  ];

  const personal = [
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

  // Fetch today's complaints
  useEffect(() => {
    const complaintsRef = ref(database, 'Complaints');
    
    const unsubscribe = onValue(complaintsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const complaintsArray = Object.entries(data).map(([key, value]) => ({
          ...value,
          ref: key // Include the Firebase key as ref
        }));
        
        const today = new Date();
        const todayDate = `${String(today.getDate()).padStart(2, '0')}-${
          String(today.getMonth() + 1).padStart(2, '0')}-${
          today.getFullYear()}`;
        
        const todaysComplaints = complaintsArray.filter(
          complaint => complaint.dateSubmitted === todayDate
        );
        
        setComplaints(todaysComplaints);
      } else {
        setComplaints([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Mark complaint as completed
  const markAsCompleted = async (complaintRef) => {
    if (!complaintRef) return;
    
    try {
      setUpdatingStatus(true);
      const complaintRefInDB = ref(database, `Complaints/${complaintRef}`);
      await update(complaintRefInDB, { status: 'completed' });
      
      // Update local state
      setComplaints(prev => prev.map(complaint => 
        complaint.ref === complaintRef ? {...complaint, status: 'completed'} : complaint
      ));
    } catch (error) {
      console.error('Error updating complaint status:', error);
      setErrorMessage('Failed to update status');
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
  
  // Find the full complaint data to verify it exists
  const selectedComplaint = complaints.find(c => c.ref === selectedComplaintRef);
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
    // Pass the complaint reference ID directly
    await supervisorAssessment(selectedComplaintRef, assessmentData);
    
    setSubmitSuccess(true);
    
    // Update local complaint status to 'assessed'
    setComplaints(prev => prev.map(complaint => 
      complaint.ref === selectedComplaintRef ? {...complaint, status: 'assessed'} : complaint
    ));
    
    // Reset form
    setSelectedComplaintRef('');
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

  if (loading) return <div className="loading">Loading complaints...</div>;

  return (
    <div className='supervisor-page'>
      <Navbar id={2} />
      <div className="supervisor-container">
        <div className="h1-top">
          <h1>Today's New Complaints</h1>
          <button>Print Area Report</button>
        </div>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <div className="today-report">
          {complaints.length > 0 ? (
            complaints.map((complaint) => (
              <div key={complaint.ref} className="report">
                <div className="report-top">
                  <h3>{complaint.roadName || 'N/A'}, {complaint.issueType || 'N/A'}</h3>
                  <div className="status-container">
                    <span className={`status-badge ${complaint.status || 'pending'}`}>
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
            <p>No complaints found for today</p>
          )}
        </div>

        <div className="h1-mid">
          <h1>Repair Assessment</h1>
        </div>

        <div className="Assessment">
          <div className="complaint-selection">
            <h3>Complaint Selection</h3>
            <select 
              value={selectedComplaintRef}
              onChange={(e) => setSelectedComplaintRef(e.target.value)}
            >
              <option value="">Select a complaint</option>
              {complaints.map(complaint => (
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
              >
                <option value="">Select Material</option>
                {materials.map((material, index) => (
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
              >
                <option value="">Select Machine</option>
                {machines.map((machine, index) => (
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
              >
                <option value="">Select Personnel</option>
                {personal.map((person) => (
                  <option key={person.value} value={person.value}>
                    {person.label}
                  </option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Qty" 
                min="1"
                value={currentResource.labour.quantity}
                onChange={(e) => handleResourceChange('labour', 'quantity', e.target.value)}
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
                          ? personal.find(p => p.value === resource.name)?.label || resource.name
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
      </div>
    </div>
  );
};

export default SupervisorPage;