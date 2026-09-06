export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { texto, imageUrl } = await request.json();
    const token = process.env.LINKEDIN_ACCESS_TOKEN;

    if (!token) return NextResponse.json({ ok: false, error: "LINKEDIN_ACCESS_TOKEN no configurado" }, { status: 500 });

    // Obtener perfil del usuario autenticado
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = await meRes.json();
    if (!me.sub) return NextResponse.json({ ok: false, error: "No se pudo obtener perfil: " + JSON.stringify(me) }, { status: 400 });

    const authorUrn = `urn:li:person:${me.sub}`;

    const postBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: texto },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    // Subir imagen si hay
    if (imageUrl) {
      const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
          },
        }),
      });
      const registerData = await registerRes.json();
      const uploadUrl = registerData?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
      const asset = registerData?.value?.asset;

      if (uploadUrl && asset) {
        const imgRes = await fetch(imageUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
          body: imgBuffer,
        });
        postBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE";
        postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [{
          status: "READY",
          description: { text: "" },
          media: asset,
          title: { text: "" },
        }];
      }
    }

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    const postData = await postRes.json();
    if (postRes.ok) return NextResponse.json({ ok: true, postId: postData.id });
    return NextResponse.json({ ok: false, error: JSON.stringify(postData) }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
