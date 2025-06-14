import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { classifyImage, getModelClasses } from '../api/models';
import Notification from '../components/Notification';
import { colors } from '../styles/them';

export default function ClassifyImageScreen({ route, navigation }) {
  const { model } = route.params || {};
  const modelId = model?.id || route.params?.modelId;
  const [classes, setClasses] = useState([]);
  const [modelName, setModelName] = useState(model?.name || '');
  const [modelDescription, setModelDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [isOther, setIsOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });
  const [showSourceModal, setShowSourceModal] = useState(false);

  useEffect(() => {
    const loadModelClasses = async () => {
      try {
        const data = await getModelClasses(modelId);
        setClasses(data.classes);
        setModelName(data.modelName || model?.name || '');
        setModelDescription(data.modelDescription || '');
      } catch (error) {
        setNotification({
          visible: true,
          message: 'Failed to load model classes',
          type: 'error'
        });
      }
    };
    loadModelClasses();
  }, [modelId]);

  useEffect(() => {
    if (notification.visible && notification.type !== 'loading') {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification.visible, notification.type]);

  const pickImage = async () => {
    setShowSourceModal(true);
  };

  const handlePickFromGallery = async () => {
    setShowSourceModal(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (result.canceled) return;
      setSelectedImage(result.assets[0].uri);
      setClassificationResult(null);
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Failed to pick image. Please try again.',
        type: 'error'
      });
    }
  };

  const handleTakePhoto = async () => {
    setShowSourceModal(false);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (result.canceled) return;
      setSelectedImage(result.assets[0].uri);
      setClassificationResult(null);
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Failed to take photo. Please try again.',
        type: 'error'
      });
    }
  };

  const handleCaptureFromRaspberryPi = () => {
    setNotification({
      visible: true,
      message: 'Raspberry Pi capture not implemented yet.',
      type: 'info'
    });
    setShowSourceModal(false);
  };

  const handleClassify = async () => {
    if (!selectedImage) {
      setNotification({
        visible: true,
        message: 'Please select an image first',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setNotification({
      visible: true,
      message: 'Classifying image, please wait...',
      type: 'loading'
    });
    try {
      const data = await classifyImage(modelId, selectedImage);
      console.log('Classification result:', data);
      setClassificationResult({
        label: data.result,
        confidences: data.confidences,
        isOther:data.isOther
      });
      if(data.isOther){
        setIsOther(true)
      setClasses([...classes,'Other / uncertain'])

      }

      setNotification({
        visible: true,
        message: `Image classified as: ${data.result}`,
        type: 'success'
      });
    } catch (error) {
      setNotification({
        visible: true,
        message: 'Classification failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Notification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        actions={notification.actions}
        onClose={() => setNotification({ ...notification, visible: false })}
      />

      <Modal visible={showSourceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 28 }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>Select Image Source</Text>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10 }]} onPress={handleTakePhoto}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>📷  Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10 }]} onPress={handlePickFromGallery}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>🖼️  Select from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { width: '100%', marginBottom: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4caf50' }]} onPress={handleCaptureFromRaspberryPi}>
                <Text style={[styles.modalButtonText, { fontSize: 16 }]}>🍓  Capture from Raspberry Pi</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.modalCancelButton, { width: '100%', marginTop: 8, paddingVertical: 12, borderRadius: 10 }]} onPress={() => setShowSourceModal(false)}>
              <Text style={[styles.modalCancelButtonText, { fontSize: 16 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modelInfo}>
          <Text style={styles.modelLabel}>{modelName}</Text>
         
            <Text style={styles.modelDesc}>{modelDescription}</Text>
         
        </View>

        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.image} />
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Image
                source={require('../assets/upload-image-for-classification.png')}
                style={styles.uploadImage}
                resizeMode="contain"
              />
              <Text style={styles.uploadText}>Select Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.classesList}>
          {classes.map((classItem, index) => {
            const confidence = classificationResult ? classificationResult.confidences[index] : 1;
            const isSelected = classificationResult && classificationResult.label === classItem;
            return (
              <View
                key={index}
                style={[
                  styles.classBox,
                  isSelected && styles.classBoxSelected,
                  { flex: confidence, minWidth: 100 }
                ]}
              >
                <Text style={[styles.classBoxText, isSelected && styles.classBoxTextSelected]}>
                  {classItem}
                </Text>
                {classificationResult && (
                  <Text style={styles.confidenceValue}>
                    { isOther && classificationResult.label === classItem ? 'Model not sure':  (confidence * 100).toFixed(1)+'%'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.classifyButton} onPress={handleClassify} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Classifying...' : 'Classify Image'}</Text>
        </TouchableOpacity>

        {classificationResult && (
          <TouchableOpacity style={styles.classifyButton} onPress={() => { setSelectedImage(null); setClassificationResult(null); }}>
            <Text style={styles.buttonText}>Upload Another Image</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  modelInfo: {
    backgroundColor: 'rgba(240, 248, 255, 0.121)',
    width: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  modelLabel: {
    color: '#ff9800',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  modelDesc: {
    color: '#b0c4de',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 2,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 10,
  },
  uploadButton: {
    backgroundColor: 'rgba(240, 248, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    width: 220,
    height: 220,
    marginBottom: 10,
  },
  uploadImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    opacity: 0.7,
  },
  uploadText: {
    color: '#b0c4de',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    padding: 10,
    gap: 10,
    marginBottom: 24,
    justifyContent: 'center',
  },
  classBox: {
    backgroundColor: 'rgba(240, 248, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    marginBottom: 8,
    transition: 'all 0.3s',
    flexDirection: 'column',
    gap: 5,
  },
  classBoxSelected: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196f3',
    color: '#2196f3',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  classBoxText: {
    color: 'aliceblue',
    fontSize: 14,
    fontWeight: '500',
  },
  classBoxTextSelected: {
    color: '#2196f3',
  },
  confidenceValue: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
    color: 'aliceblue',
  },
  classifyButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: colors.text,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 8,
  },
  spacer: {
    height: 32,
  },
});
