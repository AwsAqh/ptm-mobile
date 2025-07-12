import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { RPI_URL } from '../api/config';
import { colors } from '../styles/them';

export default function LiveCameraView({ visible, onClose, onCapture, mode = 'single' }) {
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  React.useEffect(() => {
    if (visible) {
      // Pseudo-live: refresh image every second for both single and batch modes
      setStreamUrl(`${RPI_URL}/capture?${Date.now()}`);
      setIsLoading(true);
      setStreamError(false);
      const interval = setInterval(() => {
        setRefreshKey(Date.now());
        setStreamUrl(`${RPI_URL}/capture?${Date.now()}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [visible, mode]);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const response = await fetch(`${RPI_URL}/capture`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to capture image');
      }

      const imageBlob = await response.blob();
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(imageBlob);
      
      const base64Image = await base64Promise;
      setCapturedImage(base64Image);
      
      // Pass the captured image to parent component
      onCapture(base64Image);
      
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    onClose();
    setCapturedImage(null);
  };

  const handleStreamError = () => {
    setStreamError(true);
    setIsLoading(false);
  };

  const handleStreamLoad = () => {
    setIsLoading(false);
    setStreamError(false);
  };

  const getHeaderTitle = () => {
    if (mode === 'batch') {
      return 'Raspberry Pi Camera (Batch Mode)';
    }
    return 'Raspberry Pi Camera';
  };

  const getConfirmButtonText = () => {
    if (mode === 'batch') {
      return 'Start 10-Image Capture';
    }
    return 'Use Photo';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {/* Use WebView for MJPEG live stream */}
          {!capturedImage && (
            <WebView
              source={{ uri: `${RPI_URL}/video_stream` }}
              style={styles.cameraPreview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
            />
          )}
          {capturedImage && (
            <Image
              source={{ uri: capturedImage }}
              style={styles.cameraPreview}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Hide capture button in batch mode */}
          {mode !== 'batch' && !capturedImage ? (
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          ) : null}
          {capturedImage ? (
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>{getConfirmButtonText()}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  controls: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  retakeButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorSubtext: {
    color: 'white',
    fontSize: 16,
  },
  retryButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 