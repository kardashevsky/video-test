import initializeSplashScreen from './initializeSplashScreen.js';
import initializeUnity from './initializeUnity.js';

(async () => {
  const webApp = window.Telegram.WebApp;
  webApp.expand();
  webApp.lockOrientation();
  webApp.disableVerticalSwipes();

  sessionStorage.setItem('initData', webApp.initData);
  sessionStorage.setItem('initDataUnsafe', JSON.stringify(webApp.initDataUnsafe));
  let language = localStorage.getItem('language');
  if (!language) {
    language = webApp?.initDataUnsafe?.user?.language_code || 'en';
    localStorage.setItem('language', language);
  }

  const isMobile = true;
  await initializeSplashScreen(language, isMobile);

  webApp.ready();

  if (isMobile) {
    try {
      await Promise.race([
        initializeUnity(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Unity initialization timed out')), 60000)
        ),
      ]);
    } catch (error) {
      console.error('Error during Unity initialization:', error);
    }
  } else {
    console.warn('Unity is not supported on non-mobile devices.');
  }
})();
