#!/usr/bin/env node
/**
 * SONORA — GitHub Push Automation Script
 * Pushes the committed SONORA codebase to https://github.com/ayushpatil5408/SONORA.git
 * 
 * Usage:
 *   node scripts/push-to-github.mjs <GITHUB_PERSONAL_ACCESS_TOKEN>
 *   or:
 *   GITHUB_TOKEN=<token> node scripts/push-to-github.mjs
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const token = process.argv[2] || process.env.GITHUB_TOKEN;

  if (!token) {
    console.error(`\x1b[31m[ERROR] GitHub Personal Access Token (PAT) is required to push to GitHub.\x1b[0m`);
    console.log(`\nTo generate a token on GitHub:`);
    console.log(`1. Visit: https://github.com/settings/tokens?type=beta (or classic: https://github.com/settings/tokens)`);
    console.log(`2. Generate a token with 'repo' (Full control of private repositories) or 'Contents: Read and Write' scope.`);
    console.log(`3. Run:`);
    console.log(`   GITHUB_TOKEN=<YOUR_TOKEN> node scripts/push-to-github.mjs`);
    console.log(`   or:`);
    console.log(`   node scripts/push-to-github.mjs <YOUR_TOKEN>\n`);
    process.exit(1);
  }

  console.log(`\x1b[36m[SONORA] Initializing git push to https://github.com/ayushpatil5408/SONORA.git...\x1b[0m`);

  // Load isomorphic-git bundle
  console.log(`[1/4] Loading git runtime engine...`);
  const [gitCode, httpCode] = await Promise.all([
    (await fetch('https://unpkg.com/isomorphic-git@latest/index.umd.min.js')).text(),
    (await fetch('https://unpkg.com/isomorphic-git@latest/http/web/index.umd.js')).text(),
  ]);

  const sandbox = { globalThis: {}, console, process, Buffer, fetch, Headers, Request, Response };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(gitCode, sandbox);
  vm.runInContext(httpCode, sandbox);

  const git = sandbox.git;
  const http = sandbox.GitHttp;

  console.log(`[2/4] Verifying repository status & commit log...`);
  const currentBranch = await git.currentBranch({ fs, dir: projectRoot });
  const log = await git.log({ fs, dir: projectRoot, depth: 1 });
  const latestCommit = log[0];

  console.log(`   - Branch: ${currentBranch}`);
  console.log(`   - Head Commit: ${latestCommit.oid.slice(0, 7)}: "${latestCommit.commit.message.split('\n')[0]}"`);
  console.log(`   - Author: ${latestCommit.commit.author.name} <${latestCommit.commit.author.email}>`);

  console.log(`[3/4] Authenticating with GitHub and pushing to origin/${currentBranch}...`);
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: projectRoot,
      remote: 'origin',
      ref: currentBranch || 'main',
      url: `https://github.com/ayushpatil5408/SONORA.git`,
      onAuth: () => ({
        username: token.trim(),
        password: '',
      }),
    });

    console.log(`\x1b[32m[4/4] Push successful!\x1b[0m`);
    console.log(`\nRepository is live at: https://github.com/ayushpatil5408/SONORA\n`);
    if (pushResult?.ok) {
      console.log(`Push status: OK`);
    }
  } catch (err) {
    console.error(`\x1b[31m[PUSH FAILED]\x1b[0m: ${err.message}`);
    if (err.data?.statusCode === 401 || err.data?.statusCode === 403) {
      console.error(`Authentication error (${err.data.statusCode}): Please ensure your Personal Access Token has 'repo' write permissions.`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
