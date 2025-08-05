# 🌍 ClimateWise Backend - Render Deployment

## Overview

This is the backend API for ClimateWise, built with Node.js and Express. This package is optimized for deployment on Render with full API functionality for climate intelligence.

### ✨ Features

- **RESTful API** - Comprehensive climate and weather API endpoints
- **AI Integration** - Groq API for climate recommendations and simulations
- **Weather Data** - Real-time weather from Open-Meteo API
- **Location Services** - IP-based location detection with multiple providers
- **City Search** - OpenStreetMap Nominatim integration
- **CORS Configured** - Ready for cross-origin requests from frontend

## 🚀 Quick Deployment to Render

### Method 1: Deploy via GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/climatewise-backend.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Visit [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure settings (see below)
   - Set environment variables
   - Deploy!

### Method 2: Deploy via Render.yaml

The project includes a `render.yaml` file for automatic configuration:

1. **Connect Repository** on Render
2. **Select Blueprint** deployment
3. **Render will auto-configure** from render.yaml
4. **Set Environment Variables** (see below)

### Method 3: Manual Configuration

**Render Dashboard Settings**:
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 18+ (auto-detected from package.json)

## ⚙️ Environment Configuration

### Required Environment Variables

Set these in your Render dashboard under Environment:

```env
NODE_ENV=production
GROQ_API_KEY=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
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Optional Environment Variables

```env
PORT=5000                    # Auto-set by Render
DATABASE_URL=your_db_url     # If adding database features
```

### Development Environment

For local development, create a `.env` file:

```env
NODE_ENV=development
PORT=5000
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:3000
```

## 🔌 API Endpoints

### Health & Status

```http
GET /api/health
```
Returns API health status and version information.

### Location Services

```http
GET /api/location
```
Detects user location based on IP address using multiple geolocation providers.

### Weather Data

```http
GET /api/weather?lat={latitude}&lon={longitude}
```
Returns current weather conditions for specified coordinates.

**Parameters**:
- `lat` (number): Latitude coordinate
- `lon` (number): Longitude coordinate

**Response**:
```json
{
  "weather": {
    "temperature": 25,
    "feelsLike": 28,
    "humidity": 65,
    "uvIndex": 6,
    "rainProbability": 20,
    "windSpeed": 10
  }
}
```

### Weather Forecast

```http
GET /api/forecast?lat={lat}&lon={lon}&period={period}
```
Returns weather forecast for specified period.

**Parameters**:
- `lat` (number): Latitude coordinate
- `lon` (number): Longitude coordinate
- `period` (string): `daily`, `weekly`, `monthly`, or `yearly`

### City Search

```http
GET /api/search/cities/{query}
```
Searches for cities worldwide using OpenStreetMap Nominatim.

**Parameters**:
- `query` (string): City name or partial name

### AI Services

#### AI Suggestions

```http
POST /api/ai/suggestions
Content-Type: application/json

{
  "profile": {
    "age": "30",
    "gender": "male",
    "occupation": "engineer"
  },
  "weather": {
    "temperature": 25,
    "uvIndex": 6,
    "humidity": 65,
    "rainProbability": 20
  }
}
```

Returns personalized climate recommendations based on user profile and weather conditions.

#### Climate Simulator

```http
POST /api/climate/simulator
Content-Type: application/json

{
  "input": {
    "temperatureChange": 2,
    "rainfallChange": -10
  },
  "profile": {
    "age": "30",
    "occupation": "engineer"
  },
  "weather": {
    "temperature": 25,
    "uvIndex": 6,
    "humidity": 65
  }
}
```

Simulates climate changes and provides impact analysis and recommendations.

### Climate Insights

```http
POST /api/climate/insights
Content-Type: application/json

{
  "location": {
    "city": "Mumbai",
    "country": "India"
  },
  "weather": {
    "temperature": 25
  },
  "userProfile": {
    "age": "30"
  }
}
```

Generates ML-powered climate insights and trend analysis.

## 🔧 Configuration

### CORS Setup

The backend is configured for cross-origin requests from your frontend:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://climatewise.vercel.app'],
  credentials: true
}));
```

### API Rate Limiting

Consider adding rate limiting for production:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

### Request Logging

The server includes request logging for API endpoints. Logs include:
- HTTP method and path
- Response status code
- Response time
- Truncated response body for debugging

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

### API Testing

Test endpoints using curl or your preferred API client:

```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Get weather data
curl "https://your-backend.onrender.com/api/weather?lat=19.0760&lon=72.8777"

# Test AI suggestions
curl -X POST https://your-backend.onrender.com/api/ai/suggestions \
  -H "Content-Type: application/json" \
  -d '{"profile":{"age":"30","gender":"male","occupation":"engineer"},"weather":{"temperature":25,"uvIndex":6,"humidity":65,"rainProbability":20}}'
```

## 🔐 Security

### Environment Variables

- Never commit API keys to version control
- Use Render's secure environment variable storage
- Rotate API keys regularly
- Use `.env.example` for documentation only

### API Security

The backend includes:
- Input validation and sanitization
- Error handling without sensitive information exposure
- CORS configuration for trusted origins
- Request size limits (10MB)

### Groq API Security

- API key is securely stored in environment variables
- Requests include proper authentication headers
- Error responses don't expose API key information

## 📊 Monitoring

### Health Checks

Render automatically monitors the `/api/health` endpoint for uptime checks.

### Logging

All API requests are logged with:
- Timestamp
- HTTP method and path
- Response status and time
- Response body (truncated for security)

### Error Tracking

Consider integrating error tracking:
- Sentry for error monitoring
- DataDog for performance monitoring
- Custom logging for business metrics

## 🚨 Troubleshooting

### Common Issues

**1. Deployment Failures**
```bash
# Check build logs in Render dashboard
# Ensure package.json scripts are correct
# Verify Node.js version compatibility
```

**2. API Connection Issues**
```bash
# Test health endpoint
curl https://your-backend.onrender.com/api/health

# Check CORS configuration
# Verify frontend URL in environment variables
```

**3. Groq API Errors**
```bash
# Verify API key is set correctly
# Check API key permissions and limits
# Monitor Groq API status
```

**4. Memory Issues**
```bash
# Monitor memory usage in Render dashboard
# Consider upgrading to higher memory plan
# Optimize API response sizes
```

### Performance Optimization

**1. Response Caching**
```javascript
// Add response caching for weather data
const cache = new Map();
app.get('/api/weather', (req, res) => {
  const key = `${req.query.lat},${req.query.lon}`;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }
  // ... fetch and cache response
});
```

**2. Request Optimization**
- Implement request batching
- Add response compression
- Use connection pooling for external APIs

## 🔄 Updates and Maintenance

### Dependency Updates

```bash
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### API Monitoring

Set up monitoring for:
- Response times
- Error rates
- API usage patterns
- External API dependencies

### Backup and Recovery

For production applications:
- Regular database backups (if using database)
- Environment variable backups
- Deployment rollback procedures

## 📈 Scaling

### Horizontal Scaling

Render supports automatic scaling:
- Configure auto-scaling in dashboard
- Monitor performance metrics
- Set appropriate memory limits

### Database Integration

To add database functionality:

```javascript
// Add to package.json
"drizzle-orm": "^0.39.1",
"@neondatabase/serverless": "^0.10.4"

// Add to server.js
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
```

## 📞 Support

For deployment issues:
1. Check [Render Documentation](https://render.com/docs)
2. Review deployment logs in Render dashboard
3. Test API endpoints individually
4. Contact Render support for platform issues

### Useful Render Commands

```bash
# View service logs
render logs --service your-service-id

# Scale service
render scale --service your-service-id --num-instances 2
```

---

**🌍 ClimateWise Backend** - Reliable Node.js API for climate intelligence