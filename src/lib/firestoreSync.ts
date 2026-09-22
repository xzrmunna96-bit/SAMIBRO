import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { ManualRangeSummary } from "../services/manualNumberService";
import { DEFAULT_SEEDED_RANGES } from "../data/defaultManualRanges";
import { LiveConsoleHit } from "../services/voltxApi";
import { generateInitialLiveStreamHits } from "../services/liveStreamService";

export interface ManualPoolData {
  list: any[];
  updatedAt: number;
}

/**
 * Real-time listener for Live Stream Hits from Firestore (cross-platform & Vercel)
 */
export function subscribeToLiveStreamHits(
  onData: (hits: LiveConsoleHit[]) => void
) {
  try {
    const docRef = doc(db, "app_data", "live_stream_hits");
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const hits = Array.isArray(data?.hits) ? data.hits : [];
          if (hits.length > 0) {
            onData(hits);
            return;
          }
        }
        onData(generateInitialLiveStreamHits());
      },
      (err) => {
        console.warn("[FirestoreSync] Error in live_stream_hits snapshot:", err);
        onData(generateInitialLiveStreamHits());
      }
    );
  } catch (err) {
    console.warn("[FirestoreSync] Failed to subscribe to live_stream_hits:", err);
    onData(generateInitialLiveStreamHits());
    return () => {};
  }
}

/**
 * Push latest live stream hits to Firestore so other devices/sessions see them instantly
 */
export async function pushLiveStreamHitsToFirestore(hits: LiveConsoleHit[]) {
  try {
    const docRef = doc(db, "app_data", "live_stream_hits");
    // Store latest 60 hits to stay well within 1MB Firestore limit
    const sliced = hits.slice(0, 60);
    await setDoc(docRef, { hits: sliced, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("[FirestoreSync] Failed to push live_stream_hits to Firestore:", err);
  }
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
          // Prioritize precomputed full ranges summary from Firestore to avoid sliced list limits
          let ranges = Array.isArray(data?.ranges) && data.ranges.length > 0
            ? data.ranges
            : (list.length > 0 ? getManualRangesFromList(list) : DEFAULT_SEEDED_RANGES);
          onData(list, ranges);
        } else {
          onData([], DEFAULT_SEEDED_RANGES);
        }
      },
      (err) => {
        console.warn("[FirestoreSync] Error in manual_pool snapshot:", err);
        onData([], DEFAULT_SEEDED_RANGES);
      }
    );
  } catch (err) {
    console.warn("[FirestoreSync] Failed to subscribe to manual_pool:", err);
    onData([], DEFAULT_SEEDED_RANGES);
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
    // Compute small, lightweight ranges summary
    const ranges = getManualRangesFromList(list);
    // Keep only the most recent 100 numbers for the list property to avoid Firestore's 1MB document limit
    const slicedList = list.slice(0, 100);
    await setDoc(docRef, { ranges, list: slicedList, updatedAt: Date.now() });
  } catch (err) {
    console.warn("[FirestoreSync] Failed to push manual pool to Firestore:", err);
  }
}

/**
 * Direct summary save to Firestore (super fast, zero network overhead)
 */
export async function pushManualPoolSummaryToFirestore(ranges: ManualRangeSummary[], sampleList: any[]) {
  try {
    const docRef = doc(db, "app_data", "manual_pool");
    const slicedList = Array.isArray(sampleList) ? sampleList.slice(0, 100) : [];
    await setDoc(docRef, { ranges, list: slicedList, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("[FirestoreSync] Failed to push manual pool summary to Firestore:", err);
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
