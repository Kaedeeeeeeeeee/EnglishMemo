document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的单词数量
  updateWordCount();
  
  // 打开设置页面的链接
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 监听来自background的消息，更新计数
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "wordAdded") {
      document.getElementById('wordCount').textContent = request.count;
    }
  });
});

// 更新单词计数
function updateWordCount() {
  chrome.storage.local.get(['wordList'], (result) => {
    const wordList = result.wordList || [];
    document.getElementById('wordCount').textContent = wordList.length;
  });
} 