#!/usr/bin/env node

/**
 * Script to get Chrome Web Store API refresh token
 *
 * Usage:
 * 1. Set environment variables CLIENT_ID and CLIENT_SECRET
 * 2. Run: node scripts/get-refresh-token.js
 * 3. Follow the URL and authorize
 * 4. Copy the code from the redirect URL
 * 5. Paste it back here
 */

import readline from 'readline';
import https from 'https';
import { URLSearchParams } from 'url';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Please set CLIENT_ID and CLIENT_SECRET environment variables');
  console.error('\nExample:');
  console.error('export CLIENT_ID="your-client-id-here"');
  console.error('export CLIENT_SECRET="your-client-secret-here"');
  console.error('node scripts/get-refresh-token.js');
  process.exit(1);
}

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

// Step 1: Generate authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPE)}&` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('\n📋 Chrome Web Store API - Get Refresh Token\n');
console.log('Step 1: Open this URL in your browser:\n');
console.log('🔗', authUrl);
console.log('\nStep 2: Sign in and authorize the application');
console.log('Step 3: You\'ll see a code - copy it');
console.log('Step 4: Paste the code here and press Enter\n');

// Step 2: Get authorization code from user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Authorization code: ', async (code) => {
  if (!code) {
    console.error('❌ No code provided');
    rl.close();
    process.exit(1);
  }

  // Step 3: Exchange code for refresh token
  const tokenParams = new URLSearchParams({
    code: code.trim(),
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': tokenParams.toString().length
    }
  };

  console.log('\n⏳ Exchanging code for tokens...\n');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);

        if (result.error) {
          console.error('❌ Error:', result.error_description || result.error);
        } else if (result.refresh_token) {
          console.log('✅ Success! Here are your tokens:\n');
          console.log('REFRESH_TOKEN:', result.refresh_token);
          console.log('\n📝 Save these in your GitHub Secrets:');
          console.log('- EXTENSION_ID: (get from Chrome Web Store dashboard)');
          console.log('- CLIENT_ID:', CLIENT_ID);
          console.log('- CLIENT_SECRET:', CLIENT_SECRET);
          console.log('- REFRESH_TOKEN:', result.refresh_token);
          console.log('\n⚠️  Keep the refresh token secure and never commit it to your repository!');
        } else {
          console.error('❌ No refresh token received. Response:', data);
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', data);
      }
      rl.close();
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
    rl.close();
  });

  req.write(tokenParams.toString());
  req.end();
});