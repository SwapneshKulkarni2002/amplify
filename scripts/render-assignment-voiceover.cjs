const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const projectDir = path.resolve(__dirname, '..');
const distDir = path.join(projectDir, 'dist');
const audioPath = process.argv[2] || 'C:/Users/hp/Downloads/WhatsApp Audio 2026-10-18 at 6.38.07 PM.mp4';
const sourceVideoPath = path.join(distDir, 'amplify-campaigns-demo.webm');
const outputPath = path.join(distDir, 'amplify-campaigns-assignment-voice.mp4');
const vttPath = path.join(distDir, 'amplify-campaigns-assignment-captions.vtt');

process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:\\Users\\hp\\AppData\\Local\\ms-playwright';
const runtimeRequire = createRequire('C:/Users/hp/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = runtimeRequire('playwright');

const chapters = [
  {
    title: 'Introducing Amplify',
    kicker: 'CAMPAIGN AMPLIFICATION HACKATHON',
    summary: 'A mobile app prototype for community-supported campaign reach.',
    bullets: ['A backer journey and a creator journey', 'A clear campaign review step', 'Prototype assumptions shown up front'],
    narration: 'Hello, my name is [Your name], and this is my submission for the Campaign Amplification Hackathon. I built Amplify, a mobile app prototype for community-supported campaign reach. In this presentation, I’ll explain the idea, walk through the experience for both backers and creators, and share the main implementation choices and current prototype boundaries.',
    visual: [2.4, 3.2],
  },
  {
    title: 'The product idea',
    kicker: 'A CLEAR DISTINCTION',
    summary: 'Backers support distribution of a message, not the cause described in it.',
    bullets: ['Make the purpose of backing clear', 'Give people context before they act', 'Help creators describe a reach plan'],
    narration: 'The product starts with a distinction that matters: backing a campaign supports distribution of its message. It is not a direct donation to the cause or organization mentioned in the campaign. Amplify is designed to make that clear before a person takes action. The challenge is to give people enough context to make an informed choice, while giving creators a simple way to describe a campaign and plan its reach.',
    visual: [3.2, 9.8],
  },
  {
    title: 'Home: create, review, amplify',
    kicker: 'THE FIRST SCREEN',
    summary: 'Home introduces the process and sets expectations about reach estimates.',
    bullets: ['Featured demo campaigns', 'Create → Review → Amplify', 'Reach is a planning estimate'],
    narration: 'The home screen introduces that process. A visitor can see featured campaigns and understand the basic steps: create a campaign, submit it for review, and amplify it after approval. The reach figures on the screen are estimates, so the app labels them as planning information rather than guaranteed outcomes. That expectation is carried through the rest of the experience.',
    visual: [3.2, 9.8],
  },
  {
    title: 'Discovering campaigns',
    kicker: 'BACKER EXPERIENCE · DISCOVER',
    summary: 'People can explore before signing in and narrow results to topics they care about.',
    bullets: ['Guest browsing', 'Topic search', 'Category filters and sorting'],
    narration: 'I’ll start with the backer experience. People can browse campaigns without creating an account, search by topic, narrow results by category, and change the sort order. Here I’m searching for a shade-related campaign. The goal is to make discovery quick without hiding the details people need before they decide to support a message.',
    visual: [11.8, 20.5],
  },
  {
    title: 'Reviewing a campaign',
    kicker: 'BACKER EXPERIENCE · DETAILS',
    summary: 'The campaign page puts its story, sources, and proposed reach plan together.',
    bullets: ['Story and supporting sources', 'Audience, channels, and ad preview', 'Funding progress and policy'],
    narration: 'On the campaign page, the story and supporting sources are visible together, so someone can inspect the context instead of relying only on a short headline. The page also shows the intended audience, the planned channels, an advertising preview, funding progress, and the campaign’s funding policy. These details help explain what the creator is proposing and how the campaign is meant to reach people.',
    visual: [20.6, 30.3],
  },
  {
    title: 'Backing with clear numbers',
    kicker: 'BACKER EXPERIENCE · CHECKOUT',
    summary: 'Show the fee and estimated reach before the simulated contribution.',
    bullets: ['Preset or custom contribution', '3% demo fee and reach estimate', 'No card charge; no money moves'],
    narration: 'If someone chooses to back the campaign, they can select a preset amount or enter a custom one. Before continuing, the app presents the contribution, a three percent demo fee, and an estimated reach. The estimate uses a simple prototype assumption and is not a promise of actual impressions or people reached. Checkout is simulated: no card is charged and no money moves. The confirmation and receipt are stored locally for this demonstration.',
    visual: [30.5, 56.9],
  },
  {
    title: 'Creating a campaign',
    kicker: 'CREATOR EXPERIENCE · BASICS AND STORY',
    summary: 'A guided flow helps a creator turn an idea into a reviewable draft.',
    bullets: ['Basics → Story → Campaign & Ad Visuals → Reach → Submit', 'Editable sample copy and source links', 'Drafts save locally on the device'],
    narration: 'Now I’ll show the creator experience. Campaign creation is organized into five steps: Basics, Story, Campaign and Ad Visuals, Reach, and Submit. A creator can begin with editable sample copy, then add a title, category, creator name, and summary. In the Story step, they can provide more context and add supporting sources. Drafts save on the device, so the creator can continue later. The starter content is sample text; the prototype does not send it to an AI service.',
    visual: [58.7, 84.2],
  },
  {
    title: 'Planning visuals and reach',
    kicker: 'CREATOR EXPERIENCE · PLAN',
    summary: 'Keep campaign artwork distinct from the ad creative and make targeting choices visible.',
    bullets: ['Separate campaign cover and ad visual', 'Set audience, location, and channels', 'Preview budget and timeline assumptions'],
    narration: 'The visual step keeps the campaign cover separate from the advertising creative, because they serve different purposes. A placement preview shows how a concise message may appear. In Reach, the creator chooses a location, audience, channels, budget, and timeline. The audience preview gives a readable summary of those choices. Together, these steps help creators turn a broad idea into a plan that reviewers and backers can understand.',
    visual: [86.1, 106.2],
  },
  {
    title: 'Submission and review',
    kicker: 'CREATOR EXPERIENCE · SUBMIT',
    summary: 'Submission starts a review process; it does not approve a campaign automatically.',
    bullets: ['Review the details and policies', 'Track In review status on the dashboard', 'No distribution before approval'],
    narration: 'Before submission, the creator can review the campaign and confirm the community policies. After submitting, the campaign is marked In review. The creator dashboard and review timeline show that status. A submitted campaign does not automatically become approved, and distribution does not begin from this prototype. Keeping approval as a separate step is an important part of the product flow.',
    visual: [106.0, 119.7],
  },
  {
    title: 'Everyday campaign tools',
    kicker: 'FOLLOW-UP AND STATUS',
    summary: 'Keep the experience useful after discovery or submission.',
    bullets: ['Saved campaigns and activity', 'Creator status and contribution history', 'Records are local in this prototype'],
    narration: 'Beyond the main flows, the prototype includes saved campaigns, activity notifications, campaign status, and contribution history. These features help a person return to campaigns they follow and help a creator understand what is happening with a submission. For this assignment, these records are stored on the device, which keeps the demonstration self-contained.',
    visual: [113.0, 119.7],
  },
  {
    title: 'Implementation and next steps',
    kicker: 'HOW THE PROTOTYPE IS BUILT',
    summary: 'The interface is connected to local storage today; production services would own critical decisions.',
    bullets: ['Expo + React Native user interface', 'Typed campaign data + local persistence', 'Future backend: validation, payments, review, reporting'],
    narration: 'The app is built with Expo and React Native. Campaigns, drafts, activity, and contribution records use shared TypeScript data types and a local persistence adapter. That lets the interface demonstrate the key product flows without a live backend. For a production version, the server should own campaign validation, user permissions, fee and payment calculations, review decisions, and reporting. A payment provider would handle real transactions, and distribution reports would distinguish spend, impressions, reach, and clicks.',
    visual: [115.0, 119.7],
  },
  {
    title: 'Thank you',
    kicker: 'AMPLIFY · CAMPAIGN REACH',
    summary: 'A prototype for transparent campaign planning and review.',
    bullets: ['Payments are simulated', 'Records are local; reach is illustrative', 'Thank you for watching'],
    narration: 'To summarize, Amplify brings campaign discovery, transparent planning, creator tools, and a review step into one mobile experience. This submission is a prototype: payments are simulated, records are local, and reach figures are illustrative. The next step would be connecting a secure backend and validating the reach model with real campaign data. Thank you for watching.',
    visual: [2.4, 3.2],
  },
];

async function main() {
  if (!fs.existsSync(audioPath)) throw new Error(`Voice recording not found: ${audioPath}`);
  if (!fs.existsSync(sourceVideoPath)) throw new Error(`Walkthrough video not found: ${sourceVideoPath}`);
  const audioBase64 = fs.readFileSync(audioPath).toString('base64');
  const videoBase64 = fs.readFileSync(sourceVideoPath).toString('base64');
  const outputChunks = [];
  let chunkCount = 0;
  console.log(`Loading the recording and walkthrough; target audio ${audioBase64.length} base64 characters.`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
    args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('console', (message) => console.log(`[renderer] ${message.text()}`));
    page.on('pageerror', (error) => console.error(`[renderer] ${error.message}`));
    await page.exposeFunction('saveVideoChunk', (base64) => {
      outputChunks.push(Buffer.from(base64, 'base64'));
      chunkCount++;
      if (chunkCount % 10 === 0) console.log(`Encoded ${chunkCount * 4} seconds of the presentation.`);
    });
    await page.setContent('<!doctype html><html><body style="margin:0;background:#f3f4f0"><video id="screen" muted playsinline></video><canvas id="output" width="1920" height="1080"></canvas></body></html>');
    console.log('Starting local voiceover composition.');

    const render = await page.evaluate(async ({ audioData, videoData, chapters }) => {
      const screen = document.getElementById('screen');
      const canvas = document.getElementById('output');
      const ctx = canvas.getContext('2d', { alpha: false });
      screen.src = `data:video/webm;base64,${videoData}`;
      screen.muted = true;
      await new Promise((resolve, reject) => {
        screen.onloadedmetadata = resolve;
        screen.onerror = () => reject(new Error('Could not load the existing walkthrough footage.'));
      });

      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(bytes.buffer);
      const audioDestination = audioContext.createMediaStreamDestination();
      const voice = audioContext.createBufferSource();
      voice.buffer = decoded;
      voice.connect(audioDestination);

      const duration = decoded.duration;
      const channel = decoded.getChannelData(0);
      const step = Math.round(decoded.sampleRate * 0.1);
      const rms = [];
      for (let i = 0; i < channel.length; i += step) {
        const end = Math.min(channel.length, i + step);
        let power = 0;
        for (let j = i; j < end; j++) power += channel[j] * channel[j];
        rms.push(Math.sqrt(power / (end - i)));
      }
      const pauses = [];
      for (let i = 0; i < rms.length;) {
        if (rms[i] >= 0.03) { i++; continue; }
        const start = i;
        while (i < rms.length && rms[i] < 0.03) i++;
        const end = i;
        if (end - start >= 4) pauses.push({ start: start * 0.1, end: end * 0.1, mid: (start + end) * 0.05 });
      }
      let voiceStart = 0;
      while (voiceStart < rms.length && rms[voiceStart] < 0.03) voiceStart++;
      voiceStart *= 0.1;

      const wordCount = (text) => (text.match(/[\p{L}\p{N}]+/gu) || []).length;
      const chapterWords = chapters.map((chapter) => wordCount(chapter.narration));
      const totalWords = chapterWords.reduce((sum, count) => sum + count, 0);
      const boundaries = [0];
      let cumulative = 0;
      const usedPauses = new Set();
      for (let i = 0; i < chapters.length - 1; i++) {
        cumulative += chapterWords[i];
        const target = duration * cumulative / totalWords;
        let bestIndex = -1;
        let bestDistance = Infinity;
        for (let j = 0; j < pauses.length; j++) {
          if (usedPauses.has(j)) continue;
          const pause = pauses[j];
          if (pause.mid < boundaries[boundaries.length - 1] + 8 || pause.mid > duration - 5) continue;
          const distance = Math.abs(pause.mid - target);
          if (distance <= 6 && distance < bestDistance) { bestIndex = j; bestDistance = distance; }
        }
        if (bestIndex >= 0) {
          usedPauses.add(bestIndex);
          boundaries.push(pauses[bestIndex].mid);
        } else {
          boundaries.push(Math.max(boundaries[boundaries.length - 1] + 8, target));
        }
      }
      boundaries.push(duration);
      const sceneData = chapters.map((chapter, i) => {
        const previousPause = i === 0 ? null : pauses.find((p) => Math.abs(p.mid - boundaries[i]) < 0.25);
        const nextPause = i === chapters.length - 1 ? null : pauses.find((p) => Math.abs(p.mid - boundaries[i + 1]) < 0.25);
        const captionStart = i === 0 ? voiceStart : (previousPause ? previousPause.end : boundaries[i]);
        const captionEnd = i === chapters.length - 1 ? duration : (nextPause ? nextPause.start : boundaries[i + 1]);
        const captionText = chapter.narration.replace('my name is [Your name], ', '');
        const sentences = captionText.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [captionText];
        const weights = sentences.map(wordCount);
        const total = weights.reduce((sum, n) => sum + n, 0);
        const cueBoundaries = [captionStart];
        let wordsBefore = 0;
        const used = new Set();
        for (let s = 0; s < sentences.length - 1; s++) {
          wordsBefore += weights[s];
          const target = captionStart + (captionEnd - captionStart) * wordsBefore / total;
          let best = null;
          let bestDistance = Infinity;
          for (let p = 0; p < pauses.length; p++) {
            if (used.has(p) || pauses[p].mid <= cueBoundaries[cueBoundaries.length - 1] + 1 || pauses[p].mid >= captionEnd - 0.4) continue;
            const distance = Math.abs(pauses[p].mid - target);
            if (distance <= 1.5 && distance < bestDistance) { best = pauses[p]; bestDistance = distance; used.add(p); }
          }
          cueBoundaries.push(best ? best.mid : target);
        }
        cueBoundaries.push(captionEnd);
        const cues = sentences.map((text, s) => ({ start: cueBoundaries[s], end: cueBoundaries[s + 1], text }));
        return { ...chapter, start: boundaries[i], end: boundaries[i + 1], cues };
      });

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      const wrapText = (text, x, y, maxWidth, lineHeight, maxLines = 4) => {
        const words = text.split(/\s+/);
        const lines = [];
        let line = '';
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
          else line = next;
        }
        if (line) lines.push(line);
        const shown = lines.slice(0, maxLines);
        if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/[.,;:!?]?$/, '')}…`;
        shown.forEach((part, i) => ctx.fillText(part, x, y + i * lineHeight));
        return shown.length;
      };
      const formatTime = (seconds) => {
        const total = Math.max(0, Math.floor(seconds));
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      };
      let activeScene = -1;
      let visualEnd = 0;
      let sceneStartAt = 0;
      let videoSeeked = false;
      const draw = (time) => {
        const index = Math.min(sceneData.length - 1, sceneData.findIndex((scene) => time < scene.end) < 0 ? sceneData.length - 1 : sceneData.findIndex((scene) => time < scene.end));
        const scene = sceneData[index];
        if (index !== activeScene) {
          activeScene = index;
          visualEnd = scene.visual[1];
          sceneStartAt = time;
          videoSeeked = false;
          screen.pause();
          screen.currentTime = Math.min(scene.visual[0], Math.max(0, screen.duration - 0.1));
          screen.onseeked = () => {
            videoSeeked = true;
            if (scene.visual[1] - scene.visual[0] > 0.25) screen.play().catch(() => {});
          };
        }
        if (!screen.paused && screen.currentTime >= visualEnd) screen.pause();

        ctx.fillStyle = '#F3F4F0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#E9EEE5';
        ctx.fillRect(0, 0, 610, canvas.height);
        ctx.fillStyle = '#D6E2C8';
        ctx.beginPath();
        ctx.arc(565, 96, 190, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#173F35';
        roundRect(80, 42, 48, 48, 14);
        ctx.fill();
        ctx.fillStyle = '#E8F1DC';
        ctx.font = '700 26px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A', 104, 76);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#173F35';
        ctx.font = '700 28px Segoe UI, Arial, sans-serif';
        ctx.fillText('AMPLIFY', 145, 76);
        ctx.fillStyle = '#66766E';
        ctx.font = '600 18px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('HUMANITY FOUNDERS  ·  CAMPAIGN AMPLIFICATION ASSIGNMENT', 1835, 72);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#D8DED5';
        ctx.fillRect(80, 104, 1760, 2);

        ctx.save();
        ctx.shadowColor = 'rgba(13,35,27,.20)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = '#10231D';
        roundRect(76, 111, 512, 891, 46);
        ctx.fill();
        ctx.restore();
        const sx = 96, sy = 129, sw = 472, sh = 844;
        ctx.save();
        roundRect(sx, sy, sw, sh, 34);
        ctx.clip();
        ctx.fillStyle = '#F5F5F0';
        ctx.fillRect(sx, sy, sw, sh);
        if (screen.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoSeeked) ctx.drawImage(screen, sx, sy, sw, sh);
        ctx.fillStyle = '#123C32';
        ctx.fillRect(sx, sy + sh * 0.774, sw, sh * 0.136);
        ctx.fillStyle = '#CFE5A9';
        ctx.font = '800 12px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AMPLIFY  ·  LIVE PROTOTYPE WALKTHROUGH', sx + sw / 2, sy + sh * 0.832);
        ctx.fillStyle = 'rgba(236,242,231,.82)';
        ctx.font = '500 12px Segoe UI, Arial, sans-serif';
        ctx.fillText('Sample campaign data · illustrative estimates', sx + sw / 2, sy + sh * 0.864);
        ctx.restore();
        ctx.strokeStyle = '#243B32';
        ctx.lineWidth = 2;
        roundRect(sx, sy, sw, sh, 34);
        ctx.stroke();
        ctx.fillStyle = '#AEB9B0';
        roundRect(285, 114, 96, 7, 4);
        ctx.fill();

        const panelX = 670;
        const panelW = 1165;
        ctx.fillStyle = '#557567';
        ctx.font = '800 18px Segoe UI, Arial, sans-serif';
        ctx.fillText(`${scene.kicker}   ·   ${String(index + 1).padStart(2, '0')} / ${String(sceneData.length).padStart(2, '0')}`, panelX, 171);
        ctx.fillStyle = '#173F35';
        ctx.font = '700 58px Segoe UI, Arial, sans-serif';
        const titleLines = wrapText(scene.title, panelX, 264, panelW, 70, 2);
        const summaryY = 264 + Math.max(1, titleLines) * 70 + 28;
        ctx.fillStyle = '#42564C';
        ctx.font = '400 31px Segoe UI, Arial, sans-serif';
        const summaryLines = wrapText(scene.summary, panelX, summaryY, panelW, 43, 3);

        if (index === 10) {
          const y = 565;
          const cards = [
            { x: panelX, w: 315, title: 'Mobile app', detail: 'Expo + React Native', fill: '#E3EBDD' },
            { x: panelX + 390, w: 315, title: 'Prototype today', detail: 'Typed data + local storage', fill: '#E3EBDD' },
            { x: panelX + 780, w: 340, title: 'Production direction', detail: 'Secure backend services', fill: '#DCE8C9' },
          ];
          for (let c = 0; c < cards.length; c++) {
            const card = cards[c];
            ctx.fillStyle = card.fill;
            roundRect(card.x, y, card.w, 148, 22);
            ctx.fill();
            ctx.fillStyle = '#173F35';
            ctx.font = '700 22px Segoe UI, Arial, sans-serif';
            ctx.fillText(card.title, card.x + 22, y + 50);
            ctx.fillStyle = '#53675C';
            ctx.font = '500 18px Segoe UI, Arial, sans-serif';
            wrapText(card.detail, card.x + 22, y + 91, card.w - 44, 25, 2);
            if (c < cards.length - 1) {
              ctx.strokeStyle = '#759281';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(card.x + card.w + 16, y + 74);
              ctx.lineTo(card.x + card.w + 66, y + 74);
              ctx.stroke();
              ctx.fillStyle = '#759281';
              ctx.beginPath();
              ctx.moveTo(card.x + card.w + 66, y + 66);
              ctx.lineTo(card.x + card.w + 80, y + 74);
              ctx.lineTo(card.x + card.w + 66, y + 82);
              ctx.closePath();
              ctx.fill();
            }
          }
          ctx.fillStyle = '#6B7F73';
          ctx.font = '500 18px Segoe UI, Arial, sans-serif';
          ctx.fillText('Production services are a proposed next step; they are not connected in this prototype.', panelX, y + 188);
        } else {
          let y = summaryY + Math.max(1, summaryLines) * 43 + 48;
          for (const bullet of scene.bullets) {
            ctx.fillStyle = '#8BA36C';
            ctx.beginPath();
            ctx.arc(panelX + 8, y - 8, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#283E34';
            ctx.font = '500 28px Segoe UI, Arial, sans-serif';
            const lines = wrapText(bullet, panelX + 32, y, panelW - 32, 38, 2);
            y += Math.max(1, lines) * 38 + 26;
          }
        }

        const cue = scene.cues.find((item) => time >= item.start && time < item.end) || null;
        ctx.fillStyle = '#173F35';
        roundRect(panelX, 810, panelW, 204, 24);
        ctx.fill();
        ctx.fillStyle = '#CFE5A9';
        ctx.font = '800 15px Segoe UI, Arial, sans-serif';
        ctx.fillText('VOICEOVER CAPTIONS', panelX + 28, 844);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 29px Segoe UI, Arial, sans-serif';
        ctx.textAlign = 'left';
        if (cue) wrapText(cue.text, panelX + 28, 888, panelW - 56, 35, 3);
        else {
          ctx.fillStyle = '#DAE4DC';
          ctx.font = '500 24px Segoe UI, Arial, sans-serif';
          ctx.fillText('Amplify · campaign reach prototype', panelX + 28, 902);
        }
        ctx.fillStyle = '#D8DED5';
        ctx.fillRect(panelX, 1022, panelW, 4);
        ctx.fillStyle = '#8CA66F';
        ctx.fillRect(panelX, 1022, panelW * Math.min(1, time / duration), 4);
        ctx.fillStyle = '#66766E';
        ctx.font = '600 16px Segoe UI, Arial, sans-serif';
        ctx.fillText('PROTOTYPE · NO LIVE PAYMENTS OR AD DISTRIBUTION', panelX, 1058);
        ctx.textAlign = 'right';
        ctx.fillText(`${formatTime(time)}  /  ${formatTime(duration)}`, panelX + panelW, 1058);
        ctx.textAlign = 'left';
      };

      const toVttTime = (seconds) => {
        const millis = Math.max(0, Math.round(seconds * 1000));
        const hh = String(Math.floor(millis / 3600000)).padStart(2, '0');
        const mm = String(Math.floor((millis % 3600000) / 60000)).padStart(2, '0');
        const ss = String(Math.floor((millis % 60000) / 1000)).padStart(2, '0');
        const ms = String(millis % 1000).padStart(3, '0');
        return `${hh}:${mm}:${ss}.${ms}`;
      };
      const vtt = ['WEBVTT', ''];
      let cueNumber = 1;
      for (const scene of sceneData) {
        for (const cue of scene.cues) {
          if (cue.end <= cue.start) continue;
          vtt.push(String(cueNumber++), `${toVttTime(cue.start)} --> ${toVttTime(cue.end)}`, cue.text, '');
        }
      }

      const stream = new MediaStream([
        ...canvas.captureStream(30).getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);
      const mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error(`Browser cannot record ${mimeType}.`);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2800000, audioBitsPerSecond: 160000 });
      let pending = Promise.resolve();
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        pending = pending.then(async () => {
          const chunk = new Uint8Array(await event.data.arrayBuffer());
          let binary = '';
          for (let i = 0; i < chunk.length; i += 0x8000) binary += String.fromCharCode(...chunk.subarray(i, i + 0x8000));
          await window.saveVideoChunk(btoa(binary));
        });
      };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => reject(event.error || new Error('Video recording failed.'));
      });
      await audioContext.resume();
      draw(0);
      recorder.start(4000);
      const animation = () => {
        const time = Math.min(duration, Math.max(0, audioContext.currentTime - startAudioAt));
        draw(time);
        if (time < duration) requestAnimationFrame(animation);
      };
      const startAudioAt = audioContext.currentTime;
      voice.start(startAudioAt);
      requestAnimationFrame(animation);
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(duration * 1000)));
      draw(duration);
      recorder.stop();
      await stopped;
      await pending;
      await audioContext.close();
      return { duration, mimeType, cues: vtt.join('\n'), chapters: sceneData.map(({ title, start, end }) => ({ title, start, end })), pauseCount: pauses.length };
    }, { audioData: audioBase64, videoData: videoBase64, chapters });

    fs.writeFileSync(outputPath, Buffer.concat(outputChunks));
    fs.writeFileSync(vttPath, render.cues, 'utf8');
    console.log(`Created ${outputPath}`);
    console.log(`Duration: ${render.duration.toFixed(2)} seconds; chapters: ${render.chapters.length}; aligned pause points: ${render.pauseCount}`);
    console.log(`Captions: ${vttPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
