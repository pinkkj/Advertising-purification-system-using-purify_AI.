document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleClean');
  const status = document.getElementById('status');

  // 초기 상태 불러오기
  chrome.storage.local.get(['adsEnabled'], (data) => {
    const enabled = data.adsEnabled ?? true;
    toggle.checked = enabled;
    updateStatus(enabled);
  });

  // 상태 변경 시 저장
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ adsEnabled: enabled }, () => {
      updateStatus(enabled);
    });
  });

  function updateStatus(enabled) {
    status.innerText = enabled
      ? '✅ 광고 정화가 활성화됨'
      : '🚫 광고 정화가 꺼져있음';
  }
});
