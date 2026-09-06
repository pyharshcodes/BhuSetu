# 🚀 BhuSetu (भूसेतु) Deployment Guide

यह गाइड आपको BhuSetu (NER Landslide Early Warning System) को इंटरनेट पर लाइव डिप्लॉय करने के सभी आसान तरीक़े बताती है।

---

## 🌟 आर्किटेक्चर (Single-Service Architecture)
BhuSetu एक **यूनिफाइड आर्किटेक्चर** पर बना है:
- **एक ही सर्वर** पर बैकएंड APIs, Leaflet मैप, डायनेमिक डैशबोर्ड UI और Calibrated XGBoost ML मॉडल रन होते हैं।
- अलग-अलग फ्रंटएंड और बैकएंड डिप्लॉय करने की आवश्यकता नहीं है।
- **WSGI Production Server**: Gunicorn (`backend.app:app`).

---

## 🏆 तरीका 1: Render.com पर डिप्लॉय करें (अनुशंसित — 100% फ्री एवं स्थायी 24/7 HTTPS लिंक)

Render.com पर आपको हमेशा के लिए एक फ्री पब्लिक HTTPS डोमेन (जैसे: `https://bhusetu-ews.onrender.com`) मिलता है।

### चरण 1: प्रोजेक्ट को GitHub पर अपलोड करें
अपने टर्मिनल / PowerShell में यह कमांड्स चलाएं:
```powershell
cd C:\Users\harsh\Desktop\NER_Landslide_EWS_Project

# Git इनिशियलाइज़ करें
git init
git add .
git commit -m "feat: initial commit with validated ML and deployment config"

# GitHub पर अपनी नई रिपॉजिटरी से कनेक्ट करें (GitHub पर जाकर New Repository बनाएं):
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

### चरण 2: Render.com पर वेब सर्विस बनाएं
1. [https://render.com](https://render.com) पर जाएं और अपने GitHub अकाउंट से Sign In / Sign Up करें।
2. डैशबोर्ड पर **New +** बटन पर क्लिक करें और **Web Service** चुनें।
3. **Build and deploy from a Git repository** चुनें और अपनी `bhusetu` रिपॉजिटरी को कनेक्ट करें।

### चरण 3: सेटिंग्स भरें
| फ़ील्ड | वैल्यू |
| :--- | :--- |
| **Name** | `bhusetu-ews` (या अपनी पसंद का नाम) |
| **Region** | `Singapore (Southeast Asia)` (भारत के निकटतम) |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn --workers=2 --threads=4 --timeout=120 --bind 0.0.0.0:$PORT backend.app:app` |
| **Instance Type** | `Free` (0.1 CPU, 512 MB RAM) |

### चरण 4: Environment Variables (पर्यावरण चर) जोड़ें
**Advanced** -> **Add Environment Variable** पर क्लिक करें और ये वैल्यूज जोड़ें:
- `WEATHER_API_KEY`: `your_openweathermap_api_key`
- `AI_PROVIDER`: `groq`
- `GROQ_API_KEY`: `your_groq_cloud_api_key`
- `GROQ_MODEL`: `qwen/qwen3.8-27b`

### चरण 5: Deploy
**Create Web Service** पर क्लिक करें। 
2 से 3 मिनट में आपकी वेबसाइट लाइव हो जाएगी और आपको एक लिंक मिलेगा:
🔗 `https://bhusetu-ews.onrender.com`

---

## ⚡ तरीका 2: Instant 1-Minute Live Tunnel (बिना GitHub के तुरंत लाइव लिंक)

यदि आपको तुरंत अपने मोबाइल फ़ोन या किसी अन्य व्यक्ति को लाइव ऐप दिखाना है, तो बिना कोई अकाउंट बनाए सीधे अपने कंप्यूटर से लाइव लिंक बना सकते हैं:

### विकल्प A: Localhost.run (Windows में पहले से इनबिल्ट SSH द्वारा)
जब आपका बैकएंड स्थानीय रूप से चल रहा हो (`http://localhost:8000`):
एक नया PowerShell खोलें और यह कमांड चलाएं:
```powershell
ssh -R 80:localhost:8000 localhost.run
```
टर्मिनल में आपको तुरंत एक फ्री पब्लिक HTTPS लिंक (जैसे `https://abc123xyz.lhr.life`) मिल जाएगा जिसे आप अपने फ़ोन पर भी खोल सकते हैं!

### विकल्प B: Cloudflare Tunnel (आधिकारिक एवं सुरक्षित)
1. Cloudflared डाउनलोड करें:
   `winget install --id Cloudflare.cloudflared`
2. टनल स्टार्ट करें:
   `cloudflared tunnel --url http://localhost:8000`
3. आपको तुरंत एक `https://....trycloudflare.com` लाइव URL मिल जाएगा।

---

## 🐳 तरीका 3: Docker कंटेनर में चलाएं

प्रोजेक्ट में पहले से ही प्रोडक्शन-ग्रेड `Dockerfile` शामिल है:

```bash
# डॉकर इमेज बनाएं
docker build -t bhusetu-ews .

# कंटेनर रन करें
docker run -d -p 8000:8000 \
  -e WEATHER_API_KEY="your_openweathermap_api_key" \
  -e GROQ_API_KEY="your_groq_api_key" \
  --name bhusetu_app bhusetu-ews
```
ब्राउज़र में खोलें: `http://localhost:8000`

---

## 📋 रिपॉजिटरी में शामिल डिप्लॉयमेंट फाइल्स:
1. `requirements.txt`: प्रोडक्शन पैकेज (`Flask`, `gunicorn`, `scikit-learn`, `xgboost`, `requests`).
2. `Procfile`: Render / Railway / Heroku के लिए ऑटो स्टार्ट निर्देश।
3. `render.yaml`: Render 1-क्लिक इन्फ्रास्ट्रक्चर ब्लूप्रिंट।
4. `Dockerfile` & `.dockerignore`: लाइटवेट Python 3.11-slim कंटेनर कॉन्फ़िग।
5. `backend/app.py`: डायनेमिक `$PORT` बाइंडिंग और प्रोडक्शन WSGI सपोर्ट।
