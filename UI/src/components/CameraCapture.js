import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';

const CameraCapture = ({ onCapture, disabled = false }) => {
  const webcamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && onCapture) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  return (
    <div className="camera-container">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
        videoConstraints={videoConstraints}
        className="camera-feed"
        onUserMedia={() => setIsCameraReady(true)}
        onUserMediaError={(error) => {
          console.error('Camera error:', error);
          setIsCameraReady(false);
        }}
      />
      <div className="camera-controls">
        <button
          onClick={capture}
          disabled={!isCameraReady || disabled}
          className="btn btn-primary"
        >
          {disabled ? 'Processing...' : 'Capture Image'}
        </button>
      </div>
      {!isCameraReady && (
        <div className="alert alert-info">
          Waiting for camera access...
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
