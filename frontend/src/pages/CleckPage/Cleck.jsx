import React, { useEffect, useState } from 'react';
import './Cleck.css';
import Navbar from '../../componets/Navbar/Navbar';
import { addComplaint } from '../../firebase/firebaseFunctions';
import { database } from '../../firebase/firebase';
import { ref, onValue } from "firebase/database";

const Cleck = () => {
  const [formData, setFormData] = useState({
    locationArea: '',
    roadName: '',
    issueType: '',
    severityLevel: '',
    description: '',
    status: 'Pending'
  });

  // Sample options for dropdowns
  const locationAreas = [
    { value: '', label: 'Select Area' },
    { value: 'north', label: 'North District' },
    { value: 'south', label: 'South District' },
    { value: 'east', label: 'East District' },
    { value: 'west', label: 'West District' },
  ];

  const issueTypes = [
    { value: '', label: 'Select Issue Type' },
    { value: 'pothole', label: 'Pothole' },
    { value: 'streetlight', label: 'Streetlight Outage' },
    { value: 'drainage', label: 'Drainage Problem' },
    { value: 'graffiti', label: 'Graffiti' },
  ];

  const severityLevels = [
    { value: '', label: 'Select Severity' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const EntriesHeader = [
    { id: 1, name: 'Ref #' },
    { id: 2, name: 'Location' },
    { id: 3, name: 'Issue Type' },
    { id: 4, name: 'Severity Level' },
    { id: 5, name: 'Date Submitted' },
    { id: 6, name: 'Status' },
];

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const complaintsRef = ref(database, 'Complaints');
    const unsubscribe = onValue(complaintsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and sort by ref number (oldest first)
        const complaintsArray = Object.values(data)
          .sort((a, b) => a.ref - b.ref); // Changed from b.ref - a.ref to a.ref - b.ref
        setComplaints(complaintsArray);
      } else {
        setComplaints([]);
      }
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.locationArea || !formData.roadName || !formData.issueType || !formData.severityLevel) {
      alert('Please fill in all required fields');
      return;
    }
  
    try {
      await addComplaint(formData);  // Removed the manual date handling
      alert('Complaint submitted successfully!');
      
      // Reset form
      setFormData({
        locationArea: '',
        roadName: '',
        issueType: '',
        severityLevel: '',
        description: '',
        status: 'Pending'
      });
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Failed to submit complaint. Please try again.');
    }
  };
  return (
    <div className='cleck'>
      <Navbar id={0} />
      <div className="cleck-container-grid">
        <div className="cleck-container">
          <h1>Enter New Complaint</h1>
          <div className="Complaint-container">
            <div className="Complaint-grid">
              <div className="complaint-grid-item">
                <h3>Location Area *</h3>
                <select 
                  className='inputs'
                  name="locationArea"
                  value={formData.locationArea}
                  onChange={handleChange}
                  required
                >
                  {locationAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="complaint-grid-item">
                <h3>Road Name *</h3>
                <input 
                  type="text" 
                  className='inputs' 
                  name="roadName"
                  value={formData.roadName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="complaint-grid-item">
                <h3>Issue Type *</h3>
                <select 
                  className='inputs'
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleChange}
                  required
                >
                  {issueTypes.map((issue) => (
                    <option key={issue.value} value={issue.value}>
                      {issue.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="complaint-grid-item">
                <h3>Severity level *</h3>
                <select 
                  className='inputs'
                  name="severityLevel"
                  value={formData.severityLevel}
                  onChange={handleChange}
                  required
                >
                  {severityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="description">
              <h3>Description</h3>
              <textarea 
                className='inputs' 
                rows="4" 
                cols="50" 
                placeholder='Enter your complaint here...'
                name="description"
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>
            <button onClick={handleSubmit}>Submit Complaint</button>
          </div>
        </div>
        
        <div className="entries-container">
          <h1>Recent Entries</h1>
          <div className="entries">
            <div className="entries-header">
              {EntriesHeader.map((header) => (
                <h2 key={header.id}>{header.name}</h2>
              ))}
            </div>

            {loading ? (
              <div className="entries-item">
                <p>Loading...</p>
              </div>
            ) : complaints.length === 0 ? (
              <div className="entries-item">
                <div className="empty-entry">
                  <p>No Entries Added</p>
                </div>
              </div>
            ) : (
              complaints.map((complaint) => (
                <div className="entries-item" key={complaint.id}>
                    <div className="entry-cell">{complaint.ref || '---'}</div>
                    <div className="entry-cell">
                        {complaint.locationArea ? 
                            `${complaint.locationArea}, ${complaint.roadName || '---'}` : 
                            '---'}
                    </div>
                    <div className="entry-cell">{complaint.issueType || '---'}</div>
                    <div className="entry-cell">{complaint.severityLevel || '---'}</div>
                    <div className="entry-cell">{complaint.dateSubmitted || '---'}</div> {/* Changed from date to dateSubmitted */}
                    <div className="entry-cell">{complaint.status || '---'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cleck;