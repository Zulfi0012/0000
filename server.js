import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://climatewise.vercel.app', 'https://nn-orcin.vercel.app','https://climateai.online','http://climateai.online' ,'http://192.168.1.8:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    app: 'ClimateWise Backend',
    version: '1.0.0'
  });
});

// Location detection endpoint
app.get('/api/location', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // If lat/lon are available (from browser geolocation)
    if (lat && lon) {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'User-Agent': 'ClimateWise/1.0 (contact@yourdomain.com)' } }
      );
    
      if (!geoResponse.ok) {
        throw new Error('Failed to fetch reverse geolocation');
      }
    
      const geoData = await geoResponse.json();
      return res.json({
        city: geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.state || '',
        region: geoData.address?.state || '',
        country: geoData.address?.country || '',
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: geoData.address?.timezone || ''
      });
    }
    
    

    // Otherwise, fallback to IP-based detection (production only)
    const clientIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP;

    const services = [
      () => fetch(`https://ipapi.co/${ip}/json/`),
      () => fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,timezone`),
      () => fetch(`https://ipinfo.io/${ip}/json`)
    ];

    for (const service of services) {
      try {
        const response = await service();
        if (response.ok) {
          const data = await response.json();
          if (data.status !== 'fail' && (data.city || data.country)) {
            return res.json({
              city: data.city || '',
              region: data.regionName || data.region || '',
              country: data.country || data.country_name || '',
              latitude: parseFloat(data.lat || (data.loc?.split(',')[0] || 0)),
              longitude: parseFloat(data.lon || (data.loc?.split(',')[1] || 0)),
              timezone: data.timezone || ''
            });
          }
        }
      } catch (error) {
        console.warn(`IP location service failed: ${error.message}`);
      }
    }

    return res.json({ city: '', country: '', latitude: null, longitude: null, timezone: null });

  } catch (error) {
    console.error('Location detection error:', error);
    res.status(500).json({ error: 'Failed to detect location' });
  }
});



// Weather data endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const latitude = lat || 19.0760;
    const longitude = lon || 72.8777;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,weather_code&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto&forecast_days=1`;

    const response = await fetch(weatherUrl);
    const data = await response.json();

    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm2_5,pm10,us_aqi&timezone=auto`;
    const airQualityResponse = await fetch(airQualityUrl);
    const airQualityData = await airQualityResponse.json();

    // Extract AQI (use first hourly value or 0 fallback)
    const aqiValue = airQualityData?.hourly?.us_aqi?.[0] || 0;


    if (data.current) {
      const weather = {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(
          data.current.temperature_2m + (data.current.relative_humidity_2m > 70 ? 2 : -1)
        ),
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        uvIndex: data.current.uv_index || 0,
        weatherCode: data.current.weather_code,
        rainProbability: data.hourly?.precipitation_probability?.[0] || 0,
      };

      // ADD RISKS OBJECT
      const risks = {
        rain: {
          probability: weather.rainProbability,
          risk:
            weather.rainProbability > 60
              ? "high"
              : weather.rainProbability > 30
                ? "moderate"
                : "low",
          description: `Chance of rain: ${weather.rainProbability}%`,
        },
        uv: {
          index: weather.uvIndex,
          risk:
            weather.uvIndex > 8
              ? "extreme"
              : weather.uvIndex > 6
                ? "high"
                : weather.uvIndex > 3
                  ? "moderate"
                  : "low",
          description: `UV Index is ${weather.uvIndex}`,
        },
        aqi: {
          value: aqiValue,
          risk: aqiValue > 150 ? "high" : aqiValue > 100 ? "moderate" : "low",
          description: `Air Quality Index: ${aqiValue} (${aqiValue > 150 ? "Unhealthy" : aqiValue > 100 ? "Moderate" : "Good"})`,
        },
      };

      res.json({ ...weather, risks });
    } else {
      res.status(500).json({ error: 'Invalid weather data received' });
    }
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// City search endpoint
app.get('/api/search/cities/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&featuretype=city`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'ClimateWise/1.0'
      }
    });
    const data = await response.json();

    const cities = data.map(item => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));

    res.json(cities);
  } catch (error) {
    console.error('City search error:', error);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

// Weather forecast endpoint
app.get('/api/forecast', async (req, res) => {
  try {
    const { lat, lon, period = 'daily' } = req.query;
    const latitude = lat || 19.0760;
    const longitude = lon || 72.8777;

    let forecastDays = 7;
    if (period === 'weekly') forecastDays = 7;
    if (period === 'monthly') {
      forecastDays = 16;
    }
    if (period === 'yearly') {
      forecastDays = 16;
    }


    // ✅ Handle daily, weekly, and monthly forecasts
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,wind_speed_10m_max&timezone=auto&forecast_days=${forecastDays}`;

    const response = await fetch(weatherUrl);
    const data = await response.json();
    console.log(`Fetching forecast from: ${weatherUrl}`);
    console.log('Raw API response sample:', JSON.stringify(data, null, 2));


    if (data?.daily?.time) {
      const forecastData = data.daily.time.map((date, index) => ({
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[index]),
        tempMin: Math.round(data.daily.temperature_2m_min[index]),
        precipitation: data.daily.precipitation_sum[index] || 0,
        uvIndex: data.daily.uv_index_max[index] || 0,
        windSpeed: data.daily.wind_speed_10m_max[index] || 0,
      }));


      let confidence = 90;
      if (period === 'weekly') confidence = 80;
      if (period === 'monthly') confidence = 70;
      if (period === 'yearly') confidence = 60;

      return res.json({ period, data: forecastData, confidence });
    } else {
      console.warn(`⚠️ No valid data returned for ${period} forecast`);
      return res.json({ period, data: [] }); // fallback instead of 500 error
    }
  } catch (error) {
    console.error('Forecast API error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});


// AI suggestions endpoint
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { profile, weather } = req.body;

    const prompt = `
You are an AI assistant that generates **personalized, weather-aware climate suggestions**. 
Base your advice on the data below and respond ONLY in strict JSON (no extra text, no markdown).

User Profile:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Occupation: ${profile.occupation}

Current Weather:
- Temperature: ${weather.temperature}°C
- Feels Like: ${weather.feelsLike}°C
- Humidity: ${weather.humidity}%
- UV Index: ${weather.uvIndex}
- Rain Probability: ${weather.rainProbability}%
- Air Quality Index (AQI): ${weather.risks?.aqi?.value || 0}

Return exactly 3–4 suggestions in this JSON format:
[
  {
    "id": "unique-id",
    "type": "energy|health|safety|timing|general",
    "title": "Short title",
    "content": "Actionable recommendation based on weather",
    "icon": "fas fa-icon-name"
  }
]
`;

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;

    // Clean response: remove markdown wrappers if present
    content = content.replace(/```json|```/g, '').trim();

    try {
      const suggestions = JSON.parse(content);
      res.json(suggestions);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      res.json([
        {
          id: 'fallback-1',
          type: 'health',
          title: 'Stay Hydrated',
          content: 'Drink enough water due to current weather conditions.',
          icon: 'fas fa-tint'
        },
        {
          id: 'fallback-2',
          type: 'safety',
          title: 'Carry Umbrella',
          content: 'Rain probability detected, carry an umbrella if you go outside.',
          icon: 'fas fa-umbrella'
        }
      ]);
    }
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate AI suggestions' });
  }
});

// Climate insights endpoint
app.post('/api/climate/insights', async (req, res) => {
  try {
    const { location, weather, userProfile } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const prompt = `
    You are an AI climate analyst. Based on the following data, generate 3–4 JSON insights about the current climate conditions.
    Return ONLY valid JSON array.

    User Profile:
    - Age: ${userProfile?.age || 'unknown'}
    - Gender: ${userProfile?.gender || 'unknown'}
    - Occupation: ${userProfile?.occupation || 'unknown'}

    Location:
    - City: ${location.city || 'unknown'}
    - Country: ${location.country || 'unknown'}
    - Latitude: ${location.latitude}
    - Longitude: ${location.longitude}

    Current Weather:
    - Temperature: ${weather?.temperature || 0}°C
    - Feels Like: ${weather?.feelsLike || 0}°C
    - Humidity: ${weather?.humidity || 0}%
    - UV Index: ${weather?.uvIndex || 0}
    - Rain Probability: ${weather?.rainProbability || 0}%
    - Air Quality Index: ${weather?.risks?.aqi?.value || 0}

    Respond ONLY with JSON in this format:
    [
      {
        "id": "unique-id",
        "title": "Short title",
        "content": "Insight description",
        "severity": "info|warning|critical",
        "category": "temperature|precipitation|air-quality|uv|general",
        "confidence": 0-100,
        "timeframe": "time context"
      }
    ]
    `;

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content.trim();
    content = content.replace(/```json|```/g, '').trim();

    let insights;
    try {
      insights = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', error, content);
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    res.json({ insights, generated: Date.now() });

  } catch (error) {
    console.error('Climate insights error:', error);
    res.status(500).json({ error: 'Failed to generate climate insights' });
  }
});


// Climate simulator endpoint
app.post('/api/climate/simulator', async (req, res) => {
  try {
    const { input, profile, weather } = req.body;

    const prompt = `
You are an AI climate impact simulation expert.
Analyze the scenario below and provide weather-aware insights.

User Profile:
- Age: ${profile.age}
- Gender: ${profile.gender}
- Occupation: ${profile.occupation}

Current Weather:
- Temperature: ${weather.temperature}°C
- Feels Like: ${weather.feelsLike}°C
- Humidity: ${weather.humidity}%
- UV Index: ${weather.uvIndex}
- Rain Probability: ${weather.rainProbability}%
- Air Quality Index: ${weather.risks?.aqi?.value || 0}
- Wind Speed: ${weather.windSpeed} km/h

Simulation Adjustments:
- Temperature Change: ${input.temperatureChange > 0 ? '+' : ''}${input.temperatureChange}°C
- Rainfall Change: ${input.rainfallChange > 0 ? '+' : ''}${input.rainfallChange}%

Return ONLY valid JSON in this format:
{
  "impact": "Brief weather-aware impact summary",
  "recommendations": [
    "Recommendation 1 (specific to weather and simulation changes)",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "healthRisks": [
    "Health risk 1",
    "Health risk 2"
  ]
}`;

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status} ${response.statusText}`);

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content.trim();
    content = content.replace(/```json|```/g, '').trim();

    try {
      const simulation = JSON.parse(content);
      res.json(simulation);
    } catch (err) {
      console.error('Failed to parse AI response:', err, content);
      res.json({
        impact: 'Weather-aware climate simulation fallback result',
        recommendations: [
          'Stay hydrated and monitor weather changes',
          'Avoid prolonged sun exposure',
          'Adjust outdoor plans based on rainfall probability'
        ],
        healthRisks: ['Heat stress', 'UV exposure']
      });
    }
  } catch (error) {
    console.error('Climate simulator error:', error);
    res.status(500).json({ error: 'Failed to run climate simulation' });
  }
});


// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ClimateWise Backend running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not specified'}`);
});

export default app;
