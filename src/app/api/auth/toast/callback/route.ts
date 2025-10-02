import { NextRequest, NextResponse } from 'next/server';

/**
 * NOTE: This endpoint is deprecated and should not be used.
 *
 * Toast does NOT use traditional OAuth 2.0 authorization code flow.
 * There is no OAuth callback because there is no redirect-based authorization.
 *
 * Toast integration methods:
 * 1. Partner Program (production): Webhooks notify when restaurants connect
 * 2. Manual credentials (testing): Direct API connection with GUID
 *
 * This file is kept for backward compatibility but returns an error.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Toast OAuth callback not supported',
      message: 'Toast does not use traditional OAuth flow. Please use the manual connection method or Partner Program webhooks.'
    },
    { status: 404 }
  );
}
