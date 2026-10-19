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

- **フォーム送信先**：`contact.php`（PHP + mb_send_mail）で送信します。通知先は `contact.php` 冒頭の `MAIL_TO`（現在 linklink5715@gmail.com）。
  PHPが動かない静的ホスティング（GitHub Pages 等）ではフォームは送信エラーになり、LINE・電話へ案内します。
- **お名前.com への自動デプロイ**：`.github/workflows/deploy-onamae.yml`。リポジトリの Secrets に
  `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` / `FTP_SERVER_DIR` を登録すると、main への push で自動アップロードされます。
- **古物商許可番号**：`index.html` の会社情報（コメントアウト部分）に記載してください。
- **OGP**：本番ドメイン確定後、`og:image` を絶対URLに変更してください。

## 計測

CTAクリック・フォーム送信は `window.dataLayer` にイベントを送信します（GTM / GA4 用）。

- `cta_click`（`cta_name`, `cta_type`: line / tel / form）
- `form_start`
- `generate_lead`
