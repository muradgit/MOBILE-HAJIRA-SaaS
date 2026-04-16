import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

/**
 * API Route to search institutions (tenants) by Name or EIIN.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Search by Name (Prefix search)
    const nameQuery = adminDb.collection("tenants")
      .where("name", ">=", query)
      .where("name", "<=", query + "\uf8ff")
      .limit(5);

    // Search by EIIN
    const eiinQuery = adminDb.collection("tenants")
      .where("eiin", "==", query)
      .limit(5);

    const [nameSnap, eiinSnap] = await Promise.all([
      nameQuery.get(),
      eiinQuery.get()
    ]);

    const resultsMap = new Map();

    nameSnap.forEach(doc => {
      const data = doc.data();
      resultsMap.set(doc.id, {
        tenant_id: doc.id,
        name: data.name,
        eiin: data.eiin
      });
    });

    eiinSnap.forEach(doc => {
      const data = doc.data();
      resultsMap.set(doc.id, {
        tenant_id: doc.id,
        name: data.name,
        eiin: data.eiin
      });
    });

    return NextResponse.json({ results: Array.from(resultsMap.values()) });

  } catch (error: any) {
    console.error("Institution search error:", error);
    return NextResponse.json({ error: "Failed to search institutions" }, { status: 500 });
  }
}
