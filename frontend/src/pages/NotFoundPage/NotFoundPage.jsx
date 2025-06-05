import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NotFoundPage.css'

const NotFoundPage = () => {

    const navigate = useNavigate()

  return (
    <div>
        <p>Not found page</p>
        <button className='NBTW' onClick={() => navigate('/LoginPage')}>Back</button>
    </div>
  )
}

export default NotFoundPage