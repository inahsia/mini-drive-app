import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  Text, 
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/api';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('token-auth/', { username, password });
      await AsyncStorage.setItem('token', response.data.token);
      
      // Check if user is admin
      try {
        const statsResponse = await API.get('stats/');
        const isAdmin = statsResponse.data.is_admin;
        
        Alert.alert(
          'Login Successful', 
          isAdmin ? `Welcome back, Admin ${username}!` : `Welcome back, ${username}!`
        );
      } catch (err) {
        // If stats call fails, just proceed with login
        Alert.alert('Login Successful', `Welcome back, ${username}!`);
      }
      
      navigation.replace('Home');
    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createTestAdmin = async () => {
    Alert.alert(
      'Create Test Admin',
      'This will create a test admin account for demo purposes.\nUsername: admin\nPassword: admin123',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: async () => {
            try {
              await API.post('register/', { 
                username: 'admin', 
                password: 'admin123',
                is_staff: true 
              });
              Alert.alert(
                'Admin Created', 
                'Test admin account created successfully!\nUsername: admin\nPassword: admin123'
              );
            } catch (error) {
              Alert.alert('Error', 'Could not create admin account. It may already exist.');
            }
          }
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Mini Drive</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.adminSection}>
            <Text style={styles.adminTitle}>For Testing:</Text>
            <TouchableOpacity style={styles.adminButton} onPress={createTestAdmin}>
              <Text style={styles.adminButtonText}>Create Test Admin</Text>
            </TouchableOpacity>
            <Text style={styles.adminHint}>
              Regular users can only see their own files.{'\n'}
              Admin users can see all uploaded files.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  adminSection: {
    alignItems: 'center',
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  adminButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  adminButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  adminHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LoginScreen;
