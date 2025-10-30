//app/api/socket/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("upgrade") !== "websocket") {
    return NextResponse.json(
      { error: "WebSocket upgrade required" },
      { status: 426 }
    );
  }

  const io = new Server({
    addTrailingSlash: false,
  });

  // Korjattu: Määritelty tarkempi tyyppi
  const handleImageUpload = async (data: { userId: string; imageData: string }) => {
    console.log("Kuva lähetetty:", data);
    return { status: "uploaded" };
  };

  io.on("connection", (socket) => {
    console.log("✅ Uusi yhteys (CV/kuvat):", socket.id);

    socket.on("cv_upload", async (data: { userId: string; cvId: string }) => {
      const status = await checkCvStatus();
          console.log("Kuva lähetetty:", data);

      socket.emit("cv_status", { status });
    });

    socket.on("image_upload", handleImageUpload);

    socket.on("disconnect", () => {
      console.log("❌ Yhteys katkaistu:", socket.id);
    });
  });

  return NextResponse.json(
    { message: "WebSocket connection established" },
    { status: 200 }
  );
}

async function checkCvStatus() {
  return "processed";
}