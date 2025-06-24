const adsToDelete = [];
window._adsToDelete = adsToDelete;

function waitForAdToLoad(el, type, timeout = 300) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const elapsed = Date.now() - start;
      if (type === 'img') {
        if (el.complete && el.naturalWidth > 0) return resolve();
      } else if (type === 'bg') {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url')) return resolve();
      }
      if (elapsed > timeout) return resolve();
      requestAnimationFrame(check);
    };
    check();
  });
}
function shouldIgnoreAd(el) {
  const id = (el.id || '').toLowerCase();
  const classAttr = (el.className || '').toLowerCase(); // 전체 클래스 문자열
  const classList = classAttr.split(/\s+/); // 공백 분할
  const ignoreExactClasses = [
    'story-news', 'article', 'a8txa-ad', 'au8b3lyn', 'qoczwlz9',
    'a8txa-ad-psw', 'side-bar', 'recent-changes', 'tool-box',
    'wiki-inner', 'menu-content', 'namu-menu', 'content-nav',
    'floating-banner', 'side-link-box', 'trc_', 'taboola', 'stock',
    'trc_rbox', 'trc-widget-footer'
  ];
  const ignoreClassCombos = [
    'side-ad-box dable',
    'side-ad-livesissue type1',
    'side-ad-livesissue',
    'side-ad-livesissue type2' // ← 문제 케이스
  ];
  return (
    ignoreExactClasses.some(cls => classList.includes(cls)) ||
    ignoreClassCombos.includes(classAttr.trim()) ||
    id.includes('trc_') ||
    id.includes('taboola') ||
    id.includes('topviewarticles')
  );
}


async function runAdPurification() {
  chrome.storage.local.get(['adsEnabled'], async (settings) => {
    const adsEnabled = settings.adsEnabled ?? true;
    if (!adsEnabled) {
      console.log('🚫 광고 정화 비활성화');
      return;
    }
    // 더 안전한 탐지를 위해 단독 단어 기준으로만 매칭
    const adClassPattern = /\b(ad-|ads-|sponsor|banner|adsbygoogle)\b/;

    /*const adClassPattern = /\b(ad|ads|advert|sponsor|banner|adsbygoogle)\b/;*/
    const adIframeSrcCheck = (src) => src && (
      src.includes('ads') || src.includes('doubleclick.net') ||
      src.includes('googlesyndication.com') || src.includes('taboola') ||
      src.includes('kakao') || src.includes('ad.naver') || src.includes('media.net') ||
      src.includes('mobon.net') || src.includes('criteo')
    );
    const adImageSrcCheck = (src) => src && (
      src.includes('adimg') || src.includes('adsafeprotected') || src.includes('doubleclick.net')
    );
    const hardcodedAdIdRegexes = [
      /google_ads_iframe.*namuwiki\/(top|sidebar|sidebar-box)/,
      /top_0__container__/,
      /google_ads_iframe.*namunews/
    ];

    const adCandidates = [];
    document.querySelectorAll('iframe, div, section, ins, a, img').forEach((el) => {
      const src = el.src || '';
      const rect = el.getBoundingClientRect();
      const isIframeAd = el.tagName === 'IFRAME' && (
        adIframeSrcCheck(src) ||
        el.id?.includes('google_ads_iframe') || // ID로 추가 감지
        el.name?.includes('google_ads_iframe')  // name 속성도 fallback
      );
      const isImageAd = el.tagName === 'IMG' && adImageSrcCheck(src);
      const isKnownIdAd = hardcodedAdIdRegexes.some(re => re.test(el.id));
      const attrText = ((el.className || '') + (el.id || '') + (el.getAttribute('aria-label') || '') + (el.getAttribute('role') || '')+(el.getAttribute('title') || '') + (el.name || '') ).toLowerCase();

      const isAd = (
        adClassPattern.test(attrText) ||
        el.hasAttribute('data-ad-slot') ||
        el.hasAttribute('data-google-query-id') ||
        el.hasAttribute('data-ad-type') ||
        el.hasAttribute('data-ad-group') ||
        isIframeAd || isImageAd || isKnownIdAd
      );

      if (isAd && !shouldIgnoreAd(el)) {
        adCandidates.push({ el, rect, type: el.tagName.toLowerCase() });
      }
    });

    const leafAds = adCandidates.filter(({ el }) => {
      return !adCandidates.some(other => other.el !== el && other.el.contains(el));
    });

    console.log(`🔍 탐지된 광고 수: ${leafAds.length}`);

    leafAds.forEach(({ el }, i) => {
      el.setAttribute('data-ad-id', i + 1);
      
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
      overlay.style.zIndex = 999999;
      overlay.style.pointerEvents = 'none';
      overlay.className = 'ad-blur-overlay';
      overlay.setAttribute('data-overlay-for', i + 1);
      el.style.position = 'relative';
      el.appendChild(overlay);
    });

    const observer = new IntersectionObserver(async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const index = parseInt(el.getAttribute('data-ad-id'));
          observer.unobserve(el);
          await waitForAdToLoad(el);
          console.log(`📸 광고 캡처`);

          //const rect = el.getBoundingClientRect();
          const iframe = el.querySelector('iframe');
          const rect = iframe?.getBoundingClientRect?.() || el.getBoundingClientRect();
          
          const dataUrl = await new Promise(resolve => {
            chrome.runtime.sendMessage({
              action: 'capture-single-ad',
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
              index
            }, response => resolve(response?.dataUrl));
          });

          if (!dataUrl) return;

          const img = new Image();
          img.src = dataUrl;
          await new Promise(res => img.onload = res);

          const scale = window.devicePixelRatio;
          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale, 0, 0, rect.width, rect.height);

          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          if (!blob) return;

          const formData = new FormData();
          formData.append('image', blob, `ad_${index}.png`);

          try {
            const res = await fetch('http://localhost:5000/predict', { method: 'POST', body: formData });
            if (!res.ok) {
              console.error(`❌ 서버 응답 오류 (status: ${res.status})`);
              return;
            }
            // http://localhost:5000/predict or https://purify-project.onrender.com/predict
            const result = await res.json();
            const { exposure: expGrade, sexual: sexGrade, original_filename: img } = result;
            console.log(`📸 광고: 노출:${expGrade}, 성행위:${sexGrade}`);

            const overlay = document.querySelector(`.ad-blur-overlay[data-overlay-for="${index}"]`);
            if (adsEnabled && (expGrade >= 3 || sexGrade >= 3)) {
              adsToDelete.push(index);
              el.remove();
            } else {
              overlay?.remove();
            }
          } catch (err) {
            console.error(`❌ 예측 실패`, err);
          }
        }
      }
    }, { threshold: 0.8 });

    leafAds.forEach(({ el }) => observer.observe(el));
  });
}

// ✅ 최초 진입 시 1회 실행
window.addEventListener('load', () => {
  setTimeout(() => {
    runAdPurification();
  }, 300); // 또는 500ms로 여유 있게
});

// ✅ SPA 감지를 위한 URL 변경 추적
let lastUrl = location.href;
let purifyTimeout = null;
setInterval(() => {
  if (location.href !== lastUrl) {
    console.log('🔁 URL 변경 감지됨');

    lastUrl = location.href;

    // 기존 실행 예약 제거
    if (purifyTimeout) clearTimeout(purifyTimeout);

    // 페이지 로딩 안정화까지 기다리기 (예: 500ms 후 실행)
    purifyTimeout = setTimeout(() => {
  // DOM 안정화 대기 (예: requestAnimationFrame + 500ms 추가)
  requestAnimationFrame(() => {
    setTimeout(() => {
      runAdPurification();
    }, 500); // DOM이 안정적으로 바뀔 시간 확보
  });
}, 100); // 기존보다 살짝 여유 줌

  }
}, 800);
