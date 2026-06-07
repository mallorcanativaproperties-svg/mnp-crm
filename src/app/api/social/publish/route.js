export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

async function publishInstagram(post, account) {
  const { access_token, ig_user_id } = account;
  const baseUrl = "https://graph.facebook.com/v21.0";
  try {
    let containerParams = { access_token, caption: `${post.texto || ""}\n\n${post.hashtags || ""}`.trim() };
    const mediaUrl = post.media_urls?.[0];
    const isVideo = post.media_types?.[0] === "video";
    const isCarousel = (post.media_urls?.length || 0) > 1;

    if (isCarousel) {
      const children = [];
      for (let i = 0; i < post.media_urls.length; i++) {
        const cp = { access_token, is_carousel_item: true };
        if (post.media_types[i] === "video") { cp.media_type = "VIDEO"; cp.video_url = post.media_urls[i]; }
        else { cp.image_url = post.media_urls[i]; }
        const cr = await fetch(`${baseUrl}/${ig_user_id}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cp) });
        const cd = await cr.json();
        if (cd.id) children.push(cd.id);
      }
      containerParams.media_type = "CAROUSEL";
      containerParams.children = children.join(",");
    } else if (post.tipo === "Reel") {
      containerParams.media_type = "REELS"; containerParams.video_url = mediaUrl;
    } else if (post.tipo === "Story") {
      containerParams.media_type = "STORIES";
      if (isVideo) containerParams.video_url = mediaUrl; else containerParams.image_url = mediaUrl;
    } else if (isVideo) {
      containerParams.media_type = "VIDEO"; containerParams.video_url = mediaUrl;
    } else {
      containerParams.image_url = mediaUrl;
    }

    const cr = await fetch(`${baseUrl}/${ig_user_id}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(containerParams) });
    const cd = await cr.json();
    if (!cd.id) return { success: false, error: cd.error?.message || "Container failed" };

    if (isVideo || post.tipo === "Reel") {
      let status = "IN_PROGRESS", attempts = 0;
      while (status === "IN_PROGRESS" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const sr = await fetch(`${baseUrl}/${cd.id}?fields=status_code&access_token=${access_token}`);
        const sd = await sr.json();
        status = sd.status_code; attempts++;
      }
    }

    const pr = await fetch(`${baseUrl}/${ig_user_id}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: cd.id, access_token }) });
    const pd = await pr.json();
    if (!pd.id) return { success: false, error: pd.error?.message || "Publish failed" };

    if (post.primer_comentario) {
      await fetch(`${baseUrl}/${pd.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: post.primer_comentario, access_token }) });
    }
    return { success: true, post_id: pd.id };
  } catch (err) { return { success: false, error: err.message }; }
}

async function publishFacebook(post, account) {
  const { access_token, page_id } = account;
  const baseUrl = "https://graph.facebook.com/v21.0";
  try {
    const message = `${post.texto || ""}\n\n${post.hashtags || ""}`.trim();
    const mediaUrl = post.media_urls?.[0];
    const isVideo = post.media_types?.[0] === "video";
    let endpoint = `${baseUrl}/${page_id}/feed`, body = { message, access_token };
    if (isVideo) { endpoint = `${baseUrl}/${page_id}/videos`; body = { file_url: mediaUrl, description: message, access_token }; }
    else if (mediaUrl) { endpoint = `${baseUrl}/${page_id}/photos`; body = { url: mediaUrl, message, access_token }; }
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    return data.id ? { success: true, post_id: data.id } : { success: false, error: data.error?.message || "Failed" };
  } catch (err) { return { success: false, error: err.message }; }
}

async function publishLinkedIn(post, account) {
  const { access_token, account_id } = account;
  try {
    const text = `${post.texto || ""}\n\n${post.hashtags || ""}`.trim();
    const body = { author: `urn:li:organization:${account_id}`, lifecycleState: "PUBLISHED", visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }, specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } } };
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify(body) });
    const data = await res.json();
    return data.id ? { success: true, post_id: data.id } : { success: false, error: JSON.stringify(data) };
  } catch (err) { return { success: false, error: err.message }; }
}

async function publishTikTok(post, account) {
  const { access_token } = account;
  const mediaUrl = post.media_urls?.[0];
  if (!mediaUrl) return { success: false, error: "TikTok requires a video" };
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ post_info: { title: `${post.texto || ""} ${post.hashtags || ""}`.trim().slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE", disable_comment: false }, source_info: { source: "PULL_FROM_URL", video_url: mediaUrl } }) });
    const data = await res.json();
    return data.data?.publish_id ? { success: true, post_id: data.data.publish_id } : { success: false, error: data.error?.message || "TikTok failed" };
  } catch (err) { return { success: false, error: err.message }; }
}

async function publishYouTube(post, account) {
  const { access_token } = account;
  const mediaUrl = post.media_urls?.[0];
  if (!mediaUrl) return { success: false, error: "YouTube requires a video" };
  try {
    const metadata = { snippet: { title: post.titulo || "Video", description: `${post.texto || ""}\n\n${post.hashtags || ""}`.trim(), tags: (post.hashtags || "").split(/\s+/).filter((t) => t.startsWith("#")).map((t) => t.slice(1)), categoryId: "22" }, status: { privacyStatus: "public", selfDeclaredMadeForKids: false } };
    const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(metadata) });
    if (res.ok) return { success: true, post_id: "pending", upload_url: res.headers.get("Location") };
    const err = await res.json();
    return { success: false, error: err.error?.message || "YouTube failed" };
  } catch (err) { return { success: false, error: err.message }; }
}

const PUBLISHERS = { instagram: publishInstagram, facebook: publishFacebook, linkedin: publishLinkedIn, tiktok: publishTikTok, youtube: publishYouTube };

export async function POST(request) {
  try {
    const { postId } = await request.json();
    const { data: post, error: postErr } = await supabase.from("social_posts").select("*").eq("id", postId).single();
    if (postErr || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const { data: accounts } = await supabase.from("social_accounts").select("*").eq("connected", true);
    const results = {};

    for (const red of post.redes || []) {
      const account = accounts?.find((a) => a.platform === red);
      if (!account) { results[red] = { success: false, error: "Not connected" }; continue; }
      const publisher = PUBLISHERS[red];
      if (publisher) {
        results[red] = await publisher(post, account);
        if (results[red].success && results[red].post_id) {
          const field = { instagram: "ig_post_id", facebook: "fb_post_id", linkedin: "li_post_id", tiktok: "tk_post_id", youtube: "yt_video_id" }[red];
          if (field) await supabase.from("social_posts").update({ [field]: results[red].post_id }).eq("id", postId);
        }
      }
    }

    const anySuccess = Object.values(results).some((r) => r.success);
    await supabase.from("social_posts").update({ estado: anySuccess ? "publicado" : "error", fecha_publicado: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", postId);

    return NextResponse.json({ success: true, results });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
