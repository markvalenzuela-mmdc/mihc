import { NextResponse } from "next/server";
import { getSignedArtifactUrl } from "@mmdc/shared";

type Params = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { key } = await params;
    const artifactKey = key.join("/");
    const url = await getSignedArtifactUrl(artifactKey);

    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Invalid artifact key" }, { status: 400 });
  }
}