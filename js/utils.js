export function fit(container, minRatioW, minRatioH, maxRatioW, maxRatioH) {
  let currentR = window.innerWidth / window.innerHeight;
  let minR = minRatioW / minRatioH;
  let maxR = maxRatioW / maxRatioH;

  let clampedR = Math.min(Math.max(currentR, minR), maxR);
  let width = window.innerWidth;
  let height = width / clampedR;

  if (height > window.innerHeight) {
    width = Math.min(width, Math.ceil(window.innerHeight * clampedR));
  }

  height = Math.floor(width / clampedR);

  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
}

export function saveToIndexedDB(dbName, storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const putRequest = store.put(data);

      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = (err) => reject(new Error(`Failed to save bundle: ${err.target.error}`));

      transaction.oncomplete = () => db.close();
      transaction.onerror = (err) => reject(new Error(`Transaction error: ${err.target.error}`));
    };

    request.onerror = (err) => reject(new Error(`Failed to open database: ${err.target.error}`));
  });
}

export async function getFromIndexedDB(dbName, storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        reject(new Error(`Object store ${storeName} does not exist.`));
        return;
      }

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = (err) => reject(err);
    };

    request.onerror = (err) => reject(err);
  });
}

export async function clearIndexedDB() {
  try {
    const request = indexedDB.deleteDatabase('AssetBundlesDB');
    request.onsuccess = () => console.log('IndexedDB cleared successfully.');
    request.onerror = (err) => {
      console.error('Failed to clear IndexedDB:', err);
      showWebAppAlert('Failed to clear application cache. Please restart the app.');
    };
  } catch (error) {
    console.error('Error while clearing IndexedDB:', error);
    showWebAppAlert('An unexpected error occurred while clearing cache.');
  }
}

export async function fetchBundle(bundleUrl) {
  const response = await fetch(bundleUrl);
  if (!response.ok) {
    throw new Error(`Failed to load bundle: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

export function showWebAppAlert(message, callback = () => {}) {
  const webApp = window.Telegram?.WebApp;

  if (!webApp || typeof webApp.showAlert !== 'function') {
    console.error('Telegram WebApp or showAlert method is not available.');
    return;
  }

  webApp.showAlert(message, callback);
}

export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('Localization', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('localization')) {
        db.createObjectStore('localization', { keyPath: 'key' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export function saveTranslationData(db, languageCode, data) {
  return new Promise((resolve, reject) => {
    const key = `translation_data_${languageCode}`;
    const transaction = db.transaction('localization', 'readwrite');
    const store = transaction.objectStore('localization');
    const putRequest = store.put({ key, ...data });

    putRequest.onsuccess = () => {
      resolve();
    };

    putRequest.onerror = (err) => {
      reject(err.target.error);
    };

    transaction.oncomplete = () => db.close();
  });
}

export async function getTranslationsDB(languageCode) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const key = `translation_data_${languageCode}`;
    if (!db.objectStoreNames.contains('localization')) {
      reject(new Error(`Object store localization does not exist.`));
      return;
    }
    const transaction = db.transaction('localization', 'readonly');
    const store = transaction.objectStore('localization');
    const getRequest = store.get(key);

    getRequest.onsuccess = () => {
      resolve(getRequest.result || null);
    };
    getRequest.onerror = (err) => reject(err.target.error);

    transaction.oncomplete = () => db.close();
  });
}
