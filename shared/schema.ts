import { z } from "zod";

export const userProfileSchema = z.object({
  age: z.string(),
  gender: z.string(),
  occupation: z.string(),
});

export const locationSchema = z.object({
  city: z.string(),
  country: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const weatherDataSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  uvIndex: z.number(),
  rainProbability: z.number(),
  windSpeed: z.number(),
  pressure: z.number(),
  visibility: z.number(),
});

export const climateRiskSchema = z.object({
  temperature: z.object({
    value: z.number(),
    risk: z.enum(['low', 'moderate', 'high', 'extreme']),
    description: z.string(),
  }),
  rain: z.object({
    probability: z.number(),
    risk: z.enum(['low', 'moderate', 'high', 'extreme']),
    description: z.string(),
  }),
  uv: z.object({
    index: z.number(),
    risk: z.enum(['low', 'moderate', 'high', 'extreme']),
    description: z.string(),
  }),
  aqi: z.object({
    value: z.number(),
    risk: z.enum(['low', 'moderate', 'high', 'extreme']),
    description: z.string(),
  }),
});

export const aiSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(['energy', 'health', 'safety', 'timing', 'general']),
  title: z.string(),
  content: z.string(),
  icon: z.string(),
});

export const forecastDataSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  data: z.array(z.object({
    date: z.string(),
    temperature: z.number(),
    description: z.string(),
  })),
  confidence: z.number(),
});

export const simulationInputSchema = z.object({
  temperatureChange: z.number().min(-20).max(20),
  rainfallChange: z.number().min(-50).max(50),
});

export const simulationResultSchema = z.object({
  impact: z.string(),
  recommendations: z.array(z.string()),
  healthRisks: z.array(z.string()),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type Location = z.infer<typeof locationSchema>;
export type WeatherData = z.infer<typeof weatherDataSchema>;
export type ClimateRisk = z.infer<typeof climateRiskSchema>;
export type AISuggestion = z.infer<typeof aiSuggestionSchema>;
export type ForecastData = z.infer<typeof forecastDataSchema>;
export type SimulationInput = z.infer<typeof simulationInputSchema>;
export type SimulationResult = z.infer<typeof simulationResultSchema>;
