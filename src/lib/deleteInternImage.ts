import { deleteFromBytescale, extractFileIdFromUrl } from "./bytescale";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Deletes the intern's uploaded image from Bytescale after attendance approval.
 * @param attendanceId The ID of the attendance record.
 * @returns Promise<void>
 */
export async function deleteInternImageAfterApproval(attendanceId: string): Promise<void> {
  // Get the attendance record
  const attendanceDoc = await getDoc(doc(db, "attendance", attendanceId));
  if (!attendanceDoc.exists()) return;
  const attendanceData = attendanceDoc.data();
  const photoUrl = attendanceData.photoUrl;
  if (!photoUrl) return;

  // Extract file ID from Bytescale URL
  const fileId = extractFileIdFromUrl(photoUrl);
  if (!fileId) {
    console.warn("⚠️ Could not extract file ID from URL:", photoUrl);
    return;
  }

  await deleteFromBytescale(fileId);
}
