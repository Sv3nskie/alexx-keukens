<?php
/**
 * Alexx Keukens — contact form handler.
 *
 * Receives the form on contact.html, validates it, mails it to the showroom
 * and (optionally) sends the visitor a confirmation. No dependencies.
 *
 * Answers JSON to fetch() requests and falls back to a redirect for visitors
 * without JavaScript.
 */

// ── settings ────────────────────────────────────────────────────────────────
const MAIL_TO            = 'info@alexxkeukens.nl';   // where aanvragen arrive
const MAIL_FROM          = 'info@alexxkeukens.nl';     // must be a real mailbox on this domain (SPF)
const MAIL_FROM_NAME     = 'Alexx Keukens website';
const SEND_CONFIRMATION  = true;                       // autoresponder to the visitor
const MAX_PER_HOUR       = 5;                          // per IP address
const SUCCESS_REDIRECT   = '/contact?verzonden=1';     // used when JavaScript is off

// ── helpers ─────────────────────────────────────────────────────────────────
function wants_json(): bool {
    return stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

function respond(int $status, bool $ok, string $message = ''): void {
    if (wants_json()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
    } elseif ($ok) {
        header('Location: ' . SUCCESS_REDIRECT, true, 303);
    } else {
        http_response_code($status);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><meta charset="utf-8"><title>Versturen niet gelukt</title>'
           . '<p style="font:16px/1.6 system-ui;max-width:40em;margin:3em auto;padding:0 1em">'
           . htmlspecialchars($message, ENT_QUOTES) . ' '
           . '<a href="/contact">Terug naar het formulier</a>.</p>';
    }
    exit;
}

/** One line of user input, safe to drop into a mail header. */
function clean_line(string $v, int $max = 200): string {
    $v = str_replace(["\r", "\n", "\0", "%0a", "%0d"], ' ', $v);
    return mb_substr(trim($v), 0, $max);
}

function clean_text(string $v, int $max = 5000): string {
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr(trim($v), 0, $max);
}

/** Crude per-IP throttle: MAX_PER_HOUR submissions, counted in a temp file. */
function throttled(): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = sys_get_temp_dir() . '/alexx-form-' . md5($ip) . '.txt';
    $now = time();
    $hits = is_readable($file) ? array_filter(explode(',', (string) file_get_contents($file))) : [];
    $hits = array_filter($hits, static fn($t) => $now - (int) $t < 3600);
    if (count($hits) >= MAX_PER_HOUR) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, implode(',', $hits), LOCK_EX);
    return false;
}

// ── request ─────────────────────────────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Methode niet toegestaan.');
}

// Honeypot: a field hidden from people, irresistible to bots.
if (trim((string) ($_POST['bedrijf'] ?? '')) !== '') {
    respond(200, true); // play along silently
}

$naam     = clean_line((string) ($_POST['naam'] ?? ''), 100);
$email    = clean_line((string) ($_POST['email'] ?? ''), 150);
$telefoon = clean_line((string) ($_POST['telefoon'] ?? ''), 50);
$vraag    = clean_text((string) ($_POST['vraag'] ?? ''));
$interesse = (string) ($_POST['interesse'] ?? 'keuken');
if (!in_array($interesse, ['keuken', 'kast', 'beide'], true)) {
    $interesse = 'keuken';
}

if ($naam === '') {
    respond(422, false, 'Vul uw naam in.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Vul een geldig e-mailadres in.');
}

// Only count genuine, valid submissions against the per-IP limit.
if (throttled()) {
    respond(429, false, 'U heeft zojuist al een aanvraag verstuurd. Probeer het later opnieuw of bel 024 355 0330.');
}

// ── mail to the showroom ────────────────────────────────────────────────────
$onderwerp = 'Aanvraag via de website — ' . $naam;
$body = "Nieuwe aanvraag via alexxkeukens.nl\n"
      . str_repeat('-', 46) . "\n\n"
      . "Naam:       {$naam}\n"
      . "E-mail:     {$email}\n"
      . "Telefoon:   " . ($telefoon !== '' ? $telefoon : '—') . "\n"
      . "Onderwerp:  {$interesse}\n\n"
      . "Vraag of plan:\n"
      . ($vraag !== '' ? $vraag : '—') . "\n\n"
      . str_repeat('-', 46) . "\n"
      . 'Verstuurd op ' . date('d-m-Y \o\m H:i') . "\n"
      . 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\n";

$from = sprintf('%s <%s>', MAIL_FROM_NAME, MAIL_FROM);
$headers = [
    'From: ' . $from,
    'Reply-To: ' . sprintf('%s <%s>', $naam, $email),
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    'X-Mailer: alexxkeukens.nl',
];

$sent = @mail(MAIL_TO, $onderwerp, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    error_log('[alexx-contact] mail() failed for ' . $email);
    respond(500, false, 'Versturen is niet gelukt. Probeer het nog eens of bel 024 355 0330.');
}

// ── confirmation to the visitor ─────────────────────────────────────────────
if (SEND_CONFIRMATION) {
    $voornaam = explode(' ', $naam)[0] ?: 'alvast';
    $bevestiging = "Beste {$voornaam},\n\n"
        . "Bedankt voor uw aanvraag. Wij hebben hem goed ontvangen en nemen zo snel\n"
        . "mogelijk contact met u op.\n\n"
        . "Liever meteen iets bespreken? Bel 024 355 0330.\n\n"
        . "Met vriendelijke groet,\n"
        . "Alexx Keukens\n"
        . "Roggeweg 30G, 6534 AJ Nijmegen\n"
        . "024 355 0330 · info@alexxkeukens.nl\n\n"
        . str_repeat('-', 46) . "\n"
        . "Uw aanvraag:\n\n{$body}";

    @mail(
        sprintf('%s <%s>', $naam, $email),
        'Wij hebben uw aanvraag ontvangen — Alexx Keukens',
        $bevestiging,
        implode("\r\n", [
            'From: ' . $from,
            'Reply-To: ' . MAIL_TO,
            'Content-Type: text/plain; charset=UTF-8',
            'MIME-Version: 1.0',
        ]),
        '-f' . MAIL_FROM
    );
}

respond(200, true);
