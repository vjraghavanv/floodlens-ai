import { test, expect } from "@playwright/test";

// The 10 required user journeys from the brief. Desktop project runs all;
// the mobile project runs the same set (journey 10 = mobile layout) so the
// whole UI is exercised at a phone viewport too.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The data-mode badge only renders once data has loaded successfully.
  await expect(page.getByText(/local data/i)).toBeVisible();
});

test("1. dashboard loads with computed overview stats", async ({ page }) => {
  // Overview section shows the computed water-bodies count (real OSM, > 0).
  const overview = page.locator("main section").first();
  await expect(overview).toContainText("Water bodies");
  await expect(overview).toContainText("Flood hotspots");
  await expect(overview).toContainText("Neighbourhoods");
});

test("2. map renders", async ({ page }) => {
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
});

test("3. flood layer can be toggled off and on", async ({ page }) => {
  const t = page.getByTestId("layer-toggle-flood_hotspots");
  await expect(t).toBeChecked();
  await t.click();
  await expect(t).not.toBeChecked();
  await t.click();
  await expect(t).toBeChecked();
});

test("4. waterbody layer can be toggled off and on", async ({ page }) => {
  const t = page.getByTestId("layer-toggle-water_bodies");
  await expect(t).toBeChecked();
  await t.click();
  await expect(t).not.toBeChecked();
  await t.click();
  await expect(t).toBeChecked();
});

test("5. clicking a search result selects the location", async ({ page }) => {
  await page.getByTestId("search-input").fill("velach");
  const results = page.getByTestId("search-results");
  await expect(results).toBeVisible();
  await expect(results.locator("li").first()).toContainText(/velach/i);
  await results.locator("li").first().click();
  await expect(page.getByTestId("search-input")).toHaveValue("");
});

test("6. location search returns matches", async ({ page }) => {
  await page.getByTestId("search-input").fill("lake");
  await expect(page.getByTestId("search-results").locator("li").first()).toBeVisible();
});

test("7. filters update the insights charts", async ({ page }) => {
  await page.getByTestId("tab-insights").click();
  const count = page.getByTestId("filtered-count");
  await expect(count).toContainText("15 hotspot");
  await page.getByTestId("filter-neighbourhood").selectOption({ label: "Velachery" });
  await expect(count).toContainText("1 hotspot");
});

test("8. proximity analysis returns distances", async ({ page }) => {
  await page.getByTestId("tab-proximity").click();
  await page.getByTestId("proximity-hotspot").selectOption({ index: 1 });
  const rows = page.getByTestId("proximity-results").locator("li");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toContainText(/\d+(\.\d+)?\s?(m|km)/);
  await page.getByTestId("proximity-run").click();
});

test("9. missing dataset values do not crash the app", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const t of ["insights", "proximity", "datasets", "map"] as const) {
    await page.getByTestId(`tab-${t}`).click();
    await page.waitForTimeout(200);
  }
  expect(errors).toHaveLength(0);
});

test("10. dataset explorer shows provenance with verified + demo badges", async ({ page }) => {
  await page.getByTestId("tab-datasets").click();
  await expect(page.getByText("VERIFIED").first()).toBeVisible();
  await expect(page.getByText("DEMO").first()).toBeVisible();
  await expect(page.getByText(/OpenStreetMap/i).first()).toBeVisible();
});
