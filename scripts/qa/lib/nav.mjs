// Sidebar navigation for QA. The sidebar lists only the pages of the current group, so a page in another group
// is reached the way a person would: through the workspace search (Ctrl/Cmd+K or the search button).
export async function goToSection(page, name, settle = 450) {
  const item = page.locator('.ui-as-side__nav .workspace-nav-label').getByText(name, { exact: true });
  if (await item.count()) await item.click();
  else {
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search workspace', exact: true }).fill(name);
    await page.locator('.crm-search__results button').filter({ has: page.locator('small', { hasText: 'section' }) }).filter({ hasText: new RegExp(`^${name}`) }).first().click();
  }
  await page.waitForTimeout(settle);
}
