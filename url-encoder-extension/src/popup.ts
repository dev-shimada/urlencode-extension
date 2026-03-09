class UrlEncoder {
  private urlInput: HTMLTextAreaElement;
  private resultDisplay: HTMLDivElement;
  private encodeBtn: HTMLButtonElement;
  private decodeBtn: HTMLButtonElement;
  private copyBtn: HTMLButtonElement;
  private navigateBtn: HTMLButtonElement;
  private selectionInfo: HTMLDivElement;
  private currentUrl: string = "";

  constructor() {
    this.urlInput = document.getElementById("urlInput") as HTMLTextAreaElement;
    this.resultDisplay = document.getElementById(
      "resultDisplay"
    ) as HTMLDivElement;
    this.encodeBtn = document.getElementById(
      "encodeBtn"
    ) as HTMLButtonElement;
    this.decodeBtn = document.getElementById(
      "decodeBtn"
    ) as HTMLButtonElement;
    this.copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
    this.navigateBtn = document.getElementById(
      "navigateBtn"
    ) as HTMLButtonElement;
    this.selectionInfo = document.getElementById(
      "selectionInfo"
    ) as HTMLDivElement;

    this.init();
  }

  private async init(): Promise<void> {
    // 現在のタブのURLを取得
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      this.urlInput.value = tab.url;
      this.currentUrl = tab.url;
      this.renderSegmentedUrl(tab.url);
    }

    this.urlInput.addEventListener("input", () => {
      this.currentUrl = this.urlInput.value;
      this.renderSegmentedUrl(this.currentUrl);
    });

    this.urlInput.addEventListener("select", () => {
      this.updateSelectionInfo();
    });

    this.urlInput.addEventListener("mouseup", () => {
      this.updateSelectionInfo();
    });

    this.urlInput.addEventListener("keyup", () => {
      this.updateSelectionInfo();
    });

    this.encodeBtn.addEventListener("click", () => this.encodeSelection());
    this.decodeBtn.addEventListener("click", () => this.decodeSelection());
    this.copyBtn.addEventListener("click", () => this.copyResult());
    this.navigateBtn.addEventListener("click", () => this.navigateToUrl());
  }

  private updateSelectionInfo(): void {
    const start = this.urlInput.selectionStart ?? 0;
    const end = this.urlInput.selectionEnd ?? 0;

    if (start === end) {
      this.selectionInfo.textContent = "テキストを選択してエンコード/デコードできます";
      this.selectionInfo.className = "selection-info no-selection";
      this.encodeBtn.disabled = true;
      this.decodeBtn.disabled = true;
    } else {
      const selected = this.urlInput.value.substring(start, end);
      this.selectionInfo.textContent = `選択範囲: ${start}-${end} (${end - start}文字): "${selected}"`;
      this.selectionInfo.className = "selection-info has-selection";
      this.encodeBtn.disabled = false;
      this.decodeBtn.disabled = false;
    }
  }

  private encodeSelection(): void {
    const start = this.urlInput.selectionStart ?? 0;
    const end = this.urlInput.selectionEnd ?? 0;
    if (start === end) return;

    const url = this.urlInput.value;
    const before = url.substring(0, start);
    const selected = url.substring(start, end);
    const after = url.substring(end);

    const encoded = encodeURIComponent(selected);
    const newUrl = before + encoded + after;

    this.urlInput.value = newUrl;
    this.currentUrl = newUrl;

    // カーソル位置を更新
    const newEnd = start + encoded.length;
    this.urlInput.setSelectionRange(start, newEnd);

    this.renderSegmentedUrl(newUrl);
    this.updateSelectionInfo();
    this.showFeedback("エンコードしました");
  }

  private decodeSelection(): void {
    const start = this.urlInput.selectionStart ?? 0;
    const end = this.urlInput.selectionEnd ?? 0;
    if (start === end) return;

    const url = this.urlInput.value;
    const before = url.substring(0, start);
    const selected = url.substring(start, end);
    const after = url.substring(end);

    try {
      const decoded = decodeURIComponent(selected);
      const newUrl = before + decoded + after;

      this.urlInput.value = newUrl;
      this.currentUrl = newUrl;

      // カーソル位置を更新
      const newEnd = start + decoded.length;
      this.urlInput.setSelectionRange(start, newEnd);

      this.renderSegmentedUrl(newUrl);
      this.updateSelectionInfo();
      this.showFeedback("デコードしました");
    } catch (e) {
      this.showFeedback("デコードエラー: 無効なエンコード形式", true);
    }
  }

  private renderSegmentedUrl(url: string): void {
    if (!url) {
      this.resultDisplay.innerHTML =
        '<span class="placeholder">URLを入力してください</span>';
      return;
    }

    // URLをパーツに分解して色分け表示
    this.resultDisplay.innerHTML = "";
    const fragment = document.createDocumentFragment();

    try {
      const parsedUrl = new URL(url);

      // プロトコル
      const protocolSpan = this.createSpan(
        parsedUrl.protocol + "//",
        "protocol"
      );
      fragment.appendChild(protocolSpan);

      // ホスト
      const hostSpan = this.createSpan(parsedUrl.host, "host");
      fragment.appendChild(hostSpan);

      // パス
      if (parsedUrl.pathname && parsedUrl.pathname !== "/") {
        const pathSpan = this.createSpan(parsedUrl.pathname, "path");
        fragment.appendChild(pathSpan);
      } else if (parsedUrl.pathname === "/") {
        const slashSpan = this.createSpan("/", "path");
        fragment.appendChild(slashSpan);
      }

      // クエリパラメータ
      if (parsedUrl.search) {
        const queryMark = this.createSpan("?", "query-mark");
        fragment.appendChild(queryMark);

        const params = parsedUrl.search.substring(1).split("&");
        params.forEach((param, index) => {
          if (index > 0) {
            fragment.appendChild(this.createSpan("&", "query-separator"));
          }
          const eqIdx = param.indexOf("=");
          if (eqIdx !== -1) {
            const key = param.substring(0, eqIdx);
            const value = param.substring(eqIdx + 1);
            fragment.appendChild(this.createSpan(key, "param-key"));
            fragment.appendChild(this.createSpan("=", "param-eq"));
            fragment.appendChild(this.createSpan(value, "param-value"));
          } else {
            fragment.appendChild(this.createSpan(param, "param-key"));
          }
        });
      }

      // フラグメント
      if (parsedUrl.hash) {
        const hashSpan = this.createSpan(parsedUrl.hash, "fragment");
        fragment.appendChild(hashSpan);
      }
    } catch {
      // URLのパースに失敗した場合はそのまま表示
      const span = document.createElement("span");
      span.textContent = url;
      span.className = "raw";
      fragment.appendChild(span);
    }

    this.resultDisplay.appendChild(fragment);
  }

  private createSpan(text: string, className: string): HTMLSpanElement {
    const span = document.createElement("span");
    span.textContent = text;
    span.className = `url-part ${className}`;
    span.title = text;
    return span;
  }

  private async copyResult(): Promise<void> {
    const url = this.urlInput.value;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      this.showFeedback("クリップボードにコピーしました");
    } catch (e) {
      this.showFeedback("コピーに失敗しました", true);
    }
  }

  private async navigateToUrl(): Promise<void> {
    const url = this.urlInput.value;
    if (!url) return;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        await chrome.tabs.update(tab.id, { url });
        window.close();
      }
    } catch (e) {
      this.showFeedback("ナビゲートに失敗しました", true);
    }
  }

  private showFeedback(message: string, isError = false): void {
    const feedback = document.getElementById("feedback") as HTMLDivElement;
    feedback.textContent = message;
    feedback.className = isError ? "feedback error" : "feedback success";
    feedback.style.display = "block";
    setTimeout(() => {
      feedback.style.display = "none";
    }, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new UrlEncoder();
});
