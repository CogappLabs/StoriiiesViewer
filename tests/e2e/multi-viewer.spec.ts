import { expect, type Page, test } from "@playwright/test";
import { manifest } from "../support/utils";

const HIDDEN = /storiiies-viewer__info-area--hidden/;

async function setupViewers(page: Page) {
  await page.goto("multi-viewer.html");
  await page.evaluate((manifestUrl) => {
    for (const container of document.querySelectorAll(".viewer")) {
      new window.StoriiiesViewer({ container, manifestUrl });
    }
  }, manifest("standard-v3"));
}

const button = (page: Page, instance: number, name: string) =>
  page.locator(`#storiiies-viewer-${instance}__${name}`);

async function clickTimes(
  page: Page,
  instance: number,
  name: string,
  times: number,
) {
  for (let i = 0; i < times; i++) await button(page, instance, name).click();
}

test.beforeEach(({ page }) => setupViewers(page));

test("Should render multiple Openseadragon viewers", async ({ page }) => {
  await expect(page.locator("[data-loaded='true']")).toHaveCount(3);
});

test("should be able to navigate between annotations, and disable buttons where necessary", async ({
  page,
}) => {
  for (let i = 0; i <= 2; i++) {
    await expect(button(page, i, "previous")).toBeDisabled();
    await expect(button(page, i, "next")).toBeEnabled();
    await clickTimes(page, i, "next", 3);
    await expect(button(page, i, "next")).toHaveAttribute(
      "aria-label",
      "Restart",
    );

    await expect(button(page, i, "previous")).toBeEnabled();
    await clickTimes(page, i, "previous", 3);
    await expect(button(page, i, "previous")).toBeDisabled();
  }
});

test("should isolate each instance from events in other instances", async ({
  page,
}) => {
  await button(page, 0, "next").click();
  await expect(button(page, 1, "previous")).toBeDisabled();
  await expect(button(page, 2, "previous")).toBeDisabled();

  await button(page, 0, "previous").click();
  await expect(button(page, 0, "previous")).toBeDisabled();
  await expect(button(page, 1, "previous")).toBeDisabled();
  await expect(button(page, 2, "previous")).toBeDisabled();

  await clickTimes(page, 1, "next", 3);
  await expect(button(page, 1, "next")).toHaveAttribute(
    "aria-label",
    "Restart",
  );
  await expect(button(page, 0, "next")).toBeEnabled();
  await expect(button(page, 2, "next")).toHaveAttribute("aria-label", "Next");

  await clickTimes(page, 1, "previous", 3);
  await expect(button(page, 1, "previous")).toBeDisabled();
  await expect(button(page, 0, "next")).toBeEnabled();
  await expect(button(page, 2, "next")).toHaveAttribute("aria-label", "Next");

  // Hidden info areas fade to opacity 0, which Playwright still counts as visible
  const infoArea = (i: number) => button(page, i, "info-area");
  await button(page, 0, "info-toggle").click();
  await expect(infoArea(0)).toHaveClass(HIDDEN);
  await expect(infoArea(1)).not.toHaveClass(HIDDEN);
  await expect(infoArea(2)).not.toHaveClass(HIDDEN);

  await button(page, 1, "info-toggle").click();
  await expect(infoArea(0)).toHaveClass(HIDDEN);
  await expect(infoArea(1)).toHaveClass(HIDDEN);
  await expect(infoArea(2)).not.toHaveClass(HIDDEN);

  await button(page, 2, "info-toggle").click();
  await expect(infoArea(0)).toHaveClass(HIDDEN);
  await expect(infoArea(1)).toHaveClass(HIDDEN);
  await expect(infoArea(2)).toHaveClass(HIDDEN);
});
