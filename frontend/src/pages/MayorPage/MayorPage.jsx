import React, { useState, useEffect } from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import './MayorPage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { database } from '../../firebase/firebase';
import { ref, onValue } from "firebase/database";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';

const MayorPage = () => {
  // State for complaint counts
  const [counts, setCounts] = useState({
    current: { pending: 0, assessed: 0, completed: 0 },
    previous: { pending: 0, assessed: 0, completed: 0 }
  });

  // State for district data
  const [districtData, setDistrictData] = useState({
    north: { pending: 0, assessed: 0, completed: 0 },
    south: { pending: 0, assessed: 0, completed: 0 },
    east: { pending: 0, assessed: 0, completed: 0 },
    west: { pending: 0, assessed: 0, completed: 0 }
  });

  // State for time period selection
  const [timePeriod, setTimePeriod] = useState('30days');
  const [chartPeriod, setChartPeriod] = useState('month');

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current === 0 ? '--' : '∞';
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const pendingChange = calculateChange(counts.current.pending, counts.previous.pending);
  const assessedChange = calculateChange(counts.current.assessed, counts.previous.assessed);
  const completedChange = calculateChange(counts.current.completed, counts.previous.completed);

  // Custom label renderer for pie chart that hides 0% values
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent === 0) return null;
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Data for charts
  const statusData = [
    { name: 'Completed', value: counts.current.completed, color: '#4CAF50' },
    { name: 'Assessed', value: counts.current.assessed, color: '#FF9800' },
    { name: 'Pending', value: counts.current.pending, color: '#F44336' }
  ].filter(item => item.value > 0); // Filter out zero values

  const lineData = [
    { name: 'Week 1', completed: Math.floor(counts.current.completed * 0.2), assessed: Math.floor(counts.current.assessed * 0.2), pending: Math.floor(counts.current.pending * 0.2) },
    { name: 'Week 2', completed: Math.floor(counts.current.completed * 0.4), assessed: Math.floor(counts.current.assessed * 0.4), pending: Math.floor(counts.current.pending * 0.4) },
    { name: 'Week 3', completed: Math.floor(counts.current.completed * 0.6), assessed: Math.floor(counts.current.assessed * 0.6), pending: Math.floor(counts.current.pending * 0.6) },
    { name: 'Week 4', completed: counts.current.completed, assessed: counts.current.assessed, pending: counts.current.pending }
  ];

  useEffect(() => {
    const complaintsRef = ref(database, 'Complaints');
    
    onValue(complaintsRef, (snapshot) => {
      const complaintsData = snapshot.val();
      const newCounts = { 
        current: { pending: 0, assessed: 0, completed: 0 },
        previous: { pending: 10, assessed: 8, completed: 15 } // Mock previous data
      };

      const newDistrictData = {
        north: { pending: 0, assessed: 0, completed: 0 },
        south: { pending: 0, assessed: 0, completed: 0 },
        east: { pending: 0, assessed: 0, completed: 0 },
        west: { pending: 0, assessed: 0, completed: 0 }
      };

      if (complaintsData) {
        Object.values(complaintsData).forEach(complaint => {
          // Count current period complaints
          if (!complaint.status || complaint.status === 'Pending') {
            newCounts.current.pending++;
          } else if (complaint.status === 'assessed') {
            newCounts.current.assessed++;
          } else if (complaint.status === 'completed') {
            newCounts.current.completed++;
          }

          // Count by district
          if (complaint.locationArea) {
            const district = complaint.locationArea.toLowerCase();
            if (district in newDistrictData) {
              if (!complaint.status || complaint.status === 'Pending') {
                newDistrictData[district].pending++;
              } else if (complaint.status === 'assessed') {
                newDistrictData[district].assessed++;
              } else if (complaint.status === 'completed') {
                newDistrictData[district].completed++;
              }
            }
          }
        });
      }

      setCounts(newCounts);
      setDistrictData(newDistrictData);
    }, (error) => {
      console.error("Error reading complaints data:", error);
    });
  }, [timePeriod]);

  return (
    <div className='mayorpage'>
      <Navbar id={3}/>
      <div className="container">
        <div className="main-content">
          <div className="page-header">
            <h2 className="page-title">Road Repair Performance</h2>
            <div className="date-selector">
              <span>Time Period:</span>
              <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="repair-grid">
            <div className="repair-info">
              <h4>Completed Repairs</h4>
              <p className="C-No">{counts.current.completed}</p>
              <p className={`P-No ${completedChange > 0 ? 'positive' : 'negative'}`}>
                <FontAwesomeIcon icon={completedChange > 0 ? faArrowUp : faArrowDown}/> 
                {completedChange === '--' ? '0' : completedChange}% from last period
              </p>
            </div>
            
            <div className="repair-info">
              <h4>Pending Repairs</h4>
              <p className="C-No">{counts.current.pending}</p>
              <p className={`P-No ${pendingChange > 0 ? 'negative' : 'positive'}`}>
                <FontAwesomeIcon icon={pendingChange > 0 ? faArrowUp : faArrowDown}/> 
                {pendingChange === '--' ? '0' : pendingChange}% from last period
              </p>
            </div>
            
            <div className="repair-info">
              <h4>Assessed Repairs</h4>
              <p className="C-No">{counts.current.assessed}</p>
              <p className={`P-No ${assessedChange > 0 ? 'positive' : 'negative'}`}>
                <FontAwesomeIcon icon={assessedChange > 0 ? faArrowUp : faArrowDown}/> 
                {assessedChange === '--' ? '0' : assessedChange}% from last period
              </p>
            </div>
          </div>
          
          {/* Charts */}
          <div className="repair-carts">
            <div className="carts">
              <div className="header">
                <h3>Repair Status Trend</h3>
                <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                  <option value="week">By Week</option>
                  <option value="month">By Month</option>
                  <option value="quarter">By Quarter</option>
                </select>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completed" stroke="#4CAF50" />
                    <Line type="monotone" dataKey="assessed" stroke="#FF9800" />
                    <Line type="monotone" dataKey="pending" stroke="#F44336" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="carts">
              <div className="header">
                <h3>Repair Status Distribution</h3>
                <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                </select>
              </div>
              <div className="chart-container" style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120} // Increased radius
                      innerRadius={60} // Added inner radius for donut effect (optional)
                      fill="#8884d8"
                      dataKey="value"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        value,
                        name,
                        percent,
                        index
                      }) => {
                        // Only show label if value > 0
                        if (value === 0) return null;
                        
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 30; // Position outside the pie
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={statusData[index].color}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            style={{ fontWeight: 'bold', fontSize: '14px' }}
                          >
                            {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          </text>
                        );
                      }}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        value,
                        `${name}: ${(props.payload.percent * 100).toFixed(1)}%`
                      ]}
                    />
                    {/* Optional: Add legend if needed */}
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      formatter={(value, entry, index) => (
                        <span style={{ color: statusData[index].color }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* District Performance Comparison */}
          <div className="district-performance">
            <div className="header">
              <h3>District Performance Comparison</h3>
              <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
            <div className="district-grid">
              {Object.entries(districtData).map(([district, data]) => (
                <div key={district} className="district-card">
                  <h4>{district.charAt(0).toUpperCase() + district.slice(1)} District</h4>
                  <div className="district-stats">
                    <div className="stat">
                      <span className="stat-label">Completed:</span>
                      <span className="stat-value completed">{data.completed}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Assessed:</span>
                      <span className="stat-value assessed">{data.assessed}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Pending:</span>
                      <span className="stat-value pending">{data.pending}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Resource Utilization */}
          <div className="chart-card">
            <div className="header">
              <h3>Repair Status Comparison</h3>
              <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                <option value="week">By Week</option>
                <option value="month">By Month</option>
                <option value="quarter">By Quarter</option>
              </select>
            </div>
            <div className="chart-container" style={{height: '400px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#4CAF50" />
                  <Bar dataKey="assessed" fill="#FF9800" />
                  <Bar dataKey="pending" fill="#F44336" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MayorPage;