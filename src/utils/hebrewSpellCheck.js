// hebrewSpellCheck.js — Hebrew spelling correction engine for TeamChat
// Uses a curated dictionary + common-typos map + Levenshtein distance for fuzzy matching

// ── Common Hebrew workplace / chat dictionary ──────────────────────────
const DICTIONARY = new Set([
  // Greetings & courtesy
  'שלום', 'היי', 'הי', 'בוקר', 'טוב', 'ערב', 'לילה', 'ביי', 'להתראות',
  'תודה', 'בבקשה', 'סליחה', 'מצטער', 'מצטערת', 'ברוך', 'הבא', 'ברוכים', 'הבאים',
  // Common words
  'אני', 'אתה', 'את', 'אנחנו', 'הם', 'הן', 'הוא', 'היא', 'זה', 'זאת', 'זו',
  'כן', 'לא', 'אולי', 'בטח', 'כמובן', 'בסדר', 'טוב', 'רע', 'מעולה',
  'יש', 'אין', 'צריך', 'צריכה', 'רוצה', 'יכול', 'יכולה', 'חייב', 'חייבת',
  'עכשיו', 'מחר', 'היום', 'אתמול', 'אחרי', 'לפני', 'מתי', 'איפה', 'למה', 'איך',
  'כי', 'גם', 'עוד', 'רק', 'כבר', 'עדיין', 'תמיד', 'אף', 'פעם', 'אבל',
  'של', 'על', 'עם', 'בין', 'ליד', 'בלי', 'מתחת', 'מעל', 'אחד', 'אחת',
  'מה', 'מי', 'כמה', 'איזה', 'שום', 'כל', 'הרבה', 'קצת', 'מעט', 'יותר', 'פחות',
  // Shift / work related
  'משמרת', 'משמרות', 'עבודה', 'עובד', 'עובדת', 'עובדים', 'צוות', 'ניהול', 'מנהל', 'מנהלת',
  'בוקר', 'ערב', 'לילה', 'שחר', 'חצות', 'אמצע', 'פיתוח', 'פרומו', 'מיוחדים', 'פרויקטים',
  'מוטור', 'אינטרנט', 'שוטף', 'לוח', 'סידור', 'שעות', 'שעה', 'דקות', 'דקה',
  'החלפה', 'להחליף', 'מחליף', 'מחליפה', 'זמין', 'זמינה', 'זמינים', 'זמינות',
  'עדיפות', 'העדפה', 'מקסימום', 'מינימום', 'חופש', 'חופשה', 'חופשי', 'מחלה', 'היעדרות',
  // Days
  'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'יום', 'ימים', 'שבוע',
  // Chat / communication
  'הודעה', 'הודעות', 'שלח', 'שלחי', 'קרא', 'קראי', 'ענה', 'עני', 'כתוב', 'כתבי',
  'בדוק', 'בדקי', 'תבדוק', 'תבדקי', 'תשלח', 'תשלחי', 'תכתוב', 'תכתבי',
  'עדכון', 'עדכונים', 'חדש', 'חדשה', 'חדשות', 'בעיה', 'בעיות', 'פתרון',
  // Actions
  'לעשות', 'עשיתי', 'עשית', 'מוכן', 'מוכנה', 'סיימתי', 'התחלתי', 'ממשיך', 'ממשיכה',
  'לבוא', 'באתי', 'הגעתי', 'יוצא', 'יוצאת', 'נשאר', 'נשארת', 'חוזר', 'חוזרת',
  'לעזור', 'עוזר', 'עוזרת', 'עזרה', 'ביטול', 'אישור', 'אשר', 'אשרי', 'מאשר', 'מאשרת',
  // Adjectives / states
  'טוב', 'רע', 'מצוין', 'מצוינת', 'נהדר', 'נהדרת', 'חשוב', 'חשובה', 'דחוף', 'דחופה',
  'קל', 'קשה', 'פשוט', 'מסובך', 'מסובכת', 'בטוח', 'בטוחה', 'מתאים', 'מתאימה',
  'אפשר', 'אפשרי', 'לגמרי', 'בדיוק', 'מהר', 'לאט', 'כרגע', 'מיד',
  // Numbers (spelled out)
  'אחד', 'שניים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר',
  // Positive reactions
  'אחלה', 'סבבה', 'יופי', 'מדהים', 'מושלם', 'מושלמת', 'נכון', 'בהחלט', 'מסכים', 'מסכימה',
  // Misc workplace
  'ישיבה', 'פגישה', 'דיון', 'תכנון', 'דוח', 'דיווח', 'משוב', 'הערה', 'הערות',
  'חירום', 'דחוף', 'רגיל', 'מיוחד', 'מיוחדת', 'קבוע', 'קבועה', 'זמני', 'זמנית',
]);

// ── Common Hebrew typo corrections (misspelling → correction) ──────────
const COMMON_TYPOS = {
  'שולם': 'שלום',
  'שלומ': 'שלום',
  'שאלום': 'שלום',
  'תודא': 'תודה',
  'תודע': 'תודה',
  'טודה': 'תודה',
  'בבקשא': 'בבקשה',
  'בבאקשה': 'בבקשה',
  'מצטאר': 'מצטער',
  'מצטערר': 'מצטער',
  'מצטרת': 'מצטערת',
  'אנחו': 'אנחנו',
  'אנחנוו': 'אנחנו',
  'עבודא': 'עבודה',
  'עבודע': 'עבודה',
  'משמרתת': 'משמרת',
  'משמרט': 'משמרת',
  'משמרות': 'משמרות',
  'מוחן': 'מוכן',
  'מוחנה': 'מוכנה',
  'הודאה': 'הודעה',
  'הודאע': 'הודעה',
  'עדכוון': 'עדכון',
  'עדכונ': 'עדכון',
  'חופשא': 'חופשה',
  'חיפשה': 'חופשה',
  'סלחיה': 'סליחה',
  'סליחא': 'סליחה',
  'סלחיא': 'סליחה',
  'בסדא': 'בסדר',
  'בסאדר': 'בסדר',
  'אפשא': 'אפשר',
  'אפשאר': 'אפשר',
  'מצויין': 'מצוין',
  'מצויינת': 'מצוינת',
  'לגמריי': 'לגמרי',
  'בידיוק': 'בדיוק',
  'מתאיים': 'מתאים',
  'מתאיימה': 'מתאימה',
  'אחאלה': 'אחלה',
  'אחלא': 'אחלה',
  'סאבבה': 'סבבה',
  'סאבה': 'סבבה',
  'סבבא': 'סבבה',
  'מושלמ': 'מושלם',
  'מהדים': 'מדהים',
  'יופיי': 'יופי',
  'ביוקר': 'בוקר',
  'בוקא': 'בוקר',
  'ערב': 'ערב',
  'מחא': 'מחר',
  'מחאר': 'מחר',
  'היומ': 'היום',
  'אתמולל': 'אתמול',
  'ראשוון': 'ראשון',
  'שניי': 'שני',
  'שלשי': 'שלישי',
  'רביעיי': 'רביעי',
  'חמישיי': 'חמישי',
  'שישיי': 'שישי',
  'דוחף': 'דחוף',
  'דחופפ': 'דחוף',
  'חרום': 'חירום',
  'חירומ': 'חירום',
  'פגשיה': 'פגישה',
  'פגישא': 'פגישה',
  'ישביה': 'ישיבה',
  'ישיבא': 'ישיבה',
  'צוואת': 'צוות',
  'צוותת': 'צוות',
  'מנאהל': 'מנהל',
  'מנאהלת': 'מנהלת',
};

// ── Levenshtein distance (edit distance) ───────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Check if a word is a Hebrew word (contains Hebrew characters)
 */
function isHebrewWord(word) {
  return /[\u0590-\u05FF]/.test(word);
}

/**
 * Check a single word and return suggestions.
 * Returns { word, isCorrect, suggestions: string[] }
 */
export function checkWord(word) {
  const clean = word.replace(/[^א-ת]/g, '');
  if (!clean || clean.length < 2 || !isHebrewWord(clean)) {
    return { word, isCorrect: true, suggestions: [] };
  }

  // If the word is in the dictionary, it's correct
  if (DICTIONARY.has(clean)) {
    return { word: clean, isCorrect: true, suggestions: [] };
  }

  // Check common typos map first
  if (COMMON_TYPOS[clean]) {
    return { word: clean, isCorrect: false, suggestions: [COMMON_TYPOS[clean]] };
  }

  // Fuzzy match against dictionary using Levenshtein distance
  const maxDist = clean.length <= 3 ? 1 : 2;
  const candidates = [];

  for (const dictWord of DICTIONARY) {
    // Quick length filter to avoid unnecessary computation
    if (Math.abs(dictWord.length - clean.length) > maxDist) continue;
    const dist = levenshtein(clean, dictWord);
    if (dist > 0 && dist <= maxDist) {
      candidates.push({ word: dictWord, distance: dist });
    }
  }

  // Sort by distance, then alphabetically
  candidates.sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word, 'he'));
  const suggestions = candidates.slice(0, 4).map(c => c.word);

  return {
    word: clean,
    isCorrect: suggestions.length === 0, // if no close match found, assume correct (might just not be in dictionary)
    suggestions
  };
}

/**
 * Check the full text and return an array of misspelled words with suggestions.
 * Returns: { index, original, suggestions }[]
 */
export function checkText(text) {
  if (!text || !text.trim()) return [];

  // Split on whitespace while preserving word positions
  const words = text.split(/\s+/);
  const results = [];

  words.forEach((raw, index) => {
    const clean = raw.replace(/[^א-ת]/g, '');
    if (!clean || clean.length < 2) return;

    const result = checkWord(clean);
    if (!result.isCorrect && result.suggestions.length > 0) {
      results.push({
        index,
        original: raw,
        cleanWord: clean,
        suggestions: result.suggestions
      });
    }
  });

  return results;
}

/**
 * Auto-correct common typos in text (applies only well-known corrections).
 * Returns the corrected text string.
 */
export function autoCorrect(text) {
  if (!text) return text;
  const words = text.split(/(\s+)/); // preserve spaces
  return words.map(word => {
    const clean = word.replace(/[^א-ת]/g, '');
    if (clean.length < 2) return word;
    if (COMMON_TYPOS[clean]) {
      return word.replace(clean, COMMON_TYPOS[clean]);
    }
    return word;
  }).join('');
}

/**
 * Get the last word from text (for real-time checking as user types)
 */
export function getLastWord(text) {
  if (!text) return '';
  const words = text.trimEnd().split(/\s+/);
  return words[words.length - 1] || '';
}
