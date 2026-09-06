"""
Unit and integration tests for BhuSetu Phase 1 Weather Service.
SIH 2026 Problem Statement SIH26001.

All unit tests use mocked HTTP responses to ensure tests never fail offline,
never depend on external network availability, and never consume API quota.
"""
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import json
import os
import sys

# Ensure backend path is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services import weather_service


class TestWeatherService(unittest.TestCase):

    def setUp(self):
        # Clear in-memory cache before each test
        weather_service._WEATHER_CACHE.clear()

    def test_validate_coordinates_valid(self):
        valid, coords = weather_service.validate_coordinates(25.18, 93.03)
        self.assertTrue(valid)
        self.assertEqual(coords, (25.18, 93.03))

        valid, coords = weather_service.validate_coordinates('-20.5', '140.2')
        self.assertTrue(valid)
        self.assertEqual(coords, (-20.5, 140.2))

    def test_validate_coordinates_invalid(self):
        valid, msg = weather_service.validate_coordinates(95.0, 50.0)
        self.assertFalse(valid)
        self.assertIn('Latitude', msg)

        valid, msg = weather_service.validate_coordinates(25.0, 195.0)
        self.assertFalse(valid)
        self.assertIn('Longitude', msg)

        valid, msg = weather_service.validate_coordinates('abc', 50.0)
        self.assertFalse(valid)
        self.assertIn('valid floating point', msg)

    def test_missing_api_key(self):
        with patch.dict(os.environ, {'WEATHER_API_KEY': ''}):
            result = weather_service.fetch_live_weather(25.18, 93.03)
            self.assertEqual(result['data_status'], 'UNAVAILABLE')
            self.assertEqual(result['error'], 'MISSING_API_KEY')
            self.assertIn('not configured', result['message'])

    @patch('services.weather_service._http_get_json')
    def test_weather_success_normalization(self, mock_http):
        mock_current = {
            'name': 'Haflong',
            'sys': {'country': 'IN'},
            'main': {'temp': 28.4, 'feels_like': 30.1, 'humidity': 76, 'pressure': 1008},
            'wind': {'speed': 3.5, 'deg': 120},
            'clouds': {'all': 40},
            'visibility': 10000,
            'weather': [{'main': 'Clouds', 'description': 'scattered clouds', 'icon': '03d'}],
            'rain': {'1h': 4.2}
        }
        mock_forecast = {
            'list': [
                {'rain': {'3h': 2.0}},
                {'rain': {'3h': 3.5}},
                {'rain': {'3h': 1.0}},
            ]
        }
        mock_soil = {
            'current': {'soil_moisture_0_to_1cm': 0.35, 'soil_moisture_1_to_3cm': 0.38},
            'elevation': 410.0
        }
        mock_http.side_effect = [
            (mock_current, None),
            (mock_forecast, None),
            (mock_soil, None)
        ]

        with patch.dict(os.environ, {'WEATHER_API_KEY': 'test_mock_key_123'}):
            res = weather_service.fetch_live_weather(25.18, 93.03)

        self.assertEqual(res['data_status'], 'LIVE')
        self.assertIn('OpenWeather API', res['source'])
        self.assertEqual(res['location']['name'], 'Haflong')
        self.assertEqual(res['location']['country'], 'IN')
        self.assertEqual(res['weather']['temperature'], 28.4)
        self.assertEqual(res['weather']['humidity'], 76)
        self.assertEqual(res['weather']['rainfall_1h'], 4.2)
        self.assertEqual(res['weather']['rainfall_forecast_24h'], 6.5)
        self.assertEqual(res['weather']['soil_moisture'], 35.0)

        # Verify field status tagging
        self.assertEqual(res['field_status']['temperature'], 'LIVE')
        self.assertEqual(res['field_status']['humidity'], 'LIVE')
        self.assertEqual(res['field_status']['rainfall_1h'], 'LIVE')
        self.assertEqual(res['field_status']['rainfall_forecast_24h'], 'DERIVED')
        self.assertEqual(res['field_status']['soil_moisture'], 'LIVE')
        self.assertEqual(res['field_status']['elevation'], 'LIVE')
        self.assertEqual(res['field_status']['ml_landslide_prediction'], 'NOT AVAILABLE YET')

        # Verify ML feature vector structure
        ml_vec = res['ml_feature_vector']
        self.assertEqual(ml_vec['temperature_c'], 28.4)
        self.assertEqual(ml_vec['humidity_pct'], 76)
        self.assertEqual(ml_vec['rainfall_1h_mm'], 4.2)
        self.assertEqual(ml_vec['antecedent_soil_moisture'], 35.0)
        self.assertEqual(ml_vec['elevation_m'], 410.0)

    @patch('services.weather_service._http_get_json')
    def test_caching_behavior(self, mock_http):
        mock_current = {'name': 'Gangtok', 'sys': {'country': 'IN'}, 'main': {'temp': 18.0, 'humidity': 85}, 'weather': [{'main': 'Rain'}], 'rain': {'1h': 5.0}}
        mock_forecast = {'list': []}
        mock_soil = {'current': {'soil_moisture_0_to_1cm': 0.28}}
        mock_http.side_effect = [
            (mock_current, None),
            (mock_forecast, None),
            (mock_soil, None)
        ]

        with patch.dict(os.environ, {'WEATHER_API_KEY': 'test_key'}):
            res1 = weather_service.fetch_live_weather(27.33, 88.61)
            self.assertFalse(res1['cached'])

            # Second call should hit cache and not call _http_get_json again
            res2 = weather_service.fetch_live_weather(27.33, 88.61)
            self.assertTrue(res2['cached'])
            self.assertEqual(mock_http.call_count, 3)

    @patch('services.weather_service._http_get_json')
    def test_external_api_failure_handling(self, mock_http):
        mock_http.return_value = (None, 'HTTP 503: Service Unavailable')

        with patch.dict(os.environ, {'WEATHER_API_KEY': 'test_key'}):
            res = weather_service.fetch_live_weather(25.18, 93.03)

        self.assertEqual(res['data_status'], 'UNAVAILABLE')
        self.assertEqual(res['error'], 'EXTERNAL_API_ERROR')
        self.assertIn('503', res['message'])
        self.assertNotIn('temperature', res.get('weather', {}))

    def test_url_sanitization(self):
        raw_url = 'https://api.openweathermap.org/data/2.5/weather?lat=25.18&lon=93.03&appid=secret_api_key_12345&units=metric'
        clean = weather_service.sanitize_url_for_logging(raw_url)
        self.assertNotIn('secret_api_key_12345', clean)
        self.assertIn('[REDACTED]', clean)


if __name__ == '__main__':
    unittest.main()
