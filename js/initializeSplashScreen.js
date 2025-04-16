import { getTranslations, getLocalizationVersions } from './api.js';
import { getTranslationsDB } from './utils.js';

function initializeMobileSplashScreen(commentText, subheading) {
  document.body.classList.remove('no-bg', 'custom-bg');
  document.body.classList.add('default-bg');

  const images = document.querySelectorAll('img[data-src]:not(#qr-code)');
  const loadingPage = document.querySelector('.loading-page');
  const contentElement = document.querySelector('.loading-page__content');
  const textCommentElement = document.getElementById('text-comment');
  const textSubheadingElement = document.getElementById('text-subheading');
  const introVideo = document.getElementById('intro-video');
  const unmuteButton = document.getElementById('unmute-button');

  const imagePromises = Array.from(images).map(img => {
    return new Promise((resolve) => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.setAttribute('src', src);
        img.removeAttribute('data-src');
      } else {
        resolve();
      }
    });
  });

  textCommentElement.textContent = commentText;
  textSubheadingElement.textContent = subheading;
  
  const fontPromise = document.fonts.load('1rem "Onest"').catch((err) => {
    console.warn('Шрифт не загружен, fallback:', err);
  });

  return Promise.all([...imagePromises, fontPromise])
    .then(() => {
      loadingPage.classList.remove('hidden');
      loadingPage.classList.add('visible');
      contentElement.classList.remove('hidden');
      contentElement.classList.add('visible');
      textCommentElement.classList.remove('hidden');
      textCommentElement.classList.add('visible');
      textSubheadingElement.classList.remove('hidden');
      textSubheadingElement.classList.add('visible');
      introVideo.play();
      unmuteButton.addEventListener('click', () => {
        introVideo.muted = false;
        introVideo.volume = 1.0;
        unmuteButton.classList.add('hidden');
      });
    })
    .catch(error => {
      console.error('Ошибка загрузки ресурсов:', error);
    });
}

function initializeNonMobileSplashScreen(warningText) {
  document.body.classList.remove('default-bg', 'no-bg');
  document.body.classList.add('custom-bg');

  const qrCode = document.getElementById('qr-code');
  const warningScreen = document.getElementById('warning-screen');
  const qrInstruction = document.querySelector('.qr-instruction');

  qrCode.setAttribute('src', qrCode.getAttribute('data-src'));
  qrCode.removeAttribute('data-src');

  const showWarningScreen = () => {
    warningScreen.classList.remove('hidden');
    qrInstruction.textContent = warningText;
  };

  qrCode.onload = showWarningScreen;
  qrCode.onerror = showWarningScreen;
}

async function checkVersionAndGetTranslations(languageCode) {
  try {
    const localVersion = localStorage.getItem(`localization_version_${languageCode}`);
    const versionData = await getLocalizationVersions();

    let remoteVersion = versionData[languageCode];
    if (!remoteVersion) {
      console.warn(`Версия локализации для ${languageCode} не найдена. Используем 'en'.`);
      languageCode = 'en';
      remoteVersion = versionData[languageCode];

      if (!remoteVersion) {
        throw new Error(`Нет локализации даже для fallback (en).`);
      }
    }

    if (remoteVersion !== localVersion) {
      const translations = await getTranslations(languageCode);
      localStorage.setItem(`localization_version_${languageCode}`, remoteVersion);
      return translations;
    } else {
      const textSplashScreen = await getTranslationsDB(languageCode);
      if (!textSplashScreen) {
        return await getTranslations(languageCode);
      }
      return {
        subheading: textSplashScreen.data?.screen00_heading ?? 'Error',
        commentText: textSplashScreen.data?.screen00_subheading ?? 'Error',
        warningText: textSplashScreen.data?.screen00_device ?? 'Error',
      };
    }
  } catch (error) {
    console.error('Ошибка при проверке версии локализации:', error);
    throw error;
  }
}

export default async function initializeSplashScreen(languageCode, isMobile) {
  try {
    const textSplashScreen = await checkVersionAndGetTranslations(languageCode);

    if (isMobile) {
      return initializeMobileSplashScreen(
        textSplashScreen.commentText,
        textSplashScreen.subheading
      );
    } else {
      initializeNonMobileSplashScreen(textSplashScreen.warningText);
    }
  } catch (error) {
    throw error;
  }
}
