chrome.action.onClicked.addListener(async () => {
  const targetUrl = chrome.runtime.getURL('index.html');
  const existingTabs = await chrome.tabs.query({ url: `${targetUrl}*` });

  if (existingTabs.length > 0) {
    const tab = existingTabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    if (typeof tab.windowId === 'number') {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
});