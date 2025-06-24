chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'capture-single-ad') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (dataUrl) {
      if (!dataUrl) {
        console.error('[Background] 캡처 실패');
        sendResponse({ success: false });
        return;
      }

      // ✅ 응답 반환 (content.js에서 await 가능)
      sendResponse({ success: true, dataUrl });

      // 🔔 추가 메시지 전달 (선택 사항)
      // chrome.tabs.sendMessage(sender.tab.id, {
      //   action: 'process-cropped',
      //   dataUrl: dataUrl,
      //   rect: msg.rect,
      //   index: msg.index
      // });
    });

    return true; // ✅ 비동기 응답을 허용
  }
});
