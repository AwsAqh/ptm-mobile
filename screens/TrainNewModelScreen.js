import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { trainModel } from '../api/train';
import Notification from '../components/Notification';
import { colors } from '../styles/them';

const categories = [
  { value: 'plants', label: 'Plants' },
  { value: 'animals_diseases', label: 'Animals diseases' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

const modelArchitectures = [
  { value: '', label: 'Architecture', disabled: true },
  { value: 'resnet50', label: 'ResNet50' },
  { value: 'googlenet', label: 'Googlenet' },
  { value: 'mobilenet_v2', label: 'Mobilenet_v2' },
];

export default function TrainNewModelScreen({ navigation }) {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [category, setCategory] = useState('');
  const [classes, setClasses] = useState([
    { id: 1, name: '', images: [] },
    { id: 2, name: '', images: [] }
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

  useEffect(() => {
    if (notification.visible && notification.type !== 'loading') {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible, notification.type]);

  const handleAddClass = () => {
    const newClassId = classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 1;
    setClasses([...classes, { id: newClassId, name: '', images: [] }]);
  };

  const handleDeleteClass = (id) => {
    setClasses(classes.filter(cls => cls.id !== id));
  };

  const handlePickImages = (classId) => {
    setShowSourceModalForClass(classId);
  };

  const handlePickFromGallery = async (classId) => {
    setShowSourceModalForClass(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (!result.canceled) {
        setClasses(classes.map(cls =>
          cls.id === classId
            ? { ...cls, images: [...cls.images, ...result.assets.map(asset => asset.uri)] }
            : cls
        ));
      }
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Failed to pick images. Please try again.',
        type: 'error'
      });
    }
  };

  const handleTakePhoto = (classId) => {
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
      if (!result.canceled) {
        setMultiCaptureImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Failed to take photo. Please try again.',
        type: 'error'
      });
    }
  };

  const handleMultiCaptureDone = () => {
    setClasses(classes.map(cls =>
      cls.id === multiCaptureClassId
        ? { ...cls, images: [...cls.images, ...multiCaptureImages] }
        : cls
    ));
    setShowMultiCaptureModal(false);
    setMultiCaptureClassId(null);
    setMultiCaptureImages([]);
  };

  const handleMultiCaptureCancel = () => {
    setShowMultiCaptureModal(false);
    setMultiCaptureClassId(null);
    setMultiCaptureImages([]);
  };

  const handleCaptureFromRaspberryPi = (classId) => {
    setNotification({
      visible: true,
      message: 'Raspberry Pi capture not implemented yet.',
      type: 'info'
    });
    setShowSourceModalForClass(null);
  };

  const handleTrain = async () => {
    if (!modelName || !modelDescription || !category) {
      setNotification({
        visible: true,
        message: 'Please fill in all fields',
        type: 'error'
      });
      return;
    }

    const emptyClasses = classes.some(cls => cls.images.length === 0);
    if (emptyClasses) {
      setNotification({
        visible: true,
        message: 'Please add images for all classes',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setNotification({
      visible: true,
      message: 'Training model, please wait...',
      type: 'loading'
    });
    try {
      const formData = new FormData();
      formData.append('modelName', modelName);
      formData.append('modelDescription', modelDescription);
      formData.append('category', category);
      formData.append('modelArch', modelArch);
      formData.append('classesCount', classes.length);

      for (const [index, cls] of classes.entries()) {
        formData.append(`class_name_${index}`, cls.name);
        for (const [imageIndex, imageUri] of cls.images.entries()) {
          console.log('Processing image URI:', imageUri);
          const lower = imageUri.toLowerCase();
          let format = 'jpeg';
          if (lower.endsWith('.png')) format = 'png';
          try {
            // Try to manipulate the image
            const manipulated = await ImageManipulator.manipulateAsync(
              imageUri,
              [],
              { compress: 0.9, format: format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG }
            );
            formData.append(`class_dataset_${index}`, {
              uri: manipulated.uri,
              type: format === 'png' ? 'image/png' : 'image/jpeg',
              name: `image_${imageIndex}.${format}`,
            });
          } catch (err) {
            // If manipulation fails, show a notification and skip this image
            setNotification({
              visible: true,
              message: `Skipped image: ${imageUri.split('/').pop()} (could not process)`,
              type: 'error'
            });
            // continue; // just skip this image and keep going
          }
        }
      }

      const token = await AsyncStorage.getItem('token');
      const data = await trainModel(formData, token);
      setNotification({
        visible: true,
        message: 'Model trained successfully!',
        type: 'success',
        actions: [{
          label: 'Browse Models',
          type: 'primary',
          onClick: () => navigation.navigate('Browse Models')
        }]
      });
    } catch (error) {
      setNotification({
        visible: true,
        message: error.message || 'Training failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
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
