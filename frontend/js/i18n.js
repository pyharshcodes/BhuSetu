/**
 * BhuSetu EWS — Vernacular Language Switcher Engine (i18n)
 * Supports: English ('en'), Hindi ('hi'), Assamese ('as')
 * Team Bits & Bytes (IIT Guwahati) — SIH26001
 */

const TRANSLATIONS = {
  "en": {
    "brand.title": "BhuSetu",
    "brand.subtitle": "Safer Hills, Stronger Communities",
    "search.placeholder": "Search district, village or corridor...",
    "mode.simulated": "Simulated",
    "mode.live": "Live",
    "mode.offline": "Offline",
    "btn.light": "Light",
    "btn.dark": "Dark",
    "btn.low_bw": "Low-BW",
    "user.hello": "Hello, Harsh",
    "user.team": "Team SIH26001",
    "nav.overview": "SYSTEM OVERVIEW",
    "nav.dashboard": "Operational Command Center",
    "nav.map": "Geospatial Risk Map",
    "nav.weather": "Doppler & Meteorological Radar",
    "nav.analytics": "ANALYTICS & INTELLIGENCE",
    "nav.alerts": "Critical Alert Feed",
    "nav.analysis": "Corridor Risk Analytics",
    "nav.suraksha": "Suraksha Setu",
    "nav.explain": "AI XAI Explainability",
    "nav.emergency": "EMERGENCY OPERATIONS",
    "nav.resources": "Disaster Response Resources",
    "nav.reports": "Citizen Incident Reporting",
    "nav.community": "Community Preparedness",
    "nav.settings": "System Administration",
    "risk.red": "RED ALERT (High Risk)",
    "risk.orange": "ORANGE WARNING",
    "risk.yellow": "YELLOW WATCH",
    "risk.green": "GREEN NORMAL",
    "kpi.monitored_corridors": "Monitored Corridors",
    "kpi.high_risk_zones": "High Risk Corridors",
    "kpi.max_rainfall": "24h Max Rainfall",
    "kpi.avg_soil": "Avg Soil Saturation",
    "kpi.readiness": "Disaster Readiness",
    "kpi.active_alerts": "Active Early Warnings",
    "action.download_sitrep": "Official SitRep PDF",
    "action.low_bw_sos": "112 Offline SOS",
    "action.sound_siren": "Audio Alert Siren",
    "action.stop_siren": "Stop Siren",
    "action.simulate_blockage": "Simulate Route Blockage",
    "action.reset_route": "Reset Primary Route",
    "action.panic_sos": "I AM TRAPPED / SEND RESCUE",
    "action.send_sos_beacon": "Broadcast Live Panic Beacon",
    "action.cancel": "Cancel",
    "action.refresh": "Refresh Live Data",
    "action.export": "Export Report",
    "panic.title": "EMERGENCY RESCUE DISPATCH INITIATED",
    "panic.subtitle": "Your live GPS coordinates have been transmitted to State Disaster Operations (SDMA) and NDRF.",
    "panic.coords": "Captured Coordinates",
    "panic.ticket_id": "Rescue Incident Ticket",
    "panic.direct_helpline": "1-Tap Emergency Helplines",
    "panic.national_112": "National Emergency: 112",
    "panic.state_1070": "State Disaster Control: 1070",
    "panic.district_1077": "District EOC: 1077",
    "radar.layer_title": "Doppler Weather Radar Overlay",
    "radar.toggle_radar": "Doppler Radar",
    "radar.toggle_clouds": "Cloud Satellite",
    "radar.opacity": "Radar Opacity",
    "radar.live_source": "Live Source: RainViewer Global Radar Composite",
    "state.all": "All 8 NER States",
    "corridor.select": "Select Critical Corridor...",
    "footer.slogan": "Prepared Today · Safer Tomorrow",
    "footer.gov": "Ministry of Earth Sciences · Government of India"
  },
  "hi": {
    "brand.title": "भूसेतु",
    "brand.subtitle": "सुरक्षित पहाड़, सशक्त समुदाय",
    "search.placeholder": "जिला, गांव या कॉरिडोर खोजें...",
    "mode.simulated": "सिम्युलेटेड",
    "mode.live": "लाइव",
    "mode.offline": "ऑफ़लाइन",
    "btn.light": "लाइट",
    "btn.dark": "डार्क",
    "btn.low_bw": "कम बैंडविड्थ",
    "user.hello": "नमस्ते, हर्ष",
    "user.team": "टीम SIH26001",
    "nav.overview": "सिस्टम अवलोकन",
    "nav.dashboard": "ऑपरेशनल कमांड सेंटर",
    "nav.map": "भू-स्थानिक जोखिम मानचित्र",
    "nav.weather": "डॉप्लर और मौसम रडार",
    "nav.analytics": "विश्लेषण और बुद्धिमत्ता",
    "nav.alerts": "गंभीर चेतावनी फीड",
    "nav.analysis": "कॉरिडोर जोखिम विश्लेषण",
    "nav.suraksha": "सुरक्षा सेतु",
    "nav.explain": "एआई स्पष्टीकरण (XAI)",
    "nav.emergency": "आपातकालीन संचालन",
    "nav.resources": "आपदा प्रतिक्रिया संसाधन",
    "nav.reports": "नागरिक घटना रिपोर्टिंग",
    "nav.community": "सामुदायिक आपदा तैयारी",
    "nav.settings": "सिस्टम प्रशासन",
    "risk.red": "लाल चेतावनी (उच्च जोखिम)",
    "risk.orange": "नारंगी चेतावनी (मध्यम)",
    "risk.yellow": "पीली सतर्कता (निगरानी)",
    "risk.green": "हरा सामान्य (सुरक्षित)",
    "kpi.monitored_corridors": "निगरानी किए गए कॉरिडोर",
    "kpi.high_risk_zones": "उच्च जोखिम कॉरिडोर",
    "kpi.max_rainfall": "24 घंटे की अधिकतम वर्षा",
    "kpi.avg_soil": "औसत मिट्टी संतृप्ति",
    "kpi.readiness": "आपदा तैयारी तत्परता",
    "kpi.active_alerts": "सक्रिय पूर्व चेतावनियाँ",
    "action.download_sitrep": "सरकारी सिटरैप पीडीएफ",
    "action.low_bw_sos": "112 ऑफ़लाइन एसओएस",
    "action.sound_siren": "ऑडियो चेतावनी सायरन",
    "action.stop_siren": "सायरन बंद करें",
    "action.simulate_blockage": "मार्ग अवरोध सिमुलेशन",
    "action.reset_route": "प्राथमिक मार्ग रीसेट करें",
    "action.panic_sos": "मैं फंसा हुआ हूँ / बचाव दल भेजें",
    "action.send_sos_beacon": "लाइव पैनिक बीकन प्रसारित करें",
    "action.cancel": "रद्द करें",
    "action.refresh": "लाइव डेटा रीफ्रेश करें",
    "action.export": "रिपोर्ट निर्यात करें",
    "panic.title": "आपातकालीन बचाव अभियान सक्रिय",
    "panic.subtitle": "आपके लाइव जीपीएस निर्देशांक राज्य आपदा संचालन (SDMA) और NDRF को प्रेषित कर दिए गए हैं।",
    "panic.coords": "प्राप्त जीपीएस निर्देशांक",
    "panic.ticket_id": "बचाव घटना संदर्भ",
    "panic.direct_helpline": "1-टैप आपातकालीन हेल्पलाइन",
    "panic.national_112": "राष्ट्रीय आपातकाल: 112",
    "panic.state_1070": "राज्य आपदा नियंत्रण: 1070",
    "panic.district_1077": "जिला आपातकालीन केंद्र: 1077",
    "radar.layer_title": "डॉप्लर मौसम रडार ओवरले",
    "radar.toggle_radar": "डॉप्लर रडार",
    "radar.toggle_clouds": "क्लाउड सैटेलाइट",
    "radar.opacity": "रडार पारदर्शिता",
    "radar.live_source": "लाइव स्रोत: रैनव्यूअर ग्लोबल कम्पोजिट",
    "state.all": "पूर्वोत्तर के सभी 8 राज्य",
    "corridor.select": "महत्वपूर्ण कॉरिडोर चुनें...",
    "footer.slogan": "आज तैयार · कल सुरक्षित",
    "footer.gov": "पृथ्वी विज्ञान मंत्रालय · भारत सरकार"
  },
  "as": {
    "brand.title": "ভূসেতু",
    "brand.subtitle": "সুৰক্ষিত পাহাৰ, শক্তিশালী সম্প্ৰদায়",
    "search.placeholder": "জিলা, গাঁও বা কৰিডৰ সন্ধান কৰক...",
    "mode.simulated": "অনুকৰণ কৰা",
    "mode.live": "লাইভ",
    "mode.offline": "অফলাইন",
    "btn.light": "লাইট",
    "btn.dark": "ডাৰ্ক",
    "btn.low_bw": "কম বেণ্ডউইথ",
    "user.hello": "নমস্কাৰ, হৰ্ষ",
    "user.team": "দল SIH26001",
    "nav.overview": "ব্যৱস্থাৰ অৱলোকন",
    "nav.dashboard": "অপাৰেশ্যনেল কমাণ্ড চেণ্টাৰ",
    "nav.map": "ভূ-স্থানিক ঝুঁকি মেপ",
    "nav.weather": "ডপলাৰ আৰু বতৰ ৰাডাৰ",
    "nav.analytics": "বিশ্লেষণ আৰু তথ্য",
    "nav.alerts": "গুৰুতৰ সতৰ্কবাণী ফিড",
    "nav.analysis": "কৰিডৰ ঝুঁকি বিশ্লেষণ",
    "nav.suraksha": "সুৰক্ষা সেতু",
    "nav.explain": "AI ব্যাখ্যাযোগ্যতা (XAI)",
    "nav.emergency": "জৰুৰীকালীন কাৰ্যকলাপ",
    "nav.resources": "দুৰ্যোগ সঁহাৰি সম্পদ",
    "nav.reports": "নাগৰিক ঘটনা প্ৰতিবেদন",
    "nav.community": "সম্প্ৰদায় দুৰ্যোগ প্ৰস্তুতি",
    "nav.settings": "ব্যৱস্থা প্ৰশাসন",
    "risk.red": "ৰঙা সতৰ্কবাণী (উচ্চ ঝুঁকি)",
    "risk.orange": "কমলা সতৰ্কবাণী (মধ্যম)",
    "risk.yellow": "হালধীয়া সতৰ্কতা (নজৰদাৰী)",
    "risk.green": "সেউজীয়া স্বাভাৱিক (সুৰক্ষিত)",
    "kpi.monitored_corridors": "নজৰ ৰখা কৰিডৰসমূহ",
    "kpi.high_risk_zones": "উচ্চ ঝুঁকিৰ কৰিডৰ",
    "kpi.max_rainfall": "২৪ ঘণ্টাৰ সৰ্বোচ্চ বৰষুণ",
    "kpi.avg_soil": "গড় মাটিৰ সংপৃক্ততা",
    "kpi.readiness": "দুৰ্যোগ প্ৰস্তুতিৰ তৎপৰতা",
    "kpi.active_alerts": "সক্ৰিয় আগতীয়া সতৰ্কবাণী",
    "action.download_sitrep": "চৰকাৰী চিটৰেপ PDF",
    "action.low_bw_sos": "১১২ অফলাইন এছঅ'এছ",
    "action.sound_siren": "অডিঅ' চাইৰেন বজাওক",
    "action.stop_siren": "চাইৰেন বন্ধ কৰক",
    "action.simulate_blockage": "পথ অৱৰোধ অনুকৰণ",
    "action.reset_route": "প্ৰাথমিক পথ ৰিছেট কৰক",
    "action.panic_sos": "মই আৱদ্ধ হৈ আছোঁ / উদ্ধাৰকাৰী দল পঠিয়াওক",
    "action.send_sos_beacon": "লাইভ প্যানিক বীকন প্ৰেৰণ কৰক",
    "action.cancel": "বাতিল কৰক",
    "action.refresh": "লাইভ তথ্য সতেজ কৰক",
    "action.export": "প্ৰতিবেদন ৰপ্তানি",
    "panic.title": "জৰুৰীকালীন উদ্ধাৰ অভিযান সক্ৰিয়",
    "panic.subtitle": "আপোনাৰ লাইভ GPS স্থানাংক ৰাজ্যিক দুৰ্যোগ পৰিচালনা (SDMA) আৰু NDRF লৈ প্ৰেৰণ কৰা হৈছে।",
    "panic.coords": "প্ৰাপ্ত GPS স্থানাংক",
    "panic.ticket_id": "উদ্ধাৰ কাণ্ড প্ৰসংগ",
    "panic.direct_helpline": "১-টেপ জৰুৰীকালীন হেল্পলাইন",
    "panic.national_112": "ৰাষ্ট্ৰীয় জৰুৰীকালীন: ১১২",
    "panic.state_1070": "ৰাজ্যিক দুৰ্যোগ নিয়ন্ত্ৰণ: ১০৭০",
    "panic.district_1077": "জিলা জৰুৰীকালীন কেন্দ্ৰ: ১০৭৭",
    "radar.layer_title": "ডপলাৰ বতৰ ৰাডাৰ অভাৰলে",
    "radar.toggle_radar": "ডপলাৰ ৰাডাৰ",
    "radar.toggle_clouds": "মেঘ উপগ্ৰহ",
    "radar.opacity": "ৰাডাৰ স্বচ্ছতা",
    "radar.live_source": "লাইভ উৎস: RainViewer গ্ল'বেল ৰাডাৰ কম্পজিট",
    "state.all": "উত্তৰ-পূবৰ আটাইকেইখন ৮ খন ৰাজ্য",
    "corridor.select": "গুৰুত্বপূৰ্ণ কৰিডৰ বাছক...",
    "footer.slogan": "আজি প্ৰস্তুত · কাইলৈ সুৰক্ষিত",
    "footer.gov": "পৃথিৱী বিজ্ঞান মন্ত্ৰালয় · ভাৰত চৰকাৰ"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem("bhusetu_lang") || "en";
    if (!["en", "hi", "as"].includes(this.currentLang)) {
      this.currentLang = "en";
    }
    this.listeners = [];
  }

  getLanguage() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (!["en", "hi", "as"].includes(lang)) return;
    this.currentLang = lang;
    localStorage.setItem("bhusetu_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    this.notifyListeners();
  }

  t(key, fallback = "") {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key] !== undefined) {
      return enDict[key];
    }
    return fallback || key;
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    for (const fn of this.listeners) {
      try {
        fn(this.currentLang);
      } catch (err) {
        console.error("i18n listener error:", err);
      }
    }
  }
}

export const i18n = new I18nManager();
export const t = (key, fallback) => i18n.t(key, fallback);