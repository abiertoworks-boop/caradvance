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
  送信内容は選択肢の照合・連続送信の制限・全体の送信数上限（1時間30件）を行います。自動返信には、お客様の自由記述を転記しません。
  PHPが動かない静的ホスティング（GitHub Pages 等）ではフォームは送信エラーになり、LINE・電話へ案内します。
- **お名前.com への自動デプロイ**：`.github/workflows/deploy-onamae.yml`。リポジトリの Secrets に
  `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` / `FTP_SERVER_DIR` を登録すると、main への push で自動アップロードされます。
- **古物商許可番号**：`index.html` の会社情報（コメントアウト部分）に記載してください。
- **OGP / canonical**：`https://www.ucar-advance.com/` を前提に設定済みです。ドメインを変える場合は `index.html` と `sitemap.xml` を更新してください。
- **構造化データ**：営業時間の時刻が未確定のため、JSON-LD から営業時間を外しています。確定したら `openingHoursSpecification`（opens / closes つき）を追加してください。

## 計測

CTAクリック・フォーム送信は `window.dataLayer` にイベントを送信します（GTM / GA4 用）。

- `cta_click`（`cta_name`, `cta_type`: line / tel / form）
- `form_start`
- `generate_lead`
