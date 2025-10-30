// src/utils/arrayUtils.js
export const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'object') {
    // If it has a data property that's an array
    if (value.data && Array.isArray(value.data)) return value.data;
    // Convert object values to array
    return Object.values(value);
  }
  return [];
};

export const safeSlice = (array, start, end) => {
  const safeArray = Array.isArray(array) ? array : [];
  return safeArray.slice(start, end);
};

export const safeMap = (array, callback) => {
  const safeArray = Array.isArray(array) ? array : [];
  return safeArray.map(callback);
};

export const safeFilter = (array, callback) => {
  const safeArray = Array.isArray(array) ? array : [];
  return safeArray.filter(callback);
};