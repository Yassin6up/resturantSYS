import React from 'react'

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`}>
    </div>
  )
}

export default LoadingSpinner