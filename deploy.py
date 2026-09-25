#!/usr/bin/env python3
"""
Deploy the site to the mijndomein (Plesk) webspace over FTPS.

Credentials come from the environment, never from this file:

    FTP_HOST=213.249.67.30  FTP_USER=...  FTP_PASS=...  python deploy.py

Options:
    --backup      download the current remote httpdocs into ./_backup-<date>/ first
    --dry-run     list what would be uploaded, change nothing
    --dir PATH    remote target (default /httpdocs)

FTPS (explicit TLS) is used, so the password is never sent in the clear.
"""
from __future__ import annotations

import argparse
import datetime as dt
import ftplib
import os
import ssl
import sys
from pathlib import Path

# Files that live in the repo but must never reach the webserver.
EXCLUDE_NAMES = {
    '.git', '.gitignore', '.nojekyll', 'deploy.py', '_router.php',
    'README.md', 'htaccess-alexxinterieur.txt', '.pw',
}
EXCLUDE_SUFFIX = {'.md', '.bak', '.log'}
LOCAL = Path(__file__).resolve().parent


def wanted(p: Path) -> bool:
    if any(part in EXCLUDE_NAMES for part in p.relative_to(LOCAL).parts):
        return False
    if p.name.startswith('_backup-'):
        return False
    return p.suffix.lower() not in EXCLUDE_SUFFIX


def connect(host: str, user: str, password: str) -> ftplib.FTP_TLS:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False          # shared hosting certs rarely match the IP
    ctx.verify_mode = ssl.CERT_NONE
    ftp = ftplib.FTP_TLS(context=ctx)
    ftp.connect(host, 21, timeout=30)
    ftp.login(user, password)
    ftp.prot_p()                        # encrypt the data channel too
    ftp.set_pasv(True)
    return ftp


def ensure_dir(ftp: ftplib.FTP_TLS, remote: str) -> None:
    parts, path = [p for p in remote.split('/') if p], ''
    for part in parts:
        path += '/' + part
        try:
            ftp.mkd(path)
        except ftplib.error_perm as e:
            if not str(e).startswith('550'):   # 550 = already exists
                raise


def remote_files(ftp: ftplib.FTP_TLS, root: str) -> list[str]:
    """Every file under root, depth-first, as absolute remote paths."""
    found: list[str] = []
    try:
        entries = list(ftp.mlsd(root))
    except (ftplib.error_perm, ftplib.error_temp):
        return found
    for name, facts in entries:
        if name in ('.', '..'):
            continue
        path = f'{root}/{name}'
        if facts.get('type') == 'dir':
            found += remote_files(ftp, path)
        elif facts.get('type') == 'file':
            found.append(path)
    return found


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--backup', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--dir', default='/httpdocs')
    args = ap.parse_args()

    host = os.environ.get('FTP_HOST')
    user = os.environ.get('FTP_USER')
    password = os.environ.get('FTP_PASS')
    if not all((host, user, password)):
        print('Set FTP_HOST, FTP_USER and FTP_PASS in the environment.', file=sys.stderr)
        return 2

    files = sorted(p for p in LOCAL.rglob('*') if p.is_file() and wanted(p))
    total = sum(p.stat().st_size for p in files)
    print(f'{len(files)} files, {total/1024:.0f} KB -> {host}:{args.dir}')

    if args.dry_run:
        for p in files:
            print('   ', p.relative_to(LOCAL).as_posix())
        return 0

    ftp = connect(host, user, password)
    print('connected:', ftp.getwelcome() or 'ok')

    if args.backup:
        stamp = dt.datetime.now().strftime('%Y%m%d-%H%M')
        dest = LOCAL / f'_backup-{stamp}'
        existing = remote_files(ftp, args.dir)
        print(f'backing up {len(existing)} remote files into {dest.name}/')
        for rpath in existing:
            local = dest / rpath[len(args.dir):].lstrip('/')
            local.parent.mkdir(parents=True, exist_ok=True)
            with open(local, 'wb') as fh:
                ftp.retrbinary(f'RETR {rpath}', fh.write)
        print('backup done')

    ensure_dir(ftp, args.dir)
    made: set[str] = set()
    for p in files:
        rel = p.relative_to(LOCAL).as_posix()
        remote = f'{args.dir}/{rel}'
        parent = remote.rsplit('/', 1)[0]
        if parent not in made:
            ensure_dir(ftp, parent)
            made.add(parent)
        with open(p, 'rb') as fh:
            ftp.storbinary(f'STOR {remote}', fh)
        print(f'  up  {rel}  ({p.stat().st_size/1024:.0f} KB)')

    ftp.quit()
    print('\ndone.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
