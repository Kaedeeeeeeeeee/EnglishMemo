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
async function saveSelectedText() { // Made async
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => { // Made async
    if (tabs.length === 0) return;
    
    // 检查当前tab是否可以执行content script
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => true
    }).then(() => {
      // 确认可以执行脚本后再发送消息
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"}, async (response) => { // Made async
        if (chrome.runtime.lastError) {
          console.error("消息发送错误:", chrome.runtime.lastError.message);
          chrome.action.setBadgeText({text: "×"});
          setTimeout(() => chrome.action.setBadgeText({text: ""}), 2000);
          return;
        }
        
        if (response && response.text) {
          let translation = '-'; // Default to placeholder
          if (response.pageLang === 'en' && response.text) {
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(response.text)}&langpair=en|zh-CN`;
            try {
              const fetchResponse = await fetch(apiUrl);
              const data = await fetchResponse.json();
              if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
                translation = data.responseData.translatedText;
              } else if (data.responseStatus !== 200) {
                console.warn('MyMemory API error:', data.responseDetails || `Status ${data.responseStatus}`);
                translation = 'API error'; 
              } else {
                // No specific translation found by API, but call was successful
                translation = '-'; 
              }
            } catch (error) {
              console.error('Error fetching translation:', error);
              translation = 'Fetch error';
            }
          } else if (response.text) {
            // Word saved from a non-English page, or page language unknown
            translation = '-'; // Signify no translation attempted/applicable
          }

          try {
            // 获取当前保存的单词列表
            chrome.storage.local.get(['wordList'], (result) => {
              const wordList = result.wordList || [];
              
              // 添加新单词
              wordList.push({
                word: response.text,
                context: "", // 可以扩展获取上下文
                url: response.url,
                title: response.title,
                date: new Date().toLocaleDateString(),
                timestamp: new Date().getTime(), // 添加毫秒级时间戳
                translation: translation // New field
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