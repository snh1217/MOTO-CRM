export function getStoragePathFromUrl(url: string | null, bucket: string) {
  if (!url) return null;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const privateMarker = `/storage/v1/object/${bucket}/`;

  const publicIndex = url.indexOf(publicMarker);
  if (publicIndex !== -1) {
    return decodeURIComponent(url.slice(publicIndex + publicMarker.length));
  }

  const privateIndex = url.indexOf(privateMarker);
  if (privateIndex !== -1) {
    return decodeURIComponent(url.slice(privateIndex + privateMarker.length));
  }

  return null;
}
