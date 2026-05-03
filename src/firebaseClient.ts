import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';

export interface ActivitySuggestion {
  activity: string;
  met: number;
  suggestedSpoons: number;
}

export interface AutocompleteDebugInfo {
  query: string;
  docsLoaded: number;
  matchesFound: number;
  reason: string;
}

interface FirestoreActivityRecord {
  [key: string]: unknown;
  activity?: string;
  activity_clean?: string;
  keywords?: string[];
  met?: number;
  suggested_spoons?: number;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(value => typeof value === 'string' && value.length > 0);
console.log('[Firebase] hasFirebaseConfig:', hasFirebaseConfig, '| projectId:', firebaseConfig.projectId);

const app = hasFirebaseConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

const db = app ? getFirestore(app) : null;

const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
};

const estimateSpoonsFromMet = (met: number) => {
  if (met < 2) return 1;
  if (met < 3.5) return 2;
  if (met < 5) return 3;
  if (met < 6.5) return 4;
  return 5;
};

let activitiesCache: FirestoreActivityRecord[] | null = null;
let lastAutocompleteDebug: AutocompleteDebugInfo = {
  query: '',
  docsLoaded: 0,
  matchesFound: 0,
  reason: '',
};

const CANDIDATE_COLLECTIONS = ['activities'] as const;

const toStringValue = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const getRecordActivityName = (record: FirestoreActivityRecord): string => {
  const preferredKeys = ['activity', 'activity_clean', 'name', 'activityName', 'title', 'label'] as const;
  for (const key of preferredKeys) {
    const value = toStringValue(record[key]);
    if (value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim().length > 1) {
      return value;
    }
  }

  return '';
};

const getRecordKeywords = (record: FirestoreActivityRecord): string[] => {
  const rawKeywords = record.keywords;
  if (Array.isArray(rawKeywords)) {
    return rawKeywords.filter((item): item is string => typeof item === 'string');
  }

  if (typeof rawKeywords === 'string' && rawKeywords.trim()) {
    return rawKeywords.split(/[;,\s]+/).filter(Boolean);
  }

  const fallback = getRecordActivityName(record);
  return fallback ? fallback.split(/\s+/).filter(Boolean) : [];
};

const getRecordMet = (record: FirestoreActivityRecord): number => {
  const possible = [record.met, record.met_value, record.metValue, record.MET];
  for (const value of possible) {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      return num;
    }
  }
  return 0;
};

const getRecordSuggestedSpoons = (record: FirestoreActivityRecord): number => {
  const possible = [record.suggested_spoons, record.suggestedSpoons, record.spoons, record.spoon_cost];
  for (const value of possible) {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) {
      return num;
    }
  }
  return 0;
};

const getCachedActivities = async (): Promise<FirestoreActivityRecord[]> => {
  if (activitiesCache) {
    return activitiesCache;
  }

  if (!db) {
    lastAutocompleteDebug = {
      query: lastAutocompleteDebug.query,
      docsLoaded: 0,
      matchesFound: 0,
      reason: hasFirebaseConfig
        ? 'Firestore instance not initialized.'
        : 'Firebase config missing (create .env.local with VITE_FIREBASE_*).',
    };
    return [];
  }

  const allRecords: FirestoreActivityRecord[] = [];
  const seen = new Set<string>();
  const collectionErrors: string[] = [];

  for (const collectionName of CANDIDATE_COLLECTIONS) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      for (const doc of snapshot.docs) {
        const data = doc.data() as FirestoreActivityRecord;
        const key = normalizeText(getRecordActivityName(data)) || doc.id;
        if (!seen.has(key)) {
          seen.add(key);
          allRecords.push(data);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Firebase] Error reading collection '${collectionName}':`, error);
      collectionErrors.push(`${collectionName}: ${message}`);
    }
  }

  activitiesCache = allRecords;

  if (allRecords.length === 0) {
    const permissionError = collectionErrors.find(msg => msg.toLowerCase().includes('permission'));
    lastAutocompleteDebug = {
      query: lastAutocompleteDebug.query,
      docsLoaded: 0,
      matchesFound: 0,
      reason: permissionError
        ? 'Firestore permission denied: opdater regler for laeseadgang.'
        : collectionErrors.length > 0
          ? `No docs loaded. Error: ${collectionErrors.join(' | ')}`
          : 'No docs in collections activities/activity/Activities.',
    };
  }

  return activitiesCache;
};

const scoreActivityMatch = (record: FirestoreActivityRecord, queryText: string): number => {
  const activityName = getRecordActivityName(record);
  const activity = normalizeText(activityName);
  const activityClean = normalizeText(toStringValue(record.activity_clean));
  const keywords = getRecordKeywords(record).map(keyword => normalizeText(keyword));

  if (activity === queryText || activityClean === queryText) return 100;
  if (activity.startsWith(queryText) || activityClean.startsWith(queryText)) return 80;
  if (keywords.some(keyword => keyword.startsWith(queryText))) return 60;
  if (activity.includes(queryText) || activityClean.includes(queryText)) return 40;
  if (keywords.some(keyword => keyword.includes(queryText))) return 20;
  return 0;
};

export const searchActivitySuggestions = async (
  rawInput: string,
  maxResults = 8
): Promise<ActivitySuggestion[]> => {
  const queryText = normalizeText(rawInput);
  if (!queryText || queryText.length < 2) {
    lastAutocompleteDebug = {
      query: rawInput,
      docsLoaded: activitiesCache?.length || 0,
      matchesFound: 0,
      reason: queryText ? 'Skriv mindst 2 tegn.' : '',
    };
    return [];
  }

  lastAutocompleteDebug = {
    query: rawInput,
    docsLoaded: activitiesCache?.length || 0,
    matchesFound: 0,
    reason: '',
  };

  const records = await getCachedActivities();
  if (!records.length) {
    lastAutocompleteDebug = {
      query: rawInput,
      docsLoaded: 0,
      matchesFound: 0,
      reason: lastAutocompleteDebug.reason || 'No records were loaded from Firestore.',
    };
    return [];
  }

  const unique = new Set<string>();
  const matches = records
    .map(record => ({ record, score: scoreActivityMatch(record, queryText) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.record)
    .filter(record => {
      const key = normalizeText(getRecordActivityName(record));
      if (!key || unique.has(key)) {
        return false;
      }
      unique.add(key);
      return true;
    })
    .slice(0, Math.max(1, maxResults));

  lastAutocompleteDebug = {
    query: rawInput,
    docsLoaded: records.length,
    matchesFound: matches.length,
    reason: matches.length === 0 ? 'Data loaded, but no match for this text.' : '',
  };

  return matches.map(record => {
    const met = getRecordMet(record);
    const suggestedSpoons = met > 0 ? estimateSpoonsFromMet(met) : getRecordSuggestedSpoons(record) || 2;
    const activityName = getRecordActivityName(record);

    return {
      activity: activityName || rawInput,
      met,
      suggestedSpoons,
    };
  });
};

export const getAutocompleteDebugInfo = (): AutocompleteDebugInfo => {
  return lastAutocompleteDebug;
};

export const getSuggestionFromFirestore = async (activityName: string): Promise<ActivitySuggestion | null> => {
  if (!db || !activityName.trim()) {
    return null;
  }

  const normalizedName = normalizeText(activityName);
  if (!normalizedName) {
    return null;
  }

  const words = normalizedName.split(/\s+/).filter(word => word.length > 2);
  const lookupWord = words[0] || normalizedName;

  const snapshot = await getDocs(
    query(collection(db, 'activities'), where('keywords', 'array-contains', lookupWord), limit(30))
  );

  if (snapshot.empty) {
    return null;
  }

  const docs = snapshot.docs.map(doc => doc.data() as { activity?: string; met?: number; suggested_spoons?: number });

  const exact = docs.find(item => normalizeText(item.activity || '') === normalizedName) || docs[0];
  const met = Number(exact.met) || 0;
  const suggestedSpoons = met > 0 ? estimateSpoonsFromMet(met) : Number(exact.suggested_spoons) || 0;

  if (suggestedSpoons <= 0) {
    return null;
  }

  return {
    activity: exact.activity || activityName,
    met,
    suggestedSpoons,
  };
};

export const getActivities = async () => {
  if (!db) {
    console.warn('Firebase is not configured. Add VITE_FIREBASE_* values in your .env file.');
    return [];
  }

  const data = await getCachedActivities();

  console.log(data);
  return data;
};
