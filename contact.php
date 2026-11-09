<?php
/**
 * Car Advance お問い合わせフォーム送信処理
 * お名前.com レンタルサーバー等、PHP + mb_send_mail が使えるサーバーで動作します。
 */

/* ===== 設定 ===== */
// 問い合わせの通知先
const MAIL_TO = 'linklink5715@gmail.com';
// 送信元（サイトのドメインのアドレスにすると迷惑メール判定されにくくなります。空ならサーバーのドメインから自動生成）
const MAIL_FROM = '';
const SITE_NAME = 'Car Advance（カーアドバンス）';
const TEL = '06-6415-7184';
const LINE_URL = 'https://lin.ee/raFB37D9';
// 同一IPからの連続送信を制限する秒数
const THROTTLE_SEC = 30;
// サイト全体で1時間に受け付ける送信数の上限（大量送信・迷惑メール踏み台化の対策）
const HOURLY_LIMIT = 30;
// フォームの選択肢（これ以外の値は受け付けない）
const SUBJECTS = ['車を買いたい（落札代行）', '車を売りたい（出品代行）', '査定・買取', '廃車・不動車', '法人・福祉車両のご相談', 'その他'];
const BUDGETS = ['', '〜100万円', '100〜200万円', '200〜300万円', '300〜500万円', '500万円〜', '未定・相談したい'];
/* ================= */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond($ok, $message = '', $code = 200) {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function field($key, $max) {
    $v = isset($_POST[$key]) && is_string($_POST[$key]) ? $_POST[$key] : '';
    $v = str_replace(["\r\n", "\r"], "\n", trim($v));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return mb_substr($v, 0, $max, 'UTF-8');
}

function oneline($v) {
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method Not Allowed', 405);
}

// 他サイトからの送信を拒否
$host = isset($_SERVER['HTTP_HOST']) ? strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'])) : '';
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $originHost = strtolower((string) parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST));
    if ($originHost !== '' && $originHost !== $host) {
        respond(false, 'Forbidden', 403);
    }
}

// スパム対策（ボットだけが入力する隠し項目）
if (field('bot-field', 200) !== '') {
    respond(true); // ボットには成功を装う
}

// 連続送信の制限
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$lock = rtrim(sys_get_temp_dir(), '/\\') . '/caradvance_form_' . md5($ip);
if (is_file($lock) && (time() - filemtime($lock)) < THROTTLE_SEC) {
    respond(false, '短時間に連続して送信されました。しばらくしてから再度お試しください。', 429);
}

// サイト全体の送信数の上限（1時間あたり）
$gl = rtrim(sys_get_temp_dir(), '/\\') . '/caradvance_form_global';
$stamps = [];
if (is_file($gl)) {
    $raw = @file_get_contents($gl);
    foreach (explode("\n", (string) $raw) as $line) {
        $ts = (int) $line;
        if ($ts > time() - 3600) $stamps[] = $ts;
    }
}
if (count($stamps) >= HOURLY_LIMIT) {
    respond(false, 'ただいま混み合っています。お手数ですがLINEまたはお電話でご連絡ください。', 429);
}

$subject = oneline(field('subject', 60));
$car     = oneline(field('car', 200));
$budget  = oneline(field('budget', 60));
$name    = oneline(field('name', 60));
$tel     = oneline(field('tel', 30));
$email   = oneline(field('email', 254));
$message = field('message', 3000);
$agree   = field('agree', 20);

$errors = [];
if ($subject === '' || !in_array($subject, SUBJECTS, true)) $errors[] = 'ご相談内容';
if (!in_array($budget, BUDGETS, true)) $errors[] = 'ご予算';
if ($name === '') $errors[] = 'お名前';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'メールアドレス';
if ($tel !== '' && !preg_match('/^[0-9\-\s()+]{10,20}$/', $tel)) $errors[] = '電話番号';
if ($message === '') $errors[] = 'ご相談内容の詳細';
if ($agree === '') $errors[] = 'プライバシーポリシーへの同意';
if ($errors) {
    respond(false, '入力内容をご確認ください：' . implode('、', $errors), 422);
}

mb_language('uni');
mb_internal_encoding('UTF-8');

$domain = preg_replace('/^www\./', '', $host);
$from = MAIL_FROM !== '' ? MAIL_FROM : ('noreply@' . ($domain !== '' ? $domain : 'localhost'));
$fromHeader = 'From: ' . mb_encode_mimeheader(SITE_NAME) . " <{$from}>";
$date = date('Y年n月j日 H:i');

/* ---- 店舗への通知 ---- */
$body = <<<TXT
Webサイトのお問い合わせフォームから送信がありました。

━━━━━━━━━━━━━━━━━━━━
■ ご相談内容：{$subject}
■ 希望車種・お車の情報：{$car}
■ ご予算：{$budget}
■ お名前：{$name}
■ 電話番号：{$tel}
■ メールアドレス：{$email}
■ ご相談内容の詳細：
{$message}
━━━━━━━━━━━━━━━━━━━━
送信日時：{$date}
送信元IP：{$ip}

※このメールに返信すると、お客様（{$email}）宛てに返信できます。
TXT;

$headers = $fromHeader . "\r\nReply-To: {$email}";
$sent = mb_send_mail(MAIL_TO, "【Car Advance】お問い合わせ（{$subject}）{$name}様", $body, $headers);

if (!$sent) {
    error_log('[caradvance] mail to shop failed');
    respond(false, '送信に失敗しました。', 500);
}

@touch($lock);
$stamps[] = time();
@file_put_contents($gl, implode("\n", $stamps), LOCK_EX);

/* ---- お客様への自動返信 ---- */
$tel_ = TEL; $line_ = LINE_URL; $site_ = SITE_NAME;
$reply = <<<TXT
{$name} 様

この度は{$site_}へお問い合わせいただき、誠にありがとうございます。
以下の内容で受け付けいたしました。内容を確認のうえ、担当者よりご連絡いたします。

━━━━━━━━━━━━━━━━━━━━
■ ご相談内容：{$subject}
■ 希望車種・お車の情報：{$car}
■ ご予算：{$budget}
■ お名前：{$name}
■ 電話番号：{$tel}
■ ご相談内容の詳細：ご入力いただいた内容を確認のうえ、ご連絡いたします
━━━━━━━━━━━━━━━━━━━━

お急ぎの場合は、お電話またはLINEでもお気軽にご連絡ください。
電話：{$tel_}（休業日：日曜日）
LINE：{$line_}

※本メールは送信専用アドレスから自動送信しています。このメールへのご返信はできません。
　追加のご連絡は、当サイトのお問い合わせフォーム・お電話・LINEよりお願いいたします。

──────────────────
有限会社NOAH　カーアドバンス（Car Advance）
〒661-0951 兵庫県尼崎市田能5-7-15-103
TEL：{$tel_}
──────────────────
TXT;

@mb_send_mail($email, '【Car Advance】お問い合わせありがとうございます', $reply, $fromHeader);

respond(true);
