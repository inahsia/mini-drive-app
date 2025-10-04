import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image,
  Linking,
  Dimensions,
  PermissionsAndroid,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
import API from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [files, setFiles] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const fetchFiles = async () => {
    try {
      const response = await API.get('files/');
      setFiles(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch files.');
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await API.get('stats/');
      setUserStats(response.data);
      setIsAdmin(response.data.is_admin);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFiles();
      fetchUserStats();
    }, [])
  );

  const handleUpload = async () => {
    Alert.alert(
      'Select File Type',
      'Choose the type of file you want to upload',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Photo Library', onPress: () => openPhotoLibrary() },
      ]
    );
  };

  const openCamera = async () => {
    // Check camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchCamera(options, (response) => {
      console.log('Camera response:', response);
      
      if (response.didCancel) {
        console.log('User cancelled camera');
        return;
      }
      
      if (response.errorMessage) {
        console.log('Camera error:', response.errorMessage);
        Alert.alert('Camera Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        uploadFile(response.assets[0]);
      } else {
        Alert.alert('Error', 'No image was captured');
      }
    });
  };

  const openPhotoLibrary = () => {
    const options = {
      mediaType: 'photo', // Only photos
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      includeBase64: false,
      selectionLimit: 1,
    };

    console.log('Opening photo library with options:', options);

    launchImageLibrary(options, (response) => {
      console.log('Photo library response:', response);
      
      if (response.didCancel) {
        console.log('User cancelled photo picker');
        return;
      }
      
      if (response.errorMessage) {
        console.log('Photo library error:', response.errorMessage);
        Alert.alert('Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        console.log('Selected photo:', response.assets[0]);
        uploadFile(response.assets[0]);
      } else {
        console.log('No photo selected');
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'mixed', // Allows both photos and videos
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      includeBase64: false,
      selectionLimit: 1,
    };

    console.log('Opening gallery with options:', options);

    launchImageLibrary(options, (response) => {
      console.log('Gallery response:', response);
      
      if (response.didCancel) {
        console.log('User cancelled gallery picker');
        return;
      }
      
      if (response.errorMessage) {
        console.log('Gallery error:', response.errorMessage);
        Alert.alert('Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        console.log('Selected file:', response.assets[0]);
        uploadFile(response.assets[0]);
      } else {
        console.log('No file selected');
        Alert.alert('Error', 'No file selected');
      }
    });
  };

  const uploadFile = async (file) => {
    try {
      // Check file size (10MB limit)
      if (file.fileSize && file.fileSize > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size cannot exceed 10MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.fileName || 'uploaded_file',
      });

      console.log('Uploading file:', file.fileName, file.type, file.fileSize);

      await API.post('files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'File uploaded successfully!');
      fetchFiles();
      fetchUserStats();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload file. Please try again.');
    }
  };

  const handleDelete = (fileId, fileName) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`files/${fileId}/`);
              Alert.alert('Success', 'File deleted successfully!');
              fetchFiles();
              fetchUserStats();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Could not delete file.');
            }
          }
        },
      ]
    );
  };

  const handleReplaceFile = (fileId, fileName) => {
    Alert.alert(
      'Replace File',
      `Replace "${fileName}" with a new file?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => openCameraForReplace(fileId) },
        { text: 'Gallery', onPress: () => openGalleryForReplace(fileId) },
      ]
    );
  };

  const openCameraForReplace = async (fileId) => {
    // Check camera permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchCamera(options, (response) => {
      console.log('Camera response for replace:', response);
      
      if (response.didCancel) {
        console.log('User cancelled camera');
        return;
      }
      
      if (response.errorMessage) {
        console.log('Camera error:', response.errorMessage);
        Alert.alert('Camera Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        console.log('Camera file selected for replace:', response.assets[0]);
        replaceFile(fileId, response.assets[0]);
      } else {
        Alert.alert('Error', 'No image was captured');
      }
    });
  };

  const openGalleryForReplace = (fileId) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      
      if (response.assets && response.assets[0]) {
        replaceFile(fileId, response.assets[0]);
      }
    });
  };

  const replaceFile = async (fileId, newFile) => {
    try {
      // Check file size (10MB limit)
      if (newFile.fileSize && newFile.fileSize > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size cannot exceed 10MB');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: newFile.uri,
        type: newFile.type,
        name: newFile.fileName || 'replaced_file',
      });

      console.log('Replacing file:', fileId, newFile.fileName);

      await API.put(`files/${fileId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'File replaced successfully!');
      fetchFiles();
      fetchUserStats();
    } catch (error) {
      console.error('Replace error:', error);
      Alert.alert('Replace Failed', 'Could not replace file. Please try again.');
    }
  };

  const handleEdit = (fileId, fileName) => {
    Alert.alert(
      'Edit File',
      `What would you like to do with "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace File', onPress: () => handleReplaceFile(fileId, fileName) },
      ]
    );
  };

  const renameFile = (fileId, currentName) => {
    // Note: This would require updating the backend to support renaming
    Alert.alert('Rename Feature', 'Rename functionality will be added in the next update.');
  };

  const openFile = (fileUrl) => {
    if (fileUrl) {
      Linking.openURL(fileUrl).catch(err => {
        console.error('Could not open file:', err);
        Alert.alert('Error', 'Could not open file');
      });
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  const navigateToAdmin = () => {
    navigation.navigate('AdminPanel');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    const ext = fileName.toLowerCase().substr(fileName.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };

  const renderFile = ({item}) => (
    <View style={styles.fileItem}>
      <Image 
        source={{uri: `http://10.0.2.2:8000${item.file}`}} 
        style={styles.fileImage} 
      />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>{item.original_name}</Text>
        <Text style={styles.fileSize}>{(item.file_size / 1024).toFixed(1)} KB</Text>
        <Text style={styles.fileDate}>
          {new Date(item.uploaded_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.fileActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item.id, item.original_name)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.original_name)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Files</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.adminButton} onPress={navigateToAdmin}>
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        {isAdmin ? (
          <Text style={styles.statsText}>
            Total Users: {userStats.total_users} | Total Files: {userStats.total_files}
          </Text>
        ) : (
          <Text style={styles.statsText}>
            My Files: {userStats.user_files_count || 0}
          </Text>
        )}
      </View>

      <Button title="Upload Image/Photo" onPress={handleUpload} />
      
      <FlatList
        data={files}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderFile}
        style={styles.fileList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No files uploaded yet</Text>
            <Text style={styles.emptySubText}>Tap "Upload File" to get started</Text>
          </View>
        }
      />
      
      <Button title="Logout" onPress={handleLogout} color="#ff6b6b" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  adminButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  adminButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  statsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#1976d2',
  },
  fileList: {
    flex: 1,
    marginVertical: 15,
  },
  fileItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fileImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: 12,
    color: '#888',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: '#007bff',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});

export default HomeScreen;
