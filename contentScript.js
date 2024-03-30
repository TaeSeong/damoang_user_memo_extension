const marginLeft = "10px";
let showInputBox = false;
let isOnLoad = true;

const addMemoBtnForWriter = async () => {
  const blockBtn = document.querySelector('#bo_v_act button[title="차단"]');
  if (blockBtn) {
    const userId = blockBtn
      .getAttribute("onclick")
      .match(/na_chadan\('(.+?)'\);/)[1];

    const memoBtn = await makeMemoBtn(userId);
    const targetDiv = document.querySelector("#bo_v_info .me-auto");
    const spans = targetDiv.querySelectorAll("span");
    const lastSpan = spans[spans.length - 1];

    if (lastSpan && !showInputBox) {
      lastSpan.appendChild(memoBtn);
    }
  }
};

const addInputBox = async (event) => {
  const button = event.target;
  const userId = button.getAttribute("data-userid");

  if (showInputBox) {
    removeInputBox(userId);
  } else {
    let inputBox = document.createElement("input");
    inputBox.style.marginLeft = marginLeft;
    inputBox.type = "text";
    inputBox.id = "memo_input_" + userId;
    inputBox.style.verticalAlign = "middle";
    let savedMemo = await getMemoByUserId(userId);
    if (savedMemo) {
      inputBox.value = savedMemo;
    }

    const targetBtn = button;
    if (targetBtn && targetBtn.parentNode) {
      const saveBtn = document.createElement("button");
      saveBtn.innerText = " 저장";
      saveBtn.classList.add("btn", "btn-outline-secondary", "btn-sm");
      saveBtn.id = "memo_save_" + userId;
      saveBtn.addEventListener("click", () => {
        saveData(userId, document.getElementById(inputBox.id).value);
      });
      saveBtn.style.marginLeft = marginLeft;
      saveBtn.setAttribute("data-userid", userId);

      targetBtn.parentNode.insertBefore(saveBtn, targetBtn.nextSibling);
      targetBtn.parentNode.insertBefore(inputBox, targetBtn.nextSibling);
      showInputBox = true;
    }
  }
};

const addMemoBtn = async () => {
  let memberSpans = document.querySelectorAll("div.me-2 > span.member");
  for (let span of memberSpans) {
    let commentListWrap = span.closest("div.comment-list-wrap");
    let blockButton = commentListWrap.querySelector('button[title="차단"]');
    if (blockButton && blockButton.hasAttribute("onclick")) {
      let onclickAttr = blockButton.getAttribute("onclick");
      let match = onclickAttr.match(/na_chadan\('(.+?)'\);/);

      if (match) {
        let userId = match[1];
        const memoBtn = await makeMemoBtn(userId);
        span.parentElement.appendChild(memoBtn);
      }
    }
  }
};

const saveData = (userId, memo) => {
  chrome.storage.sync.get(["damoangMemo"], function (result) {
    let memos = result.damoangMemo ? JSON.parse(result.damoangMemo) : [];

    // storage sync에서 기존 데이터 중복 여부 확인
    const existingIndex = memos.findIndex((m) => m.userId === userId);

    if (memo) {
      if (existingIndex > -1) {
        // userId가 이미 존재하면 memo 업데이트
        memos[existingIndex].memo = memo;
      } else {
        // 새로운 userId라면 추가
        memos.push({ userId: userId, memo: memo });
      }
    } else {
      // memo가 비어있다면, userId 키를 삭제
      if (existingIndex > -1) {
        memos.splice(existingIndex, 1); // 해당 인덱스의 객체를 삭제
      }
    }

    // 변경된 데이터를 Chrome Sync Storage에 저장합니다.
    chrome.storage.sync.set(
      { damoangMemo: JSON.stringify(memos) },
      function () {
        console.log("Data has been saved to Chrome Sync Storage.");
      }
    );

    removeInputBox(userId);
    const targetBtns = document.querySelectorAll(
      `button[data-userid="${userId}"]`
    );
    targetBtns.forEach((btn) => {
      btn.innerText = memo ? memo : "";
    });
  });
};

const removeInputBox = (userId) => {
  showInputBox = false;
  document.getElementById("memo_input_" + userId).remove();
  document.getElementById("memo_save_" + userId).remove();
};

const getMemoByUserId = async (userId) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["damoangMemo"], function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        let memos = result.damoangMemo ? JSON.parse(result.damoangMemo) : [];
        const memoObj = memos.find((memo) => memo.userId === userId);
        resolve(memoObj ? memoObj.memo : null);
      }
    });
  });
};

const makeMemoBtn = async (userId) => {
  const btnStyle = [
    "bi",
    "bi-pencil-square",
    "btn",
    "btn-outline-secondary",
    "btn-sm",
  ];
  const button = document.createElement("button");
  const memo = await getMemoByUserId(userId);
  button.innerText = memo ? " " + memo : "";
  button.addEventListener("click", addInputBox);
  button.style.marginLeft = marginLeft;
  button.classList.add(...btnStyle);
  button.setAttribute("data-userid", userId);
  return button;
};

const getUserBtnLength = (userId) => {
  return document.querySelectorAll(`button[data-userid="${userId}"]`).length;
};

const damoangExportData = () => {
  chrome.storage.sync.get(["damoangMemo"], function (result) {
    if (result.damoangMemo) {
      // 데이터를 JSON 객체로 변환
      const memos = JSON.parse(result.damoangMemo);
      // CSV 문자열 생성 시작
      let csvContent = "data:text/csv;charset=utf-8,";
      // CSV 헤더 추가
      csvContent += "userId,memo\n";

      // 각 메모 객체를 CSV 형식으로 변환
      memos.forEach(function (memoObj) {
        let row = `"${memoObj.userId}","${memoObj.memo.replace(/"/g, '""')}"`; // CSV 포맷을 위해 쌍따옴표 처리
        csvContent += row + "\n";
      });

      // CSV 문자열을 URI로 변환
      const encodedUri = encodeURI(csvContent);
      // 링크 생성 및 다운로드 실행
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "damoang_memo_data.csv");
      document.body.appendChild(link); // 필요한 경우에만 DOM에 추가
      link.click(); // 링크 클릭 이벤트를 트리거하여 파일 다운로드 실행
      document.body.removeChild(link); // 다운로드 후 링크 요소 제거
    } else {
      alert("저장된 데이터가 없어 CSV를 생성할 수 없습니다.");
    }
  });
};

// 백그라운드로부터 메시지 수신 대기
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "downloadCsv") {
    damoangExportData(request.data);
    sendResponse({ status: "success" });
  }
});

window.onload = () => {
  if (isOnLoad) {
    addMemoBtnForWriter();
    addMemoBtn();
    isOnLoad = false;
  }
};
