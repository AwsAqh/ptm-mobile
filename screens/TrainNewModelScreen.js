import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { unzipSync } from 'fflate';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { RPI_URL } from '../api/config';
import { trainModel } from '../api/train';
import LiveCameraView from '../components/LiveCameraView';
import Notification from '../components/Notification';
import { colors } from '../styles/them';

const categories = [
  { value: 'plants', label: 'Plants' },
  { value: 'animals_diseases', label: 'Animals diseases' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

const modelArchitectures = [
  { value: 'resnet50', label: 'Architecture' },
  { value: 'resnet50', label: 'ResNet50 (defaullt)' },
  { value: 'googlenet', label: 'Googlenet' },
  { value: 'mobilenet_v2', label: 'Mobilenet_v2' },
];

// Helper to unzip a zip file buffer and write images to FileSystem
function uint8ToBase64(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  } else {
    // For Node.js or environments without btoa
    return Buffer.from(binary, 'binary').toString('base64');
  }
}

async function unzipWithFflate(zipPath, destDir) {
  const zipData = await FileSystem.readAsStringAsync(zipPath, { encoding: FileSystem.EncodingType.Base64 });
  const uint8 = Uint8Array.from(atob(zipData), c => c.charCodeAt(0));
  const files = unzipSync(uint8);
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
  const imageUris = [];
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
      const fileUri = `${destDir}/${name}`;
      await FileSystem.writeAsStringAsync(fileUri, uint8ToBase64(data), { encoding: FileSystem.EncodingType.Base64 });
      imageUris.push(fileUri);
    }
  }
  return imageUris;
}

export default function TrainNewModelScreen({ navigation }) {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [category, setCategory] = useState('');
  const [classes, setClasses] = useState([
    { id: 1, name: '', images: [] },
    { id: 2, name: '', images: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });
  const [modelArch, setModelArch] = useState('');
  const [modelArchOpen, setModelArchOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showSourceModalForClass, setShowSourceModalForClass] = useState(null);
  const [showMultiCaptureModal, setShowMultiCaptureModal] = useState(false);
  const [multiCaptureClassId, setMultiCaptureClassId] = useState(null);
  const [multiCaptureImages, setMultiCaptureImages] = useState([]);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [liveCameraClassId, setLiveCameraClassId] = useState(null);
  const [showPiOptionsModal, setShowPiOptionsModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [captureMode, setCaptureMode] = useState(null); // 'single' or 'batch'
  const [showBatchPreview, setShowBatchPreview] = useState(false);
  const [pendingBatchClassId, setPendingBatchClassId] = useState(null);
  const [pendingSingleImage, setPendingSingleImage] = useState(null);
  const [liveCameraKey, setLiveCameraKey] = useState(0);
  const [lastCapturedImage, setLastCapturedImage] = useState(null);

  useEffect(() => {
    if (notification.visible && notification.type !== 'loading') {
      const timer = setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 2000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible, notification.type]);

  const handleAddClass = () => {
    const newId = classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 1;
    setClasses([...classes, { id: newId, name: '', images: [] }]);
  };

  const handleDeleteClass = id => setClasses(classes.filter(c => c.id !== id));

  const handlePickFromGallery = async classId => {
    setShowSourceModalForClass(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (!result.canceled) {
        setClasses(arr => arr.map(c => c.id === classId ? { ...c, images: [...c.images, ...result.assets.map(a => a.uri)] } : c));
      }
    } catch {
      setNotification({ visible: true, message: 'Failed to pick images', type: 'error' });
    }
  };

  const handleTakePhoto = classId => {
    setMultiCaptureClassId(classId);
    setMultiCaptureImages([]);
    setShowMultiCaptureModal(true);
  };

  const handleMultiCapturePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) setMultiCaptureImages(prev => [...prev, result.assets[0].uri]);
    } catch {
      setNotification({ visible: true, message: 'Failed to take photo', type: 'error' });
    }
  };

  const handleMultiCaptureDone = () => {
    setClasses(arr => arr.map(c => c.id === multiCaptureClassId ? { ...c, images: [...c.images, ...multiCaptureImages] } : c));
    setShowMultiCaptureModal(false);
    setMultiCaptureClassId(null);
    setMultiCaptureImages([]);
  };

  const handleCaptureFromRaspberryPi = (classId) => {
    setShowSourceModalForClass(null);
    setSelectedClassId(classId);
    setShowPiOptionsModal(true);
  };

  const handleSingleImageCapture = () => {
    console.log('handleSingleImageCapture: selectedClassId', selectedClassId);
    setShowPiOptionsModal(false);
    setLiveCameraClassId(selectedClassId);
    setCaptureMode('single');
    setLiveCameraKey(prev => prev + 1); // Force remount
    setLastCapturedImage(null); // Reset last captured image
    setShowLiveCamera(true);
  };

  const handleBatchCapture = () => {
    setShowPiOptionsModal(false);
    setPendingBatchClassId(selectedClassId);
    setShowBatchPreview(true);
  };

  const handleStartBatchCapture = async () => {
    setShowBatchPreview(false);
    setLiveCameraClassId(pendingBatchClassId);
    setCaptureMode('batch');
    setShowLiveCamera(false); // Ensure not showing old modal
    setNotification({ visible: true, message: 'Capturing 10 images from Raspberry Pi...', type: 'loading' });
    try {
      const response = await fetch(`${RPI_URL}/dataset`);
      if (!response.ok) throw new Error('Failed to capture dataset from Raspberry Pi');
      const blob = await response.blob();
      const reader = new FileReader();
      let didFinish = false;
      const timeout = setTimeout(() => {
        if (!didFinish) {
          setNotification({ visible: true, message: 'Timed out reading images from Raspberry Pi', type: 'error' });
          setPendingBatchClassId(null);
        }
      }, 20000); // 20 seconds timeout
      reader.onerror = () => {
        clearTimeout(timeout);
        setNotification({ visible: true, message: 'Failed to read images from Raspberry Pi', type: 'error' });
        setPendingBatchClassId(null);
      };
      reader.onload = async () => {
        clearTimeout(timeout);
        didFinish = true;
        try {
          const base64data = reader.result.split(',')[1];
          const zipPath = `${FileSystem.cacheDirectory}dataset_images_${Date.now()}.zip`;
          await FileSystem.writeAsStringAsync(zipPath, base64data, { encoding: FileSystem.EncodingType.Base64 });
          // Unzip using fflate
          const unzipDir = `${FileSystem.cacheDirectory}dataset_images_${Date.now()}`;
          const imageUris = await unzipWithFflate(zipPath, unzipDir);
          if (imageUris.length === 0) {
            setNotification({ visible: true, message: 'No images found in the zip file', type: 'error' });
            setPendingBatchClassId(null);
            return;
          }
          setClasses(classes.map(cls =>
            cls.id === pendingBatchClassId
              ? { ...cls, images: [...cls.images, ...imageUris] }
              : cls
          ));
          setNotification({ visible: true, message: `Captured ${imageUris.length} images from Raspberry Pi`, type: 'success' });
          setPendingBatchClassId(null);
        } catch (err) {
          setNotification({ visible: true, message: `Failed to process images: ${err.message}`, type: 'error' });
          setPendingBatchClassId(null);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      setNotification({ visible: true, message: `Failed: ${error.message}`, type: 'error' });
      setPendingBatchClassId(null);
    }
  };

  const handleLiveCameraCapture = async () => {
    if (liveCameraClassId) {
      if (captureMode === 'single') {
        // Single image capture from RPi (identical to classify page)
        setNotification({ visible: true, message: 'Capturing image from Raspberry Pi...', type: 'loading' });
        try {
          const response = await fetch(`${RPI_URL}/capture`);
          if (!response.ok) throw new Error('Failed to capture image from Raspberry Pi');
          const blob = await response.blob();
          const fileReaderInstance = new FileReader();
          fileReaderInstance.readAsDataURL(blob);
          fileReaderInstance.onload = async () => {
            const base64data = fileReaderInstance.result.split(',')[1];
            const fileUri = `${FileSystem.cacheDirectory}rpi_capture_${Date.now()}.jpg`;
            await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
            setPendingSingleImage(fileUri); // Store temporarily
            setLastCapturedImage(fileUri); // Track last captured image
            setNotification({ visible: true, message: 'Image captured. Confirm to add to class.', type: 'success' });
          };
        } catch (error) {
          setNotification({ visible: true, message: `Failed: ${error.message}`, type: 'error' });
        }
      } else if (captureMode === 'batch') {
        // Batch capture from RPi
        setNotification({ visible: true, message: 'Capturing 10 images from Raspberry Pi...', type: 'loading' });
        try {
          const response = await fetch(`${RPI_URL}/dataset`);
          if (!response.ok) throw new Error('Failed to capture dataset from Raspberry Pi');
          const blob = await response.blob();
          // Save ZIP to file
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onload = async () => {
            const base64data = reader.result.split(',')[1];
            const zipPath = `${FileSystem.cacheDirectory}dataset_images_${Date.now()}.zip`;
            await FileSystem.writeAsStringAsync(zipPath, base64data, { encoding: FileSystem.EncodingType.Base64 });
            // Unzip
            const unzipDir = `${FileSystem.cacheDirectory}dataset_images_${Date.now()}`;
            await unzipWithFflate(zipPath, unzipDir);
            const imageFiles = await FileSystem.readDirectoryAsync(unzipDir);
            const imageUris = imageFiles.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')).map(f => `${unzipDir}/${f}`);
            setClasses(classes.map(cls =>
              cls.id === liveCameraClassId
                ? { ...cls, images: [...cls.images, ...imageUris] }
                : cls
            ));
            setNotification({ visible: true, message: `Captured ${imageUris.length} images from Raspberry Pi`, type: 'success' });
          };
        } catch (error) {
          setNotification({ visible: true, message: `Failed: ${error.message}`, type: 'error' });
        }
      }
    }
  };

  const handleLiveCameraClose = () => {
    setShowLiveCamera(false);
    setLiveCameraClassId(null);
    setCaptureMode(null);
  };

  const handleMultiCaptureCancel = () => {
    setShowMultiCaptureModal(false);
    setMultiCaptureClassId(null);
    setMultiCaptureImages([]);
  };

  const handlePickImages = (classId) => {
    setShowSourceModalForClass(classId);
  };

  const handleTrain = async () => {
    if (!modelName || !modelDescription ) {
      setNotification({ visible: true, message: 'Please fill all fields', type: 'error' });
      return;
    }
    if (classes.some(c => c.images.length === 0)) {
      setNotification({ visible: true, message: 'Add images for all classes', type: 'error' });
      return;
    }
    const classesNames=classes.map(c=>c.name)
    const namesSet= new Set(classesNames)
   
    if(namesSet.size!==classesNames.length) {setNotification({ visible: true, message: 'each class should have a unique name', type: 'error' });
    return;}

    setLoading(true);
    setNotification({ visible: true, message: 'Training model…', type: 'loading' });
    try {
      const formData = new FormData();
      formData.append('modelName', modelName);
      formData.append('modelDescription', modelDescription);
      formData.append('category', category);
      formData.append('modelArch', modelArch);
      formData.append('classesCount', classes.length);
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        formData.append(`class_name_${i}`, cls.name);
        for (let j = 0; j < cls.images.length; j++) {
          const uri = cls.images[j];
          const lower = uri.toLowerCase();
          const format = lower.endsWith('.png') ? 'png' : 'jpeg';
          try {
            const manipulated = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.9, format: format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG });
            formData.append(`class_dataset_${i}`, { uri: manipulated.uri, type: format === 'png' ? 'image/png' : 'image/jpeg', name: `image_${j}.${format}` });
          } catch {
            setNotification({ visible: true, message: `Skipped ${uri.split('/').pop()}`, type: 'error' });
          }
        }
      }
      const token = await AsyncStorage.getItem('token');
      await trainModel(formData, token);
      setNotification({ visible: true, message: 'Model trained!', type: 'success', actions: [{ label: 'Browse Models', type: 'primary', onClick: () => navigation.navigate('Browse Models') }] });
    } catch (err) {
      console.error(err);
      setNotification({ visible: true, message: err.message || 'Training failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSingleImage = () => {
    console.log('handleConfirmSingleImage: liveCameraClassId', liveCameraClassId, 'selectedClassId', selectedClassId, 'pendingSingleImage', pendingSingleImage, 'classes', classes);
    const classId = liveCameraClassId != null ? liveCameraClassId : selectedClassId;
    if (pendingSingleImage && classId != null) {
      setClasses(prevClasses =>
        prevClasses.map(cls =>
          String(cls.id) === String(classId)
            ? { ...cls, images: [...cls.images, pendingSingleImage] }
            : cls
        )
      );
      setNotification({ visible: true, message: 'Image added to class', type: 'success' });
    }
    setPendingSingleImage(null);
    setShowLiveCamera(false);
    setLiveCameraClassId(null);
    setCaptureMode(null);
    setLastCapturedImage(null);
  };

  return (
    <View style={{ flex: 1 }}>
      {notification.visible && (
        <View style={styles.notificationOverlay}>
          <Notification
            visible={notification.visible}
            message={notification.message}
            type={notification.type}
            actions={notification.actions}
            onClose={() => setNotification({ ...notification, visible: false })}
          />
        </View>
      )}
      <LiveCameraView
        key={liveCameraKey}
        visible={showLiveCamera}
        onClose={handleLiveCameraClose}
        onCapture={handleLiveCameraCapture}
        mode={captureMode}
        lastImage={lastCapturedImage}
      />
      <Modal visible={showBatchPreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 28 }]}> 
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>Live Preview - Raspberry Pi</Text>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
              <LiveCameraView visible={true} onClose={() => setShowBatchPreview(false)} mode="batch" onCapture={() => {}} />
            </View>
            <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4caf50' }]} onPress={handleStartBatchCapture}>
              <Text style={[styles.modalButtonText, { fontSize: 16 }]}>Start 10-Image Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancelButton, { width: '100%', marginTop: 8, paddingVertical: 12, borderRadius: 10 }]} onPress={() => setShowBatchPreview(false)}>
              <Text style={[styles.modalCancelButtonText, { fontSize: 16 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Train New Model</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Model Name"
          placeholderTextColor="#bbb"
          value={modelName}
          onChangeText={setModelName}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Model Description"
          placeholderTextColor="#bbb"
          value={modelDescription}
          onChangeText={setModelDescription}
          multiline
          numberOfLines={4}
        />
        
        <View style={styles.pickersRow}>
          <View style={styles.pickerCompactContainer}>
            <Text style={styles.pickerLabel}>Architecture</Text>
            <DropDownPicker
              open={modelArchOpen}
              value={modelArch}
              items={modelArchitectures.map(opt => ({
                label: opt.label,
                value: opt.value,
                disabled: !!opt.disabled,
              }))}
              setOpen={setModelArchOpen}
              setValue={setModelArch}
              setItems={() => {}}
              placeholder="Architecture"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              theme="DARK"
              zIndex={3000}
              zIndexInverse={1000}
              listMode="SCROLLVIEW"
            />
          </View>
          <View style={styles.pickerCompactContainer}>
            <Text style={styles.pickerLabel}>Category</Text>
            <DropDownPicker
              open={categoryOpen}
              value={category}
              items={categories.map(opt => ({
                label: opt.label,
                value: opt.value,
              }))}
              setOpen={setCategoryOpen}
              setValue={setCategory}
              setItems={() => {}}
              placeholder="Select a category"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              theme="DARK"
              zIndex={2000}
              zIndexInverse={2000}
              listMode="SCROLLVIEW"
            />
          </View>
        </View>

        {classes.map((cls, idx) => (
          <View key={idx} style={styles.classContainer}>
            <Text style={styles.classTitle}>Class {cls.id}</Text>
            <TextInput
              style={styles.input}
              placeholder="Class name"
              placeholderTextColor="#bbb"
              value={cls.name}
              onChangeText={(text) => {
                const updatedClasses = [...classes];
                updatedClasses[idx] = { ...updatedClasses[idx], name: text };
                setClasses(updatedClasses);
              }}
            />
            <TouchableOpacity 
              style={styles.imageButton} 
              onPress={() => handlePickImages(cls.id)}
            >
              <Text style={styles.buttonText}>Add Images</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: '#757575', marginBottom: 8 }]}
              onPress={() => {
                const updatedClasses = [...classes];
                updatedClasses[idx] = { ...updatedClasses[idx], images: [] };
                setClasses(updatedClasses);
              }}
            >
              <Text style={styles.buttonText}>Clear Images</Text>
            </TouchableOpacity>
            <Text style={styles.imageCount}>
              {cls.images.length} images selected
            </Text>
            {classes.length > 2 && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteClass(cls.id)}
              >
                <Text style={styles.deleteButtonText}>Delete Class</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
          <Text style={styles.buttonText}>Add Class</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modernButton} onPress={handleTrain} disabled={loading}>
          <Text style={styles.modernButtonText}>{loading ? 'Training...' : 'Train Model'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={!!showSourceModalForClass} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 28 }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>Select Image Source</Text>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10 }]} onPress={() => handleTakePhoto(showSourceModalForClass)}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>📷  Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10 }]} onPress={() => handlePickFromGallery(showSourceModalForClass)}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>🖼️  Select from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4caf50' }]} onPress={() => handleCaptureFromRaspberryPi(showSourceModalForClass)}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>🍓  Capture from Raspberry Pi</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.modalCancelButton, { width: '100%', marginTop: 8, paddingVertical: 12, borderRadius: 10 }]} onPress={() => setShowSourceModalForClass(null)}>
              <Text style={[styles.modalCancelButtonText, { fontSize: 16 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showMultiCaptureModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Take Multiple Photos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {multiCaptureImages.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={{ width: 60, height: 60, margin: 4, borderRadius: 6 }} />
              ))}
            </View>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
              {multiCaptureImages.length === 0 ? (
                <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 8 }]} onPress={handleMultiCapturePhoto}>
                  <Text style={styles.modalButtonText}>Take Photo</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 8 }]} onPress={handleMultiCapturePhoto}>
                    <Text style={styles.modalButtonText}>Take Another Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 8 }]} onPress={handleMultiCaptureDone} disabled={multiCaptureImages.length === 0}>
                    <Text style={styles.modalButtonText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <TouchableOpacity style={[styles.modalCancelButton, { width: '100%', marginTop: 8 }]} onPress={handleMultiCaptureCancel}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showPiOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 28 }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>
              Raspberry Pi Capture Options
            </Text>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity 
                style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2196f3' }]} 
                onPress={handleSingleImageCapture}
              >
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>📷  Single Image (Live Preview)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4caf50' }]} 
                onPress={handleBatchCapture}
              >
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>📸  Batch Capture (10 Images)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.modalCancelButton, { width: '100%', marginTop: 8, paddingVertical: 12, borderRadius: 10 }]} 
              onPress={() => setShowPiOptionsModal(false)}
            >
              <Text style={[styles.modalCancelButtonText, { fontSize: 16 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {pendingSingleImage && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingVertical: 28 }]}> 
              <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>Confirm Image</Text>
              <Image source={{ uri: pendingSingleImage }} style={{ width: 200, height: 200, borderRadius: 10, marginBottom: 20 }} />
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4caf50' }]} onPress={handleConfirmSingleImage}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>Use Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2196f3' }]} onPress={() => {
                setPendingSingleImage(null);
                setLastCapturedImage(null);
                setShowLiveCamera(true);
                setLiveCameraKey(prev => prev + 1);
              }}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCancelButton, { width: '100%', marginTop: 8, paddingVertical: 12, borderRadius: 10 }]} onPress={() => {
                setPendingSingleImage(null);
                setLastCapturedImage(null);
                setShowLiveCamera(false);
                setLiveCameraClassId(null);
                setCaptureMode(null);
              }}>
                <Text style={[styles.modalCancelButtonText, { fontSize: 16 }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  classContainer: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
  },
  classTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  imageButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCount: {
    color: colors.secondaryText,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  modernButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    opacity: 1,
  },
  modernButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  pickerCompactContainer: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
  },
  pickerCompact: {
    height: 48,
    backgroundColor: colors.card,
    color: 'white',
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 8,
    width: '100%',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  picker: {
    height: 50,
    backgroundColor: colors.card,
    color: 'white',
    borderRadius: 8,
  },
  dropdown: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    minHeight: 44,
  },
  dropdownContainer: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  dropdownText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dropdownPlaceholder: {
    color: '#bbb',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
