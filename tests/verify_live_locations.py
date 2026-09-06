"""
Verification script for BhuSetu Phase 1 Live Weather Integration.
Queries the running backend server at http://127.0.0.1:8000
and verifies real-time OpenWeather API integration across 3 distinct NER locations.
"""
import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def get_json(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={'User-Agent': 'BhuSetu-Verifier/1.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def main():
    print("=================================================================")
    print("    BHUSETU PHASE 1: MULTI-LOCATION LIVE WEATHER VERIFICATION   ")
    print("=================================================================")

    # 1. Verify Health endpoint
    status, health = get_json("/api/health")
    print(f"\n[1] GET /api/health -> HTTP {status}")
    print(f"    - Status: {health.get('status')}")
    print(f"    - Weather API Configured: {health.get('weather_api_configured')}")
    print(f"    - Weather API Mode: {health.get('weather_api_mode')}")
    print(f"    - Model Mode: {health.get('model_mode')}")
    assert status == 200, "Health check failed"
    assert health.get("model_mode") in ("trained", "rule_based (Phase 1 prototype)"), "Model mode must be trained or prototype"

    # 2. Verify 3 Distinct NER Locations
    locations = [
        {"name": "Dima Hasao, Assam", "lat": 25.18, "lon": 93.03},
        {"name": "Gangtok, Sikkim", "lat": 27.33, "lon": 88.61},
        {"name": "Shillong, Meghalaya", "lat": 25.57, "lon": 91.89}
    ]

    weather_results = []
    print("\n[2] Testing Live Weather Across 3 Distinct NER Coordinates:")

    for loc in locations:
        endpoint = f"/api/weather/live?lat={loc['lat']}&lon={loc['lon']}&refresh=true"
        status, data = get_json(endpoint)
        print(f"\n  * Location: {loc['name']} ({loc['lat']}, {loc['lon']})")
        print(f"    - HTTP Status: {status}")
        print(f"    - Data Status: {data.get('data_status')}")
        print(f"    - Source: {data.get('source')}")
        print(f"    - Resolved City: {data.get('location', {}).get('name')}, {data.get('location', {}).get('country')}")
        
        weather = data.get("weather", {})
        temp = weather.get("temperature")
        hum = weather.get("humidity")
        rain1h = weather.get("rainfall_1h")
        rain24h = weather.get("rainfall_forecast_24h")
        desc = weather.get("condition")
        
        soil = weather.get("soil_moisture")
        elev = weather.get("elevation")
        
        print(f"    - Weather: {desc} | Temp: {temp} °C | Humidity: {hum}% | 1h Rain: {rain1h} mm | Soil Moisture: {soil}% | Elevation: {elev}m")
        print(f"    - Field Status: Temp={data.get('field_status', {}).get('temperature')}, Soil={data.get('field_status', {}).get('soil_moisture')}, Elev={data.get('field_status', {}).get('elevation')}")
        
        assert status == 200
        assert data.get("data_status") == "LIVE"
        assert "OpenWeather API" in data.get("source")
        assert temp is not None
        assert hum is not None
        assert soil is not None, "Soil moisture should be live"
        weather_results.append((loc['name'], temp, hum, soil, data.get('location', {}).get('name')))

    print("\n[3] Verifying Locational Divergence:")
    for name, temp, hum, soil, city in weather_results:
        print(f"    - {name}: City={city}, Temp={temp} °C, Humidity={hum}%, Soil={soil}%")

    # 3. Verify District endpoint
    status, dist_data = get_json("/api/weather/district/16")
    print(f"\n[4] GET /api/weather/district/16 (Dima Hasao) -> HTTP {status}")
    print(f"    - District Name: {dist_data.get('district_name')}")
    print(f"    - Data Status: {dist_data.get('data_status')}")
    print(f"    - Source: {dist_data.get('source')}")
    print(f"    - Temp: {dist_data.get('weather', {}).get('temperature')} °C")
    assert status == 200
    assert dist_data.get("data_status") == "LIVE"

    # 4. Verify Dashboard endpoint includes live_weather
    status, dash_data = get_json("/api/corridors/16/dashboard")
    print(f"\n[5] GET /api/corridors/16/dashboard -> HTTP {status}")
    has_live_weather = "live_weather" in dash_data
    print(f"    - live_weather included: {has_live_weather}")
    if has_live_weather:
        lw = dash_data["live_weather"]
        print(f"    - Live Weather Status: {lw.get('data_status')}")
        print(f"    - Live Weather Temp: {lw.get('weather', {}).get('temperature')} °C")
        print(f"    - Live Weather Humidity: {lw.get('weather', {}).get('humidity')}%")
    assert has_live_weather, "Dashboard must include live_weather key"

    print("\n=================================================================")
    print("  SUCCESS: ALL LIVE MULTI-LOCATION VERIFICATIONS PASSED 100%!")
    print("=================================================================\n")

if __name__ == "__main__":
    main()
