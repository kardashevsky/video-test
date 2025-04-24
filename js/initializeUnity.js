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
const canvasOverlay = document.querySelector("#canvas-overlay");
const progressBarFill = document.querySelector("#progress-bar-fill");
const progressPercentage = document.querySelector("#progress-percentage");
const productVersionElement = document.querySelector("#product-version");

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

    const progressContainer = document.querySelector('.progress-bar-container');
    const tapHint = document.getElementById('splash_screen_button_continue');

    setTimeout(() => {
      progressContainer.style.opacity = '0';
      progressBarFill.style.opacity = '0';
      progressPercentage.style.opacity = '0';

      setTimeout(() => {
        progressContainer.style.display = 'none';
        progressBarFill.style.display = 'none';
        progressPercentage.style.display = 'none';

        tapHint.style.transition = 'opacity 0.5s ease-out';
        tapHint.classList.remove('hidden');
        tapHint.style.display = 'block';

        setTimeout(() => {
          tapHint.style.opacity = '1';

          const handleTapToContinue = (e) => {
            e.preventDefault();

            tapHint.style.transition = 'opacity 0.3s ease-out';
            tapHint.style.opacity = '0';

            canvasOverlay.style.transition = 'opacity 0.5s ease-out';
            canvasOverlay.style.opacity = '0';

            setTimeout(() => {
              tapHint.style.display = 'none';
              document.documentElement.classList.add('black-background');
              document.body.classList.add('black-background');

              canvasOverlay.removeEventListener('click', handleTapToContinue);
              canvasOverlay.removeEventListener('touchstart', handleTapToContinue);
              canvas.removeEventListener('click', handleTapToContinue);
              canvas.removeEventListener('touchstart', handleTapToContinue);
            }, 300);
          };

          canvasOverlay.addEventListener('click', handleTapToContinue);
          canvasOverlay.addEventListener('touchstart', handleTapToContinue);
          canvas.addEventListener('click', handleTapToContinue);
          canvas.addEventListener('touchstart', handleTapToContinue);
        }, 50);
      }, 500);
    }, 500);
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
