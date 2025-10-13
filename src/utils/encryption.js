import CryptoJS from 'crypto-js';

// Secret key for encryption (in production, this should be more secure)
const SECRET_KEY = 'MiniDrive2024SecretKey';

/**
 * Encrypt text using AES encryption
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text
 */
export const encryptText = (text) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt text');
  }
};

/**
 * Decrypt text using AES decryption
 * @param {string} encryptedText - Encrypted text to decrypt
 * @returns {string} - Decrypted text
 */
export const decryptText = (encryptedText) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt text');
  }
};

/**
 * Generate a random encryption key
 * @returns {string} - Random key
 */
export const generateRandomKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};

/**
 * Hash password using SHA256
 * @param {string} password - Password to hash
 * @returns {string} - Hashed password
 */
export const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString();
};

/**
 * Encrypt file data (for file content encryption)
 * @param {string} data - File data to encrypt
 * @param {string} customKey - Optional custom key
 * @returns {string} - Encrypted data
 */
export const encryptFileData = (data, customKey = null) => {
  const key = customKey || SECRET_KEY;
  return CryptoJS.AES.encrypt(data, key).toString();
};

/**
 * Decrypt file data
 * @param {string} encryptedData - Encrypted file data
 * @param {string} customKey - Optional custom key
 * @returns {string} - Decrypted data
 */
export const decryptFileData = (encryptedData, customKey = null) => {
  const key = customKey || SECRET_KEY;
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
};