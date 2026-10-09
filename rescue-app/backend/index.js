const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data store for hackathon demo
const journeys = {};

// Hardcoded local urban risk zones (incidents)
const mockIncidents = [
  { id: 1, title: 'Unlit Alleyway / Low Surveillance', lat: 29.9650, lng: 76.8750 },
  { id: 2, title: 'Reported Harassment Zone', lat: 29.9720, lng: 76.8820 },
];

// Helper to calculate risk index
function calculateRisk(routeDeviationScore, audioAnomalyScore) {
  // 40% weight to GPS deviation, 60% weight to Audio anomalies
  const combined = Math.round(routeDeviationScore * 0.4 + audioAnomalyScore * 0.6);
  return Math.min(combined, 100);
}

// 1. Fetch Local Urban Incidents
app.get('/api/incidents', (req, res) => {
  res.json(mockIncidents);
});

// 2. Start Journey Endpoint
app.post('/api/v1/journey/start', (req, res) => {
  const { userId, startLocationName, destinationName, startLocation, plannedWaypoints, emergencyContacts } = req.body;
  const journeyId = `j_${Date.now()}`;

  journeys[journeyId] = {
    journeyId,
    userId,
    startLocationName,
    destinationName,
    startLocation,
    plannedWaypoints,
    emergencyContacts: emergencyContacts || [],
    routeDeviationScore: 0,
    audioAnomalyScore: 0,
    combinedRiskScore: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  console.log(`[NIRVAA Engine] Journey started: ${journeyId} for ${startLocationName} ➔ ${destinationName}`);

  res.json({
    message: 'Journey successfully started',
    journeyId,
    contactsCount: journeys[journeyId].emergencyContacts.length,
  });
});

// 3. Audio Anomaly Telemetry Endpoint
app.post('/api/v1/telemetry/audio', (req, res) => {
  const { journeyId, distressScore } = req.body;

  if (!journeyId || !journeys[journeyId]) {
    return res.status(404).json({ error: 'Journey session not found' });
  }

  const journey = journeys[journeyId];
  journey.audioAnomalyScore = Math.round(distressScore * 100);
  journey.combinedRiskScore = calculateRisk(journey.routeDeviationScore, journey.audioAnomalyScore);

  const triggerSafetyCheck = journey.combinedRiskScore >= 50;

  console.log(`[Audio Telemetry] Journey: ${journeyId} | Audio Score: ${journey.audioAnomalyScore}% | Combined Risk: ${journey.combinedRiskScore}%`);

  res.json({
    routeDeviationScore: journey.routeDeviationScore,
    audioAnomalyScore: journey.audioAnomalyScore,
    combinedRiskScore: journey.combinedRiskScore,
    triggerSafetyCheck,
  });
});

// 4. Location / Route Deviation Telemetry Endpoint
app.post('/api/v1/telemetry/location', (req, res) => {
  const { journeyId } = req.body;

  if (!journeyId || !journeys[journeyId]) {
    return res.status(404).json({ error: 'Journey session not found' });
  }

  const journey = journeys[journeyId];
  journey.routeDeviationScore = 85;
  journey.combinedRiskScore = calculateRisk(journey.routeDeviationScore, journey.audioAnomalyScore);

  const triggerSafetyCheck = journey.combinedRiskScore >= 50;

  console.log(`[GPS Telemetry] Journey: ${journeyId} | Deviation Score: ${journey.routeDeviationScore}% | Combined Risk: ${journey.combinedRiskScore}%`);

  res.json({
    routeDeviationScore: journey.routeDeviationScore,
    audioAnomalyScore: journey.audioAnomalyScore,
    combinedRiskScore: journey.combinedRiskScore,
    triggerSafetyCheck,
  });
});

// 5. Safety Verification Check-In Response Endpoint
app.post('/api/v1/journey/checkin', (req, res) => {
  const { journeyId, status } = req.body;

  if (!journeyId || !journeys[journeyId]) {
    return res.status(404).json({ error: 'Journey session not found' });
  }

  const journey = journeys[journeyId];

  if (status === 'safe') {
    journey.routeDeviationScore = 0;
    journey.audioAnomalyScore = 0;
    journey.combinedRiskScore = 0;
    console.log(`[Check-In] Journey ${journeyId}: User confirmed SAFE.`);

    return res.json({
      action: 'CLEARED',
      message: 'Safety verified. Risk scores reset to normal.',
    });
  } else {
    journey.status = 'EMERGENCY_DISPATCHED';
    console.log(`[Check-In] Journey ${journeyId}: ESCALATING EMERGENCY to contacts:`, journey.emergencyContacts);

    console.log(`--------------------------------------------------`);
    console.log(`🚨 [NIRVAA EMERGENCY DISPATCH PAYLOAD]`);
    console.log(`Recipient Contacts: ${journey.emergencyContacts.join(', ')}`);
    console.log(`ALERT: User in distress at start location: ${journey.startLocationName}`);
    console.log(`Coordinates: Lat ${journey.startLocation.latitude}, Lng ${journey.startLocation.longitude}`);
    console.log(`--------------------------------------------------`);

    return res.json({
      action: 'ESCALATE_EMERGENCY',
      message: `🚨 Emergency dispatch activated! Alerts sent to: ${journey.emergencyContacts.join(', ')}`,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 NIRVAA Multi-Signal Backend running on http://localhost:${PORT}`);
});