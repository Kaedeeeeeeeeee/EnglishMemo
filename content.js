// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // 获取当前页面URL和标题
      const pageUrl = window.location.href;
      const pageTitle = document.title;
      
      sendResponse({ 
        text: selectedText, 
        url: pageUrl, 
        title: pageTitle,
        timestamp: new Date().toISOString()
      });
    } else {
      sendResponse({ error: "没有选中文本" });
    }
  }
  return true; // 保持消息通道开放
}); 