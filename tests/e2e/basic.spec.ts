import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  expectCentre,
  manifest,
  screenSizes,
  setupViewer,
} from "../support/utils";

const TITLE_HTML = `\n        <h1 class="storiiies-viewer__title storiiies-viewer__text-section">Lorem ipsum dolor sit amet, consectetur adipiscing elit</h1>\n        <div class="storiiies-viewer__text-section"><p><em>Pellentesque tempor ante non congue pulvinar.</em> Maecenas non ipsum non metus imperdiet facilisis. Vestibulum ante ipsum primis in <strong>faucibus</strong> orci luctus et ultrices posuere cubilia curae; Praesent sem felis, porta eu nisl in, rhoncus luctus nunc.<br>Morbi bibendum, eros eu sollicitudin egestas, nisi dui convallis nisi, sed lacinia velit augue eu lectus. In enim est, elementum ac elit a, ultricies pellentesque nibh.</p></div>\n        <div class="storiiies-viewer__text-section"><strong>Attribution:</strong> Provided courtesy of Example Institution</div>\n      `;
const PLAIN_TEXT_TITLE_HTML = `\n        <h1 class="storiiies-viewer__title storiiies-viewer__text-section">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</h1>\n        <div class="storiiies-viewer__text-section">Pellentesque tempor ante non congue pulvinar.<br><br>Maecenas non ipsum non metus imperdiet facilisis. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Praesent sem felis, porta eu nisl in, rhoncus luctus nunc.<br>Morbi bibendum, eros eu sollicitudin egestas, nisi dui convallis nisi, sed lacinia velit augue eu lectus. In enim est, elementum ac elit a, ultricies pellentesque nibh.</div>\n        <div class="storiiies-viewer__text-section"><strong>Attribution:</strong> Provided courtesy of Example Institution</div>\n      `;
const CREDITS_HTML = `<div class="storiiies-viewer__text-section"><p>Storiiies was created by <a href="https://www.cogapp.com" target="_blank">Cogapp</a>.</p><p>It's easy, and free, to create your own story - find out more at <a href="https://www.cogapp.com/storiiies" target="_blank">cogapp.com/storiiies</a>.</p><p>This viewer is released as open source - see <a href="https://cogapp.com/open-source-at-cogapp" target="_blank">cogapp.com/open-source-at-cogapp</a>.</p></div>`;
const FIRST_ANNOTATION_HTML = `<div class="storiiies-viewer__text-section">Nullam sit amet egestas metus.<br><br>Sed dictum mattis erat feugiat gravida</div>`;
const SECOND_ANNOTATION_HTML = `<div class="storiiies-viewer__text-section"><p><strong>Suspendisse lacinia enim lorem</strong>, sit amet interdum odio dignissim et.</p><p><img src="http://localhost:43110/images/embedded/duck.jpg" alt="Mallard"></p><p>Curabitur ultricies felis non sagittis commodo.</p><p>Proin finibus imperdiet lectus quis imperdiet. Maecenas at rhoncus nibh, ac lobortis ante. Nam et ligula a dui <a href="https://www.google.com">consectetur consectetur</a>. Suspendisse non nisi turpis.</p></div>`;

async function clickTimes(locator: Locator, times: number) {
  for (let i = 0; i < times; i++) await locator.click();
}

const infoText = (page: Page) => page.locator("#storiiies-viewer-0__info-text");
const previous = (page: Page) => page.locator("#storiiies-viewer-0__previous");
const next = (page: Page) => page.locator("#storiiies-viewer-0__next");

async function expectHtml(page: Page, html: string) {
  await expect(infoText(page)).toHaveJSProperty("innerHTML", html);
}

function annotations(showCreditSlide: boolean) {
  // The credit slide adds one more step before Restart
  const slides = showCreditSlide ? 3 : 2;

  test("should be able to navigate between annotations, and alter buttons where necessary", async ({
    page,
  }) => {
    await expect(previous(page)).toBeDisabled();
    await expect(next(page)).toHaveAttribute("aria-label", "Next");
    await clickTimes(next(page), slides);
    await expect(next(page)).toHaveAttribute("aria-label", "Restart");

    await expect(previous(page)).toBeEnabled();
    await clickTimes(previous(page), slides);
    await expect(previous(page)).toBeDisabled();

    await clickTimes(next(page), slides + 1);
    await expect(previous(page)).toBeDisabled();
  });

  if (showCreditSlide) {
    test("should display the credits on the final slide", async ({ page }) => {
      await clickTimes(next(page), 3);
      await expectHtml(page, CREDITS_HTML);
    });
  } else {
    test("should not display the credits on the final slide", async ({
      page,
    }) => {
      await clickTimes(next(page), 2);
      await expectHtml(page, SECOND_ANNOTATION_HTML);
      await expect(infoText(page)).not.toContainText(
        "Storiiies was created by",
      );
    });
  }

  test("should display the correct annotation text and be sanitised", async ({
    page,
  }) => {
    await expectHtml(page, TITLE_HTML);
    await next(page).click();
    await expectHtml(page, FIRST_ANNOTATION_HTML);
    await next(page).click();
    await expectHtml(page, SECOND_ANNOTATION_HTML);
  });

  test("should display the correct region in OpenSeadragon", async ({
    page,
  }) => {
    await expect(page.locator("#viewer")).toHaveAttribute(
      "data-loaded",
      "true",
    );

    // Title slide shows the whole image
    await expectCentre(page, "0,0,2048,2048");
    await next(page).click();
    await expectCentre(page, "265.53218,661.3333,100,200");
    await next(page).click();
    await expectCentre(page, "-20,242,200,120");
  });

  test("should toggle annotation text and controls, and update button text", async ({
    page,
  }) => {
    const infoArea = page.locator("#storiiies-viewer-0__info-area");
    const toggle = page.locator("#storiiies-viewer-0__info-toggle");

    await expect(infoArea).not.toHaveAttribute("inert");
    await expect(toggle).toHaveAttribute("aria-label", "Hide annotations");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Show annotations");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(infoArea).toHaveAttribute("inert");
  });
}

for (const screenSize of screenSizes) {
  test.describe(screenSize.label, () => {
    test.use({
      viewport: { width: screenSize.width, height: screenSize.height },
    });

    test.describe("Basic rendering", () => {
      test.beforeEach(({ page }) =>
        setupViewer(page, { manifestUrl: manifest("standard-v3") }),
      );

      test("Should render an Openseadragon viewer", async ({ page }) => {
        await expect(page.locator("#viewer")).toHaveAttribute(
          "data-loaded",
          "true",
        );
      });

      test("Should initially display the label from the manifest", async ({
        page,
      }) => {
        await expectHtml(page, TITLE_HTML);
      });
    });

    test.describe("Rendering manifest with plain text summary", () => {
      test.beforeEach(({ page }) =>
        setupViewer(page, { manifestUrl: manifest("plain-text-summary-v3") }),
      );

      test("Should render an Openseadragon viewer", async ({ page }) => {
        await expect(page.locator("#viewer")).toHaveAttribute(
          "data-loaded",
          "true",
        );
      });

      // Plain text should include converted break tags
      test("Should initially display the label from the manifest", async ({
        page,
      }) => {
        await expectHtml(page, PLAIN_TEXT_TITLE_HTML);
      });
    });

    test.describe("Rendering manifest with mixed HTML/plain text summary", () => {
      test.beforeEach(({ page }) =>
        setupViewer(page, {
          manifestUrl: manifest("mixed-html-plain-summary-v3"),
        }),
      );

      test("Should render an Openseadragon viewer", async ({ page }) => {
        await expect(page.locator("#viewer")).toHaveAttribute(
          "data-loaded",
          "true",
        );
      });

      // Something judged to be HTML (starts with < and ends with >) should not include converted break tags
      test("Should not convert \\n's to break tags", async ({ page }) => {
        await expect(infoText(page).locator("h1")).toBeVisible();
        expect(await infoText(page).innerHTML()).not.toContain("<br>");
      });
    });

    test.describe("Annotations with credit slide", () => {
      test.beforeEach(({ page }) =>
        setupViewer(page, { manifestUrl: manifest("standard-v3") }),
      );
      annotations(true);
    });

    test.describe("Annotations without credit slide", () => {
      test.beforeEach(({ page }) =>
        setupViewer(page, {
          manifestUrl: manifest("standard-v3"),
          showCreditSlide: false,
        }),
      );
      annotations(false);
    });
  });
}
