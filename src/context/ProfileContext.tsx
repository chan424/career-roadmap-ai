import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { careers, careersById, labels, model, sampleProfile } from '../model/catalog';
import {
  coerceDraft,
  emptyDraft,
  profileToDraft,
  validateDraft,
  decodeProfile,
  type FieldErrors,
} from '../model/profile';
import { scoreAll } from '../model/scoring';
import type { DraftProfile, MatchResult, UserProfile } from '../model/types';

const PROFILE_KEY = 'career-roadmap.v1.profile';
const COMPARE_KEY = 'career-roadmap.v1.compare';
const DRAFT_KEY = 'career-roadmap.v1.draft';

interface ProfileContextValue {
  ready: boolean;
  profile: UserProfile | null;
  draft: DraftProfile;
  shareError: boolean;
  compareIds: string[];
  matches: MatchResult[] | null;
  setDraft: (draft: DraftProfile) => void;
  toggleInterest: (id: string) => void;
  setSkill: (id: string, level: number) => void;
  setEducation: (level: DraftProfile['educationLevel']) => void;
  setStream: (stream: string) => void;
  setFocusText: (text: string) => void;
  setPreference: (key: keyof DraftProfile['preferences'], value: string) => void;
  submitDraft: () => { ok: true; profile: UserProfile } | { ok: false; errors: FieldErrors };
  editFromSaved: () => void;
  loadSample: () => void;
  clearAll: () => void;
  toggleCompare: (id: string) => 'added' | 'removed' | 'full';
  replaceCompare: (ids: string[]) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readStorage(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode or a full disk should not break the assessment. */
  }
}

function removeStorage(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* Ignore storage failures. */
  }
}

function storedProfile(): UserProfile | null {
  const validated = validateDraft(coerceDraft(readStorage(localStorage, PROFILE_KEY)));
  return validated.ok ? validated.profile : null;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<DraftProfile>(emptyDraft);
  const [shareError, setShareError] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('p');
    let nextProfile: UserProfile | null = null;
    let badShare = false;
    if (token) {
      const decoded = decodeProfile(token);
      if (decoded.ok) nextProfile = decoded.profile;
      else badShare = true;
    }
    if (!nextProfile) nextProfile = storedProfile();

    let nextDraft = nextProfile ? profileToDraft(nextProfile) : emptyDraft();
    if (!token) {
      const sessionDraft = readStorage(sessionStorage, DRAFT_KEY);
      if (sessionDraft) nextDraft = coerceDraft(sessionDraft);
    }

    const storedCompare = readStorage(localStorage, COMPARE_KEY);
    const ids = Array.isArray(storedCompare)
      ? storedCompare.filter((id): id is string => typeof id === 'string' && id in careersById).slice(0, 3)
      : [];

    setProfile(nextProfile);
    setDraft(nextDraft);
    setCompareIds(ids);
    setShareError(badShare);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStorage(sessionStorage, DRAFT_KEY, draft);
  }, [draft, ready]);

  useEffect(() => {
    if (!ready) return;
    if (profile) writeStorage(localStorage, PROFILE_KEY, profile);
    else removeStorage(localStorage, PROFILE_KEY);
  }, [profile, ready]);

  useEffect(() => {
    if (!ready) return;
    writeStorage(localStorage, COMPARE_KEY, compareIds);
  }, [compareIds, ready]);

  const matches = useMemo(
    () => (profile ? scoreAll(profile, careers, model, labels) : null),
    [profile],
  );

  const value = useMemo<ProfileContextValue>(() => {
    const toggleInterest = (id: string) => {
      setDraft((current) => {
        const has = current.interests.includes(id);
        return {
          ...current,
          interests: has ? current.interests.filter((item) => item !== id) : [...current.interests, id],
        };
      });
    };
    const setSkill = (id: string, level: number) => {
      setDraft((current) => ({ ...current, skills: { ...current.skills, [id]: level } }));
    };
    const setPreference = (key: keyof DraftProfile['preferences'], preference: string) => {
      setDraft((current) => ({ ...current, preferences: { ...current.preferences, [key]: preference } }));
    };
    return {
      ready,
      profile,
      draft,
      shareError,
      compareIds,
      matches,
      setDraft,
      toggleInterest,
      setSkill,
      setEducation: (level) => setDraft((current) => ({ ...current, educationLevel: level })),
      setStream: (stream) => setDraft((current) => ({ ...current, stream })),
      setFocusText: (focusText) => setDraft((current) => ({ ...current, focusText })),
      setPreference,
      submitDraft: () => {
        const result = validateDraft(draft);
        if (!result.ok) return result;
        setProfile(result.profile);
        setDraft(profileToDraft(result.profile));
        setShareError(false);
        return result;
      },
      editFromSaved: () => {
        if (profile) setDraft(profileToDraft(profile));
      },
      loadSample: () => {
        setProfile(sampleProfile);
        setDraft(profileToDraft(sampleProfile));
        setShareError(false);
      },
      clearAll: () => {
        setProfile(null);
        setDraft(emptyDraft());
        setCompareIds([]);
        setShareError(false);
        removeStorage(localStorage, PROFILE_KEY);
        removeStorage(localStorage, COMPARE_KEY);
        removeStorage(sessionStorage, DRAFT_KEY);
      },
      toggleCompare: (id: string) => {
        if (compareIds.includes(id)) {
          setCompareIds(compareIds.filter((item) => item !== id));
          return 'removed';
        }
        if (compareIds.length >= 3) return 'full';
        setCompareIds([...compareIds, id]);
        return 'added';
      },
      replaceCompare: (ids: string[]) => {
        setCompareIds(ids.filter((id) => id in careersById).slice(0, 3));
      },
    };
  }, [ready, profile, draft, shareError, compareIds, matches]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// The provider and the hook live together so saved-profile state has one owner.
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used within ProfileProvider');
  return value;
}
