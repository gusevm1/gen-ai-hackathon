'use client'

import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPin, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ViewMode = 'streetview' | 'map'

interface PropertyMapViewProps {
  address: string
  latitude: number | null
  longitude: number | null
}

export function PropertyMapView({ address, latitude, longitude }: PropertyMapViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('streetview')
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [streetViewAvailable, setStreetViewAvailable] = useState(true)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

  useEffect(() => {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      v: 'weekly',
    })

    let cancelled = false

    const init = async () => {
      try {
        await Promise.all([
          importLibrary('maps'),
          importLibrary('streetView'),
          importLibrary('geometry'),
        ])
      } catch {
        if (!cancelled) setLoadState('error')
        return
      }

      if (cancelled || !mapContainerRef.current) return

      let propertyLatLng: google.maps.LatLng

      if (latitude != null && longitude != null) {
        propertyLatLng = new google.maps.LatLng(latitude, longitude)
      } else {
        const geocoder = new google.maps.Geocoder()
        const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
          geocoder.geocode({ address }, (results, status) => {
            resolve(status === 'OK' && results ? results[0] : null)
          })
        })
        if (!result) {
          if (!cancelled) setLoadState('error')
          return
        }
        propertyLatLng = result.geometry.location
      }

      if (cancelled || !mapContainerRef.current) return

      const map = new google.maps.Map(mapContainerRef.current, {
        center: propertyLatLng,
        zoom: 16,
        disableDefaultUI: false,
      })
      mapInstanceRef.current = map

      const marker = new google.maps.Marker({
        map,
        position: propertyLatLng,
        title: address,
      })
      markerRef.current = marker

      const infoWindow = new google.maps.InfoWindow({ content: address })
      marker.addListener('click', () => {
        infoWindow.open({ map, anchor: marker })
      })

      const svService = new google.maps.StreetViewService()
      svService.getPanorama(
        { location: propertyLatLng, radius: 50 },
        (data, status) => {
          if (cancelled) return

          if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
            setStreetViewAvailable(false)
            setViewMode('map')
            setLoadState('ready')
            return
          }

          const panoramaLatLng = data.location.latLng!
          const heading = google.maps.geometry.spherical.computeHeading(
            panoramaLatLng,
            propertyLatLng
          )

          const panorama = new google.maps.StreetViewPanorama(mapContainerRef.current!, {
            position: panoramaLatLng,
            pov: { heading, pitch: 0 },
            zoom: 1,
            visible: false,
          })
          panoramaInstanceRef.current = panorama
          map.setStreetView(panorama)

          setStreetViewAvailable(true)
          setViewMode('streetview')
          setLoadState('ready')
        }
      )
    }

    init()

    return () => {
      cancelled = true
    }
  }, [address, latitude, longitude])

  useEffect(() => {
    if (loadState !== 'ready') return

    if (viewMode === 'streetview') {
      panoramaInstanceRef.current?.setVisible(true)
    } else {
      panoramaInstanceRef.current?.setVisible(false)
    }
  }, [viewMode, loadState])

  return (
    <section aria-labelledby="property-location-heading">
      {/* Section heading row: title left, toggle right */}
      <div className="flex items-center justify-between mb-4">
        <h2
          id="property-location-heading"
          className="text-xl font-semibold text-foreground"
        >
          Property Location
        </h2>

        {/* Toggle — hidden when Street View unavailable */}
        {loadState === 'ready' && streetViewAvailable && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'streetview' ? 'default' : 'outline'}
              aria-pressed={viewMode === 'streetview'}
              onClick={() => setViewMode('streetview')}
            >
              <MapPin className="h-3.5 w-3.5 mr-1" />
              Street View
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'default' : 'outline'}
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            >
              <Map className="h-3.5 w-3.5 mr-1" />
              Map
            </Button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loadState === 'loading' && (
        <Skeleton className="h-96 w-full rounded-lg" />
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div className="h-96 w-full rounded-lg border border-border flex items-center justify-center bg-muted">
          <p className="text-sm text-muted-foreground">Unable to load map</p>
        </div>
      )}

      {/* Map container — always in DOM so refs attach during initialization */}
      <div
        ref={mapContainerRef}
        aria-label="Property location map"
        className={cn(
          'h-96 w-full rounded-lg overflow-hidden border border-border',
          loadState !== 'ready' && 'hidden'
        )}
      >
        <span className="sr-only">
          Interactive map showing property at {address}
        </span>
      </div>
    </section>
  )
}
