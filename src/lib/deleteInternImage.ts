import { getStorage, ref, deleteObject } from "firebase/storage";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Deletes the intern's uploaded image from Firebase Storage after attendance approval.
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

  // Get storage reference from photoUrl
  const storage = getStorage();
  // Extract the path from the photoUrl
  // photoUrl is usually like: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?...
  const match = photoUrl.match(/\/o\/(.*)\?/);
  const imagePath = match ? decodeURIComponent(match[1]) : null;
  if (!imagePath) return;

  const imageRef = ref(storage, imagePath);
  await deleteObject(imageRef);
}
