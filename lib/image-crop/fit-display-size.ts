/**
 * Вписывает прямоугольник натурального размера изображения в maxWidth × maxHeight
 * с сохранением пропорций (аналог object-fit: contain).
 */
export function fitImageDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return {
      width: Math.max(1, Math.min(280, maxWidth)),
      height: Math.max(1, Math.min(200, maxHeight))
    };
  }
  const imageAr = naturalWidth / naturalHeight;
  let width = maxWidth;
  let height = width / imageAr;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * imageAr;
  }
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height))
  };
}
