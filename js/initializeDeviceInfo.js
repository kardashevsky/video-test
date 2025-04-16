export async function initializeDeviceInfo() {
  const userAgent = navigator.userAgent;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const innerWidth = window.innerWidth;
  const innerHeight = window.innerHeight;
  const deviceType = innerWidth <= 768 ? "Mobile" : "Desktop/Tablet";

  let device = "Unknown";
  if (/iPhone/i.test(userAgent)) {
    device = "iPhone";
  } else if (/iPad/i.test(userAgent)) {
    device = "iPad";
  } else if (/Android/i.test(userAgent)) {
    device = "Android";
  }

  const language = navigator.language || navigator.userLanguage;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let platform = "Unknown platform";
  if (navigator.userAgentData) {
    try {
      const highEntropyData = await navigator.userAgentData.getHighEntropyValues(['platform']);
      platform = highEntropyData.platform;
    } catch {
      platform = navigator.userAgentData.platform || "Unknown platform";
    }
  } else {
    platform = navigator.platform;
  }

  const isDesktopByViewport = innerWidth > 768;
  const isDesktopByUserAgent = /Windows NT|Macintosh|Linux x86_64/i.test(userAgent);
  const isDesktopByTouch = !isTouchDevice;

  const isDesktop = isDesktopByViewport || isDesktopByUserAgent || isDesktopByTouch;

  const browserName = (() => {
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
    return "Unknown";
  })();

  const browserVersion = (() => {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edg|Opera|OPR)\/([\d.]+)/);
    return match ? `${match[1]} ${match[2]}` : "Unknown";
  })();

  const connection = navigator.connection || {};
  const connectionType = connection.effectiveType || "Unknown";
  const downlink = connection.downlink || "Unknown";
  const rtt = connection.rtt || "Unknown";

  const gpuInfo = (() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return "Unknown";
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : "Unknown";
  })();

  const supportsFeatures = {
    webGL: !!window.WebGLRenderingContext,
    serviceWorker: 'serviceWorker' in navigator,
    localStorage: 'localStorage' in window,
    sessionStorage: 'sessionStorage' in window,
    cookies: navigator.cookieEnabled,
    geolocation: 'geolocation' in navigator,
    notifications: 'Notification' in window,
  };

  const deviceInfo = {
    userAgent,
    isTouchDevice,
    screenSize: `${screenWidth}x${screenHeight}`,
    viewportSize: `${innerWidth}x${innerHeight}`,
    deviceType,
    device,
    language,
    platform,
    timeZone,
    isDesktop,
    browserName,
    browserVersion,
    connection: {
      type: connectionType,
      downlink,
      rtt,
    },
    gpuInfo,
    supportsFeatures,
    details: {
      isDesktopByViewport,
      isDesktopByUserAgent,
      isDesktopByTouch,
    },
  };

  sessionStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));

  const isMobile = !deviceInfo.isDesktop;

  return isMobile;
}
