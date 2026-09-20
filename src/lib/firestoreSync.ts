import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { ManualRangeSummary } from "../services/manualNumberService";

export interface ManualPoolData {
  list: any[];
  updatedAt: number;
}

/**
 * Real-time listener for Manual Numbers Pool from Firestore
 */
export function subscribeToManualPool(
  onData: (numbers: any[], ranges: ManualRangeSummary[]) => void
) {
  try {
    const docRef = doc(db, "app_data", "manual_pool");
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const list = Array.isArray(data?.list) ? data.list : [];
          const ranges = getManualRangesFromList(list);
          onData(list, ranges);
        }
      },
      (err) => {
        console.warn("[FirestoreSync] Error in manual_pool snapshot:", err);
      }
    );
  } catch (err) {
    console.warn("[FirestoreSync] Failed to subscribe to manual_pool:", err);
    return () => {};
  }
}

/**
 * Helper to compute ranges summary from raw number list
 */
export function getManualRangesFromList(list: any[]): ManualRangeSummary[] {
  const map = new Map<string, ManualRangeSummary>();

  for (const item of list) {
    if (!item || item.id?.startsWith("seed_")) continue;
    const prefix = item.rangePrefix || item.cleanDigits?.slice(0, 5) || "UNKNOWN";
    const masked = item.maskedRange || `${prefix}XXXXX`;
    const country = item.country || "Global";
    const flag = item.flag || "🌐";
    const dialCode = item.dialCode || "";
    const platform = item.platform || item.socialMedia || "WhatsApp";

    const key = `${prefix}_${country}_${platform}`;

    if (!map.has(key)) {
      map.set(key, {
        rangePrefix: prefix,
        maskedRange: masked,
        country,
        flag,
        dialCode,
        platform,
        socialMedia: platform,
        totalCount: 0,
        availableCount: 0,
        allocatedCount: 0,
      });
    }

    const entry = map.get(key)!;
    entry.totalCount += 1;
    if (item.allocated) {
      entry.allocatedCount += 1;
    } else {
      entry.availableCount += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Save manual numbers pool to Firestore
 */
export async function pushManualPoolToFirestore(list: any[]) {
  try {
    const docRef = doc(db, "app_data", "manual_pool");
    await setDoc(docRef, { list, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("[FirestoreSync] Failed to push manual pool to Firestore:", err);
  }
}

/**
 * Fetch manual numbers pool from Firestore once
 */
export async function fetchManualPoolFromFirestore(): Promise<any[]> {
  try {
    const docRef = doc(db, "app_data", "manual_pool");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data?.list) ? data.list : [];
    }
  } catch (err) {
    console.warn("[FirestoreSync] Failed to fetch manual pool from Firestore:", err);
  }
  return [];
}
