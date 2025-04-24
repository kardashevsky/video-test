import { getTranslations, getLocalizationVersions } from './api.js';
import { getTranslationsDB } from './utils.js';

function initializeMobileSplashScreen(splashScreenTexts) {
  document.body.classList.remove('no-bg', 'custom-bg');
  document.body.classList.add('default-bg');

  const elementsToInitialize = [
    { id: 'splash_screen_commentary', text: splashScreenTexts.splash_screen_commentary },
    { id: 'splash_screen_header', text: splashScreenTexts.splash_screen_header },
    { id: 'splash_screen_button_continue', text: splashScreenTexts.splash_screen_button_continue },

    { id: 'splash_screen_1_mvp', text: splashScreenTexts.splash_screen_1_mvp },
    { id: 'splash_screen_2_getready', text: splashScreenTexts.splash_screen_2_getready },
    { id: 'splash_screen_3_dating', text: splashScreenTexts.splash_screen_3_dating },
    { id: 'splash_screen_4_p2p', text: splashScreenTexts.splash_screen_4_p2p },
    { id: 'splash_screen_5_pvp', text: splashScreenTexts.splash_screen_5_pvp },
    { id: 'splash_screen_6_ios_android', text: splashScreenTexts.splash_screen_6_ios_android },
    { id: 'splash_screen_7_nft', text: splashScreenTexts.splash_screen_7_nft },
  ];

  elementsToInitialize.forEach(item => {
    const element = document.getElementById(item.id);
    if (element) element.textContent = item.text;
  });

  const backgroundVideo = document.querySelector('.background-video');

  const images = document.querySelectorAll('img[data-src]:not(#qr-code)');
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

  const fontPromise = document.fonts.load('1rem "Onest"').catch((err) => {
    console.warn('Шрифт не загружен, fallback:', err);
  });

  return Promise.all([...imagePromises, fontPromise])
    .then(() => {
      backgroundVideo.classList.remove('hidden');
      backgroundVideo.classList.add('visible');

      document.getElementById('roadmap').classList.remove('hidden');
      document.getElementById('roadmap').classList.add('visible');

      document.getElementById('splash_screen_commentary').classList.remove('hidden');
      document.getElementById('splash_screen_commentary').classList.add('visible');
      
      document.getElementById('splash_screen_header').classList.remove('hidden');
      document.getElementById('splash_screen_header').classList.add('visible');

      backgroundVideo.play().catch(e => console.error('Ошибка воспроизведения видео:', e));
    })
    .catch(error => {
      console.error('Ошибка загрузки ресурсов:', error);
    });
}

function initializeNonMobileSplashScreen(splash_screen_qrcode) {
  document.body.classList.remove('default-bg', 'no-bg');
  document.body.classList.add('custom-bg');

  const qrCode = document.getElementById('qr-code');
  const warningScreen = document.getElementById('warning-screen');
  const qrInstruction = document.querySelector('.qr-instruction');

  qrCode.setAttribute('src', qrCode.getAttribute('data-src'));
  qrCode.removeAttribute('data-src');

  const showWarningScreen = () => {
    warningScreen.classList.remove('hidden');
    qrInstruction.textContent = splash_screen_qrcode;
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
        splash_screen_header: textSplashScreen.data?.splash_screen_header ?? 'Error',
        splash_screen_commentary: textSplashScreen.data?.splash_screen_commentary ?? 'Error',
        splash_screen_qrcode: textSplashScreen.data?.splash_screen_qrcode ?? 'Error',

        splash_screen_1_mvp: textSplashScreen.data?.splash_screen_1_mvp ?? 'Error',
        splash_screen_2_getready: textSplashScreen.data?.splash_screen_2_getready ?? 'Error',
        splash_screen_3_dating: textSplashScreen.data?.splash_screen_3_dating ?? 'Error',
        splash_screen_4_p2p: textSplashScreen.data?.splash_screen_4_p2p ?? 'Error',
        splash_screen_5_pvp: textSplashScreen.data?.splash_screen_5_pvp ?? 'Error',
        splash_screen_6_ios_android: textSplashScreen.data?.splash_screen_6_ios_android ?? 'Error',
        splash_screen_7_nft: textSplashScreen.data?.splash_screen_7_nft ?? 'Error',
        splash_screen_button_continue: textSplashScreen.data?.splash_screen_button_continue ?? 'Error',
      };
    }
  } catch (error) {
    console.error('Ошибка при проверке версии локализации:', error);
    throw error;
  }
}

export default async function initializeSplashScreen(languageCode, isMobile) {
  try {
    const splashScreenTexts = await checkVersionAndGetTranslations(languageCode);

    if (isMobile) {
      return initializeMobileSplashScreen(splashScreenTexts);
    } else {
      initializeNonMobileSplashScreen(splashScreenTexts.splash_screen_qrcode);
    }
  } catch (error) {
    throw error;
  }
}
