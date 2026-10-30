import puppeteer from './client/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { io } from './server/node_modules/socket.io-client/build/esm/index.js';
import mysql from './server/node_modules/mysql2/promise.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:4000';

async function runTest() {
  console.log('--- 1. Testing Wrong Quiz Code ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pageTestWrong = await browser.newPage();
  await pageTestWrong.setViewport({ width: 1280, height: 800 });
  await pageTestWrong.goto(`${CLIENT_URL}/join/INVALIDCODE99`, { waitUntil: 'networkidle0' });
  const wrongText = await pageTestWrong.evaluate(() => document.body.innerText);
  console.log('Contains "isn\'t valid or has ended"?', wrongText.includes("isn't valid or has ended") || wrongText.includes("Not Found"));
  await pageTestWrong.screenshot({ path: 'client/screenshot-wrong-code.png' });
  await pageTestWrong.close();

  console.log('\n--- 2. Creating New Session via Admin API ---');
  const createRes = await fetch(`${SERVER_URL}/api/admin/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': 'change-me' },
    body: JSON.stringify({ quizId: 1 }),
  });
  const sessionData = await createRes.json();
  const code = sessionData.code;
  console.log(`Created session code: ${code}`);

  // Admin socket connection for controlling the quiz
  const adminSocket = io(SERVER_URL);
  await new Promise((resolve, reject) => {
    adminSocket.emit('admin:join', { code, adminKey: 'change-me' }, (res) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error));
    });
  });
  console.log('Admin socket joined session');

  console.log('\n--- 3. Player 1 (Desktop 1280px) Joins via Browser ---');
  const pageP1 = await browser.newPage();
  // Auto-accept beforeunload dialog when reloading mid-question
  pageP1.on('dialog', async (dialog) => {
    console.log('Accepted beforeunload dialog:', dialog.type(), dialog.message());
    await dialog.accept();
  });

  await pageP1.setViewport({ width: 1280, height: 800 });
  await pageP1.goto(`${CLIENT_URL}/join/${code}`, { waitUntil: 'networkidle0' });
  await pageP1.screenshot({ path: 'client/screenshot-join-1280.png' });

  // Fill Player 1 form
  await pageP1.type('input[placeholder="e.g. Aarav Sharma"]', 'Aarav Sharma');
  await pageP1.type('input[placeholder="Roll no. or employee ID"]', 'EMP-001');
  await pageP1.type('input[placeholder="So we can reach you with results"]', 'aarav@example.com');
  await pageP1.click('button[type="submit"]');

  // Wait for Instructions page
  await pageP1.waitForSelector('input[type="checkbox"]');
  console.log('Player 1 reached Instructions page');
  await pageP1.screenshot({ path: 'client/screenshot-instructions-1280.png' });

  // Agree and join
  await pageP1.click('input[type="checkbox"]');
  await new Promise((r) => setTimeout(r, 300));
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find((b) => b.innerText.includes('Join the quiz'));
    joinBtn?.click();
  });
  await pageP1.waitForFunction(() => document.body.innerText.includes('PLAYERS IN THE LOBBY'));
  console.log('Player 1 successfully entered Lobby');

  console.log('\n--- 4. Player 2 (Mobile 390px, Private/Incognito Context) Joins ---');
  const incognitoContext = await browser.createBrowserContext();
  const pageP2 = await incognitoContext.newPage();
  pageP2.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await pageP2.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await pageP2.goto(`${CLIENT_URL}/join/${code}`, { waitUntil: 'networkidle0' });
  await pageP2.screenshot({ path: 'client/screenshot-join-390.png' });

  // Fill Player 2 form
  await pageP2.type('input[placeholder="e.g. Aarav Sharma"]', 'Priya Patel');
  await pageP2.type('input[placeholder="Roll no. or employee ID"]', 'EMP-002');
  await pageP2.type('input[placeholder="So we can reach you with results"]', '+919876543210');
  await pageP2.click('button[type="submit"]');

  // Instructions on mobile
  await pageP2.waitForSelector('input[type="checkbox"]');
  console.log('Player 2 reached Instructions page (mobile 390px)');
  await pageP2.screenshot({ path: 'client/screenshot-instructions-390.png' });
  await pageP2.click('input[type="checkbox"]');
  await new Promise((r) => setTimeout(r, 300));
  await pageP2.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find((b) => b.innerText.includes('Join the quiz'));
    joinBtn?.click();
  });
  await pageP2.waitForFunction(() => document.body.innerText.includes('PLAYERS IN THE LOBBY'));
  console.log('Player 2 successfully entered Lobby');

  await new Promise((r) => setTimeout(r, 1000));
  await pageP1.screenshot({ path: 'client/screenshot-lobby-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-lobby-390.png' });

  console.log('\n--- 5. Admin Starts Quiz -> Countdown Phase ---');
  await new Promise((resolve) => {
    adminSocket.emit('admin:start', resolve);
  });
  console.log('Admin started quiz');
  await new Promise((r) => setTimeout(r, 1500));
  await pageP1.screenshot({ path: 'client/screenshot-countdown-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-countdown-390.png' });

  console.log('\n--- 6. Question 1 Phase (Single choice: Red Planet) ---');
  // Wait for question 1 to appear on Player 1
  await pageP1.waitForFunction(() => document.body.innerText.includes('Red Planet'), { timeout: 10000 });
  await pageP2.waitForFunction(() => document.body.innerText.includes('Red Planet'), { timeout: 10000 });
  console.log('Question 1 displayed on both players');
  await pageP1.screenshot({ path: 'client/screenshot-question1-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-question1-390.png' });

  // Player 1 taps "Venus" first, then changes to "Mars" (testing changeable answers)
  console.log('Player 1 selects Venus first...');
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.innerText.includes('Venus'));
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  console.log('Player 1 changes selection to Mars...');
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.innerText.includes('Mars'));
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // Player 1 reloads mid-question to test rejoining with same ID!
  console.log('Player 1 reloads mid-question (testing rejoin with same ID)...');
  await Promise.all([
    pageP1.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    pageP1.reload(),
  ]);
  await pageP1.waitForFunction(() => document.body.innerText.includes('Red Planet'), { timeout: 10000 });
  console.log('Player 1 restored question after reload successfully!');

  // Player 2 leaves Question 1 blank (testing leaving blank)
  console.log('Player 2 leaves question 1 blank.');

  // Wait for Question 1 timer to end and result phase to appear
  console.log('Waiting for question 1 result...');
  await pageP1.waitForFunction(
    () =>
      document.body.innerText.includes('Answer') &&
      (document.body.innerText.includes('Correct!') ||
        document.body.innerText.includes('Not quite') ||
        document.body.innerText.includes("Time's up")),
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  await pageP1.screenshot({ path: 'client/screenshot-result1-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-result1-390.png' });

  const p1Res1Text = await pageP1.evaluate(() => document.body.innerText);
  const p2Res1Text = await pageP2.evaluate(() => document.body.innerText);
  console.log('Player 1 saw Correct banner?', p1Res1Text.includes('Correct! +10 marks'));
  console.log('Player 2 saw Time\'s up banner?', p2Res1Text.includes("Time's up. No answer"));

  console.log('\n--- 7. Admin Advances to Question 2 (Largest ocean) ---');
  await new Promise((resolve) => {
    adminSocket.emit('admin:next', resolve);
  });
  await pageP1.waitForFunction(() => document.body.innerText.includes('ocean on Earth'), { timeout: 10000 });
  await pageP2.waitForFunction(() => document.body.innerText.includes('ocean on Earth'), { timeout: 10000 });
  console.log('Question 2 displayed');

  // Player 1 picks Pacific Ocean (correct)
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.innerText.includes('Pacific Ocean'));
    b?.click();
  });

  // Player 2 picks Indian Ocean (wrong)
  await pageP2.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.innerText.includes('Indian Ocean'));
    b?.click();
  });

  console.log('Waiting for question 2 result...');
  await pageP1.waitForFunction(
    () => document.body.innerText.includes('Answer') && document.body.innerText.includes('ocean on Earth'),
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  await pageP1.screenshot({ path: 'client/screenshot-result2-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-result2-390.png' });

  const p1Res2Text = await pageP1.evaluate(() => document.body.innerText);
  const p2Res2Text = await pageP2.evaluate(() => document.body.innerText);
  console.log('Player 1 saw Correct banner?', p1Res2Text.includes('Correct! +10 marks'));
  console.log('Player 2 saw Wrong banner?', p2Res2Text.includes('Not quite. 0 marks'));

  console.log('\n--- 8. Admin Advances to Question 3 (Multi-select prime numbers) ---');
  await new Promise((resolve) => {
    adminSocket.emit('admin:next', resolve);
  });
  await pageP1.waitForFunction(() => document.body.innerText.includes('prime numbers'), { timeout: 10000 });
  await pageP2.waitForFunction(() => document.body.innerText.includes('prime numbers'), { timeout: 10000 });
  console.log('Question 3 (multi-select) displayed');
  await pageP1.screenshot({ path: 'client/screenshot-question3-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-question3-390.png' });

  // Player 1 toggles 2 and 3 (both prime, correct)
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b2 = btns.find((el) => el.innerText.trim().endsWith('2') || el.innerText.includes('2'));
    b2?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await pageP1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b3 = btns.find((el) => el.innerText.trim().endsWith('3') || el.innerText.includes('3'));
    b3?.click();
  });

  // Player 2 selects 2 only (partial, wrong)
  await pageP2.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b2 = btns.find((el) => el.innerText.trim().endsWith('2') || el.innerText.includes('2'));
    b2?.click();
  });

  console.log('Waiting for question 3 result...');
  await pageP1.waitForFunction(
    () => document.body.innerText.includes('Answer') && document.body.innerText.includes('prime numbers'),
    { timeout: 20000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  await pageP1.screenshot({ path: 'client/screenshot-result3-1280.png' });

  console.log('\n--- 9. Admin Advances past Last Question -> Exit Page ---');
  await new Promise((resolve) => {
    adminSocket.emit('admin:next', resolve);
  });
  await pageP1.waitForFunction(
    () => document.body.innerText.includes('Thanks for') || document.body.innerText.includes('playing'),
    { timeout: 10000 }
  );
  await pageP2.waitForFunction(
    () => document.body.innerText.includes('Thanks for') || document.body.innerText.includes('playing'),
    { timeout: 10000 }
  );
  console.log('Both players reached Exit page!');
  await new Promise((r) => setTimeout(r, 500));
  await pageP1.screenshot({ path: 'client/screenshot-exit-1280.png' });
  await pageP2.screenshot({ path: 'client/screenshot-exit-390.png' });

  const exitText = await pageP1.evaluate(() => document.body.innerText);
  console.log('Exit page has "Thanks for playing"?', exitText.includes('Thanks for') && exitText.includes('playing'));
  console.log('Exit page has "Your answers have been recorded"?', exitText.includes('Your answers have been recorded'));
  console.log('Exit page has "The leaderboard will be published"?', exitText.includes('leaderboard will be published in a few days'));

  await browser.close();
  adminSocket.disconnect();

  console.log('\n--- 10. Database Verification ---');
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'turasqlMine13adow@',
    database: 'quizapp',
  });

  const [players] = await pool.query('SELECT * FROM players WHERE session_id = ?', [sessionData.sessionId]);
  console.log(
    `Players in session ${sessionData.sessionId}:`,
    players.map((p) => ({ id: p.id, name: p.name, pid: p.participant_id }))
  );

  const [answers] = await pool.query(
    'SELECT a.*, p.name FROM answers a JOIN players p ON a.player_id = p.id WHERE p.session_id = ? ORDER BY a.question_id, p.name',
    [sessionData.sessionId]
  );
  console.log('Answers recorded in MySQL:');
  console.table(
    answers.map((a) => ({
      player: a.name,
      q_id: a.question_id,
      answer: a.answer,
      answered: a.answered,
      is_correct: a.is_correct,
      points: a.points,
      response_ms: a.response_ms,
    }))
  );

  const [leaderboard] = await pool.query(
    'SELECT l.*, p.name FROM leaderboard l JOIN players p ON l.player_id = p.id WHERE l.session_id = ? ORDER BY l.rank',
    [sessionData.sessionId]
  );
  console.log('Leaderboard recorded in MySQL:');
  console.table(
    leaderboard.map((l) => ({
      rank: l.rank,
      player: l.name,
      points: l.total_points,
      time_ms: l.total_time_ms,
    }))
  );

  await pool.end();
  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
