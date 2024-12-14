import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import CameraScanner from './components/CameraScanner';

const App = () => {
  const [scanMethod, setScanMethod] = useState('upload');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Driver's License Barcode Scanner</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setScanMethod('upload')}
          style={{ marginRight: '10px' }}
        >
          Upload Image
        </button>
        <button 
          onClick={() => setScanMethod('camera')}
        >
          Use Camera
        </button>
      </div>

      {scanMethod === 'upload' ? <UploadForm /> : <CameraScanner />}
    </div>
  );
};

export default App;