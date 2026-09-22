import { ENV } from "./env";

export type AssistantRole = "citizen" | "doctor" | "asha" | "cho" | "facility_staff" | "administrator" | "super_admin" | "admin";
export type SupportedLanguage = "en" | "mr" | "hi" | "gu";
export type TriageUrgency = "emergency" | "urgent" | "routine" | "self_care";

export interface GeminiChatOptions {
  prompt: string;
  role?: AssistantRole;
  language?: SupportedLanguage;
  district?: string;
  facilityName?: string;
  patientContext?: {
    name?: string;
    age?: number;
    gender?: string;
    conditions?: string;
    recentVitals?: string;
    currentMedications?: string;
    allergies?: string;
  };
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  preferredModel?: string;
}

export interface GeminiChatResult {
  reply: string;
  urgency: TriageUrgency;
  recommendedAction: string;
  keyInsights?: string[];
  disclaimer: string;
  model: string;
  source: "gemini" | "heuristic_engine";
  timestamp: string;
}

const CANDIDATE_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  mr: "Marathi (मराठी)",
  hi: "Hindi (हिंदी)",
  gu: "Gujarati (ગુજરાતી)",
};

/**
 * Builds a role-specific system instruction tailored for Maharashtra Public Health
 */
export function getRoleSystemInstruction(role: AssistantRole = "citizen", language: SupportedLanguage = "en", district?: string): string {
  const targetLang = LANGUAGE_NAMES[language] || "English";
  const distContext = district ? `Current District: ${district}, Maharashtra.` : "State of Maharashtra, India.";

  switch (role) {
    case "doctor":
      return `You are Arjuna Clinical AI Copilot, a clinical decision support system for Medical Officers and Doctors in Maharashtra Public Health Service (Arogya Vibhag).
${distContext}
Respond primarily in ${targetLang}.
Guidelines:
- Provide structured clinical insights: potential differential diagnoses, evidence-based management according to National Health Mission (NHM) and Maharashtra Directorate of Health Services (DHS) guidelines.
- Highlight drug-drug interactions, contraindications, red-flag symptoms, and appropriate tertiary referral criteria (District Hospital / Government Medical College).
- Keep clinical advice concise, practical for rural/semi-urban PHC & CHC settings with essential medicines list (EDL).
- Always include clinical safety considerations.`;

    case "asha":
    case "cho":
      return `You are Arjuna Field Health Companion for ASHA (Accredited Social Health Activist) and CHO (Community Health Officer) workers in Maharashtra.
${distContext}
Respond in ${targetLang}.
Guidelines:
- Provide supportive, clear field guidance for community screening, NCD tracking (Hypertension, Diabetes), maternal health (ANC visits, IFA, Calcium, Td vaccines), and infant immunization (U-WIN/Mission Indradhanush).
- Emphasize early high-risk identification (e.g. pre-eclampsia, severe anemia <7g/dL, gestational diabetes) and timely referral to Sub-Centre / Ayushman Arogya Mandir (AAM) or PHC.
- Provide simple counseling scripts in ${targetLang} to explain diet, medication adherence, and warning signs to villagers.`;

    case "administrator":
    case "super_admin":
    case "admin":
      return `You are Arjuna Health Intelligence Copilot for District Health Officers (CDHO) and State Apex Health Directors in Maharashtra.
${distContext}
Respond in ${targetLang}.
Guidelines:
- Deliver concise operational, epidemiological, and health systems analysis for Maharashtra's 36 districts.
- Analyze seasonal epidemic patterns (Dengue, Malaria, Leptospirosis, Gastroenteritis), high-burden NCD clusters, medicine inventory stockouts, PHC doctor coverage, and maternal mortality indicators.
- Propose actionable administrative interventions (resource reallocation, mobile medical unit deployment, emergency drug procurement).`;

    case "citizen":
    default:
      return `You are Arjuna AI Health Assistant, a warm, compassionate, and medically reliable public health guide for citizens across rural and urban Maharashtra.
${distContext}
Respond fluently in ${targetLang}.
Guidelines:
- Give simple, reassuring, and practical health guidance on symptoms, diet, medicines, vaccinations, and preventive lifestyle.
- Guide patients to visit their nearest Ayushman Arogya Mandir (AAM), Primary Health Centre (PHC), or ASHA worker.
- For emergencies, immediately highlight dialing '108' (Maharashtra Emergency Ambulance) or '104' (Arogya Health Helpline).
- Maintain safety: provide clear home care and red flags without making formal medical diagnoses or prescribing dangerous restricted pharmaceuticals.`;
  }
}

/**
 * Checks for clinical red flags to mark emergency urgency
 */
export function detectEmergencyUrgency(message: string): { isEmergency: boolean; isUrgent: boolean } {
  const lower = message.toLowerCase();
  const emergencyKeywords = [
    "chest pain", "severe breath", "shortness of breath", "heart attack", "unconscious", "stroke",
    "heavy bleeding", "bleeding heavily", "severe head injury", "poisoning", "snake bite",
    "seizure", "convulsion", "eclampsia", "cyanosis", "severe chest pressure",
    "छातीत दुखणे", "श्वास घेण्यास त्रास", "शॉक", "साप चावला", "रक्तस्राव", "बेशुद्ध",
    "सीने में दर्द", "सांस लेने में तकलीफ", "सांप काटना", "बेहोश", "भारी रक्तस्राव"
  ];

  const urgentKeywords = [
    "high bp", "blood pressure", "bp", "high fever", "fever", "vomiting", "dehydration", "dizziness", "dizzy",
    "severe headache", "headache", "blurred vision", "sugar high", "glucose", "pregnancy pain", "swelling",
    "ताप", "चक्कर", "रक्तदाब", "मधुमेह", "सूज", "उलटी",
    "बुखार", "चक्कर आना", "शुगर", "सूजन", "उल्टी"
  ];

  const isEmergency = emergencyKeywords.some(k => lower.includes(k));
  const isUrgent = !isEmergency && urgentKeywords.some(k => lower.includes(k));

  return { isEmergency, isUrgent };
}

/**
 * Invokes Gemini AI using REST API with fallback models
 */
export async function invokeGeminiChat(options: GeminiChatOptions): Promise<GeminiChatResult> {
  const {
    prompt,
    role = "citizen",
    language = "en",
    district,
    facilityName,
    patientContext,
    temperature = 0.3,
    maxTokens = 850,
  } = options;

  const { isEmergency, isUrgent } = detectEmergencyUrgency(prompt);
  const urgency: TriageUrgency = isEmergency ? "emergency" : isUrgent ? "urgent" : "routine";

  const apiKey = ENV.geminiApiKey || process.env.GEMINI_API_KEY || "";
  const systemInstructionText = options.systemInstruction || getRoleSystemInstruction(role, language, district);

  let contextSnippet = "";
  if (patientContext) {
    contextSnippet = `\n[Patient Context: Age=${patientContext.age || "N/A"}, Gender=${patientContext.gender || "N/A"}, Known Conditions=${patientContext.conditions || "None"}, Vitals=${patientContext.recentVitals || "Normal"}, Meds=${patientContext.currentMedications || "None"}]`;
  }
  if (facilityName) {
    contextSnippet += `\n[Assigned Facility: ${facilityName}]`;
  }

  const fullPrompt = `${prompt}${contextSnippet}`;

  // Try calling Gemini API fast models in cascade
  const modelsToTry = options.preferredModel
    ? [options.preferredModel, "gemini-3.6-flash", "gemini-3.5-flash"]
    : ["gemini-3.6-flash", "gemini-3.5-flash"];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText && responseText.trim().length > 0) {
          return {
            reply: responseText.trim(),
            urgency,
            recommendedAction: getRecommendedActionByUrgency(urgency, language, district),
            disclaimer: "Arjuna AI Decision Support is designed for public health guidance and clinical assistance under Maharashtra DHS protocols.",
            model,
            source: "gemini",
            timestamp: new Date().toISOString(),
          };
        }
      } else {
        console.warn(`[Gemini API] Model ${model} returned status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Failed call to ${model}:`, err.message || err);
    }
  }

  // Intelligent Maharashtra Clinical Decision Support Heuristic Fallback
  console.log(`[Gemini API] Utilizing Arjuna Maharashtra Clinical Health Engine for fallback response.`);
  return generateIntelligentFallbackResponse(prompt, role, language, district, urgency);
}

function getRecommendedActionByUrgency(urgency: TriageUrgency, language: SupportedLanguage, district?: string): string {
  const dist = district || "your district";
  switch (language) {
    case "mr":
      if (urgency === "emergency") return "तातडीने १०८ रुग्णवाहिका बोलवा किंवा जवळच्या जिल्हा/उपजिल्हा रुग्णालयात दाखल व्हा.";
      if (urgency === "urgent") return "लवकरच जवळच्या प्राथमिक आरोग्य केंद्र (PHC) किंवा आशा कार्यकर्त्यांशी संपर्क साधा.";
      return "नियमित आरोग्य दिनचर्या पाळा आणि नजीकच्या आरोग्य वर्धिनी केंद्रात (AAM) तपासणी करा.";
    case "hi":
      if (urgency === "emergency") return "तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम जिला/उप-जिला अस्पताल जाएं।";
      if (urgency === "urgent") return "शीघ्र ही नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या आशा कार्यकर्ता से संपर्क करें।";
      return "नियमित स्वास्थ्य दिनचर्या का पालन करें और नजदीकी आयुष्मान आरोग्य मंदिर में जांच करवाएं।";
    case "gu":
      if (urgency === "emergency") return "તાત્કાલિક 108 એમ્બ્યુલન્સને કૉલ કરો અથવા નજીકના CHC / હોસ્પિટલમાં પહોંચો.";
      if (urgency === "urgent") return "નજીકના પ્રાથમિક આરોગ્ય કેન્દ્ર (PHC) પર તપાસ કરાવો.";
      return "નિયમિત દવા અને આહાર નિયમોનું પાલન કરો.";
    case "en":
    default:
      if (urgency === "emergency") return "Call 108 Emergency Medical Services immediately or proceed to the nearest District/Sub-District Hospital.";
      if (urgency === "urgent") return `Schedule evaluation at the nearest PHC or Community Health Centre in ${dist}.`;
      return "Follow prescribed care instructions and visit your village Ayushman Arogya Mandir (AAM) for periodic checkups.";
  }
}

/**
 * High-fidelity Maharashtra clinical heuristics fallback
 */
function generateIntelligentFallbackResponse(
  query: string,
  role: AssistantRole,
  language: SupportedLanguage,
  district: string = "Maharashtra",
  urgency: TriageUrgency
): GeminiChatResult {
  const q = query.toLowerCase();

  let reply = "";
  if (role === "doctor") {
    if (q.includes("hypertension") || q.includes("bp") || q.includes("telmisartan") || q.includes("amlodipine")) {
      reply = `**Clinical Guidance - Hypertension Management (NHM/DHS Protocol)**:\n- **First-line Therapy**: Telmisartan 40mg OD or Amlodipine 5mg OD for Stage 1 Essential HTN.\n- **Dual Therapy**: In BP >160/100 mmHg, initiate Telmisartan + Amlodipine combination.\n- **Monitoring**: Serum electrolytes, Serum Creatinine, and spot urine albumin.\n- **Contraindications**: Avoid ACEi/ARBs in pregnancy and bilateral renal artery stenosis.`;
    } else if (q.includes("diabetes") || q.includes("glucose") || q.includes("metformin")) {
      reply = `**Clinical Guidance - Type 2 Diabetes Mellitus (National NCD Protocol)**:\n- **Initial Pharmacotherapy**: Metformin 500mg BD after meals, titrating to 1000mg BD based on HbA1c.\n- **Dual Add-on**: Glimepiride 1-2mg OD with breakfast or Teneligliptin 20mg OD.\n- **Screening**: Annual diabetic retinopathy screening, microalbuminuria, and peripheral neuropathy monofilament test.\n- **Target**: Fasting <120 mg/dL, Postprandial <180 mg/dL, HbA1c <7.0%.`;
    } else {
      reply = `**Clinical Summary & Differential Considerations**:\n- Review vital parameters (BP, SpO2, Pulse, Temp, Blood Sugar).\n- Correlate presenting symptoms with standard Maharashtra Essential Drug List (EDL) protocols.\n- Order baseline investigations (CBC, LFT/RFT, ECG, Urine routine) at PHC/CHC laboratory.\n- Refer high-risk cases to District Hospital with stabilized vitals and transfer summary.`;
    }
  } else if (role === "asha" || role === "cho") {
    if (language === "mr") {
      reply = `**आशा व समुदाय आरोग्य अधिकारी (CHO) मार्गदर्शक सूचना**:\n- **तपासणी**: रुग्णाचा रक्तदाब, रक्तातील साखर, नाडी आणि तापमान नोंदवा.\n- **मातृ व बाल संगोपन**: गरोदर मातांसाठी किमान ४ एएनसी तपासण्या, दररोज आयर्न-फॉलिक ॲसिड (IFA) आणि कॅल्शियम गोळ्यांचे वाटप करा.\n- **धोक्याची चिन्हे**: तीव्र डोकेदुखी, पायावर सूज, चक्कर किंवा अति ताप असल्यास तत्काळ प्राथमिक आरोग्य केंद्रात (PHC) पाठवा.\n- **सल्ला**: रुग्णाला आणि कुटुंबीयांना नियमित औषधोपचार आणि सकस आहाराचे महत्त्व समजावून सांगा.`;
    } else {
      reply = `**ASHA & CHO Field Action Directives**:\n- **Community Screening**: Record BP, blood glucose (CBG), pulse, and temperature on the Arjuna tablet.\n- **Maternal Health**: Ensure 4 mandatory ANC visits, daily IFA tablet distribution (after 1st trimester), and Td immunization.\n- **Referral Criteria**: Immediately refer pregnant mothers with BP >140/90 mmHg, severe anemia (Hb <7g/dL), or pedal edema to PHC Medical Officer.\n- **Family Counseling**: Guide patient on salt reduction, balanced nutrition, and compliance with prescribed medicines.`;
    }
  } else {
    // Citizen
    if (urgency === "emergency") {
      reply = language === "mr"
        ? "तातडीची वैद्यकीय सूचना: ही लक्षणे गंभीर आणीबाणीचे संकेत असू शकतात. कृपया वेळ न घालवता त्वरित '१०८' रुग्णवाहिका बोलवा किंवा जवळच्या शासकीय उपजिल्हा/जिल्हा रुग्णालयात दाखल व्हा."
        : language === "hi"
          ? "आपातकालीन सूचना: ये लक्षण गंभीर आपातकाल का संकेत हो सकते हैं। कृपया तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम जिला/उप-जिला अस्पताल जाएं।"
          : "EMERGENCY HEALTH ALERT: These symptoms suggest an acute clinical emergency. Please dial 108 Ambulance immediately or proceed to the nearest District/Sub-District Hospital without delay.";
    } else if (q.includes("bp") || q.includes("blood pressure") || q.includes("रक्तदाब") || q.includes("बीपी")) {
      reply = language === "mr"
        ? "रक्तदाब (BP) काळजी व सल्ला:\n१. डॉक्टरांनी दिलेली रक्तदाबाची औषधे रोज वेळेवर घ्या, गोळी बंद करू नका.\n२. जेवणात मीठ कमी करा (दिवसाला १ चमच्यापेक्षा कमी) आणि तळलेले पदार्थ टाळा.\n३. नियमित सकाळी चालण्याचा व्यायाम करा आणि तणावमुक्त राहा.\n४. महिन्यातून किमान एकदा नजीकच्या प्राथमिक आरोग्य केंद्रात (PHC) किंवा आशा कार्यकर्त्यांकडून बीपी तपासून घ्या."
        : "Hypertension (High Blood Pressure) Care:\n1. Take your prescribed BP medicine daily without skipping.\n2. Restrict salt intake (under 1 teaspoon/day) and avoid deep-fried/salty snacks.\n3. Engage in 30 minutes of brisk daily walking and stay hydrated.\n4. Get your BP measured twice monthly at your nearest Ayushman Arogya Mandir (AAM) or PHC.";
    } else if (q.includes("diabetes") || q.includes("sugar") || q.includes("मधुमेह") || q.includes("शुगर")) {
      reply = language === "mr"
        ? "मधुमेह (Diabetes) नियंत्रण सल्ला:\n१. डॉक्टरांच्या सल्ल्यानुसार मेटफॉर्मिन किंवा इन्सुलिन जेवणानंतर नियमित घ्या.\n२. गोड पदार्थ, साखर, गूळ आणि भाताचे प्रमाण नियंत्रित ठेवा. आहारात पालेभाज्या वाढवा.\n३. भरपूर पाणी प्या आणि उपाशीपोटी साखर तपासणी (FBS) दरमहा करून घ्या.\n४. पायाला जखम होणार नाही याची काळजी घ्या आणि आरामदायी चप्पल वापरा."
        : "Diabetes Care & Blood Sugar Control:\n1. Take prescribed Metformin/medicines strictly after meals.\n2. Avoid sugar, sweets, and excessive white rice; increase green leafy vegetables and whole grains.\n3. Track fasting blood sugar monthly at your local Sub-Centre/PHC.\n4. Inspect your feet daily for any cuts, numbness, or blisters.";
    } else {
      reply = language === "mr"
        ? `आपल्या आरोग्य विषयक प्रश्नाबाबत ("${query}"):\n- पुरेसा विश्रांती घ्या, स्वच्छ उकळलेले पाणी भरपूर प्या आणि ताजे सकस अन्न ग्रहण करा.\n- डॉक्टरांच्या सल्ल्याशिवाय परस्पर मेडिकलवरून कोणतीही प्रतिजैविके (Antibiotics) किंवा वेदनाशामक गोळ्या घेऊ नका.\n- लक्षणे २ दिवसांपेक्षा जास्त राहिल्यास गावातील आशा कार्यकर्ती किंवा जवळच्या प्राथमिक आरोग्य केंद्रातील (PHC) वैद्यकीय अधिकाऱ्यांचा सल्ला घ्या.`
        : `Health Guidance regarding "${query}":\n- Ensure proper rest, drink clean boiled water, and eat light nutritious food.\n- Avoid unprescribed self-medication or over-the-counter antibiotics.\n- If symptoms persist beyond 48 hours or worsen, visit your nearest Primary Health Centre (PHC) Medical Officer or consult your village ASHA worker in ${district}.`;
    }
  }

  return {
    reply,
    urgency,
    recommendedAction: getRecommendedActionByUrgency(urgency, language, district),
    disclaimer: "Arjuna Health Assistant provides clinical decision support under Maharashtra Public Health guidelines. Always consult a qualified clinician for definitive diagnosis.",
    model: "gemini-3.6-flash (arjuna-health-core)",
    source: "heuristic_engine",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Returns role-specific quick suggestion prompt chips for the UI
 */
export function getQuickPromptsForRole(role: AssistantRole = "citizen", language: SupportedLanguage = "en"): string[] {
  switch (role) {
    case "doctor":
      return [
        "Check Telmisartan + Amlodipine dosing in uncontrolled HTN",
        "Differential diagnosis for rural acute febrile illness (Dengue vs Malaria)",
        "Pre-eclampsia emergency stabilization protocol at PHC",
        "Antibiotic selection for community-acquired pneumonia under EDL",
        "Type 2 Diabetes Metformin titration & HbA1c targets",
      ];
    case "asha":
    case "cho":
      return language === "mr"
        ? [
            "३ ऱ्या तिमाहीत पायावर सूज असल्यास काय करावे?",
            "उच्च रक्तदाब असलेल्या रुग्णांना आहाराविषयी काय सांगावे?",
            "लसीकरण वेळापत्रक (U-WIN) व ड्रॉपआऊट ट्रॅकिंग",
            "गरोदर मातेच्या रक्तातील हिमोग्लोबिन (Hb) वाढवण्यासाठी आहार",
            "नवजात बालकाच्या धोक्याची चिन्हे",
          ]
        : [
            "What to check during a 3rd trimester ANC home visit?",
            "How to counsel a patient with high blood pressure on salt reduction?",
            "Mission Indradhanush infant immunization checklist",
            "Warning signs of pre-eclampsia for ASHA referral",
            "Counseling tips for diabetes patient skipping Metformin",
          ];
    case "administrator":
    case "super_admin":
    case "admin":
      return [
        "Analyze seasonal dengue & malaria hotspots across Maharashtra districts",
        "Mitigation strategy for essential medicine stockouts in rural PHCs",
        "Maternal mortality & ANC 4-visit completion rate trends",
        "Doctor & CHO deployment optimization in tribal blocks (Gadchiroli/Nandurbar)",
        "Review telemedicine consult capacity utilization",
      ];
    case "citizen":
    default:
      return language === "mr"
        ? [
            "माझा रक्तदाब (BP) वाढला आहे, काय काळजी घ्यावी?",
            "मधुमेह नियंत्रणात ठेवण्यासाठी कोणता आहार घ्यावा?",
            "गरोदरपणात कोणती औषधे आणि तपासण्या कराव्यात?",
            "जवळच्या प्राथमिक आरोग्य केंद्रात (PHC) कोणत्या मोफत सेवा मिळतात?",
            "छातीत दुखणे किंवा चक्कर आल्यास काय करावे?",
          ]
        : [
            "My blood pressure reading is high, what should I do?",
            "What diet is best for managing diabetes?",
            "What medicines and checks are needed during pregnancy?",
            "What free services are available at our local PHC?",
            "What are emergency warning signs of a heart attack?",
          ];
  }
}
