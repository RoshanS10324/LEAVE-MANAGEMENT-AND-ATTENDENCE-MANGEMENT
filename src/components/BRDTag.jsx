import React from 'react';

export default function BRDTag({ label }) {
  if (!label) return null;
  
  return (
    <div style={{
      background: '#f1f5f9',
      color: '#64748b',
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '20px',
      border: '0.5px solid #e2e8f0',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      fontWeight: 500,
      marginLeft: 'auto'
    }} title="Business Requirements Document Reference">
      {label}
    </div>
  );
}
