<template>
  <div class="lmap-wrap">
    <div class="lmap-header">
      <span>Transit Route</span>
      <span v-if="distance" class="lmap-dist">{{ distance }}</span>
    </div>

    <div class="lmap-body">
      <div ref="mapEl" class="lmap-el" />

      <div v-if="status !== 'ready'" class="lmap-overlay">
        <span v-if="status === 'loading'">Loading map...</span>
        <span v-else-if="status === 'error'">Failed to load route</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  origin: string
  destination: string
}>()

const config = useRuntimeConfig()
const apiKey = config.public.googleMapsApiKey

const mapEl = ref<HTMLDivElement | null>(null)
const distance = ref('')
const status = ref<'loading' | 'ready' | 'error'>('loading')

let map: google.maps.Map | null = null
let directionsRenderer: google.maps.DirectionsRenderer | null = null

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function buildMap() {
  if (!mapEl.value || !props.origin || !props.destination) return

  try {
    status.value = 'loading'

    await loadGoogleMaps()

    if (!map) {
      map = new google.maps.Map(mapEl.value, {
        center: { lat: 43.45, lng: -80.49 },
        zoom: 7
      })

      directionsRenderer = new google.maps.DirectionsRenderer({
        map
      })
    }

    const service = new google.maps.DirectionsService()

    const res = await service.route({
      origin: props.origin,
      destination: props.destination,
      travelMode: google.maps.TravelMode.DRIVING
    })

    directionsRenderer?.setDirections(res)

    const leg = res.routes[0].legs[0]
    distance.value = leg.distance?.text || ''

    status.value = 'ready'
  } catch (e) {
    console.error(e)
    status.value = 'error'
  }
}

onMounted(buildMap)

watch(() => [props.origin, props.destination], buildMap)
</script>

<style scoped>
.lmap-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #222;
}

.lmap-header {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  font-size: 12px;
  background: #111;
  color: #aaa;
}

.lmap-dist {
  color: #f59e0b;
  font-weight: bold;
}

.lmap-body {
  position: relative;
  height: 300px;
}

.lmap-el {
  width: 100%;
  height: 100%;
}

.lmap-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
</style>