import { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  style?: React.CSSProperties
}

export function SplineScene({ scene, className, style }: SplineSceneProps) {
  return (
    <Suspense fallback={<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#333',fontSize:'.5rem',fontFamily:'monospace'}}>Loading 3D...</span></div>}>
      <Spline scene={scene} className={className} style={style} />
    </Suspense>
  )
}
