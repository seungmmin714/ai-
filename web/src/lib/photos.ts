import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'

export interface ActivityPhoto {
  id: string
  url: string
  path: string // Storage 경로 (삭제용)
  createdAt: number
}

function photosRef(uid: string) {
  return collection(db, 'users', uid, 'activityPhotos')
}

// 휴대폰 원본 사진은 수 MB라, 캔버스로 최대 1280px JPEG로 줄여서 올린다
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const max = 1280
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했어요.'))),
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('이미지를 읽을 수 없어요.'))
    }
    img.src = URL.createObjectURL(file)
  })
}

// 도움 요청에 첨부하는 현장 사진 업로드 → 다운로드 URL 반환
export async function uploadRequestPhoto(uid: string, file: File) {
  const blob = await compressImage(file)
  const path = `requestPhotos/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

export async function uploadActivityPhoto(uid: string, file: File) {
  const blob = await compressImage(file)
  const path = `activityPhotos/${uid}/${Date.now()}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(storageRef)
  await addDoc(photosRef(uid), { url, path, createdAt: Date.now() })
}

export function subscribeToActivityPhotos(
  uid: string,
  callback: (photos: ActivityPhoto[]) => void,
  onError?: (error: Error) => void,
) {
  const q = query(photosRef(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityPhoto)),
    (error) => onError?.(error),
  )
}

export async function deleteActivityPhoto(uid: string, photo: ActivityPhoto) {
  await deleteDoc(doc(db, 'users', uid, 'activityPhotos', photo.id))
  // Storage 원본도 정리 (이미 없어도 무시)
  await deleteObject(ref(storage, photo.path)).catch(() => {})
}
