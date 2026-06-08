// Griffith Sales Associates logo — concentric circles (target/sound waves)
export default function GriffithLogo({
  size = 48,
  color = '#0f2044',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Griffith Sales Associates"
    >
      <circle cx="50" cy="50" r="47" stroke={color} strokeWidth="5" />
      <circle cx="50" cy="50" r="34" stroke={color} strokeWidth="5" />
      <circle cx="50" cy="50" r="21" stroke={color} strokeWidth="5" />
      <circle cx="50" cy="50" r="8"  fill={color} />
    </svg>
  )
}
