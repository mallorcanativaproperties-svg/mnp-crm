import { NextResponse } from "next/server";

const META_TOKEN = process.env.META_PAGE_TOKEN || "";
const PAGE_ID = "114253063560446";
const IG_USER_ID = "17841470283557761";

export async function GET(request) {
  const results = {};

  try {
    // 1. Find all pages accessible with this token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${META_TOKEN}`
    );
    results.my_pages = await pagesRes.json();

    // 2. Get Instagram account info
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}?fields=id,username&access_token=${META_TOKEN}`
    );
    results.instagram_info = await igRes.json();

    // 3. Try to find page linked to Instagram
    const igPageRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_USER_ID}?fields=id,username,name&access_token=${META_TOKEN}`
    );
    results.ig_details = await igPageRes.json();

    // 4. If we found pages, try to subscribe the first one
    const pages = results.my_pages?.data || [];
    if (pages.length > 0) {
      const pageId = pages[0].id;
      const pageToken = pages[0].access_token;
      results.found_page_id = pageId;
      results.found_page_name = pages[0].name;
      
      const subRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscribed_fields: ["messages", "messaging_postbacks", "feed"],
            access_token: pageToken,
          }),
        }
      );
      results.page_subscription = await subRes.json();
      
      // Check subscriptions
      const checkRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?access_token=${pageToken}`
      );
      results.current_subscriptions = await checkRes.json();
    } else {
      results.page_subscription = { error: "No pages found with this token" };
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, results }, { status: 500 });
  }
}
