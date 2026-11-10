const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');

const projectDir = path.resolve(__dirname, '..');
const webDir = path.join(projectDir, 'dist');
const audioDir = path.join(webDir, 'demo-audio');
const rawDir = path.join(webDir, 'demo-recording-source');
const outputVideo = path.join(webDir, 'amplify-campaigns-demo.webm');
const tempHtml = path.join(webDir, 'demo-run.html');
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:\\Users\\hp\\AppData\\Local\\ms-playwright';
const runtimeRequire = createRequire('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = runtimeRequire('playwright');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function jsonFile(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source);
}

function addWebmDuration(file, durationSeconds) {
  const bytes = fs.readFileSync(file);
  const infoOffset = bytes.indexOf(Buffer.from([0x15, 0x49, 0xa9, 0x66]));
  assert(infoOffset >= 0, 'The recorded WebM has no Segment Info element.');
  const sizeOffset = infoOffset + 4;
  const vint = bytes[sizeOffset];
  let vintLength = 1;
  while (vintLength <= 8 && (vint & (0x80 >> (vintLength - 1))) === 0) vintLength++;
  assert(vintLength === 1, 'Unexpected WebM Segment Info size encoding.');
  const oldSize = vint & 0x7f;
  const infoEnd = sizeOffset + vintLength + oldSize;
  const existingDuration = bytes.indexOf(Buffer.from([0x44, 0x89]), sizeOffset + vintLength);
  assert(existingDuration < 0 || existingDuration >= infoEnd, 'The recorded WebM already has a Duration element.');
  const durationElement = Buffer.alloc(11);
  durationElement[0] = 0x44;
  durationElement[1] = 0x89;
  durationElement[2] = 0x88;
  durationElement.writeDoubleBE(durationSeconds * 1000, 3); // default WebM timecode scale is one millisecond
  const newSize = oldSize + durationElement.length;
  assert(newSize < 127, 'WebM Segment Info is too large for the duration patch.');
  bytes[sizeOffset] = 0x80 | newSize;
  fs.writeFileSync(file, Buffer.concat([bytes.subarray(0, infoEnd), durationElement, bytes.subarray(infoEnd)]));
}

async function main() {
  assert(fs.existsSync(path.join(webDir, 'index.html')), 'Web export not found. Run `npx expo export --platform web` first.');
  assert(fs.existsSync(audioDir), 'Narration not found. Run scripts/prepare-demo-audio.ps1 first.');
  const scenes = jsonFile(path.join(audioDir, 'manifest.json'));
  assert(scenes.length === 12, `Expected 12 narration scenes, found ${scenes.length}.`);
  fs.rmSync(rawDir, { recursive: true, force: true });
  fs.mkdirSync(rawDir, { recursive: true });

  const silenceHead = path.join(audioDir, 'silence-head.wav');
  const silenceGap = path.join(audioDir, 'silence-gap.wav');
  const silenceEnd = path.join(audioDir, 'silence-end.wav');
  const createSilence = (file, duration) => {
    const sampleRate = 22050;
    const byteRate = sampleRate * 2;
    const dataBytes = Math.round(duration * byteRate);
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataBytes, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataBytes, 40);
    fs.writeFileSync(file, Buffer.concat([header, Buffer.alloc(dataBytes)]));
  };
  createSilence(silenceHead, 2);
  createSilence(silenceGap, 1.8);
  createSilence(silenceEnd, 4.5);

  const narration = path.join(audioDir, 'amplify-narration.wav');
  const audioFiles = [silenceHead, ...scenes.flatMap((scene, index) => index < scenes.length - 1
    ? [path.join(audioDir, scene.audioFile), silenceGap]
    : [path.join(audioDir, scene.audioFile)]), silenceEnd];
  const wavChunks = audioFiles.map((file) => {
    const bytes = fs.readFileSync(file);
    assert(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', `Invalid WAV file: ${file}`);
    let offset = 12;
    let format = null;
    let data = null;
    while (offset + 8 <= bytes.length) {
      const tag = bytes.toString('ascii', offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      if (tag === 'fmt ') format = bytes.subarray(offset + 8, offset + 8 + size);
      if (tag === 'data') data = bytes.subarray(offset + 8, offset + 8 + size);
      offset += 8 + size + (size % 2);
    }
    assert(format && data && format.readUInt16LE(0) === 1, `Expected PCM WAV audio: ${file}`);
    return { format, data };
  });
  const referenceFormat = wavChunks[0].format;
  assert(wavChunks.every((chunk) => chunk.format.subarray(0, 16).equals(referenceFormat.subarray(0, 16))), 'Narration WAV clips do not use a consistent format.');
  const pcm = Buffer.concat(wavChunks.map((chunk) => chunk.data));
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcm.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  referenceFormat.copy(wavHeader, 20, 0, 16);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(narration, Buffer.concat([wavHeader, pcm]));

  let browser;
  let context;
  let videoPath;
  const pageErrors = [];
  const gapMs = 1800;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
      args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
    });
    context = await browser.newContext({
      viewport: { width: 450, height: 800 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      recordVideo: { dir: rawDir, size: { width: 450, height: 800 } },
    });
    const art = path.join(webDir, 'demo-art');
    const artByPhoto = {
      'photo-1541829070764-84a7d30dd3f3': 'water-school.png',
      'photo-1570125909232-eb263c188f7e': 'transit.png',
      'photo-1500382017468-9049fed747ef': 'farm.png',
      'photo-1518391846015-55a9cc003b25': 'shelter.png',
      'photo-1529107386315-e1a2ed48a620': 'ballot.png',
      'photo-1441974231531-c6227db76b6e': 'shade.png',
    };
    await context.route('https://images.unsplash.com/**', async (route) => {
      const photoId = new URL(route.request().url()).pathname.split('/').filter(Boolean)[0];
      const file = path.join(art, artByPhoto[photoId] || 'shade.png');
      await route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(file) });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    await page.addInitScript(() => {
      document.addEventListener('pointerdown', (event) => {
        const ring = document.createElement('span');
        ring.className = 'demo-tap-ring';
        ring.style.left = `${event.clientX}px`;
        ring.style.top = `${event.clientY}px`;
        document.body.appendChild(ring);
        window.setTimeout(() => ring.remove(), 650);
      }, true);
    });
    const exportedHtml = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
    const bundleUrl = exportedHtml.match(/<script src="([^"]+)"/i)?.[1];
    assert(bundleUrl, 'Could not find the exported JavaScript bundle in dist/index.html.');
    const bundlePath = path.resolve(webDir, bundleUrl.replace(/^\/+/, ''));
    const fileHtml = exportedHtml.replace(bundleUrl, pathToFileURL(bundlePath).href);
    fs.writeFileSync(tempHtml, fileHtml, 'utf8');
    await page.goto(pathToFileURL(tempHtml).href, { waitUntil: 'domcontentloaded' });
    try {
      await page.getByText('Good messages deserve a bigger room.', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
    } catch (error) {
      console.error(`App boot diagnostics: title=${await page.title()}, text=${(await page.locator('body').innerText()).slice(0, 500)}, errors=${pageErrors.join(' | ')}`);
      throw error;
    }
    await page.addStyleTag({ content: `
      @keyframes demo-tap-pulse { 0% { opacity:.9; transform:translate(-50%,-50%) scale(.45); } 100% { opacity:0; transform:translate(-50%,-50%) scale(1.55); } }
      .demo-tap-ring { position:fixed; z-index:100000; width:38px; height:38px; border:3px solid #dff5b8; border-radius:50%; background:rgba(223,245,184,.16); pointer-events:none; animation:demo-tap-pulse .55s ease-out forwards; }
      #demo-caption { position:fixed; left:18px; right:18px; bottom:82px; z-index:99999; box-sizing:border-box; padding:12px 15px; min-height:44px; color:#fff; background:rgba(18,42,33,.96); border:1px solid rgba(255,255,255,.3); border-radius:15px; box-shadow:0 5px 18px rgba(0,0,0,.23); font:600 13px/1.42 system-ui,-apple-system,'Segoe UI',sans-serif; letter-spacing:.05px; text-align:left; }
      #demo-caption::before { content:'AMPLIFY · DEMO'; display:block; margin-bottom:3px; color:#c8e99a; font-size:8px; line-height:1.1; font-weight:800; letter-spacing:1px; }
      html, body { scrollbar-width:none; } ::-webkit-scrollbar { display:none; }
    ` });
    await page.evaluate(() => {
      const caption = document.createElement('div');
      caption.id = 'demo-caption';
      caption.setAttribute('aria-hidden', 'true');
      document.body.appendChild(caption);
    });

    const showCaption = async (index) => page.locator('#demo-caption').evaluate((element, value) => { element.textContent = value; }, scenes[index].caption);
    const runScene = async (index, events = []) => {
      await showCaption(index);
      const startedAt = Date.now();
      for (const event of events) {
        await delay(event.atMs - (Date.now() - startedAt));
        await event.action();
      }
      await delay((scenes[index].durationSeconds * 1000) - (Date.now() - startedAt));
    };
    const advance = async (action, nextIndex) => {
      const startedAt = Date.now();
      await action();
      await showCaption(nextIndex);
      await delay(gapMs - (Date.now() - startedAt));
    };
    const smoothScrollToText = async (text, exact = true) => {
      const locator = page.getByText(text, { exact }).first();
      await locator.waitFor({ state: 'attached', timeout: 12000 });
      await locator.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await delay(700);
    };
    const clickButton = async (name, options = {}) => page.getByRole('button', { name, exact: options.exact ?? true }).first().click({ timeout: 12000 });
    const continueButton = () => clickButton('Continue');

    await delay(2000); // opening beat, matched by the narration track
    await runScene(0);
    await advance(async () => {
      await clickButton('Explore campaigns');
      const search = page.getByRole('textbox', { name: 'Search campaigns or creators' });
      await search.waitFor({ state: 'visible', timeout: 10000 });
      await search.fill('shade');
      await page.getByRole('button', { name: /Read Plant shade where the heat actually is/ }).waitFor({ state: 'visible', timeout: 10000 });
    }, 1);

    await runScene(1);
    await advance(async () => {
      await page.getByRole('button', { name: /Read Plant shade where the heat actually is/ }).click();
      await page.getByText('Plant shade where the heat actually is', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    }, 2);

    await runScene(2, [
      { atMs: 900, action: () => smoothScrollToText('Supporting sources') },
      { atMs: 4200, action: () => smoothScrollToText('WHO THIS MESSAGE HOPES TO REACH', false) },
      { atMs: 7300, action: () => smoothScrollToText('Where the contribution goes') },
    ]);
    await advance(async () => {
      await clickButton('Back this campaign');
      await page.getByText('Choose your contribution', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }, 3);

    await runScene(3, [
      { atMs: 2500, action: () => smoothScrollToText('About 675 people reached', false) },
    ]);
    await advance(async () => clickButton('Review contribution'), 4);

    await runScene(4, [
      { atMs: 1300, action: () => smoothScrollToText('Total simulated payment') },
    ]);
    await advance(async () => {
      await clickButton('Complete demo contribution');
      await page.getByText('You helped this message travel.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    }, 5);

    await runScene(5);
    await advance(async () => {
      await page.getByRole('tab', { name: /Create/ }).click();
      await page.getByText('Create a campaign', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      await clickButton('Try demo');
    }, 6);

    await runScene(6, [
      { atMs: 1300, action: () => smoothScrollToText('Campaign title *') },
    ]);
    await advance(continueButton, 7);

    await runScene(7, [
      { atMs: 1300, action: () => smoothScrollToText('Story headline *') },
      { atMs: 4300, action: () => smoothScrollToText('Supporting sources *') },
    ]);
    await advance(continueButton, 8);

    await runScene(8, [
      { atMs: 1800, action: () => smoothScrollToText('PLACEMENT PREVIEW · DEMO', false) },
    ]);
    await advance(continueButton, 9);

    await runScene(9, [
      { atMs: 3500, action: () => smoothScrollToText('AUDIENCE PREVIEW') },
    ]);
    await advance(continueButton, 10);

    const submitDuration = scenes[10].durationSeconds * 1000;
    await runScene(10, [
      { atMs: 2400, action: async () => {
        await smoothScrollToText('Funding policy summary');
        await page.getByRole('checkbox', { name: /I confirm this campaign follows the community guidelines/ }).click();
      } },
      { atMs: Math.max(4500, submitDuration - 1800), action: async () => {
        await clickButton('Submit for review');
        await page.getByText('Your story is in good hands.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      } },
    ]);
    await advance(async () => {
      await clickButton('View creator dashboard');
      await page.getByText('Campaigns', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    }, 11);

    await runScene(11, [
      { atMs: Math.min(3600, scenes[11].durationSeconds * 300), action: async () => {
        await page.getByText('Bring shade to the hottest blocks', { exact: true }).waitFor({ state: 'visible', timeout: 8000 });
      } },
    ]);
    await delay(4500); // final dashboard hold, matched by the narration tail

    const pageTitle = await page.title();
    await context.close();
    context = null;
    const recordings = fs.readdirSync(rawDir).filter((file) => file.endsWith('.webm'));
    assert(recordings.length === 1, `Expected one video recording, found ${recordings.length}.`);
    videoPath = path.join(rawDir, recordings[0]);
    const mergeContext = await browser.newContext();
    const mergePage = await mergeContext.newPage();
    await mergePage.setContent('<!doctype html><html><body style="margin:0;background:#111"><video id="source" muted playsinline></video><canvas id="output" width="720" height="1280"></canvas></body></html>');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');
    const narrationBase64 = fs.readFileSync(narration).toString('base64');
    const mergeResult = await mergePage.evaluate(async ({ videoDataUrl, audioBase64 }) => {
      const video = document.getElementById('source');
      const canvas = document.getElementById('output');
      const canvasContext = canvas.getContext('2d', { alpha: false });
      video.src = videoDataUrl;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('The recorded walkthrough could not be loaded for audio muxing.'));
      });

      const audioString = atob(audioBase64);
      const audioBytes = new Uint8Array(audioString.length);
      for (let i = 0; i < audioString.length; i++) audioBytes[i] = audioString.charCodeAt(i);
      const audioData = audioBytes.buffer;
      const audioContext = new AudioContext();
      const decodedAudio = await audioContext.decodeAudioData(audioData);
      const audioDestination = audioContext.createMediaStreamDestination();
      const narrationSource = audioContext.createBufferSource();
      narrationSource.buffer = decodedAudio;
      narrationSource.connect(audioDestination);

      let animationFrame;
      const drawFrame = () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationFrame = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const videoStream = canvas.captureStream(30);
      const combined = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
      const mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error(`Browser cannot record ${mimeType}.`);
      const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 4500000, audioBitsPerSecond: 128000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => reject(event.error || new Error('Media recorder failed.'));
      });

      await audioContext.resume();
      recorder.start(1000);
      const ended = new Promise((resolve) => { video.onended = resolve; });
      await video.play();
      narrationSource.start(0);
      await ended;
      await new Promise((resolve) => setTimeout(resolve, 350));
      recorder.stop();
      await stopped;
      cancelAnimationFrame(animationFrame);

      const blob = new Blob(chunks, { type: mimeType });
      const blobBytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < blobBytes.length; i += 0x8000) binary += String.fromCharCode(...blobBytes.subarray(i, i + 0x8000));
      const duration = decodedAudio.duration;
      await audioContext.close();
      return { duration, bytes: blob.size, type: mimeType, base64: btoa(binary) };
    }, { videoDataUrl: `data:video/webm;base64,${videoBase64}`, audioBase64: narrationBase64 });
    fs.writeFileSync(outputVideo, Buffer.from(mergeResult.base64, 'base64'));
    addWebmDuration(outputVideo, mergeResult.duration);
    await mergeContext.close();
    assert(mergeResult.bytes > 100000, `Final video appears too small (${mergeResult.bytes} bytes).`);
    fs.rmSync(rawDir, { recursive: true, force: true });
    if (pageErrors.length) console.warn(`Browser page errors: ${pageErrors.join(' | ')}`);
    console.log(`Recorded ${outputVideo}`);
    console.log(`Video: ${(fs.statSync(outputVideo).size / 1024 / 1024).toFixed(1)} MB, ${mergeResult.duration.toFixed(1)} seconds with narration; final screen: ${pageTitle || 'Amplify'}`);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    fs.rmSync(tempHtml, { force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
