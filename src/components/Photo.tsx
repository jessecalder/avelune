import Image, { type ImageLoaderProps, type ImageProps } from "next/image"
import type { Photo as PhotoEntry } from "@/content/photos"

/**
 * Unsplash's CDN (imgix) resizes on the fly, so we hand it next/image's
 * requested width instead of proxying through the Next optimizer.
 */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://images.unsplash.com/${src}?w=${width}&q=${quality ?? 75}&auto=format&fit=crop`
}

const isUnsplash = (src: string) => src.startsWith("photo-")

type Props = Omit<ImageProps, "src" | "alt" | "width" | "height" | "loader" | "fill"> & {
  photo: PhotoEntry
  /** Fill the parent (parent must be position:relative). Default true. */
  fill?: boolean
}

/** Renders a manifest photo as a cover image; swap manifest entries, not call sites. */
export function Photo({ photo, fill = true, className, style, sizes, ...rest }: Props) {
  const loader = isUnsplash(photo.src) ? unsplashLoader : undefined
  const styles = { objectFit: "cover" as const, objectPosition: photo.position ?? "50% 50%", ...style }
  const sizeAttr = sizes ?? "100vw"
  if (fill) {
    return (
      <Image src={photo.src} alt={photo.alt} fill loader={loader} className={className} style={styles} sizes={sizeAttr} {...rest} />
    )
  }
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loader={loader}
      className={className}
      style={styles}
      sizes={sizeAttr}
      {...rest}
    />
  )
}
