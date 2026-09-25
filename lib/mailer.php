<?php
/**
 * Minimal SMTP client — enough to send one plain-text message, no dependencies.
 *
 * The local mail system on this host introduces itself as *.plesk.page, which
 * has no relationship to alexxkeukens.nl: receiving servers accept those
 * messages and then discard them. Sending through mijndomein's own SMTP with
 * the mailbox credentials makes the mail properly ours, so SPF and DKIM line
 * up and it is delivered normally.
 *
 * Credentials live in mail-config.php ABOVE the document root, so the web
 * server can never serve them and they are not in version control.
 */

function smtp_config(): ?array
{
    $path = dirname(__DIR__, 2) . '/mail-config.php';   // .../<subscription>/mail-config.php
    if (!is_readable($path)) {
        return null;
    }
    $cfg = include $path;
    if (!is_array($cfg)) {
        return null;
    }
    // 'mx' mode needs no credentials at all; 'smtp' mode needs a mailbox
    $mode = $cfg['mode'] ?? 'smtp';
    if ($mode === 'mx') {
        return $cfg;
    }
    return !empty($cfg['host']) && !empty($cfg['user']) ? $cfg : null;
}

/** Read one SMTP reply (handles multi-line 250- continuations). */
function smtp_read($fp, string $expect, array &$log): bool
{
    $line = '';
    do {
        $line = fgets($fp, 1024);
        if ($line === false) {
            $log[] = 'no reply';
            return false;
        }
        $log[] = rtrim($line);
    } while (isset($line[3]) && $line[3] === '-');

    return strncmp($line, $expect, strlen($expect)) === 0;
}

function smtp_cmd($fp, string $cmd, string $expect, array &$log, bool $secret = false): bool
{
    $log[] = '> ' . ($secret ? '***' : $cmd);
    fwrite($fp, $cmd . "\r\n");
    return smtp_read($fp, $expect, $log);
}

/** UTF-8 safe subject/name encoding. */
function smtp_encode(string $text): string
{
    return preg_match('/[^\x20-\x7E]/', $text)
        ? '=?UTF-8?B?' . base64_encode($text) . '?='
        : $text;
}

/** IPv4 addresses for a host — SPF here only covers the IPv4 address. */
function smtp_ipv4_for(string $host): array
{
    $recs = @dns_get_record($host, DNS_A) ?: [];
    $ips = array_column($recs, 'ip');
    return $ips ?: [$host];            // let the resolver decide if there is no A record
}

/** Mail servers for a recipient domain, best first. */
function smtp_hosts_for(string $address): array
{
    $domain = substr(strrchr($address, '@') ?: '', 1);
    if ($domain === '') {
        return [];
    }
    $mx = [];
    $weights = [];
    if (getmxrr($domain, $mx, $weights) && $mx) {
        array_multisort($weights, $mx);
        return $mx;
    }
    return [$domain];                  // fall back to the domain's own A record
}

/**
 * @return array{0: bool, 1: string}  success, and a short transcript for the log
 */
function smtp_send(array $cfg, string $to, string $subject, string $body, array $opts = []): array
{
    $host = $opts['host'] ?? $cfg['host'] ?? '';
    $port = (int) ($opts['port'] ?? $cfg['port'] ?? 587);
    $from = $cfg['from'] ?? $cfg['user'];
    $fromName = $opts['from_name'] ?? ($cfg['from_name'] ?? '');
    $replyTo = $opts['reply_to'] ?? '';
    $replyName = $opts['reply_name'] ?? '';
    $log = [];

    $transport = $port === 465 ? 'ssl://' : 'tcp://';
    // Connect over IPv4. This host also has an IPv6 address, which the domain's
    // SPF record does not cover, and Gmail rejects the mail outright:
    //   550-5.7.26 SPF [alexxkeukens.nl] with ip: [2a01:448:...] = did not pass
    $target = $opts['connect_ip'] ?? $host;
    $fp = @stream_socket_client($transport . $target . ':' . $port, $errno, $errstr, 15,
        STREAM_CLIENT_CONNECT, stream_context_create([
            'ssl' => ['peer_name' => $host],
        ]));
    if (!$fp) {
        return [false, 'connect failed: ' . $errstr];
    }
    stream_set_timeout($fp, 15);

    $helo = $cfg['helo'] ?? 'alexxkeukens.nl';
    $ok = smtp_read($fp, '220', $log)
        && smtp_cmd($fp, 'EHLO ' . $helo, '250', $log);

    if ($ok && $port !== 465) {
        $ok = smtp_cmd($fp, 'STARTTLS', '220', $log)
            && stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)
            && smtp_cmd($fp, 'EHLO ' . $helo, '250', $log);
    }

    if ($ok && !empty($cfg['user']) && !empty($cfg['pass']) && empty($opts['no_auth'])) {
        $ok = smtp_cmd($fp, 'AUTH LOGIN', '334', $log)
            && smtp_cmd($fp, base64_encode($cfg['user']), '334', $log, true)
            && smtp_cmd($fp, base64_encode($cfg['pass']), '235', $log, true);
    }

    $ok = $ok
        && smtp_cmd($fp, 'MAIL FROM:<' . $from . '>', '250', $log)
        && smtp_cmd($fp, 'RCPT TO:<' . $to . '>', '250', $log)
        && smtp_cmd($fp, 'DATA', '354', $log);

    if ($ok) {
        $headers = [
            'Date: ' . date('r'),
            'From: ' . ($fromName ? smtp_encode($fromName) . ' <' . $from . '>' : $from),
            'To: ' . $to,
            'Subject: ' . smtp_encode($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@alexxkeukens.nl>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        if ($replyTo) {
            $headers[] = 'Reply-To: '
                . ($replyName ? smtp_encode($replyName) . ' <' . $replyTo . '>' : $replyTo);
        }
        // a lone dot on a line would end the message early
        $data = implode("\r\n", $headers) . "\r\n\r\n"
              . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", $body));
        fwrite($fp, $data . "\r\n.\r\n");
        $ok = smtp_read($fp, '250', $log);
    }

    @smtp_cmd($fp, 'QUIT', '221', $log);
    fclose($fp);

    return [$ok, implode(' | ', array_slice($log, -6))];
}

/**
 * Deliver straight to the recipient's own mail servers — no mailbox, no
 * password, nothing that can be rotated out from under the site. SPF passes
 * because the domain's record authorises this web server.
 *
 * @return array{0: bool, 1: string}
 */
function mx_send(array $cfg, string $to, string $subject, string $body, array $opts = []): array
{
    $last = 'no mail server found';
    foreach (smtp_hosts_for($to) as $host) {
        foreach (smtp_ipv4_for($host) as $ip) {
            [$ok, $trace] = smtp_send($cfg, $to, $subject, $body,
                $opts + ['host' => $host, 'connect_ip' => $ip, 'port' => 25, 'no_auth' => true]);
            if ($ok) {
                return [true, $host . ' (' . $ip . '): ok'];
            }
            $last = $host . ' (' . $ip . '): ' . $trace;
        }
    }
    return [false, $last];
}
