import "dotenv/config";
import { describe, expect, it } from "vitest";

describe("Supabase server connection", () => {
  it("accepts the configured service-role key for the project REST endpoint", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key ?? "",
        Authorization: `Bearer ${key ?? ""}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15000);
});
