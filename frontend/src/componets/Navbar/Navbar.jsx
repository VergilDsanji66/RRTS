import React from 'react';
import { Roles } from "../../assets/assets"; 
import './Navbar.css'

const Navbar = ({ id }) => {
  // Get the role based on the id prop
  const role = Roles.find(r => r.id === id);
  
  // Get today's date for display
  const today = new Date().toLocaleDateString();

  return (
    <div className="navbar">
      <h1>
        RRTS - {role?.name || 'Unknown'}
      </h1>
      <div className="right">
        {role?.id === 2 ? (
          <h1>{today}</h1>
        ) : (
          <>
            <p>{role?.info},</p>
            <strong>{role?.title}</strong>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;