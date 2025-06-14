// 注册快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === "save-word") {
    saveSelectedText();
  }
});

// 添加右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToLocal",
    title: "保存到生词本",
    contexts: ["selection"]
  });
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToLocal") {
    saveSelectedText();
  }
});

// 保存选中文本的主函数
function saveSelectedText() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length === 0) return;
    
    // 检查当前tab是否可以执行content script
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => true
    }).then(() => {
      // 确认可以执行脚本后再发送消息
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"}, (response) => {
        if (chrome.runtime.lastError) {
          console.error("消息发送错误:", chrome.runtime.lastError.message);
          chrome.action.setBadgeText({text: "×"});
          setTimeout(() => chrome.action.setBadgeText({text: ""}), 2000);
          return;
        }
        
        if (response && response.text) {
          try {
            translateWord(response.text).then((translation) => {
              // 获取当前保存的单词列表
              chrome.storage.local.get(['wordList'], (result) => {
                const wordList = result.wordList || [];

                // 添加新单词
                wordList.push({
                  word: response.text,
                  translation: translation,
                  context: "", // 可以扩展获取上下文
                  url: response.url,
                  title: response.title,
                  date: new Date().toLocaleDateString(),
                  timestamp: new Date().getTime() // 添加毫秒级时间戳
                });

                // 保存更新后的列表
                chrome.storage.local.set({wordList: wordList}, () => {
                  // 显示成功提示
                  chrome.action.setBadgeText({text: "✓"});
                  setTimeout(() => chrome.action.setBadgeText({text: ""}), 2000);

                  // 发送消息给popup更新单词计数
                  chrome.runtime.sendMessage({
                    action: "wordAdded",
                    count: wordList.length
                  });
                });
              });
            });
          } catch (error) {
            console.error("保存失败:", error);
            chrome.action.setBadgeText({text: "×"});
            setTimeout(() => chrome.action.setBadgeText({text: ""}), 2000);
          }
        }
      });
    }).catch(err => {
      console.error("无法在当前页面执行脚本:", err);
  chrome.action.setBadgeText({text: "×"});
  setTimeout(() => chrome.action.setBadgeText({text: ""}), 2000);
  });
  });
}

// 使用公共翻译接口获取单词翻译
function translateWord(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-CN`;
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      return '';
    })
    .catch(err => {
      console.error('Translation error:', err);
      return '';
    });
}
