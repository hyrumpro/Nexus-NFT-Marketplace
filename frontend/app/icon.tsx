import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #00e5c8 0%, #9b5de5 100%)',
        borderRadius: '6px',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          background: 'white',
          transform: 'rotate(45deg)',
          borderRadius: '2px',
        }}
      />
    </div>,
    { ...size }
  )
}
