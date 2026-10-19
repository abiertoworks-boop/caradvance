# Car Advance

オークション代行・中古車販売「Car Advance（有限会社NOAH）」の公式サイト。

## 構成

```
index.html     トップページ
privacy.html   プライバシーポリシー
css/style.css
js/main.js     スクロール演出（GSAP / ScrollTrigger）・フォーム・CTA計測
images/
```

ビルド不要の静的サイトです。リポジトリのルートをそのまま公開してください。

## 公開前の設定

- **フォーム送信先**：Netlify で公開する場合はそのまま動作します（Netlify Forms）。
  それ以外のホスティングでは `index.html` の `<form id="form" ... data-endpoint="">` に
  Formspree 等の送信先URLを設定してください。
- **古物商許可番号**：`index.html` の会社情報（コメントアウト部分）に記載してください。
- **OGP**：本番ドメイン確定後、`og:image` を絶対URLに変更してください。

## 計測

CTAクリック・フォーム送信は `window.dataLayer` にイベントを送信します（GTM / GA4 用）。

- `cta_click`（`cta_name`, `cta_type`: line / tel / form）
- `form_start`
- `generate_lead`
