import { test, expect } from "@playwright/test";

test.describe("ParkShark Full Lifecycle E2E Test", () => {
  test("Full student flow: login -> locate stand -> lock bicycle -> session timer -> unlock", async ({ page }) => {
    // -------------------------------------------------------------
    // Step 1: Open Login Page & Verify Branding
    // -------------------------------------------------------------
    await page.goto("/");
    await expect(page).toHaveTitle(/ParkShark/i);

    // Verify presence of brand header & login card
    const brandHeading = page.locator("h1", { hasText: /Park.*Shark.*Login/i });
    await expect(brandHeading).toBeVisible();

    // -------------------------------------------------------------
    // Step 2: Student Authentication with Pre-registered College ID
    // -------------------------------------------------------------
    const idInput = page.locator("#login-identifier-input");
    await idInput.fill("21BCE1042");

    const sendOtpButton = page.locator("#send-otp-button");
    await sendOtpButton.click();

    // Verify 6 OTP input boxes appear
    const otpFirstInput = page.locator("#otp-input-0");
    await expect(otpFirstInput).toBeVisible({ timeout: 10000 });

    // Fill 6-digit test OTP: 123456
    for (let i = 0; i < 6; i++) {
      await page.locator(`#otp-input-${i}`).fill(String(i + 1));
    }

    const verifyOtpButton = page.locator("#verify-login-button");
    await verifyOtpButton.click();

    // -------------------------------------------------------------
    // Step 3: Successfully Authenticated & Navigate Campus
    // -------------------------------------------------------------
    // Verify user greeting in top header
    const userGreeting = page.locator("#user-greeting");
    await expect(userGreeting).toBeVisible({ timeout: 12000 });
    await expect(userGreeting).toContainText(/Arjun/i);

    // Verify building occupancy chips appear (AB1, AB2, AB3)
    const ab1Chip = page.locator("button", { hasText: /AB1/i }).first();
    await expect(ab1Chip).toBeVisible();

    // -------------------------------------------------------------
    // Step 4: Locate Nearest Bicycle Stand & Proceed to Lock
    // -------------------------------------------------------------
    // Navigate to Stand AB1-01 Lock Screen
    await page.goto("/lock/AB1-01");

    const lockHeading = page.locator("h1", { hasText: /Lock Bicycle at Stand AB1-01/i });
    await expect(lockHeading).toBeVisible();

    // Select 2 Hours Duration chip
    const twoHourChip = page.locator("button", { hasText: /2 Hours/i });
    if (await twoHourChip.isVisible()) {
      await twoHourChip.click();
    }

    // Fill 4-digit security PIN: 1234
    for (let i = 0; i < 4; i++) {
      await page.locator(`input[aria-label="PIN digit ${i + 1}"]`).fill(String(i + 1));
    }

    // Submit Lock form
    const lockSubmitButton = page.locator("button[type='submit']", { hasText: /Lock Bicycle Now/i });
    await lockSubmitButton.click();

    // -------------------------------------------------------------
    // Step 5: Active Parking Session & Live Countdown Timer
    // -------------------------------------------------------------
    // Should transition to /session
    await expect(page).toHaveURL(/session/);

    const sessionHeading = page.locator("h4, h2", { hasText: /Stand AB1-01/i }).first();
    await expect(sessionHeading).toBeVisible();

    // Verify digital time remaining countdown clock is active
    const timeRemainingLabel = page.locator("text=/Time Remaining/i").first();
    await expect(timeRemainingLabel).toBeVisible();

    // -------------------------------------------------------------
    // Step 6: Unlock Bicycle Verification Flow
    // -------------------------------------------------------------
    // Navigate to unlock screen
    await page.goto("/unlock");

    const unlockHeading = page.locator("h1", { hasText: /Unlock Stand AB1-01/i });
    await expect(unlockHeading).toBeVisible();

    // Fill correct 4-digit PIN: 1234
    for (let i = 0; i < 4; i++) {
      await page.locator(`input[aria-label="Code digit ${i + 1}"]`).fill(String(i + 1));
    }

    const unlockButton = page.locator("button[type='submit']", { hasText: /Verify & Unlock Bicycle/i });
    await unlockButton.click();

    // Verify Phase 6 Requirement 6 exact success confirmation
    const successBanner = page.locator("text=/Bicycle unlocked successfully! Stand AB1-01 is now available/i");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
  });
});
