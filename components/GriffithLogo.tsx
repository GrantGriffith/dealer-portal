import Image from 'next/image'

export default function GriffithLogo({
  size = 48,
}: {
  size?: number
  color?: string // kept for compatibility, unused
}) {
  return (
    <Image
      src="/griffith_sales_logo.jpeg"
      alt="Griffith Sales Associates"
      width={size * 2}
      height={size}
      className="object-contain"
      priority
    />
  )
}
