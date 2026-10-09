import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const user = await User.findOne({ uid });

    if (!user) {
      return NextResponse.json({ state: null });
    }

    return NextResponse.json({ state: user.state });
  } catch (error: any) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body || !body.state) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectMongo();
    await User.findOneAndUpdate(
      { uid },
      { state: body.state },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
