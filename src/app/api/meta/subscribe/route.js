import { NextResponse } from "next/server";

const META_TOKEN = process.env.META_PAGE_TOKEN || "";
const PAGE_ID = "61589699932855";
const IG_USER_ID = "17841470283557761";

export async function GET(request) {
  const results = {};

  try {
    // 1. Subscribe Page to app webhooks (messages, feed, etc.)
    const pageRes = await fetch(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_TOKEN}` },
        body: JSON.stringify({
          subscribed_fields: ["messages", "messaging_postbacks", "feed", "comments"],
        }),
      }
    );
    results.page_subscription = await pageRes.json();

    // 2. Get Instagram account info
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}?fields=id,username&access_token=${META_TOKEN}`
    );
    results.instagram_info = await igRes.json();

    // 3. Check current page subscriptions
    const checkRes = await fetch(
      `https://graph.facebook.com/v19.0/${PAGE_ID}/subscribed_apps?access_token=${META_TOKEN}`
    );
    results.current_subscriptions = await checkRes.json();

    // 4. Get page info to verify token works
    const pageInfoRes = await fetch(
      `https://graph.facebook.com/v19.0/${PAGE_ID}?fields=name,id,instagram_business_account&access_token=${META_TOKEN}`
    );
    results.page_info = await pageInfoRes.json();

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, results }, { status: 500 });
  }
}
