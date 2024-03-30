chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "exportData",
    title: "내보내기",
    contexts: ["action"], // 확장 프로그램 아이콘 클릭 시 표시되는 메뉴
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "exportData") {
    chrome.storage.sync.get(["damoangMemo"], function (result) {
      const memos = result.damoangMemo ? JSON.parse(result.damoangMemo) : [];
      // 콘텐츠 스크립트로 데이터 전송
      chrome.tabs.sendMessage(
        tab.id,
        { action: "downloadCsv", data: memos },
        function (response) {
          console.log(response.status);
        }
      );
    });
  }
});
