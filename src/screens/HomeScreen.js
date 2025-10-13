import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image,
  Linking,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Modal,
  ScrollView,
  Share,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
import API from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { encryptFileData, decryptFileData } from '../utils/encryption';

const HomeScreen = ({ navigation }) => {
  const [files, setFiles] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  // Simplified authenticated image component - direct approach
  const AuthenticatedImage = ({ source, style, ...props }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // For now, let's try the direct approach with token in URL
    const getAuthenticatedUrl = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token && source?.uri) {
          // Add token as query parameter for testing
          const separator = source.uri.includes('?') ? '&' : '?';
          return `${source.uri}${separator}token=${token}`;
        }
        return source?.uri;
      } catch (error) {
        console.log('Error getting token:', error);
        return source?.uri;
      }
    };

    const [authenticatedUri, setAuthenticatedUri] = useState(null);

    useEffect(() => {
      const setupUri = async () => {
        const uri = await getAuthenticatedUrl();
        setAuthenticatedUri(uri);
        console.log('Using authenticated URI:', uri);
      };
      setupUri();
    }, [source?.uri]);

    if (!authenticatedUri) {
      return (
        <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#666' }}>Loading...</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: authenticatedUri }}
        style={style}
        onLoad={() => {
          setLoading(false);
          setError(false);
          console.log('Image loaded successfully');
        }}
        onError={(err) => {
          setLoading(false);
          setError(true);
          console.log('Image loading error:', err);
        }}
        onLoadStart={() => {
          setLoading(true);
          console.log('Image loading started');
        }}
        {...props}
      />
    );
  };

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
      // Add cache buster to force fresh data
      const cacheBuster = Date.now();
      const response = await API.get(`files/?t=${cacheBuster}`);
      console.log('Fetched files:', response.data.length, 'files');
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

      const response = await API.put(`files/${fileId}/replace/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Replace response:', response.data);
      
      Alert.alert('Success', 'File replaced successfully!');
      
      // Force refresh after a small delay to ensure backend has processed
      setTimeout(() => {
        fetchFiles();
        fetchUserStats();
      }, 500);
    } catch (error) {
      console.error('Replace error:', error);
      Alert.alert('Replace Failed', 'Could not replace file. Please try again.');
    }
  };

  const handleEdit = (fileId, fileName) => {
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

  const handleShareFile = async (item) => {
    try {
      Alert.alert(
        'Download and Share',
        `This will download "${item.original_name}" to your device and open the share menu.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download & Share', onPress: () => downloadAndShareFile(item) },
        ]
      );
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Could not share file. Please try again.');
    }
  };

  const downloadAndShareFile = async (item) => {
    try {
      // Request storage permission for Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Mini Drive needs storage permission to download files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required to download files');
          return;
        }
      }

      // Show loading
      Alert.alert('Downloading...', 'Please wait while we download your file.');

      const token = await AsyncStorage.getItem('token');
      const fileUrl = __DEV__ 
        ? `http://10.0.2.2:8000/api/files/${item.id}/serve/?token=${token}`
        : `https://mini-drive-app.onrender.com/api/files/${item.id}/serve/?token=${token}`;

      // Create downloads directory path
      const downloadDir = RNFS.DownloadDirectoryPath;
      const fileName = item.original_name;
      const filePath = `${downloadDir}/MiniDrive_${fileName}`;

      console.log('Downloading file to:', filePath);

      // Download the file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: filePath,
        headers: {
          'Authorization': `Token ${token}`,
        },
      }).promise;

      console.log('Download result:', downloadResult);

      if (downloadResult.statusCode === 200) {
        // File downloaded successfully, now share it
        const shareOptions = {
          title: 'Share File from Mini Drive',
          message: `Sharing: ${item.original_name}`,
          url: `file://${filePath}`,
        };

        await Share.share(shareOptions);

        Alert.alert(
          'Success!', 
          `File downloaded and shared successfully!\n\nSaved to: Downloads/MiniDrive_${fileName}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download and share error:', error);
      Alert.alert('Download Failed', 'Could not download file for sharing. Please try again.');
    }
  };



  const handleShareViewOnly = async (item) => {
    try {
      const shareOptions = {
        title: 'Share File Link - View Only',
        message: `View this file from Mini Drive: ${item.original_name}\n\nNote: This is a view-only link from Mini Drive app.`,
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error('Share view only error:', error);
      Alert.alert('Share Failed', 'Could not share file link. Please try again.');
    }
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

  const handleFilePress = (item) => {
    setSelectedFile(item);
    setMenuVisible(true);
  };

  const handleViewFile = async (item) => {
    try {
      // Use authenticated API endpoint to serve files
      const fileUrl = __DEV__ 
        ? `http://10.0.2.2:8000/api/files/${item.id}/serve/`
        : `https://mini-drive-app.onrender.com/api/files/${item.id}/serve/`;
      
      console.log('File URL:', fileUrl);
      
      // Check if it's an image file
      const isImage = item.file.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
      
      if (isImage) {
        // Show in modal for images
        setSelectedImage({
          ...item,
          url: fileUrl
        });
        setImageViewerVisible(true);
      } else {
        // Try to open externally for other files
        Linking.openURL(fileUrl).catch((error) => {
          console.error('Error opening file:', error);
          Alert.alert('Error', 'Cannot open this file type');
        });
      }
    } catch (error) {
      console.error('Error in handleViewFile:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const renderFile = ({item}) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => handleViewFile(item)}>
      <AuthenticatedImage 
        source={{
          uri: __DEV__ 
            ? `http://10.0.2.2:8000/api/files/${item.id}/serve/?v=${item.uploaded_at}`
            : `https://mini-drive-app.onrender.com/api/files/${item.id}/serve/?v=${item.uploaded_at}`
        }} 
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
          style={styles.dropdownButton}
          onPress={(e) => {
            e.stopPropagation();
            handleFilePress(item);
          }}
        >
          <View style={styles.dotsContainer}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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

      <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
        <View style={styles.uploadIcon}>
          <Text style={styles.uploadIconText}>+</Text>
        </View>
        <Text style={styles.uploadButtonText}>Upload File</Text>
      </TouchableOpacity>
      
      <FlatList
        data={files}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderFile}
        style={styles.fileList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.fileListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No files uploaded yet</Text>
            <Text style={styles.emptySubText}>Tap "Upload File" to get started</Text>
          </View>
        }
      />
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedImage?.original_name || 'Image'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImageViewerVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {selectedImage && (
              <ScrollView 
                style={styles.imageScrollView}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <AuthenticatedImage
                  source={{ uri: selectedImage.url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onLoad={() => console.log('Image loaded successfully:', selectedImage.url)}
                  onError={(error) => {
                    console.log('Image loading error:', error);
                    console.log('Image URL:', selectedImage.url);
                  }}
                  onLoadStart={() => console.log('Image loading started:', selectedImage.url)}
                />
                <Text style={styles.debugText}>
                  URL: {selectedImage.url}
                </Text>
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <Text style={styles.imageInfo}>
                Size: {((selectedImage?.file_size || 0) / 1024).toFixed(1)} KB
              </Text>
              <Text style={styles.imageInfo}>
                Uploaded: {selectedImage?.uploaded_at ? new Date(selectedImage.uploaded_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* File Options Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{selectedFile?.original_name}</Text>
              <Text style={styles.menuSubtitle}>Choose an action</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                handleViewFile(selectedFile);
              }}
            >
              <Text style={styles.menuOptionText}>View</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                handleShareViewOnly(selectedFile);
              }}
            >
              <Text style={styles.menuOptionText}>Share Link</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                handleShareFile(selectedFile);
              }}
            >
              <Text style={styles.menuOptionText}>Share File</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                handleEdit(selectedFile?.id, selectedFile?.original_name);
              }}
            >
              <Text style={styles.menuOptionText}>Replace</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuOption, styles.deleteOption]}
              onPress={() => {
                setMenuVisible(false);
                handleDelete(selectedFile?.id, selectedFile?.original_name);
              }}
            >
              <Text style={[styles.menuOptionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuOption, styles.cancelOption]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: 0.3,
  },
  adminButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  adminButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statsText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    marginHorizontal: 20,
    marginVertical: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  uploadIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploadIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  fileItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  fileImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#f8f9fa',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: 13,
    color: '#9ca3af',
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
  dropdownButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dotsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6b7280',
    marginVertical: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  imageScrollView: {
    flex: 1,
  },
  fullImage: {
    width: '90%',
    aspectRatio: 1,
    alignSelf: 'center',
    marginVertical: 20,
  },
  modalFooter: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imageInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    margin: 10,
    padding: 5,
    backgroundColor: '#f0f0f0',
  },
  // File Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 24,
    maxWidth: 320,
    width: '85%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  menuHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuOption: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  menuOptionText: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteOption: {
    backgroundColor: '#fef2f2',
  },
  deleteText: {
    color: '#dc2626',
  },
  cancelOption: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 0,
  },
});

export default HomeScreen;
