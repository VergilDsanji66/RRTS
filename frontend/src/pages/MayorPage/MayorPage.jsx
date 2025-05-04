import React from 'react';
import Navbar from '../../componets/Navbar/Navbar';
import './MayorPage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';

const MayorPage = () => {
  return (
    <div className='mayorpage'>
      <Navbar id={3}/>
      <div className="container">
        <div className="sidebar">
          <a href="#" className="nav-item active">
            Repair Overview
          </a>
          <a href="#" className="nav-item">
            District Performance
          </a>
          <a href="#" className="nav-item">
            Resource Utilization
          </a>
        </div>
        
        <div className="main-content">
          <div className="page-header">
            <h2 className="page-title">Road Repair Performance</h2>
            <div className="date-selector">
              <span>Time Period:</span>
              <select>
                <option>Last 7 Days</option>
                <option selected>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>Last Year</option>
                <option>Custom Range...</option>
              </select>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="repair-grid">
            <div className="repair-info">
              <h4>Completed Repairs</h4>
              <p className="C-No">142</p>
              <p className="P-No positive"> <FontAwesomeIcon icon={faArrowUp}/> 12% from last month</p>
            </div>
            
            <div className="repair-info">
              <h4>Pending Repairs</h4>
              <p className="C-No">28</p>
              <p className="P-No negative"> <FontAwesomeIcon icon={faArrowUp}/> 5% from last month</p>
            </div>
            
            <div className="repair-info">
              <h4>Avg. Completion Time</h4>
              <p className="C-No">3.2 <span className="small-text">days</span></p>
              <p className="P-No positive"> <FontAwesomeIcon icon={faArrowDown}/> 1.1 days improvement</p>
            </div>
          </div>
          
          {/* Charts */}
          <div className="repair-carts">
            <div className="carts">
              <div className="header">
                <h3>Repairs Completed vs Received</h3>
                <select>
                  <option>By Week</option>
                  <option selected>By Month</option>
                  <option>By Quarter</option>
                </select>
              </div>
              <div className="display">
                [Line chart showing repairs completed vs new requests]
              </div>
            </div>
            
            <div className="carts">
              <div className="header">
                <h3>Repair Types Distribution</h3>
                <select>
                  <option>Last Month</option>
                  <option selected>Last Quarter</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div className="display">
                [Pie chart showing distribution of repair types]
              </div>
            </div>
          </div>
          
          {/* District Performance Table */}
          <div className="Comparing">
            <div className="header">
              <h3>District Performance Comparison</h3>
              <select>
                <option selected>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>Year to Date</option>
              </select>
            </div>
            <div className="table">
              <div className="labels">
                <span>District</span>
                <span>Completed</span>
                <span>Pending</span>
                <span>Avg. Time</span>
                <span>Satisfaction</span>
              </div>
              <div className="table-row">
                <span>North District</span>
                <span>45</span>
                <span>8</span>
                <span>2.8 days</span>
                <span>92%</span>
              </div>
              <div className="table-row">
                <span>South District</span>
                <span>38</span>
                <span>5</span>
                <span>3.1 days</span>
                <span>89%</span>
              </div>
              <div className="table-row">
                <span>East District</span>
                <span>32</span>
                <span>7</span>
                <span>3.5 days</span>
                <span>85%</span>
              </div>
              <div className="table-row">
                <span>West District</span>
                <span>18</span>
                <span>5</span>
                <span>4.2 days</span>
                <span>82%</span>
              </div>
            </div>
            <div className="export-options">
              <button className="export-btn">
                📊 Export as PDF
              </button>
              <button className="export-btn">
                📝 Export as Excel
              </button>
            </div>
          </div>
          
          {/* Resource Utilization */}
          <div className="chart-card" style={{marginTop: '1.5rem'}}>
            <div className="header">
              <h3>Resource Utilization</h3>
              <select >
                <option selected>Personnel</option>
                <option>Machines</option>
                <option>Materials</option>
              </select>
            </div>
            <div className="display" style={{height: '400px'}}>
              [Bar chart showing resource utilization rates]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MayorPage;