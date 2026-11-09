// Production browser checks: BROWSER_CHANNEL=msedge node scripts/forensics/qa-hero-wave.mjs [base]
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3000";
const out = "docs/design-references/hero-wave-upgrade";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge" });
const checks = [];
const metrics = [];
const errors = [];
await fs.mkdir(out, { recursive: true });

async function check(name, action) {
  try {
    await action();
    checks.push({ name, pass: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, pass: false, detail: error.message });
    throw error;
  }
}

async function instrument(page) {
  await page.addInitScript(() => {
    window.waveProbe = { frames: [], draws: 0, samples: 0, developerFrames: 0 };
    const names = new WeakMap();
    const get = WebGL2RenderingContext.prototype.getUniformLocation;
    const set = WebGL2RenderingContext.prototype.uniform1f;
    const draw = WebGL2RenderingContext.prototype.drawElements;
    const multisample = WebGL2RenderingContext.prototype.renderbufferStorageMultisample;
    WebGL2RenderingContext.prototype.getUniformLocation = function(program, name) {
      const location = get.call(this, program, name);
      if (location) names.set(location, name);
      return location;
    };
    WebGL2RenderingContext.prototype.uniform1f = function(location, value) {
      if (names.get(location) === "u_time") {
        if (this.canvas.classList.contains("hero-wave-animation__canvas")) {
          window.waveProbe.frames.push({ t: performance.now(), phase: value });
        } else if (this.canvas.classList.contains("developers-wave-animation__canvas")) {
          window.waveProbe.developerFrames++;
        }
      }
      return set.call(this, location, value);
    };
    WebGL2RenderingContext.prototype.drawElements = function(...args) {
      if (this.canvas.classList.contains("hero-wave-animation__canvas")) window.waveProbe.draws++;
      return draw.apply(this, args);
    };
    WebGL2RenderingContext.prototype.renderbufferStorageMultisample = function(target, samples, ...rest) {
      if (this.canvas.classList.contains("hero-wave-animation__canvas")) window.waveProbe.samples = samples;
      return multisample.call(this, target, samples, ...rest);
    };
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /shader|VALIDATE_STATUS|GL_INVALID|context lost/i.test(message.text())) errors.push(message.text());
  });
}

const ready = (page) => page.locator(".hero-wave-animation__contents.hero-wave-animation--drawn").waitFor({ timeout: 30000 });
const draws = (page) => page.evaluate(() => window.waveProbe.draws);

try {
  for (const [width, dpr, touch, tail] of [[1440, 1, false, 900], [1440, 2, false, 900], [1024, 1, false, 680], [390, 2, true, 460]]) {
    const context = await browser.newContext({ viewport: { width, height: 1200 }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch });
    const page = await context.newPage();
    await instrument(page);
    await page.goto(base);
    await ready(page);
    await page.waitForTimeout(3500);
    await check(`${width}@${dpr}: animated antialiased ribbon, bounded pixels, extended tail`, async () => {
      const result = await page.evaluate(() => {
        const canvas = document.querySelector(".hero-wave-animation__canvas");
        const gl = canvas.getContext("webgl2");
        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        const frames = window.waveProbe.frames.slice(-120);
        const intervals = frames.slice(1).map((frame, i) => frame.t - frames[i].t).sort((a, b) => a - b);
        return {
          width: innerWidth, dpr: devicePixelRatio,
          css: [canvas.clientWidth, canvas.clientHeight], buffer: [canvas.width, canvas.height],
          tail: parseFloat(getComputedStyle(canvas).getPropertyValue("--wave-tail")),
          samples: window.waveProbe.samples, nativeAA: gl.getContextAttributes().antialias,
          fps: (frames.length - 1) * 1000 / (frames.at(-1).t - frames[0].t),
          medianFrameMs: intervals[Math.floor(intervals.length * 0.5)], p95FrameMs: intervals[Math.floor(intervals.length * 0.95)],
          renderer: debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      metrics.push(result);
      console.log(JSON.stringify(result));
      assert.equal(result.tail, tail);
      assert.equal(result.overflow, false);
      assert.ok(result.buffer[0] * result.buffer[1] <= (touch ? 2_400_000 : 3_600_000));
      assert.ok(touch ? result.nativeAA : result.samples >= 2);
      assert.ok(result.fps > 20 && result.fps < 66, "time-based animation with a 60fps ceiling");
    });
    await check(`${width}@${dpr}: reduced motion stops draw calls and resumes without a time jump`, async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(200);
      const count = await draws(page);
      const phase = await page.evaluate(() => window.waveProbe.frames.at(-1).phase);
      await page.waitForTimeout(600);
      assert.equal(await draws(page), count);
      await page.screenshot({ path: `${out}/after-${width}-dpr${dpr}.png` });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForTimeout(250);
      const resumed = await page.evaluate((phase) => window.waveProbe.frames.find((frame) => frame.phase > phase), phase);
      assert.ok(resumed && resumed.phase - phase <= 51, "resume advances by one frame instead of paused wall time");
      assert.ok(await draws(page) > count);
    });
    await check(`${width}@${dpr}: offscreen pause and return`, async () => {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(700);
      const count = await draws(page);
      await page.waitForTimeout(400);
      assert.equal(await draws(page), count);
      await page.mouse.wheel(0, -5000);
      await page.waitForTimeout(700);
      assert.ok(await draws(page) > count);
    });
    if (width === 1440 && dpr === 1) {
      await check("desktop: visibility pause, resize, and shared developers wave", async () => {
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", { configurable: true, value: true });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.waitForTimeout(100);
        const count = await draws(page);
        await page.waitForTimeout(400);
        assert.equal(await draws(page), count);
        await page.evaluate(() => {
          delete document.hidden;
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        assert.ok(await draws(page) > count);
        await page.setViewportSize({ width: 1440, height: 1200 });
        await page.locator(".developers-wave-animation").scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        const previous = await page.evaluate(() => window.waveProbe.developerFrames);
        await page.waitForTimeout(400);
        assert.ok(await page.evaluate(() => window.waveProbe.developerFrames) > previous);
      });
    }
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await instrument(page);
  await check("initial reduced motion draws one static pose, no continuous loop", async () => {
    await page.goto(base);
    await ready(page);
    await page.waitForTimeout(500);
    const count = await draws(page);
    await page.waitForTimeout(500);
    assert.equal(await draws(page), count);
  });
  await check("product navigation and Back/Forward recreate one working hero canvas", async () => {
    await page.getByRole("button", { name: "Products", exact: true }).hover();
    await page.locator('.navigation__content--products a[href="/payments"]').click();
    await page.waitForURL(base + "/payments");
    assert.equal(await page.locator(".hero-wave-animation__canvas").count(), 0);
    await page.getByRole("link", { name: "Stripe homepage", exact: true }).click();
    await page.waitForURL(base + "/");
    await ready(page);
    assert.equal(await page.locator(".hero-wave-animation__canvas").count(), 1);
    await page.goBack();
    await page.waitForURL(base + "/payments");
    await page.goForward();
    await page.waitForURL(base + "/");
    await ready(page);
    assert.equal(await page.locator(".hero-wave-animation__canvas").count(), 1);
  });
  await context.close();

  await check("unavailable WebGL keeps the responsive image fallback", async () => {
    const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await fallback.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        if (this.classList.contains("hero-wave-animation__canvas") && kind.startsWith("webgl")) return null;
        return get.call(this, kind, ...args);
      };
    });
    await fallback.goto(base);
    await fallback.locator(".hero-wave-animation__canvas").waitFor({ state: "detached", timeout: 30000 });
    assert.equal(await fallback.locator(".hero-wave-animation__static img").evaluate((img) => img.complete && img.naturalWidth > 0), true);
    await fallback.close();
  });
  await check("sustained missed frame budgets reduce resolution while retaining MSAA", async () => {
    for (const delay of [30, 220]) {
      const slow = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2 });
      await instrument(slow);
      await slow.addInitScript((delay) => {
        // A deterministic slow scheduler exercises the fallback independently of the test GPU.
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => raf(() => {
          window.setTimeout(() => callback(performance.now()), delay);
        });
      }, delay);
      await slow.goto(base);
      await ready(slow);
      const pixels = () => slow.locator(".hero-wave-animation__canvas").evaluate((canvas) => canvas.width * canvas.height);
      const initial = await pixels();
      await slow.waitForTimeout(4700);
      const adapted = await pixels();
      assert.ok(adapted < initial * 0.9, `pixel cost adapts: ${initial} -> ${adapted}`);
      assert.equal(await slow.evaluate(() => window.waveProbe.samples), 4);
      metrics.push({ scenario: "controlled slow scheduler", delayMs: delay, initialPixels: initial, adaptedPixels: adapted });
      await slow.close();
    }
  });
  await check("no JavaScript or WebGL shader errors", async () => assert.deepEqual(errors, []));
} finally {
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ checks, metrics, errors }, null, 2) + "\n");
  await browser.close();
}
console.log(`${checks.length} hero-wave checks passed`);
