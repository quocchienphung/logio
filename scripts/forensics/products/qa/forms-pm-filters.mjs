// QA: payment-methods hub filtering (ControlledFilter/ControlledFilterSelect, SearchInput, PaymentMethodHubGrid).
// node scripts/forensics/products/qa/forms-pm-filters.mjs [width] [shotDir]
import { check, open, shotEl } from "./forms-lib.mjs";

const [width = "1440", shotDir = ""] = process.argv.slice(2);
const { browser, page, errors } = await open("/payments/payment-methods", { width: +width });
const grid = "[data-js-controller=PaymentMethodHubGrid]";

const cards = () => page.$$eval(`${grid} [data-js-target='PaymentMethodHubGrid.gridEl'] > .PaymentMethodCard`, (n) => n.map((c) => c.dataset.id));
const text = () => page.$eval("[data-js-target='PaymentMethodHubFilterText.filterText']", (n) => n.textContent.trim());
const settle = () => page.waitForTimeout(1600);
/** Independent re-implementation of the expected result from the page's JSON. */
const expected = (f) =>
  page.evaluate((f) => {
    const pms = JSON.parse(document.getElementById("paymentMethodJSONData").textContent);
    let l = pms.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (f.useCase) l = l.filter((p) => (p.useCases || []).some((u) => u.name === f.useCase));
    if (f.type) l = l.filter((p) => p.type && p.type.title === f.type);
    if (f.country) l = l.filter((p) => (p.countries || []).some((c) => c.countryCode === f.country));
    if (f.text) {
      const q = f.text.replace(/\W/g, "").toUpperCase();
      l = l.filter((p) => [p.localizedName, p.name, p.type && p.type.title, ...(p.useCases || []).map((u) => u.name), ...(p.countries || []).map((c) => c.name)].some((v) => (v || "").replace(/\W/g, "").toUpperCase().includes(q)));
    }
    return l.map((p) => p.identifier);
  }, f);

const initial = await cards();
check("initial cards rendered", initial.length > 0, `${initial.length} cards`);
const triggers = await page.$$eval(".ControlledFilterSelect__trigger", (n) => n.map((b) => ({ disabled: b.disabled, label: b.textContent.trim(), expanded: b.getAttribute("aria-expanded") })));
check("filter triggers enabled", triggers.every((t) => !t.disabled), JSON.stringify(triggers));
const optionCounts = await page.$$eval(".ControlledFilterSelect__rootOptionList", (n) => n.map((l) => l.children.length));
check("options built from the payment-method data", optionCounts.every((c) => c > 0), optionCounts.join(","));

// open "Use case" with the mouse, pick the first option
await page.locator(grid).scrollIntoViewIfNeeded();
const useCase = page.locator(".UseCaseFilter");
await useCase.locator(".ControlledFilterSelect__trigger").click();
const open1 = await useCase.locator(".ControlledFilterSelect__rootOptionList").evaluate((l) => !l.hidden);
check("click opens the dropdown", open1);
if (shotDir) await page.screenshot({ path: `${shotDir}/dropdown.png` });
const firstName = await useCase.locator(".ControlledFilterOption input").first().getAttribute("name");
await useCase.locator(".ControlledFilterOption .CheckboxField").first().click();
await settle();
const label1 = await useCase.locator(".ControlledFilterSelect__label").textContent();
check("label shows the count", label1.trim() === "Use case (1)", label1.trim());
const exp1 = await expected({ useCase: firstName });
const got1 = await cards();
check(`use case "${firstName}" filters the grid`, JSON.stringify(got1) === JSON.stringify(exp1), `${got1.length} vs ${exp1.length}`);
check("filter text updated", /use case/i.test(await text()), await text());
if (shotDir) await page.screenshot({ path: `${shotDir}/filtered.png` });

// keyboard: Escape closes and returns focus to the trigger
await page.keyboard.press("Escape");
const closed = await useCase.locator(".ControlledFilterSelect__rootOptionList").evaluate((l) => l.hidden);
const focused = await page.evaluate(() => document.activeElement?.className);
check("Escape closes and focuses the trigger", closed && /trigger/.test(focused), focused);

// keyboard: Enter on "Business location" opens, Tab reaches the first checkbox, Space toggles it
const country = page.locator(".CountryFilter");
await country.locator(".ControlledFilterSelect__trigger").focus();
await page.keyboard.press("Enter");
await page.keyboard.press("Tab");
const onCheckbox = await page.evaluate(() => document.activeElement?.className);
await page.keyboard.press("Space");
await settle();
const countryName = await country.locator(".ControlledFilterOption input").first().getAttribute("name");
const exp2 = await expected({ useCase: firstName, country: countryName });
const got2 = await cards();
check("keyboard: Tab into options, Space toggles", onCheckbox.includes("CheckboxField__hiddenInput"), onCheckbox);
check(`+ country ${countryName} (featured first)`, got2.length === exp2.length && got2.every((id) => exp2.includes(id)), `${got2.length} vs ${exp2.length}`);
await page.keyboard.press("Escape");

// clear all -> initial set, show-all visible
await page.click("[data-js-target='PaymentMethodHubFilterText.clearFilterBtn']");
await settle();
const afterClear = await cards();
check("clear restores the initial cards", JSON.stringify(afterClear) === JSON.stringify(initial), `${afterClear.length}`);
check("labels reset", (await useCase.locator(".ControlledFilterSelect__label").textContent()).trim() === "Use case");

// search text
await page.fill("[data-js-target='SearchInput.input']", "klarna");
await settle();
const exp3 = await expected({ text: "klarna" });
const got3 = await cards();
check("search 'klarna'", JSON.stringify(got3) === JSON.stringify(exp3), got3.join(","));
await page.fill("[data-js-target='SearchInput.input']", "zzzzqqq");
await settle();
check("no results state", (await cards()).length === 0 && (await text()).length > 0, await text());
if (shotDir) await shotEl(page, "[data-js-controller=PaymentMethodHubFilterText]", `${shotDir}/noresults.png`, 40);
await page.fill("[data-js-target='SearchInput.input']", "");
await settle();
check("empty search returns to the initial cards", JSON.stringify(await cards()) === JSON.stringify(initial));

// show all
await page.click("[data-js-target='PaymentMethodHubGrid.showAllButtonEl']");
await settle();
const all = await cards();
check("show all renders every payment method", all.length === 123, `${all.length}`);
const btnHidden = await page.$eval("[data-js-target='PaymentMethodHubGrid.showAllButtonEl']", (b) => b.classList.contains("PaymentMethodHubGrid__showAllButton--hidden"));
check("show-all button hidden after showing all", btnHidden);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check("no horizontal overflow", overflow <= 0, `${overflow}px`);
check("no console errors", errors.length === 0, errors.join(" / "));
await browser.close();
