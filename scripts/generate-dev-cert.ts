/**
 * generate-dev-cert — self-signed TLS certificate generator for local dev servers
 *
 * Storybook runs Vite inside an Express dev server in middleware mode, which
 * means Vite's own `server.https` option is ignored. To serve Storybook over
 * HTTPS you must pass a real certificate to the `storybook dev` CLI via
 * `--https --ssl-cert <cert> --ssl-key <key>`.
 *
 * Serving over HTTPS matters because a number of browser APIs — notably camera
 * capture and video streaming (`getUserMedia`) — are only available in a
 * "secure context". `localhost` is treated as secure over plain HTTP, but when
 * the dev server is opened from another device on the LAN (e.g. a phone by its
 * IP address, which is exactly how you test camera/scanner stories) the origin
 * is no longer a secure context unless it is served over HTTPS.
 *
 * This script generates a self-signed certificate (key.pem + cert.pem) into the
 * requested output directory using the system `openssl`. It is idempotent: an
 * existing, still-valid certificate is reused so the dev server starts fast and
 * the browser only has to trust the self-signed cert once.
 *
 * The certificate's Subject Alternative Names include `localhost`, the loopback
 * addresses and every non-private, non-internal IPv4/IPv6 address of the machine,
 * so the same certificate is valid whether Storybook is opened locally or over the
 * network.
 *
 * Usage:
 *   node --experimental-strip-types scripts/generate-dev-cert.ts <output-dir>
 *
 * Example (from an app package):
 *   node --experimental-strip-types ../../scripts/generate-dev-cert.ts .storybook/certs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

const CERT_FILE = 'cert.pem';
const KEY_FILE = 'key.pem';

/** How long a freshly generated certificate is valid for, in days. */
const CERT_VALIDITY_DAYS = 825;

/** Regenerate when the existing certificate expires within this many days. */
const CERT_RENEW_BEFORE_DAYS = 7;

/** Resolve the output directory (relative paths are resolved against the CWD). */
function resolveOutputDir(): string {
  const arg = process.argv[2];
  if (!arg) {
    throw new Error('generate-dev-cert: missing <output-dir> argument');
  }
  return isAbsolute(arg) ? arg : resolve(process.cwd(), arg);
}

/** Return true for addresses that are not useful as certificate SANs. */
function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('fec') ||
      normalized.startsWith('ff')
    );
  }

  return true;
}

/** Collect the Subject Alternative Names the certificate should be valid for. */
function collectSubjectAltNames(): string[] {
  const dnsNames = new Set<string>(['localhost']);
  const ipAddresses = new Set<string>(['127.0.0.1', '::1']);

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      // Internal, private, and scoped addresses are not valid network SANs.
      // A scope identifier (for example, `%en0`) is local routing metadata,
      // not part of the IPv6 address encoded in an X.509 certificate.
      if (address.internal || address.address.includes('%')) {
        continue;
      }
      const ip = address.address;
      if (isPrivateAddress(ip)) {
        continue;
      }
      ipAddresses.add(ip);
    }
  }

  return [...[...dnsNames].map((name) => `DNS:${name}`), ...[...ipAddresses].map((ip) => `IP:${ip}`)];
}

/**
 * Return true when a usable certificate already exists at the given paths, i.e.
 * both files are present and the certificate is not expired / about to expire.
 */
function certificateIsValid(certPath: string, keyPath: string): boolean {
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    return false;
  }

  try {
    const output = execFileSync('openssl', ['x509', '-enddate', '-noout', '-in', certPath], {
      encoding: 'utf8',
    });
    const match = output.match(/notAfter=(.*)/);
    if (!match) {
      return false;
    }
    const expiresAt = new Date(match[1].trim());
    if (Number.isNaN(expiresAt.getTime())) {
      return false;
    }
    const renewThreshold = Date.now() + CERT_RENEW_BEFORE_DAYS * 24 * 60 * 60 * 1000;
    return expiresAt.getTime() > renewThreshold;
  } catch {
    return false;
  }
}

/** Generate a fresh self-signed certificate into the output directory. */
function generateCertificate(certPath: string, keyPath: string): void {
  const subjectAltName = `subjectAltName=${collectSubjectAltNames().join(',')}`;

  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-nodes',
      '-days',
      String(CERT_VALIDITY_DAYS),
      '-subj',
      '/CN=localhost',
      '-addext',
      subjectAltName,
      '-keyout',
      keyPath,
      '-out',
      certPath,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
}

function main(): void {
  const outputDir = resolveOutputDir();
  const certPath = join(outputDir, CERT_FILE);
  const keyPath = join(outputDir, KEY_FILE);

  if (certificateIsValid(certPath, keyPath)) {
    console.log(`generate-dev-cert: reusing existing certificate at ${certPath}`);
    return;
  }

  mkdirSync(outputDir, { recursive: true });
  generateCertificate(certPath, keyPath);

  // Touch the key to surface obvious generation failures early.
  readFileSync(keyPath);
  console.log(`generate-dev-cert: generated self-signed certificate at ${certPath}`);
}

main();
