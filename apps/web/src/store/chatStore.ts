import { useSyncExternalStore } from "react";

type StoreListener = () => void;

function create<T>(createState: (set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void, get: () => T) => T) {
  let state: T;
  const listeners = new Set<StoreListener>();

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState = typeof partial === 'function' ? (partial as any)(state) : partial;
    if (nextState !== state) {
      state = Object.assign({}, state, nextState);
      listeners.forEach(listener => listener());
    }
  };

  const getState = () => state;
  const subscribe = (listener: StoreListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = createState(setState, getState);

  const useStore = <U>(selector: (state: T) => U = (s: any) => s) => {
    return useSyncExternalStore(subscribe, () => selector(getState()));
  };
  
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

export interface ExamContextData {
  subject: string;
  score: number;
  weakTopics: string[];
  masteryTopics: string[];
  completedAt: string;
}

interface ChatState {
  selectedSubject: string;
  latestExamContext: ExamContextData | null;
  
  setSubject: (subject: string) => void;
  setExamContext: (context: ExamContextData | null) => void;
  clearExamContext: () => void;
  hydrate: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  const isBrowser = typeof window !== "undefined";
  
  const getLocalStorageItem = (key: string): string | null => {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeParseJSON = <T>(val: string | null, fallback: T): T => {
    if (!val) return fallback;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };

  const savedSubject = getLocalStorageItem("selectedSubject");
  const savedContext = getLocalStorageItem("latestExamContext");

  return {
    selectedSubject: savedSubject || "auto",
    latestExamContext: safeParseJSON<ExamContextData | null>(savedContext, null),

    setSubject: (subject) => {
      if (isBrowser) {
        try { localStorage.setItem("selectedSubject", subject); } catch {}
      }
      set({ selectedSubject: subject });
    },

  setExamContext: (context) => {
    if (isBrowser) {
      try {
        if (context) {
          localStorage.setItem("latestExamContext", JSON.stringify(context));
        } else {
          localStorage.removeItem("latestExamContext");
        }
      } catch {}
    }
    set({ latestExamContext: context });
  },

  clearExamContext: () => {
    if (isBrowser) {
      try { localStorage.removeItem("latestExamContext"); } catch {}
    }
    set({ latestExamContext: null });
  },

  hydrate: () => {
    const sSubject = getLocalStorageItem("selectedSubject");
    const sContext = getLocalStorageItem("latestExamContext");
    
    set({
      selectedSubject: sSubject || "auto",
      latestExamContext: safeParseJSON<ExamContextData | null>(sContext, null)
    });
  }
  };
});
