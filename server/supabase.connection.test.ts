import { describe, expect, it } from "vitest";

describe("Supabase connection", () => {
  it("accepts the configured project URL and publishable key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_/);

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key ?? "" },
    });

    expect(response.ok).toBe(true);
    const settings = (await response.json()) as { external?: Record<string, unknown> };
    expect(settings).toHaveProperty("external");
  }, 15000);
});
