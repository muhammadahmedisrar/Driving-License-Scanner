import React, { useRef, useEffect, useState } from 'react';
import { BrowserPDF417Reader } from '@zxing/browser';

const CameraScanner = () => {
    const videoRef = useRef(null);
    const [barcodeData, setBarcodeData] = useState('');
    const [error, setError] = useState('');
    const [stream, setStream] = useState(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        // const hints = new Map();
        // hints.set(2, [BarcodeFormat.PDF_417]); // Configure for PDF417 format

        const codeReader = new BrowserPDF417Reader();
        let active = true;

        (async () => {
            try {
                setScanning(true);
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');

                if (videoDevices.length === 0) {
                    throw new Error('No camera devices found');
                }

                const deviceId = videoDevices[0].deviceId;
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        deviceId,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "environment"  // Prefer back camera
                    },
                });

                if (!active) {
                    newStream.getTracks().forEach(track => track.stop());
                    return;
                }

                setStream(newStream);

                if (videoRef.current) {
                    if (videoRef.current.srcObject) {
                        const tracks = videoRef.current.srcObject.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    
                    videoRef.current.srcObject = newStream;
                    await new Promise((resolve) => {
                        videoRef.current.onloadedmetadata = resolve;
                    });
                    
                    if (active) {
                        await videoRef.current.play().catch(err => {
                            console.warn('Play error:', err);
                        });
                    }
                }

                console.log('Starting barcode detection...');
                codeReader.decodeFromVideoDevice(
                    deviceId,
                    videoRef.current,
                    (result, err) => {
                        if (result && active) {
                            console.log('Barcode detected:', result.getText());
                            setBarcodeData(result.getText());
                            setError('');
                            active = false;
                            stopStream();
                        }
                        if (err && !(err.name === 'NotFoundException')) {
                            console.error('Scanning error:', err);
                            setError(err.message);
                        }
                    }
                );
            } catch (err) {
                console.error('Setup error:', err);
                setError(err.message);
            } finally {
                setScanning(false);
            }
        })();

        return () => {
            active = false;
            stopStream();
        };
    }, []);

    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    return (
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Camera Barcode Scanner</h1>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <video 
                    ref={videoRef} 
                    style={{ 
                        width: '100%',
                        maxHeight: '80vh',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                    }} 
                />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: '2px solid #ff0000',
                    width: '80%',
                    height: '100px',
                    boxSizing: 'border-box'
                }}></div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <p>Position the barcode within the red rectangle</p>
                {scanning && <p>Scanner is active... Please hold the license steady</p>}
            </div>

            {barcodeData && (
                <div>
                    <h2>Barcode Data:</h2>
                    <pre style={{ 
                        textAlign: 'left', 
                        background: '#f5f5f5', 
                        padding: '10px',
                        overflow: 'auto' 
                    }}>
                        {barcodeData}
                    </pre>
                </div>
            )}
            
            {error && (
                <div style={{ color: 'red', marginTop: '20px' }}>
                    <h2>Error:</h2>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default CameraScanner;