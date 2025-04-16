import { fit, saveToIndexedDB, getFromIndexedDB, clearIndexedDB, fetchBundle } from './utils.js';
import { getPlayerData } from './api.js';

const ONBOARDING_BUNDLE_URL = window.config.ONBOARDING_BUNDLE_URL;
const MAIN_SCENE_BUNDLE_URL = window.config.MAIN_SCENE_BUNDLE_URL;
const buildUrl = "Build";
const loaderUrl = buildUrl + "/Build.loader.js";

const config = {
  dataUrl: buildUrl + "/Build.data",
  frameworkUrl: buildUrl + "/Build.framework.js",
  codeUrl: buildUrl + "/Build.wasm",
  streamingAssetsUrl: "StreamingAssets",
  companyName: "NeuraGames",
  productName: "Avatar",
  productVersion: "1.0",
};

const container = document.querySelector("#unity-container");
const canvas = document.querySelector("#unity-canvas");
const progressBarFill = document.querySelector("#progress-bar-fill");
const canvasOverlay = document.querySelector("#canvas-overlay");
const progressPercentage = document.querySelector("#progress-percentage");
const productVersionElement = document.querySelector("#product-version");
const introContainer = document.getElementById('intro-video-container');
if (introContainer) {
  introContainer.classList.add('visible');
}
const introVideo = document.getElementById('intro-video');
const skipButton = document.getElementById('skip-intro-button');

let myGameInstance = null;
let scaleToFit;

try {
  scaleToFit = !!JSON.parse("true");
} catch (e) {
  scaleToFit = false;
}

const fitGameScreen = () => {
  if (scaleToFit) {
    fit(container, 820, 2340, 1080, 1080);
  }
};

window.addEventListener('resize', fitGameScreen);

async function fetchAndCacheBundle(bundleUrl, currentVersion) {
  console.log(`Fetching and caching bundle: ${bundleUrl}`);
  try {
    const assetBundleData = await fetchBundle(bundleUrl);
    await saveToIndexedDB('AssetBundlesDB', 'bundles', { id: 'bundle', data: assetBundleData });
    localStorage.setItem('productVersion', currentVersion);
    console.log('New bundle cached successfully.');
    return assetBundleData;
  } catch (error) {
    console.error('Failed to fetch and cache bundle:', error);
    console.log('Clearing IndexedDB due to incomplete or failed update...');
    await clearIndexedDB();
    localStorage.removeItem('productVersion');
    throw error;
  }
}

async function initializeUnityInstance() {
  const isPlayerDataEmpty = await getPlayerData();
  const assetBundleUrl = isPlayerDataEmpty ? ONBOARDING_BUNDLE_URL : MAIN_SCENE_BUNDLE_URL;
  const savedVersion = localStorage.getItem('productVersion');
  const currentVersion = config.productVersion;

  if (!savedVersion || savedVersion !== currentVersion) {
    console.log(savedVersion ? `Version changed: ${savedVersion} -> ${currentVersion}` : 'First launch detected.');
    try {
      await fetchAndCacheBundle(assetBundleUrl, currentVersion);
    } catch (error) {
      console.error('Critical error: Unable to fetch and cache new bundle.');
      throw new Error('Failed to initialize Unity instance: No valid bundle available.');
    }
  } else {
    const cachedBundle = await getFromIndexedDB('AssetBundlesDB', 'bundles', 'bundle');
    if (!cachedBundle) {
      console.error('No cached bundle found, initiating new bundle download...');
      try {
        await fetchAndCacheBundle(assetBundleUrl, currentVersion);
      } catch (error) {
        console.error('Critical error: Unable to fetch new bundle after cache miss.');
        throw new Error('Failed to initialize Unity instance: No valid bundle available.');
      }
    } else {
      console.log('Using cached bundle.');
    }
  }

  return createUnityInstance(canvas, config, (progress) => {
    const percentage = Math.round(100 * progress);
    progressBarFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;

    if (scaleToFit) {
      fitGameScreen();
    }
  }).then((unityInstance) => {
    window.unityInstance = unityInstance;
    myGameInstance = unityInstance;
    progressBarFill.style.width = '100%';
    progressPercentage.textContent = '100%';
    canvasOverlay.style.display = "none";
    document.documentElement.style.background = "#000";
    document.body.style.background = "#000";

    if (introVideo && skipButton && introContainer) {
      skipButton.classList.remove('hidden');

      const removeIntro = () => {
        if (introVideo && introContainer) {
          console.log('[intro] removeIntro — начинаем плавное затухание');

          let volume = introVideo.volume || 1.0;
          const fadeStep = 0.05;
          const fadeIntervalTime = 50;
          const fadeInterval = setInterval(() => {
            volume -= fadeStep;
            if (volume <= 0) {
              clearInterval(fadeInterval);
              introVideo.volume = 0;
              introVideo.pause();
              console.log('[intro] Видео остановлено после затухания');
            } else {
              introVideo.volume = volume;
            }
          }, fadeIntervalTime);

          introContainer.style.transition = 'opacity 2s ease';
          introContainer.style.opacity = '0';

          setTimeout(() => {
            introContainer.remove();
            console.log('[intro] Интро удалено');
          }, 2000);
        }
      };

      skipButton.addEventListener('click', removeIntro);
      introVideo.addEventListener('ended', removeIntro);
    }
  });
}

export default async function initializeUnity() {
  try {
    const script = document.createElement("script");
    script.src = loaderUrl;

    script.onload = () => {
      if (productVersionElement) {
        productVersionElement.textContent = `v ${config.productVersion}`;
      }
      initializeUnityInstance().catch((error) => {
        console.error("Unity instance initialization failed:", error);
      });
    };

    document.body.appendChild(script);
  } catch (error) {
    console.error("Initialization failed:", error);
    progressPercentage.textContent = "Initialization failed.";
  }
}
