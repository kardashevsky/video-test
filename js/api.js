import { openDb, saveTranslationData } from './utils.js';

const BASE_URL_GAME_API = window.config.BASE_URL_GAME_API;
const BASE_URL_CONTENT_API = window.config.BASE_URL_CONTENT_API;

export const getPlayerData = async () => {
  const initData = 'user=%7B%22id%22%3A290427089%2C%22first_name%22%3A%22Dmitry%22%2C%22last_name%22%3A%22Kardashevsky%22%2C%22username%22%3A%22kardashevsky%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F8M2uOr8GnxXffT3bpc_x0jrJR7MqmO9xoZogHVS4v74.svg%22%7D&chat_instance=-1784657362594119257&chat_type=private&auth_date=1741259628&signature=kzApDroKOgh1MfHG1tWNPvlwU8i726Z6D7utLaYUPcZscRiq7S7wePjX-ozX4bV_Z9mrMabp28SbksXlT0K_Cw&hash=8506ff5f9bdcd546f9ff9d2abe2161658288b7dc5cf1e9727a16eac54458fe71';

  if (!initData) {
    const message = 'Authorization data is missing in sessionStorage. Please restart the application.';
    console.error(message);
    throw new Error(message);
  }

  try {
    const playerData = await fetch(`${BASE_URL_GAME_API}/player`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'TelegramAuthorization': initData,
      }
    }).then(response => {
      if (!response.ok) {
        const error = `Error ${response.status}: ${response.statusText}`;
        console.error(error);
        throw new Error(error);
      }
      return response.json();
    });

    sessionStorage.setItem('playerData', JSON.stringify(playerData));

    const isEmptyData =
      !playerData.character &&
      !playerData.pet &&
      !playerData.statusLevel &&
      (!playerData.purchased_items || playerData.purchased_items.length === 0);

    return isEmptyData;
  } catch (error) {
    console.error('Error fetching player data:', error);
    throw error;
  }
};

export const getTranslations = async (languageCode) => {
  try {
    let jsonLang, jsonEnglish;

    if (languageCode === 'en') {
      const enResponse = await fetch(`${BASE_URL_CONTENT_API}/translation?language=en`, {
        method: 'GET',
        headers: { 'Accept': 'text/plain' },
      });

      if (!enResponse.ok) {
        const error = `Error ${enResponse.status}: ${enResponse.statusText}`;
        console.error(error);
        showWebAppAlert('Failed to load English translations. Please try again later.');
        throw new Error(error);
      }

      jsonLang = await enResponse.json();
      jsonEnglish = jsonLang;
    } else {
      const [langResponse, enResponse] = await Promise.all([
        fetch(`${BASE_URL_CONTENT_API}/translation?language=${languageCode}`, {
          method: 'GET',
          headers: { 'Accept': 'text/plain' },
        }),
        fetch(`${BASE_URL_CONTENT_API}/translation?language=en`, {
          method: 'GET',
          headers: { 'Accept': 'text/plain' },
        }),
      ]);

      if (!langResponse.ok) {
        const error = `Error ${langResponse.status}: ${langResponse.statusText}`;
        console.error(error);
        showWebAppAlert('Failed to load translations. Please try again later.');
        throw new Error(error);
      }
      if (!enResponse.ok) {
        const error = `Error ${enResponse.status}: ${enResponse.statusText}`;
        console.error(error);
        showWebAppAlert('Failed to load English translations. Please try again later.');
        throw new Error(error);
      }

      [jsonLang, jsonEnglish] = await Promise.all([
        langResponse.json(),
        enResponse.json(),
      ]);
    }

    const db = await openDb();
    await saveTranslationData(db, languageCode, jsonLang);

    if (languageCode !== 'en') {
      await saveTranslationData(db, 'en', jsonEnglish);
    }

    const textSplashScreen = {
      subheading: jsonLang.data?.screen00_heading ?? 'Error',
      commentText: jsonLang.data?.screen00_subheading ?? 'Error',
      warningText: jsonLang.data?.screen00_device ?? 'Error',
    };

    return textSplashScreen;
  } catch (error) {
    console.error('Error fetching translations data:', error);
    showWebAppAlert('An error occurred while loading translations. Please check your connection.');
    throw error;
  }
};

export const getLocalizationVersions = async () => {
  try {
    const response = await fetch(`${BASE_URL_CONTENT_API}/version`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = `Error ${response.status}: ${response.statusText}`;
      console.error(error);
      showWebAppAlert('Failed to fetch localization versions. Please try again later.');
      throw new Error(error);
    }

    const data = await response.json();

    for (const [lang, version] of Object.entries(data)) {
      localStorage.setItem(`localization_version_${lang}`, version);
    }

    return data;
  } catch (error) {
    console.error('Error fetching localization versions:', error);
    showWebAppAlert('An error occurred while loading localization versions. Please check your connection.');
    throw error;
  }
};
