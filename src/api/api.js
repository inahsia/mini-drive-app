import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = axios.create({
  baseURL: 'http://10.0.2.2:8000/api/', // Android emulator
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
  return config;
});

API.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default API;
