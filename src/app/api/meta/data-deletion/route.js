export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body.user_id;
    
    // Generate a confirmation code
    const confirmationCode = `MNP-DEL-${Date.now()}`;
    
    return NextResponse.json({
      url: `https://mnp-crm.vercel.app/privacy`,
      confirmation_code: confirmationCode,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
