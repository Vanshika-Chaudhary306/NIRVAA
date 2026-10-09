import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure you have this image in your project, or replace the path
import coverImage from './assets/cover.png';

// --- CONFIGURATION & MAP ICONS ---
const MAP_TILES = {
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', 
};

const defaultUserIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const createEmojiIcon = (emoji, bg) => L.divIcon({
  html: `<div style="background-color: ${bg}; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2px solid white;">${emoji}</div>`,
  className: 'custom-emoji-pin',
  iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15]
});

const icons = {
  danger: createEmojiIcon('⚠️', '#ef4444'),
  light: createEmojiIcon('💡', '#f59e0b'),
  police: createEmojiIcon('👮', '#14b8a6')
};

// --- SLEEK SVG ICONS FOR BOTTOM NAV ---
const NavIcon = ({ name, color, size = 22 }) => {
  const svgProps = { xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { transition: 'stroke 0.2s' }};
  switch (name) {
    case 'route': return <svg {...svgProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
    case 'guard': return <svg {...svgProps}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
    case 'report': return <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case 'call': return <svg {...svgProps}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case 'tools': return <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default: return null;
  }
};

// --- HELPER FUNCTIONS ---
const calculateRouteEta = (coords) => {
  if (!coords || coords.length < 2) return { distanceKm: 0, durationMins: 0 };
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i]; const [lat2, lon2] = coords[i + 1];
    const R = 6371; const dLat = ((lat2 - lat1) * Math.PI) / 180; const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); totalDist += R * c;
  }
  return { distanceKm: totalDist.toFixed(1), durationMins: Math.max(1, Math.round((totalDist / 25) * 60)) };
};

// Calculate distance between two lat/lng points in kilometers using Haversine formula
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
};

// Universal live query to OpenStreetMap Overpass API for nearest police station anywhere on Earth
const fetchNearestPoliceStation = async (lat, lng, callback) => {
  try {
    const radius = 10000; // Search within 10km radius
    const query = `[out:json];node(around:${radius},${lat},${lng})[amenity=police];out body;`;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    const data = await response.json();

    if (data && data.elements && data.elements.length > 0) {
      let nearest = data.elements[0];
      let minDist = Infinity;

      data.elements.forEach(el => {
        const dist = getDistanceFromLatLonInKm(lat, lng, el.lat, el.lon);
        if (dist < minDist) {
          minDist = dist;
          nearest = el;
        }
      });

      const stationName = nearest.tags.name || nearest.tags['name:en'] || 'Local Police Station';
      const phoneNum = nearest.tags['contact:phone'] || nearest.tags.phone || 'Emergency: 112 / 911';

      callback({
        name: stationName,
        distance: minDist.toFixed(1) + ' km',
        phone: phoneNum
      });
    } else {
      // Fallback if no tagged police station is within 10km
      callback({
        name: 'Regional Emergency Dispatch',
        distance: 'Nearby',
        phone: 'Emergency: 112 / 911'
      });
    }
  } catch (err) {
    console.error('Failed to fetch police station from Overpass API', err);
    callback({
      name: 'Local Police Authority',
      distance: 'Active',
      phone: 'Emergency: 112 / 911'
    });
  }
};

const generateDynamicZones = (centerLat, centerLng) => [
  { id: 'zone_safe', name: 'Central Commercial Corridor', safetyScore: 88, color: '#14b8a6', coordinates: [[centerLat + 0.003, centerLng - 0.004], [centerLat + 0.007, centerLng + 0.002], [centerLat + 0.002, centerLng + 0.006], [centerLat - 0.002, centerLng - 0.001]] },
  { id: 'zone_moderate', name: 'Residential Sub-Sector', safetyScore: 58, color: '#f59e0b', coordinates: [[centerLat - 0.003, centerLng - 0.007], [centerLat + 0.001, centerLng - 0.003], [centerLat - 0.005, centerLng + 0.001], [centerLat - 0.008, centerLng - 0.004]] },
  { id: 'zone_risk', name: 'Low Surveillance Zone', safetyScore: 28, color: '#ef4444', coordinates: [[centerLat + 0.005, centerLng + 0.004], [centerLat + 0.009, centerLng + 0.008], [centerLat + 0.004, centerLng + 0.012], [centerLat + 0.001, centerLng + 0.007]] },
];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]);
  return debouncedValue;
}

function useShakeToSOS(isActive, onShake) {
  useEffect(() => {
    if (!isActive || !('DeviceMotionEvent' in window)) return;
    const handleMotion = (event) => {
      if (!event.acceleration) return;
      const { x, y, z } = event.acceleration;
      if (Math.sqrt(x * x + y * y + z * z) > 20) onShake(); 
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isActive, onShake]);
}

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [themeMode, setThemeMode] = useState('dark');
  const isDark = themeMode === 'dark';
  
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // Location & Routing
  const [userLocation, setUserLocation] = useState([28.6139, 77.2090]); // Default fallback (e.g., New Delhi)
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [routeEtaInfo, setRouteEtaInfo] = useState({ distanceKm: 0, durationMins: 0 });
  const [startInput, setStartInput] = useState('');
  const debouncedStartInput = useDebounce(startInput, 500);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [destInput, setDestInput] = useState('');
  const debouncedDestInput = useDebounce(destInput, 500);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  
  // Emergency Setup
  const [emergencyContacts, setEmergencyContacts] = useState('Mom (+91 9876543210)');
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [tempContacts, setTempContacts] = useState(emergencyContacts);
  
  const [nearestPolice, setNearestPolice] = useState({ 
    name: 'Locating nearest police...', 
    distance: '', 
    phone: 'Fetching...' 
  });

  // Community
  const [communityPins, setCommunityPins] = useState([
    { id: 1, lat: 28.615, lng: 77.211, type: 'light', label: 'Broken Streetlight' },
    { id: 2, lat: 28.611, lng: 77.207, type: 'danger', label: 'Suspicious Group Reported' }
  ]);
  const [showReportModal, setShowReportModal] = useState(false);

  // Safety State
  const [neighborhoodZones, setNeighborhoodZones] = useState([]);
  const [activeJourneyId, setActiveJourneyId] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // --- AUDIO REFS AND STATE ---
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [audioThreshold, setAudioThreshold] = useState(350);
  const audioThresholdRef = useRef(audioThreshold);
  
  const highVolumeFramesRef = useRef(0);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const lastTriggerTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  const showCheckInModalRef = useRef(showCheckInModal);
  const emergencyActiveRef = useRef(emergencyActive);

  // --- OFFLINE SIMULATOR STATE ---
  const [isOffline, setIsOffline] = useState(false);
  const queuedSOSRef = useRef(false);

  useEffect(() => { showCheckInModalRef.current = showCheckInModal; }, [showCheckInModal]);
  useEffect(() => { emergencyActiveRef.current = emergencyActive; }, [emergencyActive]);
  useEffect(() => { audioThresholdRef.current = audioThreshold; }, [audioThreshold]);

  const alarmIntervalRef = useRef(null);
  const vibrateIntervalRef = useRef(null);
  const alarmAudioCtxRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      if (queuedSOSRef.current) {
        setEmergencyActive(true);
        startAlarmAndVibration();
        alert("📶 Signal Restored! Queued Offline SOS payload has been transmitted automatically.");
        queuedSOSRef.current = false;
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const playIOSChimeNote = () => {
    try {
      if (!alarmAudioCtxRef.current) alarmAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = alarmAudioCtxRef.current; if (ctx.state === 'suspended') ctx.resume();
      [659.25, 830.61].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.1; gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.4);
      });
    } catch (e) {}
  };

  const startAlarmAndVibration = () => {
    if (!alarmIntervalRef.current) { playIOSChimeNote(); alarmIntervalRef.current = setInterval(playIOSChimeNote, 750); }
    if ('vibrate' in navigator && !vibrateIntervalRef.current) vibrateIntervalRef.current = setInterval(() => navigator.vibrate([500, 200, 500]), 1500);
  };

  const stopAlarmAndVibration = () => {
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if (vibrateIntervalRef.current) clearInterval(vibrateIntervalRef.current);
    if ('vibrate' in navigator) navigator.vibrate(0);
    alarmIntervalRef.current = null; vibrateIntervalRef.current = null;
  };

  const triggerSafetyModal = useCallback(() => {
    if (showCheckInModalRef.current || emergencyActiveRef.current) return;
    setCountdown(30);
    setShowCheckInModal(true);
    startAlarmAndVibration();
  }, []);

  useShakeToSOS(activeJourneyId !== null, triggerSafetyModal);

  useEffect(() => {
    let covertTimer;
    if (emergencyActive) {
      covertTimer = setTimeout(() => {
        setEmergencyActive(false);
        stopAlarmAndVibration();
      }, 6000);
    }
    return () => clearTimeout(covertTimer);
  }, [emergencyActive]);

  const simulateLocationDeviation = () => {
    setUserLocation([userLocation[0] + 0.012, userLocation[1] + 0.015]);
    setActiveDrawer(null);
    triggerSafetyModal();
  };

  const simulateVolumeTrigger = () => {
    setAudioVolume(500); 
    triggerSafetyModal();
    setTimeout(() => setAudioVolume(0), 1000);
    setActiveDrawer(null);
  };

  const toggleDeadZone = () => {
    if (isOffline) {
      setIsOffline(false);
      if (queuedSOSRef.current) {
        setEmergencyActive(true);
        startAlarmAndVibration();
        alert("📶 Signal Restored! Queued Offline SOS payload has been transmitted automatically.");
        queuedSOSRef.current = false;
      }
    } else {
      setIsOffline(true);
    }
    setActiveDrawer(null);
  };

  const startMicMonitoring = async (jId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setIsMicActive(true);
      highVolumeFramesRef.current = 0;

      const analyzeAudio = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let maxPeak = 0;
        for (let i = 4; i < bufferLength; i++) {
          if (dataArray[i] > maxPeak) maxPeak = dataArray[i];
        }

        setAudioVolume(maxPeak);
        const now = Date.now();

        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          const width = canvasRef.current.width;
          const height = canvasRef.current.height;
          ctx.clearRect(0, 0, width, height);

          const barWidth = (width / bufferLength) * 2;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            ctx.fillStyle = maxPeak >= audioThresholdRef.current ? '#ef4444' : '#14b8a6';
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }

        if (maxPeak >= audioThresholdRef.current) {
          highVolumeFramesRef.current += 1;
        } else {
          highVolumeFramesRef.current = 0;
        }

        if (
          highVolumeFramesRef.current > 15 &&
          now - lastTriggerTimeRef.current > 4000 &&
          !showCheckInModalRef.current &&
          !emergencyActiveRef.current
        ) {
          lastTriggerTimeRef.current = now;
          highVolumeFramesRef.current = 0;
          triggerSafetyModal();
        }

        animFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();
    } catch (err) {
      console.warn('Microphone permission denied', err);
    }
  };

  const updateLocationContext = (lat, lng) => {
    setUserLocation([lat, lng]);
    setNeighborhoodZones(generateDynamicZones(lat, lng));
    fetchNearestPoliceStation(lat, lng, (stationInfo) => {
      setNearestPolice(stationInfo);
    });
  };

  useEffect(() => { 
    if (debouncedStartInput.length > 2) {
      const fetchGeocoding = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedStartInput)}&limit=5`);
          setStartSuggestions(await res.json() || []); 
          setShowStartSuggestions(true);
        } catch (err) { console.error(err); }
      };
      fetchGeocoding();
    }
  }, [debouncedStartInput]);

  useEffect(() => { 
    if (debouncedDestInput.length > 2) {
      const fetchDestGeocoding = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedDestInput)}&limit=5`);
          setDestSuggestions(await res.json() || []); 
          setShowDestSuggestions(true);
        } catch (err) { console.error(err); }
      };
      fetchDestGeocoding();
    }
  }, [debouncedDestInput]);

  const fetchCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateLocationContext(lat, lng);
        setStartInput(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      () => {}, { enableHighAccuracy: true }
    );
  };
  
  useEffect(() => { 
    updateLocationContext(userLocation[0], userLocation[1]);
  }, []);

  useEffect(() => {
    let timer;
    if (showCheckInModal && countdown > 0) timer = setInterval(() => setCountdown(c => c - 1), 1000);
    else if (showCheckInModal && countdown === 0) respondCheckIn('danger'); 
    return () => clearInterval(timer);
  }, [showCheckInModal, countdown]);

  const startJourney = () => {
    if (!destinationCoords) return alert('Set valid Destination');
    const route = [userLocation, [(userLocation[0] + destinationCoords[0])/2, (userLocation[1] + destinationCoords[1])/2], destinationCoords];
    setPlannedRoute(route); setRouteEtaInfo(calculateRouteEta(route));
    setActiveDrawer(null); 
    const jId = 'journey_' + Date.now();
    setActiveJourneyId(jId);
    
    startMicMonitoring(jId);
  };
  
  const resetJourney = () => {
    stopAlarmAndVibration(); 
    setActiveJourneyId(null); 
    setIsMicActive(false);

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

    setPlannedRoute([]); setRouteEtaInfo({ distanceKm: 0, durationMins: 0 });
    setShowCheckInModal(false); setEmergencyActive(false); queuedSOSRef.current = false;
  };

  const respondCheckIn = (status) => {
    setShowCheckInModal(false);
    if (status === 'safe') {
      stopAlarmAndVibration();
    } else {
      if (isOffline) {
        queuedSOSRef.current = true;
        startAlarmAndVibration();
        alert("No cellular network detected! SOS Payload queued. Broadcast will fire immediately upon reconnecting to network.");
      } else {
        setEmergencyActive(true);
        startAlarmAndVibration();
      }
    }
  };

  const handleReportEvent = (type, label) => {
    setCommunityPins(prev => [...prev, { id: Date.now(), lat: userLocation[0], lng: userLocation[1], type, label }]);
    setShowReportModal(false);
    alert(`Thank you! "${label}" added to the community map at your location.`);
  };

  const topOffset = isOffline ? 45 : 20;

  return (
    <div style={{
      width: '100vw', height: '100vh', backgroundColor: '#020617', 
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <style>
        {`
          .app-frame {
            position: relative; width: 100%; height: 100%; overflow: hidden;
            font-family: 'Inter', system-ui, sans-serif; background: #000;
          }
          .blinking-dot {
            width: 10px; height: 10px; border-radius: 50%; display: inline-block;
            animation: blink 1s infinite; margin-right: 8px;
          }
          .solid-dot {
            width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px;
          }
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .mobile-sidebar {
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @media (min-width: 500px) {
            .app-frame {
              max-width: 400px; max-height: 850px; border-radius: 40px;
              border: 10px solid #1e293b; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            }
            .offline-banner-top {
              border-top-left-radius: 30px;
              border-top-right-radius: 30px;
            }
          }
        `}
      </style>

      {/* --- MOBILE APP FRAME --- */}
      <div className="app-frame">
        {currentScreen === 'splash' ? (
          <div style={styles.splashContainer}>
            <img src={coverImage} alt="NIRVAA Cover" style={styles.fullscreenImage} />
            <button onClick={() => setCurrentScreen('app')} style={styles.translucentBtn}>ENTER</button>
          </div>
        ) : (
          <>
            {isOffline && (
              <div className="offline-banner-top" style={styles.offlineBanner}>
                ⚠️ CELLULAR DEAD ZONE DETECTED - Offline Fallback Active
              </div>
            )}

            {/* MAP LAYER */}
            <MapContainer center={userLocation} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
              <TileLayer key={themeMode} url={isDark ? MAP_TILES.dark : MAP_TILES.light} />
              <MapRecenter center={userLocation} />

              {plannedRoute.length > 0 && (
                <>
                  <Polyline positions={plannedRoute} color="#14b8a6" weight={12} opacity={0.3} />
                  <Polyline positions={plannedRoute} color="#14b8a6" weight={5} opacity={1} />
                </>
              )}
              
              <Marker position={userLocation} icon={defaultUserIcon}><Popup><strong>Start</strong></Popup></Marker>
              {destinationCoords && <Marker position={destinationCoords} icon={defaultUserIcon}><Popup><strong>Destination</strong></Popup></Marker>}

              {neighborhoodZones.map(zone => (
                <Polygon key={zone.id} positions={zone.coordinates} pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.15, weight: 1.5 }}>
                  <Tooltip sticky><strong>{zone.name}</strong></Tooltip>
                </Polygon>
              ))}

              {communityPins.map(pin => (
                <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={icons[pin.type]}>
                  <Popup><strong>Community Report</strong><br/>{pin.label}</Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* HAMBURGER MENU BUTTON */}
            <div onClick={() => setIsSidebarOpen(true)} style={{...styles.hamburgerBtn, top: topOffset}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? "#fff" : "#000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </div>

            {/* MOBILE SIDEBAR OVERLAY */}
            {isSidebarOpen && (
              <div style={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                <div className="mobile-sidebar" style={styles.sidebarContent(isDark)} onClick={e => e.stopPropagation()}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                    <h2 style={{margin: 0, fontSize: '1.4rem', color: '#14b8a6', display: 'flex', alignItems: 'center', gap: 8}}>
                      <NavIcon name="guard" color="#14b8a6" size={24} /> Safety Controls
                    </h2>
                    <button onClick={() => setIsSidebarOpen(false)} style={styles.closeSidebarBtn(isDark)}>✕</button>
                  </div>
                  
                  {/* System Status Card */}
                  <div style={styles.dashboardCard(isDark)}>
                    <div style={styles.cardHeader}>System Status</div>
                    {emergencyActive ? (
                      <div style={{color: '#ef4444', fontWeight: 'bold', fontSize: '0.95rem'}}>
                        <span className="blinking-dot" style={{backgroundColor: '#ef4444'}}></span> SOS DISPATCHED
                      </div>
                    ) : isOffline ? (
                      <div style={{color: '#f59e0b', fontWeight: 'bold', fontSize: '0.95rem'}}>
                        <span className="solid-dot" style={{backgroundColor: '#f59e0b'}}></span> DEVICE OFFLINE
                      </div>
                    ) : (
                      <div style={{color: '#22c55e', fontWeight: 'bold', fontSize: '0.95rem'}}>
                        <span className="solid-dot" style={{backgroundColor: '#22c55e'}}></span> USER SECURE
                      </div>
                    )}
                  </div>

                  {/* EDITABLE Contacts Card */}
                  <div style={styles.dashboardCard(isDark)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{...styles.cardHeader, marginBottom: 0}}>Emergency Contacts</div>
                      {!isEditingContacts ? (
                        <button onClick={() => { setTempContacts(emergencyContacts); setIsEditingContacts(true); }} style={styles.editBtn}>✏️ Edit</button>
                      ) : (
                        <button onClick={() => { setEmergencyContacts(tempContacts); setIsEditingContacts(false); }} style={styles.saveBtn}>✅ Save</button>
                      )}
                    </div>
                    
                    {isEditingContacts ? (
                      <input 
                        value={tempContacts} 
                        onChange={(e) => setTempContacts(e.target.value)} 
                        style={{...styles.input(isDark), padding: '8px', fontSize: '0.85rem'}} 
                        placeholder="Add multiple contacts..."
                        autoFocus
                      />
                    ) : (
                      <>
                        <div style={{fontSize: '0.95rem', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: '600', marginBottom: 4}}>📞 {emergencyContacts}</div>
                        <div style={{fontSize: '0.75rem', color: '#14b8a6'}}>✅ Verified & Active</div>
                      </>
                    )}
                  </div>

                  {/* Police Station Card with Universal Live Data */}
                  <div style={styles.dashboardCard(isDark)}>
                    <div style={styles.cardHeader}>Nearest Police Dispatch</div>
                    <div style={{fontSize: '0.95rem', color: isDark ? '#f8fafc' : '#0f172a', fontWeight: '600', marginBottom: 2}}>🚓 {nearestPolice.name} {nearestPolice.distance ? `(${nearestPolice.distance})` : ''}</div>
                    <div style={{fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', marginBottom: 4}}>📞 {nearestPolice.phone}</div>
                  </div>

                </div>
              </div>
            )}

            {/* TOP HEADER ETA */}
            {plannedRoute.length > 0 && (
              <div style={{...styles.topHeader(isDark), top: topOffset + 50}}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#14b8a6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Safe Route</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: '900', color: isDark ? '#fff' : '#111' }}>{routeEtaInfo.durationMins} <span style={{fontSize: '1rem'}}>min</span></span>
                  <span style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b' }}>{routeEtaInfo.distanceKm} km remaining</span>
                </div>
                <button onClick={resetJourney} style={styles.cancelBtn}>End</button>
              </div>
            )}

            {/* COVERT SOS BANNER */}
            {emergencyActive && (
              <div style={{...styles.emergencyBanner, top: topOffset + 50}}>
                <div style={{flex: 1, textAlign: 'center'}}>
                   <div style={{fontSize: '0.9rem', fontWeight: '900', letterSpacing: 1, marginBottom: 4}}>🚨 SOS DISPATCHED</div>
                </div>
              </div>
            )}

            {/* BOTTOM SHEET DRAWERS */}
            {activeDrawer && (
              <div style={styles.bottomSheet(isDark)}>
                {activeDrawer === 'route' && (
                  <>
                    <h3 style={styles.sheetTitle(isDark)}>Where to?</h3>
                    <div style={styles.inputGroup}>
                      <label style={styles.label(isDark)}>Start <button onClick={() => { if(navigator.vibrate) navigator.vibrate(50); fetchCurrentLocation(); }} style={styles.locBtn}>Live GPS</button></label>
                      <input 
                        value={startInput} 
                        onChange={e => setStartInput(e.target.value)} 
                        style={styles.input(isDark)} 
                        placeholder="Enter starting point or use Live GPS..."
                      />
                      {showStartSuggestions && <ul style={styles.autoList(isDark)}>{startSuggestions.map(s => <li key={s.place_id} onClick={() => { setStartInput(s.display_name); updateLocationContext(parseFloat(s.lat), parseFloat(s.lon)); setShowStartSuggestions(false); }} style={styles.autoItem(isDark)}>{s.display_name}</li>)}</ul>}
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label(isDark)}>Destination</label>
                      <input value={destInput} onChange={e => setDestInput(e.target.value)} style={styles.input(isDark)} placeholder="Enter safe destination..." />
                      {showDestSuggestions && <ul style={styles.autoList(isDark)}>{destSuggestions.map(s => <li key={s.place_id} onClick={() => { setDestInput(s.display_name); setDestinationCoords([parseFloat(s.lat), parseFloat(s.lon)]); setShowDestSuggestions(false); }} style={styles.autoItem(isDark)}>{s.display_name}</li>)}</ul>}
                    </div>
                    <button onClick={() => { if(navigator.vibrate) navigator.vibrate(50); startJourney(); }} style={{...styles.primaryBtn, marginTop: 10}}>Start Safe Navigation</button>
                  </>
                )}

                {activeDrawer === 'audio' && (
                  <>
                    <h3 style={styles.sheetTitle(isDark)}>Audio Guard</h3>
                    <p style={{fontSize: '0.8rem', color: '#888', marginBottom: 15}}>Silently triggers SOS if a scream or impact is detected.</p>
                    <canvas ref={canvasRef} width={300} height={60} style={{ backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderRadius: 12, width: '100%', marginBottom: 15 }} />
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: isDark ? '#cbd5e1' : '#475569', marginBottom: 5}}>
                      <span>Peak Level: {audioVolume}</span>
                      <span>Trigger: {audioThreshold}</span>
                    </div>
                    <input type="range" min="50" max="500" value={audioThreshold} onChange={e => setAudioThreshold(Number(e.target.value))} style={{ width: '100%' }} />
                  </>
                )}

                {activeDrawer === 'sim' && (
                  <>
                    <h3 style={styles.sheetTitle(isDark)}>Simulators</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15}}>
                      <button onClick={simulateLocationDeviation} style={styles.simBtn('#ef4444')}>📍 Simulate Route Deviation</button>
                      <button onClick={simulateVolumeTrigger} style={styles.simBtn('#f59e0b')}>🎙️ Simulate Scream Trigger</button>
                      <button onClick={toggleDeadZone} style={styles.simBtn('#3b82f6')}>{isOffline ? '📡 Restore Cellular Network' : '⚠️ Toggle Cellular Dead Zone'}</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BOTTOM NAVIGATION BAR */}
            <div style={styles.bottomNav(isDark)}>
              <button onClick={() => setActiveDrawer(d => d === 'route' ? null : 'route')} style={styles.navBtn}>
                <NavIcon name="route" color={activeDrawer === 'route' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b')} />
                <span style={{fontSize: '0.65rem', color: activeDrawer === 'route' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b'), fontWeight: 'bold', marginTop: 3}}>Route</span>
              </button>

              <button onClick={() => setActiveDrawer(d => d === 'audio' ? null : 'audio')} style={styles.navBtn}>
                <NavIcon name="guard" color={activeDrawer === 'audio' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b')} />
                <span style={{fontSize: '0.65rem', color: activeDrawer === 'audio' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b'), fontWeight: 'bold', marginTop: 3}}>Guard</span>
              </button>

              <button onClick={() => setShowReportModal(true)} style={styles.navBtn}>
                <NavIcon name="report" color={isDark ? '#94a3b8' : '#64748b'} />
                <span style={{fontSize: '0.65rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold', marginTop: 3}}>Report</span>
              </button>

             

              <button onClick={() => setActiveDrawer(d => d === 'sim' ? null : 'sim')} style={styles.navBtn}>
                <NavIcon name="tools" color={activeDrawer === 'sim' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b')} />
                <span style={{fontSize: '0.65rem', color: activeDrawer === 'sim' ? '#14b8a6' : (isDark ? '#94a3b8' : '#64748b'), fontWeight: 'bold', marginTop: 3}}>Sim</span>
              </button>
            </div>

            {/* MODALS */}
            {showReportModal && (
              <div style={styles.modalBg} onClick={() => setShowReportModal(false)}>
                <div style={{...styles.modalContent, background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000'}} onClick={e => e.stopPropagation()}>
                  <h3 style={{margin: '0 0 10px 0'}}>📢 Crowdsource Report</h3>
                  <p style={{fontSize: '0.85rem', color: '#888', marginBottom: 20}}>Drop a safety pin at your exact current location.</p>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    <button onClick={() => handleReportEvent('danger', 'Suspicious Activity')} style={styles.reportBtn('#ef4444')}>⚠️ Suspicious Activity</button>
                    <button onClick={() => handleReportEvent('light', 'Broken Streetlight')} style={styles.reportBtn('#f59e0b')}>💡 Broken Streetlight</button>
                    <button onClick={() => handleReportEvent('police', 'Police Presence')} style={styles.reportBtn('#14b8a6')}>👮 Police Presence</button>
                  </div>
                </div>
              </div>
            )}

          
            {/* SAFETY CHECK MODAL */}
            {showCheckInModal && (
              <div style={styles.modalBg}>
                <div style={styles.safetyModalContainer}>
                  <h2 style={styles.safetyHeaderTitle}>
                    ⚠️ SAFETY CHECK
                  </h2>
                  <p style={styles.safetyHeaderSubtitle}>
                    Unusual activity detected. Are you safe?
                  </p>

                  <div style={styles.dispatchBox}>
                    <div style={styles.dispatchHeader}>AUTO-DISPATCHING TO:</div>
                    <div style={styles.dispatchItem}>
                      📞 <strong>{emergencyContacts}</strong>
                    </div>
                    <div style={styles.dispatchItem}>
                      🚓 <strong>{nearestPolice.name}</strong>
                    </div>
                  </div>

                  <div style={styles.countdownRingOutline}>
                    <span>{countdown}s</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
                    <button onClick={() => respondCheckIn('safe')} style={styles.fullWidthSafeBtn}>
                      ✅ I'm Safe
                    </button>
                    <button onClick={() => respondCheckIn('danger')} style={styles.fullWidthAlertBtn}>
                      🚨 Alert Police & Contacts
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- STYLES ---
const styles = {
  splashContainer: { position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' },
  fullscreenImage: { width: '100%', height: '100%', objectFit: 'cover' },
  translucentBtn: { position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: '#fff', padding: '16px 48px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.4)', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' },
  
  offlineBanner: { position: 'absolute', top: 0, left: 0, right: 0, background: '#ef4444', color: '#fff', textAlign: 'center', padding: '8px', zIndex: 3000, fontWeight: 'bold', fontSize: '0.75rem' },
  
  hamburgerBtn: { position: 'absolute', left: 20, zIndex: 2000, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  
  sidebarOverlay: { position: 'absolute', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex' },
  sidebarContent: (isDark) => ({ width: '80%', height: '100%', background: isDark ? '#020617' : '#fff', padding: '25px 20px', boxSizing: 'border-box', overflowY: 'auto' }),
  closeSidebarBtn: (isDark) => ({ background: 'none', border: 'none', fontSize: '1.2rem', color: isDark ? '#fff' : '#000', cursor: 'pointer' }),
  
  dashboardCard: (isDark) => ({ background: isDark ? '#0f172a' : '#f8fafc', borderRadius: 16, padding: 15, marginBottom: 15, border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }),
  cardHeader: { fontSize: '0.75rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
  editBtn: { background: 'none', border: 'none', color: '#14b8a6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
  saveBtn: { background: 'none', border: 'none', color: '#22c55e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },

  topHeader: (isDark) => ({ position: 'absolute', left: 20, right: 20, zIndex: 2000, background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', padding: '15px 20px', borderRadius: 20, backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }),
  cancelBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' },

  emergencyBanner: { position: 'absolute', left: 20, right: 20, zIndex: 3000, background: '#ef4444', color: '#fff', padding: '14px', borderRadius: 20, display: 'flex', alignItems: 'center', boxShadow: '0 10px 30px rgba(239,68,68,0.5)' },

  bottomSheet: (isDark) => ({ position: 'absolute', bottom: 70, left: 0, right: 0, zIndex: 2000, background: isDark ? '#020617' : '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 25, boxShadow: '0 -10px 40px rgba(0,0,0,0.4)', borderTop: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }),
  sheetTitle: (isDark) => ({ margin: '0 0 15px 0', fontSize: '1.2rem', color: isDark ? '#fff' : '#000' }),
  inputGroup: { marginBottom: 12 },
  label: (isDark) => ({ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }),
  input: (isDark) => ({ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${isDark ? '#1e293b' : '#cbd5e1'}`, background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#fff' : '#000', boxSizing: 'border-box', outline: 'none' }),
  locBtn: { background: 'none', border: 'none', color: '#14b8a6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
  
  autoList: (isDark) => ({ listStyle: 'none', padding: 0, margin: '4px 0 0 0', background: isDark ? '#0f172a' : '#fff', borderRadius: 8, maxHeight: 120, overflowY: 'auto', border: `1px solid ${isDark ? '#1e293b' : '#cbd5e1'}` }),
  autoItem: (isDark) => ({ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', color: isDark ? '#e2e8f0' : '#1e293b', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }),

  primaryBtn: { width: '100%', background: '#14b8a6', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' },

  bottomNav: (isDark) => ({ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2000, height: 65, background: isDark ? 'rgba(2,6,23,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }),
  navBtn: { background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '20%' },

  modalBg: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modalContent: { padding: 25, borderRadius: 24, textAlign: 'center', maxWidth: 300, width: '100%' },
  reportBtn: (bg) => ({ width: '100%', background: bg, color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', paddingLeft: 15 }),

  fakeCallBg: { position: 'absolute', inset: 0, background: '#000', color: '#fff', zIndex: 6000, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12vh' },
  callBtn: (bg) => ({ background: bg, border: 'none', borderRadius: '50%', width: 70, height: 70, fontSize: '1.8rem', cursor: 'pointer', boxShadow: `0 0 20px ${bg}80` }),

  simBtn: (bg) => ({ width: '100%', background: bg, color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', paddingLeft: 15 }),

  safetyModalContainer: {
    background: '#0b1120',
    border: '2px solid #ef4444',
    borderRadius: 24,
    padding: '24px 20px',
    textAlign: 'center',
    maxWidth: 320,
    width: '100%',
    boxShadow: '0 0 35px rgba(239, 68, 68, 0.35)',
    boxSizing: 'border-box'
  },
  safetyHeaderTitle: {
    color: '#ef4444',
    fontSize: '1.35rem',
    fontWeight: '900',
    margin: '0 0 8px 0',
    letterSpacing: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  safetyHeaderSubtitle: {
    fontSize: '0.85rem',
    color: '#e2e8f0',
    margin: '0 0 16px 0',
    fontWeight: '500'
  },
  dispatchBox: {
    background: '#161c2e',
    border: '1px solid #2d3748',
    borderRadius: 14,
    padding: '12px 14px',
    textAlign: 'left',
    marginBottom: 20
  },
  dispatchHeader: {
    fontSize: '0.65rem',
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  dispatchItem: {
    fontSize: '0.82rem',
    color: '#f8fafc',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  countdownRingOutline: {
    margin: '10px auto',
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: '4px solid #f59e0b',
    background: '#0b1120',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.9rem',
    fontWeight: '900',
    boxShadow: '0 0 15px rgba(245, 158, 11, 0.25)'
  },
  fullWidthSafeBtn: {
    width: '100%',
    background: '#22c55e',
    color: '#ffffff',
    border: 'none',
    padding: '14px',
    borderRadius: 30,
    fontWeight: '800',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
  },
  fullWidthAlertBtn: {
    width: '100%',
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '14px',
    borderRadius: 30,
    fontWeight: '800',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
  }
};