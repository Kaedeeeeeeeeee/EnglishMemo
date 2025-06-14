document.addEventListener('DOMContentLoaded', () => {
  loadWordList();
  
  // 导出CSV按钮事件处理
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  
  // 清空单词按钮事件处理
  document.getElementById('clearWords').addEventListener('click', clearAllWords);
  
  // 添加页面获得焦点时重新加载单词列表
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadWordList();
    }
  });
  
  // 添加页面激活事件监听
  window.addEventListener('focus', loadWordList);
});

// 加载单词列表
function loadWordList() {
  chrome.storage.local.get(['wordList'], (result) => {
    const wordList = result.wordList || [];
    const wordCount = document.getElementById('wordCount');
    const wordTableBody = document.getElementById('wordTableBody');
    
    // 更新单词计数
    wordCount.textContent = wordList.length;
    
    // 清空表格
    wordTableBody.innerHTML = '';
    
    // 修改排序逻辑，优先使用timestamp
    wordList.sort((a, b) => {
      // 如果有timestamp，优先使用timestamp排序
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      // 否则使用日期排序
      return new Date(b.date) - new Date(a.date);
    });
    
    // 填充表格
    wordList.forEach(item => {
      const row = document.createElement('tr');

      const wordCell = document.createElement('td');
      wordCell.textContent = item.word;
      row.appendChild(wordCell);

      const translationCell = document.createElement('td');
      translationCell.textContent = item.translation || '';
      row.appendChild(translationCell);

      const sourceCell = document.createElement('td');
      const sourceLink = document.createElement('a');
      sourceLink.href = item.url;
      sourceLink.textContent = item.title || item.url;
      sourceLink.target = '_blank';
      sourceCell.appendChild(sourceLink);
      row.appendChild(sourceCell);

      const dateCell = document.createElement('td');
      dateCell.textContent = item.date;
      row.appendChild(dateCell);

      wordTableBody.appendChild(row);
    });
  });
}

// 导出为CSV
function exportToCSV() {
  chrome.storage.local.get(['wordList'], (result) => {
    const wordList = result.wordList || [];
    
    if (wordList.length === 0) {
      showStatus('没有单词可导出', 'error');
      return;
    }
    
    // 修改排序逻辑，与列表显示保持一致，优先使用timestamp
    wordList.sort((a, b) => {
      // 如果有timestamp，优先使用timestamp排序
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      // 否则使用日期排序
      return new Date(b.date) - new Date(a.date);
    });
    
    // 创建CSV内容
    let csvContent = 'Word,Translation,Context,Title,URL,Date\n';
    
    wordList.forEach(item => {
      // 处理CSV中的特殊字符
      const processValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // 如果包含逗号、引号或换行符，用引号括起来
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      
      csvContent += [
        processValue(item.word),
        processValue(item.translation),
        processValue(item.context),
        processValue(item.title),
        processValue(item.url),
        processValue(item.date)
      ].join(',') + '\n';
    });
    
    // 添加UTF-8 BOM标记，使Excel能正确识别中文
    const BOM = '\uFEFF';
    const blobContent = BOM + csvContent;
    
    // 创建Blob并下载
    const blob = new Blob([blobContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    
    chrome.downloads.download({
      url: url,
      filename: `EnglishVocabulary_${timestamp}.csv`,
      saveAs: true
    }, () => {
      if (chrome.runtime.lastError) {
        showStatus('导出失败: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('导出成功！', 'success');
      }
    });
  });
}

// 清空所有单词
function clearAllWords() {
  if (confirm('确定要删除所有保存的单词吗？此操作无法撤销。')) {
    chrome.storage.local.set({wordList: []}, () => {
      loadWordList();
      showStatus('所有单词已删除', 'success');
    });
  }
}

// 显示状态消息
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
} 