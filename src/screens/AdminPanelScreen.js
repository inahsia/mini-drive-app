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
  RefreshControl 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/api';

const AdminPanelScreen = ({ navigation }) => {
  const [allFiles, setAllFiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllFiles = async () => {
    try {
      const response = await API.get('admin/files/');
      setAllFiles(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch files. Make sure you have admin privileges.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllFiles();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllFiles();
    setRefreshing(false);
  }, []);

  const openFile = (fileUrl) => {
    if (fileUrl) {
      Linking.openURL(fileUrl).catch(err => {
        console.error('Could not open file:', err);
        Alert.alert('Error', 'Could not open file');
      });
    }
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

  const groupFilesByUser = (files) => {
    return files.reduce((acc, file) => {
      const username = file.owner_username;
      if (!acc[username]) {
        acc[username] = [];
      }
      acc[username].push(file);
      return acc;
    }, {});
  };

  const renderUserSection = (username, userFiles) => (
    <View key={username} style={styles.userSection}>
      <Text style={styles.username}>User: {username} ({userFiles.length} files)</Text>
      {userFiles.map((file) => (
        <TouchableOpacity 
          key={file.id}
          style={styles.fileItem}
          onPress={() => openFile(file.file_url)}
        >
          <View style={styles.fileContent}>
            {isImageFile(file.original_name) && file.file_url && (
              <Image 
                source={{ uri: file.file_url }} 
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={2}>
                {file.original_name || 'Unknown file'}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(file.file_size)}
              </Text>
              <Text style={styles.uploadDate}>
                {new Date(file.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const groupedFiles = groupFilesByUser(allFiles);
  const userSections = Object.entries(groupedFiles).map(([username, files]) => 
    renderUserSection(username, files)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total Files: {allFiles.length} | Users with Files: {Object.keys(groupedFiles).length}
        </Text>
      </View>

      <FlatList
        data={userSections}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => item}
        style={styles.fileList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No files found</Text>
            <Text style={styles.emptySubText}>Users haven't uploaded any files yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  statsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  fileList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  userSection: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  fileItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
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

export default AdminPanelScreen;