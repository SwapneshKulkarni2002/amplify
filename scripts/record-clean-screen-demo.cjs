const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');

const projectDir = path.resolve(__dirname, '..');
const distDir = path.join(projectDir, 'dist');
const audioPath = 'C:/Users/hp/Downloads/WhatsApp Audio 2026-10-18 at 6.38.07 PM.mp4';
const outputPath = path.join(distDir, 'amplify-campaigns-clean-screen-demo.webm');
const partialOutputPath = path.join(distDir, 'amplify-campaigns-clean-screen-demo.partial.webm');
const tempHtml = path.join(distDir, 'clean-screen-demo-run.html');
const rawDir = fs.mkdtempSync(path.join(distDir, 'amplify-clean-screen-source-'));
const audioDurationSeconds = 331.929;
const chapterStartSeconds = [0, 25.3, 53.5, 80.4, 101.8, 128.5, 160.7, 194.8, 226.1, 250.9, 279.7, 308.4, audioDurationSeconds];

process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:\\Users\\hp\\AppData\\Local\\ms-playwright';
const runtimeRequire = createRequire('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = runtimeRequire('playwright');

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
const monotonicNowMs = () => Number(process.hrtime.bigint() / 1_000_000n);

function setWebmDuration(file, durationSeconds) {
  const bytes = fs.readFileSync(file);
  const infoOffset = bytes.indexOf(Buffer.from([0x15, 0x49, 0xa9, 0x66]));
  assert(infoOffset >= 0, 'The WebM Segment Info element was not found.');
  const sizeOffset = infoOffset + 4;
  const vint = bytes[sizeOffset];
  let vintLength = 1;
  while (vintLength <= 8 && (vint & (0x80 >> (vintLength - 1))) === 0) vintLength++;
  assert(vintLength === 1, 'Unexpected WebM Segment Info size encoding.');
  const oldSize = vint & 0x7f;
  const infoEnd = sizeOffset + vintLength + oldSize;
  const existingDuration = bytes.indexOf(Buffer.from([0x44, 0x89]), sizeOffset + vintLength);
  assert(existingDuration < 0 || existingDuration >= infoEnd, 'The WebM Segment Info already has a Duration element.');
  const durationElement = Buffer.alloc(11);
  durationElement[0] = 0x44;
  durationElement[1] = 0x89;
  durationElement[2] = 0x88;
  durationElement.writeDoubleBE(durationSeconds * 1000, 3);
  const newSize = oldSize + durationElement.length;
  assert(newSize < 127, 'WebM Segment Info is too large for the duration patch.');
  bytes[sizeOffset] = 0x80 | newSize;
  fs.writeFileSync(file, Buffer.concat([bytes.subarray(0, infoEnd), durationElement, bytes.subarray(infoEnd)]));
}

async function main() {
  assert(fs.existsSync(path.join(distDir, 'index.html')), 'Web export not found in dist/index.html.');
  assert(fs.existsSync(audioPath), `Voice recording not found: ${audioPath}`);
  assert(!fs.existsSync(outputPath), `Output already exists; leaving it untouched: ${outputPath}`);
  assert(!fs.existsSync(partialOutputPath), `Partial output already exists; leaving it untouched: ${partialOutputPath}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
    args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
  });
  let context;
  let leadInSeconds = 0;

  try {
    context = await browser.newContext({
      viewport: { width: 450, height: 800 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      recordVideo: { dir: rawDir, size: { width: 450, height: 800 } },
    });

    const art = path.join(distDir, 'demo-art');
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
      const localImage = path.join(art, artByPhoto[photoId] || 'shade.png');
      await route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(localImage) });
    });

    const page = await context.newPage();
    const pageCreatedAt = monotonicNowMs();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    const exportedHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const bundleUrl = exportedHtml.match(/<script src="([^"]+)"/i)?.[1];
    assert(bundleUrl, 'Could not find the exported JavaScript bundle in dist/index.html.');
    const bundlePath = path.resolve(distDir, bundleUrl.replace(/^\/+/, ''));
    const fileHtml = exportedHtml.replace(bundleUrl, pathToFileURL(bundlePath).href);
    fs.writeFileSync(tempHtml, fileHtml, 'utf8');
    await page.goto(pathToFileURL(tempHtml).href, { waitUntil: 'domcontentloaded' });
    await page.getByText('Good messages deserve a bigger room.', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
    leadInSeconds = (monotonicNowMs() - pageCreatedAt) / 1000;
    console.log(`App is ready on Home (${leadInSeconds.toFixed(2)}s recording lead-in). Starting the 5:32 screen walk-through.`);

    const smoothScrollToText = async (text, exact = true) => {
      const locator = page.getByText(text, { exact }).first();
      await locator.waitFor({ state: 'attached', timeout: 12000 });
      await locator.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await delay(750);
    };
    const clickButton = async (name, options = {}) => page.getByRole('button', { name, exact: options.exact ?? true }).first().click({ timeout: 12000 });
    const continueButton = () => clickButton('Continue');
    const clickTab = async (name) => page.getByRole('tab', { name: new RegExp(name, 'i') }).click({ timeout: 12000 });

    const events = [
      [28, 'Home: featured campaigns', () => smoothScrollToText('Campaigns to know')],
      [55, 'Home: create, review, amplify', () => smoothScrollToText('Create. Review. Amplify.')],
      [69, 'Home: backing disclosure', () => smoothScrollToText('What does backing pay for?')],
      [80.4, 'Open Explore and search', async () => {
        await clickButton('Explore campaigns');
        const search = page.getByRole('textbox', { name: 'Search campaigns or creators' });
        await search.waitFor({ state: 'visible', timeout: 10000 });
        await search.fill('shade');
        await page.getByRole('button', { name: /Read Plant shade where the heat actually is/ }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [89, 'Explore: campaign result', () => smoothScrollToText('Plant shade where the heat actually is', false)],
      [101.8, 'Open the shade campaign', async () => {
        await page.getByRole('button', { name: /Read Plant shade where the heat actually is/ }).click({ timeout: 12000 });
        await page.getByText('Plant shade where the heat actually is', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
      }],
      [104, 'Save campaign for later', () => clickButton('Save campaign')],
      [108, 'Campaign story and sources', () => smoothScrollToText('Supporting sources')],
      [116, 'Campaign audience and channels', () => smoothScrollToText('WHO THIS MESSAGE HOPES TO REACH', false)],
      [122, 'Campaign funding policy', () => smoothScrollToText('Where the contribution goes')],
      [128.5, 'Start a contribution', async () => {
        await clickButton('Back this campaign');
        await page.getByText('Choose your contribution', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [139, 'Contribution estimate', () => smoothScrollToText('About 675 people reached', false)],
      [146, 'Review simulated contribution', () => clickButton('Review contribution')],
      [149, 'Review fee disclosure', () => smoothScrollToText('Total simulated payment')],
      [154, 'Complete demo contribution', async () => {
        await clickButton('Complete demo contribution');
        await page.getByText('You helped this message travel.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [160.7, 'Open the creator flow', async () => {
        await clickTab('Create');
        await page.getByText('Create a campaign', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
        await clickButton('Try demo');
      }],
      [170, 'Campaign basics', () => smoothScrollToText('Campaign title *')],
      [178, 'Continue to the story', async () => {
        await continueButton();
        await page.getByText('Story headline *', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [181, 'Story and context', () => smoothScrollToText('Story headline *')],
      [187, 'Supporting sources in the draft', () => smoothScrollToText('Supporting sources *')],
      [194.8, 'Continue to campaign visuals', async () => {
        await continueButton();
        await page.getByText('PLACEMENT PREVIEW · DEMO', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [201, 'Campaign visual and ad preview', () => smoothScrollToText('PLACEMENT PREVIEW · DEMO')],
      [207, 'Ad visual and call to action', () => smoothScrollToText('Call to action')],
      [213, 'Continue to Reach planning', async () => {
        await continueButton();
        await page.getByText('AUDIENCE PREVIEW', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [217, 'Audience and location preview', () => smoothScrollToText('AUDIENCE PREVIEW')],
      [222, 'Budget and timeline estimate', () => smoothScrollToText('Shape the campaign pace')],
      [226.1, 'Review the full campaign', async () => {
        await continueButton();
        await page.getByText('Funding policy summary', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [228, 'Funding policy and submission checklist', () => smoothScrollToText('Funding policy summary')],
      [230, 'Confirm community guidelines', () => page.getByRole('checkbox', { name: /I confirm this campaign follows the community guidelines/ }).click({ timeout: 12000 })],
      [236, 'Bring submit action into view', async () => {
        const button = page.getByRole('button', { name: 'Submit for review', exact: true });
        await button.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await delay(750);
      }],
      [241, 'Submit campaign for review', async () => {
        await clickButton('Submit for review');
        await page.getByText('Your story is in good hands.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [246, 'Open creator dashboard', async () => {
        await clickButton('View creator dashboard');
        await page.getByText('Creator dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [256, 'Dashboard status and saved campaign', () => smoothScrollToText('Your activity')],
      [261, 'Payment history', async () => {
        await page.getByText('Payments', { exact: true }).click({ timeout: 12000 });
        await delay(450);
      }],
      [267, 'Activity updates', async () => {
        await clickTab('Activity');
        await page.getByText('YOUR CAMPAIGN UPDATES', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [273, 'Scroll through activity updates', async () => {
        await page.mouse.wheel(0, 500);
        await delay(700);
        await page.mouse.wheel(0, 550);
        await delay(700);
      }],
      [279.7, 'Return to the creator dashboard', async () => {
        await clickTab('Profile');
        await page.getByText('Creator dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
      }],
      [284, 'Show campaign status', () => smoothScrollToText('Bring shade to the hottest blocks')],
      [294, 'Scroll through the creator dashboard', () => smoothScrollToText('Your activity')],
      [301, 'Show local activity records', () => smoothScrollToText('Payments')],
      [308.4, 'Return Home for the closing', async () => {
        await clickTab('Home');
        await page.getByText('Good messages deserve a bigger room.', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
        await smoothScrollToText('Good messages deserve a bigger room.');
      }],
    ];

    const walkStart = monotonicNowMs();
    for (const [atSeconds, label, action] of events) {
      const targetMs = atSeconds * 1000;
      const elapsed = monotonicNowMs() - walkStart;
      if (elapsed > targetMs + 1800) console.warn(`UI cue is ${((elapsed - targetMs) / 1000).toFixed(1)}s late: ${label}`);
      await delay(targetMs - elapsed);
      console.log(`[${(monotonicNowMs() - walkStart) / 1000 | 0}s] ${label}`);
      await action();
    }

    const runDurationMs = audioDurationSeconds * 1000 + 1100;
    await delay(runDurationMs - (monotonicNowMs() - walkStart));
    const pageTitle = await page.title();
    await context.close();
    context = null;
    if (pageErrors.length) console.warn(`App page errors: ${pageErrors.join(' | ')}`);
    const recordings = fs.readdirSync(rawDir).filter((file) => file.endsWith('.webm'));
    assert(recordings.length === 1, `Expected one raw screen recording, found ${recordings.length}.`);
    const rawVideoPath = path.join(rawDir, recordings[0]);
    console.log(`Screen capture ready (${(fs.statSync(rawVideoPath).size / 1024 / 1024).toFixed(1)} MB). Syncing your narration.`);

    const videoBase64 = fs.readFileSync(rawVideoPath).toString('base64');
    const audioBase64 = fs.readFileSync(audioPath).toString('base64');
    const chunkCount = { value: 0 };
    const mergePage = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
    await mergePage.exposeFunction('saveVideoChunk', (base64) => {
      fs.appendFileSync(partialOutputPath, Buffer.from(base64, 'base64'));
      chunkCount.value++;
      if (chunkCount.value % 10 === 0) console.log(`Encoded ${chunkCount.value * 3} seconds of the final video.`);
    });
    await mergePage.setContent('<!doctype html><html><body style="margin:0;background:#111"><video id="screen" muted playsinline></video><canvas id="output" width="720" height="1280"></canvas></body></html>');
    const mux = await mergePage.evaluate(async ({ videoData, audioData, videoLeadIn }) => {
      const screen = document.getElementById('screen');
      const canvas = document.getElementById('output');
      const ctx = canvas.getContext('2d', { alpha: false });
      screen.src = `data:video/webm;base64,${videoData}`;
      await new Promise((resolve, reject) => {
        screen.onloadedmetadata = resolve;
        screen.onerror = () => reject(new Error('Could not read the captured app screen video.'));
      });
      const sought = new Promise((resolve, reject) => {
        screen.onseeked = resolve;
        screen.onerror = () => reject(new Error('Could not seek to the first app screen.'));
      });
      screen.currentTime = Math.min(videoLeadIn, screen.duration - 0.1);
      await sought;

      const binary = atob(audioData);
      const audioBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) audioBytes[i] = binary.charCodeAt(i);
      const audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(audioBytes.buffer);
      const audioDestination = audioContext.createMediaStreamDestination();
      const voice = audioContext.createBufferSource();
      voice.buffer = decoded;
      voice.connect(audioDestination);

      let frameHandle;
      const drawFrame = () => {
        if (screen.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
        frameHandle = requestAnimationFrame(drawFrame);
      };
      drawFrame();
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
      const mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('This browser cannot encode the final WebM.');
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_200_000, audioBitsPerSecond: 128_000 });
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => reject(event.error || new Error('Final video encoding failed.'));
      });
      recorder.ondataavailable = async (event) => {
        if (!event.data.size) return;
        const bytes = new Uint8Array(await event.data.arrayBuffer());
        let binaryChunk = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binaryChunk += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        await window.saveVideoChunk(btoa(binaryChunk));
      };

      await audioContext.resume();
      recorder.start(3000);
      const voiceEnded = new Promise((resolve) => { voice.onended = resolve; });
      await screen.play();
      voice.start(0);
      await voiceEnded;
      await new Promise((resolve) => setTimeout(resolve, 150));
      recorder.stop();
      await stopped;
      await new Promise((resolve) => setTimeout(resolve, 500));
      cancelAnimationFrame(frameHandle);
      const result = { audioDuration: decoded.duration, screenDuration: screen.duration, leadIn: videoLeadIn };
      await audioContext.close();
      return result;
    }, { videoData: videoBase64, audioData: audioBase64, videoLeadIn: leadInSeconds });
    await mergePage.close();
    assert(fs.existsSync(partialOutputPath) && fs.statSync(partialOutputPath).size > 1_000_000, 'The final WebM was not written successfully.');
    setWebmDuration(partialOutputPath, mux.audioDuration);
    fs.renameSync(partialOutputPath, outputPath);
    console.log(`Created ${outputPath}`);
    console.log(`Narration ${mux.audioDuration.toFixed(2)}s; screen source ${mux.screenDuration.toFixed(2)}s; skipped ${mux.leadIn.toFixed(2)}s of app startup.`);
    console.log(`Final video ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB; ${pageTitle || 'Amplify'}.`);
    fs.rmSync(rawDir, { recursive: true, force: true });
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
    fs.rmSync(tempHtml, { force: true });
    fs.rmSync(partialOutputPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
