// QA: controllers that parent controllers (other groups) drive through their API. The parents are simulated
// here through the development-only window.__v1FormsApi accessor.
// node scripts/forensics/products/qa/forms-driven.mjs <card|card-checkout|card-invoicing|card-links|shipping|email|inputs|table> [width] [shotDir]
import { check, open, shotEl } from "./forms-lib.mjs";

const [which = "card", width = "1440", shotDir = ""] = process.argv.slice(2);

async function cardField(path, name, focusClass) {
  const { browser, page, errors } = await open(path, { width: +width });
  const sel = `[data-js-controller=${name}]`;
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  const t0 = await page.evaluate(
    ([s, n]) => {
      const el = document.querySelector(s);
      const api = window.__v1FormsApi(el, n);
      window.__qaStart = performance.now();
      window.__qaLog = [];
      const log = () => {
        const i = (t) => el.querySelector(`[data-js-target='${n}.${t}']`);
        window.__qaLog.push({
          t: Math.round(performance.now() - window.__qaStart),
          num: i("cardNumberInput").textContent,
          exp: i("expirationInput").textContent,
          cvc: i("cvcInput").textContent,
          focus: ["cardNumber", "expiration", "cvc"].filter((k) => i(k).classList.contains(window.__qaFocus)).join(","),
          icon: i("activeCardIcon").innerHTML.length,
          iconOpacity: getComputedStyle(i("activeCardIcon")).opacity,
        });
        if (performance.now() - window.__qaStart < 5500) requestAnimationFrame(log);
      };
      api.reset();
      if (api.playAnimation && n === "CheckoutCardField") api.playAnimation();
      else api.getAnimation().play();
      log();
      return true;
    },
    [sel, name],
  ).catch((e) => String(e));
  await page.evaluate((f) => (window.__qaFocus = f), focusClass);
  await page.waitForTimeout(2500);
  if (shotDir) await shotEl(page, sel, `${shotDir}/${name}-typing.png`);
  await page.waitForTimeout(3200);
  const log = await page.evaluate(() => window.__qaLog);
  const last = log[log.length - 1];
  const firstDigit = log.find((l) => l.num.length > 0);
  const numDone = log.find((l) => l.num === "4242 4242 4242 4242");
  const expStart = log.find((l) => l.exp.length > 0);
  check(`${name}: api present`, t0 === true, String(t0));
  check(`${name}: final values typed`, last.num === "4242 4242 4242 4242" && last.exp === "12/24" && last.cvc === "123", JSON.stringify(last));
  check(`${name}: first digit after 300ms focus delay`, firstDigit && firstDigit.t >= 280 && firstDigit.t < 450, `+${firstDigit?.t}ms`);
  check(`${name}: 19 chars at 90ms`, numDone && numDone.t >= 1850 && numDone.t < 2150, `+${numDone?.t}ms`);
  check(`${name}: expiry starts after 90ms end + 400 + 300`, expStart && expStart.t - numDone.t >= 750 && expStart.t - numDone.t < 950, `+${expStart?.t - numDone?.t}ms`);
  check(`${name}: network icon detected`, last.icon > 0 && +last.iconOpacity > 0.9, `${last.icon} chars, opacity ${last.iconOpacity}`);
  check(`${name}: focus ring removed at the end`, last.focus === "", last.focus);
  if (shotDir) await shotEl(page, sel, `${shotDir}/${name}-done.png`);
  await page.evaluate(([s, n]) => window.__v1FormsApi(document.querySelector(s), n).reset(), [sel, name]);
  await page.waitForTimeout(100);
  const cleared = await page.$eval(`${sel} [data-js-target='${name}.cardNumberInput']`, (n) => n.textContent);
  check(`${name}: reset clears`, cleared === "");
  check(`${name}: no console errors`, errors.length === 0, errors.join(" / "));
  await browser.close();
}

if (which === "card" || which === "card-checkout") await cardField("/payments/checkout", "CheckoutCardField", "GraphicFormFieldInput--focused");
if (which === "card" || which === "card-invoicing") await cardField("/invoicing", "InvoicingCardField", "InvoicingFieldInput--focused");
if (which === "card" || which === "card-links") await cardField("/payments/payment-links", "PaymentLinksCardField", "PaymentLinksFieldInput--focused");

if (which === "shipping") {
  const { browser, page, errors } = await open("/payments/checkout", { width: +width });
  const sel = "[data-js-controller=ShippingField]";
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    const api = window.__v1FormsApi(el, "ShippingField");
    window.__qaLog = [];
    const t0 = performance.now();
    const ac = el.querySelector(".AddressAutoComplete");
    const log = () => {
      window.__qaLog.push({
        t: Math.round(performance.now() - t0),
        name: el.querySelector("[data-js-target='ShippingField.nameInput']").textContent,
        addr: el.querySelector("[data-js-target='ShippingField.firstAddressLineInput']").textContent,
        city: el.querySelector("[data-js-target='ShippingField.cityInput']").textContent,
        acOpacity: +getComputedStyle(ac).opacity,
        suggestions: [...ac.querySelectorAll(".AddressAutoComplete__suggestion")].map((n) => n.innerHTML),
      });
      if (performance.now() - t0 < 5000) requestAnimationFrame(log);
    };
    api.resetAnimation().play().then(() => api.playAnimation().play());
    log();
  }, sel);
  let shot = false;
  for (let i = 0; i < 50 && shotDir && !shot; i++) {
    await page.waitForTimeout(100);
    const l = await page.evaluate(() => window.__qaLog[window.__qaLog.length - 1]);
    if (l.suggestions.length && l.acOpacity > 0.95 && l.addr.length > 6) {
      await shotEl(page, sel, `${shotDir}/shipping-autocomplete.png`, 40);
      shot = true;
    }
  }
  await page.waitForTimeout(5200);
  const log = await page.evaluate(() => window.__qaLog);
  const last = log[log.length - 1];
  const withSug = log.find((l) => l.suggestions.length);
  check("shipping: name typed", last.name.length > 0, last.name);
  check("shipping: suggestions after 2 typed chars, with <em> prefix", !!withSug && withSug.addr.length === 2 && /<em>/.test(withSug.suggestions[0]), withSug && `${withSug.addr} ${withSug.suggestions[0]}`);
  check("shipping: autofilled US address", last.addr === "354 Oyster Point Blvd" && last.city === "South San Francisco", `${last.addr}, ${last.city}`);
  check("shipping: popover hidden at the end", last.acOpacity < 0.05, String(last.acOpacity));
  if (shotDir) await shotEl(page, sel, `${shotDir}/shipping-done.png`, 40);
  check("shipping: no console errors", errors.length === 0, errors.join(" / "));
  await browser.close();
}

if (which === "email") {
  const { browser, page, errors } = await open("/invoicing", { width: +width });
  const r = await page.evaluate(async () => {
    const el = document.querySelector("[data-js-controller=Email]");
    const api = window.__v1FormsApi(el, "Email");
    const t0 = performance.now();
    await api.animateIn().play();
    const tIn = performance.now() - t0;
    const t1 = performance.now();
    await api.animateOut().play();
    return { tIn: Math.round(tIn), tOut: Math.round(performance.now() - t1), opacity: getComputedStyle(el).opacity, header: getComputedStyle(el.querySelector("[data-js-target='Email.header']")).opacity };
  });
  check("email: animateIn 300ms delay + 1000ms", r.tIn >= 1280 && r.tIn < 1450, `${r.tIn}ms`);
  check("email: animateOut fades the header", r.tOut >= 1280 && r.tOut < 1450 && r.header === "0" && r.opacity === "1", JSON.stringify(r));
  check("email: no console errors", errors.length === 0, errors.join(" / "));
  await browser.close();
}

if (which === "inputs") {
  const { browser, page, errors } = await open("/payments/payment-links", { width: +width });
  const r = await page.evaluate(() => {
    const out = {};
    let fired = 0;
    document.addEventListener("SelectInput:input", () => (fired += 1));
    const sel = document.querySelector("select[data-js-controller=SelectInput]");
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    out.selectTouched = sel.classList.contains("SelectInput__input--touched");
    out.fired = fired;
    const api = window.__v1FormsApi(sel, "SelectInput");
    out.selectValid = api.isValid();
    const input = document.querySelector("input[data-js-controller=TextInput]");
    input.dispatchEvent(new FocusEvent("blur"));
    out.textTouched = input.classList.contains("TextInput__input--touched");
    const t = window.__v1FormsApi(input, "TextInput");
    t.setDisabled(true);
    out.disabled = input.disabled;
    t.setDisabled(false);
    return out;
  });
  check("SelectInput: touched + document event", r.selectTouched && r.fired === 1, JSON.stringify(r));
  check("TextInput: touched on blur, setDisabled", r.textTouched && r.disabled, JSON.stringify(r));
  check("inputs: no console errors", errors.length === 0, errors.join(" / "));
  await browser.close();
}

if (which === "setcode") {
  // DetailCodeSnippetCarousel (carousels group) calls CodeEditor.setCode(codeSnippets[i].innerHTML)
  const { browser, page, errors } = await open("/financial-connections", { width: +width });
  const r = await page.evaluate(async () => {
    const car = document.querySelector("[data-js-controller=DetailCodeSnippetCarousel]");
    const edEl = car.querySelector("[data-js-controller=CodeEditor]");
    const api = window.__v1FormsApi(edEl, "CodeEditor");
    const snips = car.querySelectorAll("[data-js-target-list='DetailCodeSnippetCarousel.codeSnippets']");
    await api.setCode(snips[2].innerHTML);
    const code = edEl.querySelector("[data-js-target='CodeEditor.editor']").textContent;
    return { lines: code.split("\n").length, first: code.split("\n").slice(0, 2), nums: edEl.querySelectorAll(".CodeEditorLineNumbers__number").length };
  });
  check("setCode(innerHTML) restores line breaks and updates line numbers", r.lines > 10 && r.nums >= r.lines, JSON.stringify(r));
  check("setcode: no console errors", errors.length === 0, errors.join(" / "));
  await browser.close();
}

if (which === "table") {
  const { browser, page, errors } = await open("/invoicing", { width: +width });
  const r = await page.evaluate(() => {
    const el = document.querySelector("[data-js-controller=Table]");
    return { api: !!window.__v1FormsApi(el, "Table"), track: !!el.querySelector("[data-js-target='Table.track']") };
  });
  await page.locator("[data-js-controller=Table]").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector("[data-js-target='Table.track']").scrollBy(80, 0));
  check("table: mounted, scroll handler runs without errors", r.api && r.track && errors.length === 0, errors.join(" / "));
  await browser.close();
}
