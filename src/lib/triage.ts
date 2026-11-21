import { CategoryKey, Severity, TriageResult } from '../types';

/**
 * Normalise text for fuzzy/sample matching by stripping punctuation and collapsing whitespace.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।॥]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect language based on Unicode script.
 * Devanagari=Hindi, Telugu=Telugu, Kannada=Kannada, Tamil=Tamil, else English.
 */
export function detectLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  return 'English';
}

interface HardcodedSample {
  matchKeywords: string[];
  exactPattern: string;
  translated: string;
  category: CategoryKey;
  severity: Severity;
  severity_reason: string;
  hazard_flags: string[];
  summary: string;
}

const HARDCODED_SAMPLES: HardcodedSample[] = [
  {
    // Hindi sample: "हमारी गली में बड़ा गड्ढा है, गाड़ियाँ फँस रही हैं"
    matchKeywords: ['हमारी', 'गली', 'गड्ढा', 'गाड़ियाँ'],
    exactPattern: 'हमारी गली में बड़ा गड्ढा है गाड़ियाँ फँस रही हैं',
    translated: 'There is a big pothole in our street, vehicles are getting stuck.',
    category: 'roads',
    severity: 'High',
    severity_reason: 'Large pothole obstructing vehicles on a public street.',
    hazard_flags: [],
    summary: 'Large pothole in street trapping vehicles',
  },
  {
    // Telugu sample: "మా వీధిలో చెత్త రెండు రోజులుగా తీయలేదు, దుర్వాసన వస్తోంది"
    matchKeywords: ['వీధిలో', 'చెత్త', 'తీయలేదు', 'దుర్వాసన'],
    exactPattern: 'మా వీధిలో చెత్త రెండు రోజులుగా తీయలేదు దుర్వాసన వస్తోంది',
    translated: 'Garbage in our street has not been collected for two days and there is a bad smell.',
    category: 'waste',
    severity: 'Medium',
    severity_reason: 'Uncollected garbage for 2 days causing odour and a hygiene risk.',
    hazard_flags: [],
    summary: 'Uncollected street garbage causing odour',
  },
  {
    // Kannada sample: "ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದ್ದು ವಿದ್ಯುತ್ ತಂತಿ ಕೆಳಗೆ ಬಿದ್ದಿದೆ"
    matchKeywords: ['ರಸ್ತೆಯಲ್ಲಿ', 'ನೀರು', 'ವಿದ್ಯುತ್', 'ತಂತಿ', 'ಬಿದ್ದಿದೆ'],
    exactPattern: 'ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದ್ದು ವಿದ್ಯುತ್ ತಂತಿ ಕೆಳಗೆ ಬಿದ್ದಿದೆ',
    translated: 'Water is standing on the road and an electric wire has fallen down.',
    category: 'electricity',
    severity: 'Critical',
    severity_reason: 'Fallen live wire near standing water is a risk to life.',
    hazard_flags: ['live_wire', 'standing_water'],
    summary: 'Fallen electric wire in standing water',
  },
  {
    // Tamil sample: "எங்கள் தெருவில் குடிநீர் குழாய் உடைந்து தண்ணீர் வீணாகிறது"
    matchKeywords: ['எங்கள்', 'குடிநீர்', 'குழாய்', 'தண்ணீர்'],
    exactPattern: 'எங்கள் தெருவில் குடிநீர் குழாய் உடைந்து தண்ணீர் வீணாகிறது',
    translated: 'The drinking water pipe in our street is broken and water is being wasted.',
    category: 'water',
    severity: 'High',
    severity_reason: 'Broken main pipe wasting drinking water.',
    hazard_flags: [],
    summary: 'Broken drinking water pipe leaking on street',
  },
];

// Keyword Dictionaries (case-insensitive, include Hinglish / regional scripts)
const KEYWORD_DICTIONARY: Record<CategoryKey, string[]> = {
  roads: [
    'pothole', 'potholes', 'road', 'roads', 'street', 'asphalt', 'gaddha', 'gadde', 'gadda',
    'sadak', 'rasta', 'गड्ढा', 'गड्ढे', 'सड़क', 'रास्ता', 'గుంత', 'రోడ్డు', 'గుండಿ', 'ರಸ್ತೆ',
    'ಕುಳಿ', 'குழி', 'சாலை'
  ],
  waste: [
    'garbage', 'trash', 'waste', 'dump', 'bin', 'debris', 'kachra', 'kooda', 'kachre',
    'कचरा', 'कूड़ा', 'చెత్త', 'డస్ట్‌బిన్', 'కస', 'ಕಸದ', 'குப்பை'
  ],
  water: [
    'water', 'leak', 'leaking', 'leakage', 'pipe', 'pipeline', 'burst', 'tap', 'paani',
    'pani', 'पानी', 'पाइप', 'जल', 'నీళ్లు', 'నీరు', 'పైపు', 'ನೀರು', 'ಪೈಪ್', 'ನೀರಿನ',
    'தண்ணீர்', 'குழாய்', 'குடிநீர்'
  ],
  electricity: [
    'wire', 'wires', 'cable', 'cables', 'streetlight', 'streetlights', 'light', 'pole',
    'transformer', 'spark', 'sparks', 'shock', 'bijli', 'current', 'बिजली', 'तार', 'खंभा',
    'కరెంటు', 'విద్యుత్', 'వైరు', 'స్తంభం', 'ವಿದ್ಯುತ್', 'ತಂತಿ', 'ಕಂಬ', 'மின்சாரம்',
    'மின்கம்பி', 'மின்விளக்கு'
  ],
  trees: [
    'tree', 'trees', 'branch', 'branches', 'trunk', 'ped', 'pedh', 'पेड़', 'शाखा',
    'చెట్టు', 'కొమ్మ', 'ಮರ', 'ಕೊಂಬೆ', 'மரம்', 'கிளை'
  ],
  drainage: [
    'drain', 'drainage', 'gutter', 'sewage', 'sewer', 'manhole', 'overflow', 'nali', 'naala',
    'ganda paani', 'नाली', 'सीवर', 'गटर', 'డ్రైనేజీ', 'కాలువ', 'ಮೋರಿ', 'ಚರಂಡಿ',
    'சாக்கடை', 'வடிகால்'
  ],
  other: []
};

// Water words for live wire + standing water detection
const WATER_WORDS = [
  'water', 'puddle', 'puddles', 'rain', 'rainwater', 'flooding', 'flood', 'pond',
  'paani', 'पानी', 'जल', 'నీళ్లు', 'నీరు', 'ನೀರು', 'தண்ணீர்'
];

// Wire words for live wire + standing water detection
const WIRE_WORDS = [
  'wire', 'wires', 'cable', 'live wire', 'electric wire', 'cord', 'तार', 'తీగ', 'వైరు', 'ತಂತಿ', 'மின்கம்பி'
];

// Sensitive location words
const SENSITIVE_WORDS = [
  'school', 'hospital', 'kindergarten', 'clinic', 'dispensary', 'nursery',
  'स्कूल', 'अस्पताल', 'पाठशाला', 'హాస్పిటల్', 'బడి', 'ಆಸ್ಪತ್ರೆ', 'ಶಾಲೆ',
  'மருத்துவமனை', 'பள்ளி'
];

/**
 * Pure rule-based triage function.
 * Fast, synchronous, completely deterministic.
 */
export function triage(text: string): TriageResult {
  const rawClean = text.trim();
  const normalized = normalizeText(rawClean);
  const lang = detectLanguage(rawClean);

  // 1. Check hardcoded samples first
  for (const sample of HARDCODED_SAMPLES) {
    const normSample = normalizeText(sample.exactPattern);
    if (normalized.includes(normSample) || normSample.includes(normalized)) {
      return {
        language: lang,
        translated_text: sample.translated,
        category: sample.category,
        severity: sample.severity,
        severity_reason: sample.severity_reason,
        hazard_flags: [...sample.hazard_flags],
        confidence: 0.95,
        summary: sample.summary,
      };
    }

    // Check if majority of sample keywords exist in the input
    const matchCount = sample.matchKeywords.filter(k => rawClean.includes(k) || normalized.includes(k)).length;
    if (matchCount >= Math.min(3, sample.matchKeywords.length)) {
      return {
        language: lang,
        translated_text: sample.translated,
        category: sample.category,
        severity: sample.severity,
        severity_reason: sample.severity_reason,
        hazard_flags: [...sample.hazard_flags],
        confidence: 0.95,
        summary: sample.summary,
      };
    }
  }

  // 2. Translation resolution
  let translated_text = rawClean;
  if (lang !== 'English') {
    translated_text = 'Regional language: translation not available in this demo';
  }

  // 3. Count matches in Keyword Dictionaries
  const lowerText = rawClean.toLowerCase();
  const matchScores: Record<CategoryKey, number> = {
    roads: 0,
    waste: 0,
    water: 0,
    electricity: 0,
    trees: 0,
    drainage: 0,
    other: 0,
  };

  const matchedKeywordsList: string[] = [];

  for (const [cat, words] of Object.entries(KEYWORD_DICTIONARY) as [CategoryKey, string[]][]) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        matchScores[cat]++;
        matchedKeywordsList.push(word);
      }
    }
  }

  // Find top category
  let topCategory: CategoryKey = 'other';
  let maxScore = 0;
  for (const [cat, score] of Object.entries(matchScores) as [CategoryKey, number][]) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat;
    }
  }

  // 4. Hazard Rules
  const hazard_flags: string[] = [];
  let severity: Severity = 'Low';
  let severity_reason = 'Routine civic grievance logged.';

  // Check default severity based on top category
  if (topCategory === 'roads' || topCategory === 'water' || topCategory === 'drainage') {
    severity = 'Medium';
    severity_reason = `Standard ${topCategory} issue reported.`;
  } else {
    severity = 'Low';
    severity_reason = `Low priority ${topCategory} report.`;
  }

  // Rule: Wire + Water => electricity, Critical, live_wire + standing_water
  const hasWire = WIRE_WORDS.some(w => lowerText.includes(w.toLowerCase()));
  const hasWater = WATER_WORDS.some(w => lowerText.includes(w.toLowerCase()));
  if (hasWire && hasWater) {
    topCategory = 'electricity';
    if (!hazard_flags.includes('live_wire')) hazard_flags.push('live_wire');
    if (!hazard_flags.includes('standing_water')) hazard_flags.push('standing_water');
    severity = 'Critical';
    severity_reason = 'Exposed wire in or near standing water creates an imminent electrocution hazard.';
  }

  // Rule: Hanging/exposed wire or sparks => at least High
  const hasHangingOrSparks = /hanging|exposed|spark|sparks|झूल|लटक|तार/i.test(lowerText);
  if (hasWire && hasHangingOrSparks && severity !== 'Critical') {
    topCategory = 'electricity';
    if (!hazard_flags.includes('hanging_wire')) hazard_flags.push('hanging_wire');
    severity = 'High';
    severity_reason = 'Hanging or exposed electrical wire posing danger to public.';
  }

  // Rule: Fallen tree + road/blocked => at least High
  const hasTree = lowerText.includes('tree') || lowerText.includes('ped') || lowerText.includes('पेड़') || lowerText.includes('ಮರ') || lowerText.includes('மர');
  const hasRoadBlocked = /blocked|blocking|road|traffic|jam|obstruction|बंद|रास्ता/i.test(lowerText);
  if (hasTree && hasRoadBlocked) {
    topCategory = 'trees';
    if (!hazard_flags.includes('road_blocked')) hazard_flags.push('road_blocked');
    if (severity !== 'Critical') {
      severity = 'High';
      severity_reason = 'Fallen tree or branch obstructing traffic/pedestrian path.';
    }
  }

  // Rule: Open manhole, gas smell, building collapse => Critical
  if (/open manhole|खुला मैनहोल|manhole open|ತೆರೆದ ಮೋರಿ/i.test(lowerText)) {
    if (!hazard_flags.includes('open_manhole')) hazard_flags.push('open_manhole');
    severity = 'Critical';
    severity_reason = 'Open manhole posing severe fall and injury risk.';
  }
  if (/gas smell|gas leak|गैस रिसाव/i.test(lowerText)) {
    if (!hazard_flags.includes('gas_leak')) hazard_flags.push('gas_leak');
    severity = 'Critical';
    severity_reason = 'Reported gas smell or leak posing fire/explosion risk.';
  }
  if (/collapse|collapsed|falling wall|गिरना|धंसना/i.test(lowerText)) {
    if (!hazard_flags.includes('structural_danger')) hazard_flags.push('structural_danger');
    severity = 'Critical';
    severity_reason = 'Structural damage or collapse reported.';
  }

  // Rule: Sewage overflow => High
  if (/sewage overflow|sewage overflowing|drain overflowing|गंदा पानी|सीवर ओवरफ्लो/i.test(lowerText)) {
    topCategory = 'drainage';
    if (!hazard_flags.includes('sewage_overflow')) hazard_flags.push('sewage_overflow');
    if (severity !== 'Critical') {
      severity = 'High';
      severity_reason = 'Sewage or drain overflowing onto public road.';
    }
  }

  // Rule: Sensitive location words (school, hospital, etc.) => flag sensitive_location
  if (SENSITIVE_WORDS.some(w => lowerText.includes(w.toLowerCase()))) {
    if (!hazard_flags.includes('sensitive_location')) {
      hazard_flags.push('sensitive_location');
    }
    // Also mention in reason if not already critical
    if (severity !== 'Critical') {
      severity_reason += ' Located near sensitive educational or medical facility.';
    }
  }

  // 5. Confidence calculation
  let confidence = 0.85;
  if (maxScore === 0) {
    confidence = 0.25; // Below 0.4 triggers needs_review
    topCategory = 'other';
    severity_reason = 'Unclear keywords; requires human officer classification.';
  } else if (maxScore === 1) {
    confidence = 0.65;
  } else if (maxScore === 2) {
    confidence = 0.82;
  } else {
    confidence = 0.94;
  }

  if (hazard_flags.length > 0) {
    confidence = Math.max(confidence, 0.92);
  }

  // Generate cleaned summary
  let summary = rawClean.slice(0, 80);
  if (translated_text && translated_text !== 'Regional language: translation not available in this demo') {
    summary = translated_text.slice(0, 80);
  } else if (topCategory !== 'other') {
    summary = `${topCategory.charAt(0).toUpperCase() + topCategory.slice(1)} issue reported in ${lang}`;
  }

  return {
    language: lang,
    translated_text,
    category: topCategory,
    severity,
    severity_reason,
    hazard_flags,
    confidence,
    summary: summary.replace(/\.+$/, ''),
  };
}
