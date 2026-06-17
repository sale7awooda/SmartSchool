import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    throw new Error("Test server-side error from Sentry example API");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({
      error: "Test error captured. Check Sentry dashboard.",
    });
  }
}
