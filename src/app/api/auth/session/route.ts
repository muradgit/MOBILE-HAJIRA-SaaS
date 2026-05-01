import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { role, userId, email } = await request.json();

    if (!role || !userId) {
      return NextResponse.json({ error: "Missing role or userId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    
    // In a real production app, you would verify the ID token here 
    // and set a secure session cookie using firebase-admin.
    // For this prototype, we'll store the role and userId in a cookie.
    
    cookieStore.set("user-role", role, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    cookieStore.set("user-id", userId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    if (email) {
      cookieStore.set("user-email", email, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("user-role");
  cookieStore.delete("user-id");
  cookieStore.delete("user-email");
  return NextResponse.json({ success: true });
}
