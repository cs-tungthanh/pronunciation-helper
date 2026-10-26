#!/usr/bin/env node

/**
 * Chrome Web Store API credentials helper. Reads CLIENT_ID, CLIENT_SECRET,
 * REFRESH_TOKEN and EXTENSION_ID from .env (or the environment).
 *
 * Usage:
 *   node scripts/get-refresh-token.js check   Verify the credentials the CI upload step uses
 *   node scripts/get-refresh-token.js         Get a new refresh token via the browser
 *
 * The new-token flow redirects to http://127.0.0.1:<PORT> (default 8085, override with PORT).
 * A "Desktop app" OAuth client accepts any loopback port; a "Web application" client
 * needs that exact URI added to its authorized redirect URIs.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ENV_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, EXTENSION_ID } = process.env;
const PORT = Number(process.env.PORT || 8085);
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`❌ Missing ${missing.join(', ')}. Add them to .env, e.g.:\n`);
    for (const name of missing) console.error(`${name}=...`);
    process.exit(1);
  }
}

async function requestToken(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  return res.json();
}

async function check() {
  requireEnv(['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN', 'EXTENSION_ID']);

  console.log('⏳ Exchanging refresh token for an access token...');
  const token = await requestToken({ refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token' });
  if (token.error) {
    console.error(`❌ ${token.error}: ${token.error_description || ''}`);
    if (token.error === 'invalid_grant') {
      console.error('   Refresh token expired or revoked. If the OAuth consent screen is in "Testing"');
      console.error('   mode, tokens expire after 7 days: publish the app, then run this script without "check".');
    } else if (token.error === 'invalid_client') {
      console.error('   CLIENT_ID / CLIENT_SECRET are wrong (check for stray spaces or newlines).');
    }
    process.exit(1);
  }
  console.log('✅ Credentials OK');

  console.log(`⏳ Reading extension ${EXTENSION_ID}...`);
  const res = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}?projection=DRAFT`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  const item = await res.json();
  if (!res.ok || item.error) {
    console.error(`❌ HTTP ${res.status}:`, JSON.stringify(item.error || item, null, 2));
    console.error('   Check EXTENSION_ID, that the Chrome Web Store API is enabled in the same Google');
    console.error('   Cloud project, and that you authorized with the account that owns the extension.');
    process.exit(1);
  }
  console.log('✅ Extension found:', JSON.stringify(item, null, 2));
}

function getNewToken() {
  requireEnv(['CLIENT_ID', 'CLIENT_SECRET']);

  const authUrl = 'https://accounts.google.com/o/oauth2/auth?' + new URLSearchParams({
    response_type: 'code',
    scope: SCOPE,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    access_type: 'offline',
    prompt: 'consent',
  });

  const server = http.createServer(async (req, res) => {
    const params = new URL(req.url, REDIRECT_URI).searchParams;
    const code = params.get('code');
    if (!code) {
      res.end(params.get('error') ? `Authorization failed: ${params.get('error')}` : 'Waiting for authorization...');
      if (params.get('error')) {
        console.error('❌ Authorization failed:', params.get('error'));
        server.close();
        process.exitCode = 1;
      }
      return;
    }

    res.end('Done. You can close this tab and go back to the terminal.');
    server.close();

    const result = await requestToken({ code, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' });
    if (!result.refresh_token) {
      console.error('❌ No refresh token received:', JSON.stringify(result));
      process.exitCode = 1;
      return;
    }
    console.log('\n✅ New refresh token:\n');
    console.log(result.refresh_token);
    console.log('\n📝 Put it in .env as REFRESH_TOKEN and in the GitHub secret REFRESH_TOKEN,');
    console.log('   then run: node scripts/get-refresh-token.js check');
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log('\n📋 Open this URL and sign in with the account that owns the extension:\n');
    console.log(authUrl);
    console.log(`\n⏳ Waiting for the redirect to ${REDIRECT_URI} ...`);
  });
}

if (process.argv[2] === 'check') {
  check().catch((e) => {
    console.error('❌ Request failed:', e.message);
    process.exit(1);
  });
} else {
  getNewToken();
}
