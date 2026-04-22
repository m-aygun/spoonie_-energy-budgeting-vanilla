/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  History, 
  Trophy, 
  Settings, 
  ChevronRight,
  Info,
  Moon,
  Sun,
  Coffee,
  Users,
  User,
  Bath,
  Bus,
  Briefcase,
  HeartPulse,
  Utensils,
  Music,
  Gamepad2,
  Tv,
  BookOpen,
  MessageCircle,
  X,
  Pencil,
  Clock,
  Timer,
  Home,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  subDays,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths
} from 'date-fns';
import { Activity, Modifier, Quest, DayState } from './types';

const INITIAL_SPOONS = 12;

const LOW_SPOON_THRESHOLD = 2;

const ENERGY_LEVELS = [
  { level: 1, title: 'Begynder', minXP: 0 },
  { level: 2, title: 'Bevidst', minXP: 100 },
  { level: 3, title: 'Balanceret', minXP: 250 },
  { level: 4, title: 'Selvreguleret', minXP: 450 },
] as const;

const AVATAR_FRAMES = [
  { id: 'mint', label: 'Mint', className: 'bg-pastel-mint text-white', unlockLevel: 1 },
  { id: 'sky', label: 'Sky', className: 'bg-sky-400 text-white', unlockLevel: 2 },
  { id: 'rose', label: 'Rose', className: 'bg-rose-400 text-white', unlockLevel: 3 },
  { id: 'amber', label: 'Amber', className: 'bg-amber-400 text-white', unlockLevel: 4 },
] as const;

const AVATAR_SKINS = [
  { id: 'light', label: 'Lys', className: 'bg-[#F6D2B4]', unlockLevel: 1 },
  { id: 'tan', label: 'Solbrun', className: 'bg-[#DEB08A]', unlockLevel: 1 },
  { id: 'brown', label: 'Brun', className: 'bg-[#B97C56]', unlockLevel: 2 },
  { id: 'deep', label: 'Mork', className: 'bg-[#7A4D34]', unlockLevel: 3 },
] as const;

const AVATAR_HAIRS = [
  { id: 'short', label: 'Kort', colorClass: 'bg-neutral-800', unlockLevel: 1 },
  { id: 'curly', label: 'Krollet', colorClass: 'bg-amber-900', unlockLevel: 2 },
  { id: 'bob', label: 'Bob', colorClass: 'bg-orange-950', unlockLevel: 2 },
  { id: 'bun', label: 'Knold', colorClass: 'bg-neutral-900', unlockLevel: 3 },
] as const;

const AVATAR_TOPS = [
  { id: 'hoodie', label: 'Hoodie', className: 'bg-emerald-400', unlockLevel: 1 },
  { id: 'tee', label: 'T-shirt', className: 'bg-sky-400', unlockLevel: 1 },
  { id: 'jacket', label: 'Jakke', className: 'bg-indigo-500', unlockLevel: 2 },
  { id: 'knit', label: 'Strik', className: 'bg-rose-400', unlockLevel: 3 },
] as const;

const AVATAR_BOTTOMS = [
  { id: 'jeans', label: 'Jeans', className: 'bg-blue-700', unlockLevel: 1 },
  { id: 'joggers', label: 'Joggers', className: 'bg-slate-700', unlockLevel: 1 },
  { id: 'cargo', label: 'Cargo', className: 'bg-emerald-700', unlockLevel: 2 },
  { id: 'smart', label: 'Smart', className: 'bg-violet-700', unlockLevel: 3 },
] as const;

const AVATAR_ACCESSORIES = [
  { id: 'none', label: 'Ingen', emoji: '', unlockLevel: 1 },
  { id: 'glasses', label: 'Briller', emoji: '🕶️', unlockLevel: 2 },
  { id: 'cap', label: 'Kasket', emoji: '🧢', unlockLevel: 2 },
  { id: 'sparkle', label: 'Stjerne', emoji: '✨', unlockLevel: 4 },
] as const;

const getDayRemainingSpoons = (day: DayState) => {
  if (typeof day.remainingSpoons === 'number') {
    return day.remainingSpoons;
  }

  const modifierSum = day.modifiers.reduce((acc, m) => acc + m.value, 0);
  const dayTotal = day.initialSpoons + modifierSum + day.savedFromYesterday + day.borrowedFromTomorrow;
  const dayUsed = day.activities
    .filter(a => a.completed)
    .reduce((acc, a) => {
      if (a.category === 'recovery') {
        return acc - (a.estimatedSpoons || 0);
      }
      return acc + (a.estimatedSpoons || 0);
    }, 0);

  return dayTotal - dayUsed;
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const SUGGESTED_ACTIVITIES: Partial<Activity>[] = [
  { name: 'School/Work', category: 'suggested' },
  { name: 'Social event', category: 'suggested' },
  { name: 'Shower', category: 'suggested' },
  { name: 'Transport', category: 'suggested' },
  { name: 'Chores', category: 'suggested' },
  { name: 'Meeting', category: 'suggested' },
  { name: 'Doctor/Therapy', category: 'suggested' },
  { name: 'Cooking', category: 'suggested' },
];

const RECOVERY_ACTIVITIES: Partial<Activity>[] = [
  { name: 'Relax/read', category: 'recovery' },
  { name: 'Listen to music', category: 'recovery' },
  { name: 'Nap', category: 'recovery' },
  { name: 'Talk to friends', category: 'recovery' },
  { name: 'Play games', category: 'recovery' },
  { name: 'Watch TV', category: 'recovery' },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  'School/Work': <Briefcase className="w-5 h-5" />,
  'Social event': <Users className="w-5 h-5" />,
  'Shower': <Bath className="w-5 h-5" />,
  'Transport': <Bus className="w-5 h-5" />,
  'Chores': <Zap className="w-5 h-5" />,
  'Meeting': <Coffee className="w-5 h-5" />,
  'Doctor/Therapy': <HeartPulse className="w-5 h-5" />,
  'Cooking': <Utensils className="w-5 h-5" />,
  'Relax/read': <BookOpen className="w-5 h-5" />,
  'Listen to music': <Music className="w-5 h-5" />,
  'Nap': <Moon className="w-5 h-5" />,
  'Talk to friends': <MessageCircle className="w-5 h-5" />,
  'Play games': <Gamepad2 className="w-5 h-5" />,
  'Watch TV': <Tv className="w-5 h-5" />,
};

export default function App() {
  const [screen, setScreen] = useState<'main' | 'activity' | 'summary' | 'quests' | 'custom-activity' | 'settings' | 'avatar' | 'edit-activity' | 'history'>('main');
  const [currentActivity, setCurrentActivity] = useState<Partial<Activity> | null>(null);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'suggested' | 'recovery'>('suggested');
  const [estimate, setEstimate] = useState(2);
  const [dayState, setDayState] = useState<DayState>(() => {
    const saved = localStorage.getItem('spoon_day_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toISOString().split('T')[0]) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved day state', e);
      }
    }
    return {
      date: new Date().toISOString().split('T')[0],
      initialSpoons: INITIAL_SPOONS,
      modifiers: [],
      activities: [],
      borrowedFromTomorrow: 0,
      savedFromYesterday: 0,
    };
  });

  const [history, setHistory] = useState<DayState[]>(() => {
    const saved = localStorage.getItem('spoon_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [userName, setUserName] = useState('');
  const [quickAddEnabled, setQuickAddEnabled] = useState(false);
  const [reflection, setReflection] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [breakReminderEnabled, setBreakReminderEnabled] = useState(() => {
    const saved = localStorage.getItem('spoon_break_reminder_enabled');
    return saved !== null ? saved === 'true' : true; // Default to true for new users
  });
  const [breakReminderThreshold, setBreakReminderThreshold] = useState(() => {
    const saved = localStorage.getItem('spoon_break_reminder_threshold');
    return saved ? parseInt(saved, 10) : 2; // Default to 2 spoons // Default to 2 spoons
  });
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReminderAcknowledged, setBreakReminderAcknowledged] = useState(false);
  const [workFromHomeMode, setWorkFromHomeMode] = useState(() => {
    const saved = localStorage.getItem('spoon_work_from_home_mode');
    return saved === 'true';
  });
  const [sickMode, setSickMode] = useState(() => {
    const saved = localStorage.getItem('spoon_sick_mode');
    return saved === 'true';
  });

  const [totalXP, setTotalXP] = useState(() => {
    const saved = localStorage.getItem('spoon_total_xp');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [avatarFrameId, setAvatarFrameId] = useState(() => {
    return localStorage.getItem('spoon_avatar_frame') || 'mint';
  });
  const [avatarSkinId, setAvatarSkinId] = useState(() => {
    return localStorage.getItem('spoon_avatar_skin') || 'light';
  });
  const [avatarHairId, setAvatarHairId] = useState(() => {
    return localStorage.getItem('spoon_avatar_hair') || 'short';
  });
  const [avatarTopId, setAvatarTopId] = useState(() => {
    return localStorage.getItem('spoon_avatar_top') || 'hoodie';
  });
  const [avatarBottomId, setAvatarBottomId] = useState(() => {
    return localStorage.getItem('spoon_avatar_bottom') || 'jeans';
  });
  const [avatarAccessoryId, setAvatarAccessoryId] = useState(() => {
    return localStorage.getItem('spoon_avatar_accessory') || 'none';
  });

  useEffect(() => {
    localStorage.setItem('spoon_day_state', JSON.stringify(dayState));
  }, [dayState]);

  useEffect(() => {
    localStorage.setItem('spoon_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('spoon_break_reminder_enabled', breakReminderEnabled.toString());
    localStorage.setItem('spoon_break_reminder_threshold', breakReminderThreshold.toString());
    localStorage.setItem('spoon_work_from_home_mode', workFromHomeMode.toString());
    localStorage.setItem('spoon_sick_mode', sickMode.toString());
  }, [breakReminderEnabled, breakReminderThreshold, workFromHomeMode, sickMode]);

  useEffect(() => {
    localStorage.setItem('spoon_total_xp', totalXP.toString());
  }, [totalXP]);

  useEffect(() => {
    localStorage.setItem('spoon_avatar_frame', avatarFrameId);
    localStorage.setItem('spoon_avatar_skin', avatarSkinId);
    localStorage.setItem('spoon_avatar_hair', avatarHairId);
    localStorage.setItem('spoon_avatar_top', avatarTopId);
    localStorage.setItem('spoon_avatar_bottom', avatarBottomId);
    localStorage.setItem('spoon_avatar_accessory', avatarAccessoryId);
  }, [avatarFrameId, avatarSkinId, avatarHairId, avatarTopId, avatarBottomId, avatarAccessoryId]);

  const [suggestedActivities, setSuggestedActivities] = useState<Partial<Activity>[]>(SUGGESTED_ACTIVITIES);
  const [recoveryActivities, setRecoveryActivities] = useState<Partial<Activity>[]>(RECOVERY_ACTIVITIES);
  const [editingTemplate, setEditingTemplate] = useState<{ index: number, category: 'suggested' | 'recovery' } | null>(null);
  const [dragSource, setDragSource] = useState<'available' | 'selected' | null>(null);
  const [draggedPlanActivityId, setDraggedPlanActivityId] = useState<string | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<{ category: 'suggested' | 'recovery'; index: number } | null>(null);
  const [showBorrowWarning, setShowBorrowWarning] = useState(false);
  const [hasEstimated, setHasEstimated] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    const saved = localStorage.getItem('spoon_has_seen_onboarding');
    return saved === 'true';
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(!hasSeenOnboarding);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const energyLevel = useMemo(() => {
    return [...ENERGY_LEVELS]
      .reverse()
      .find(({ minXP }) => totalXP >= minXP) ?? ENERGY_LEVELS[0];
  }, [totalXP]);

  const nextEnergyLevel = useMemo(() => {
    return ENERGY_LEVELS.find(({ level }) => level === energyLevel.level + 1) ?? null;
  }, [energyLevel.level]);

  const xpToNextLevel = nextEnergyLevel ? Math.max(0, nextEnergyLevel.minXP - totalXP) : 0;

  const energyProgress = nextEnergyLevel
    ? Math.min(
        100,
        Math.round(((totalXP - energyLevel.minXP) / (nextEnergyLevel.minXP - energyLevel.minXP)) * 100)
      )
    : 100;

  const unlockedAvatarFrames = useMemo(() => {
    return AVATAR_FRAMES.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const unlockedAvatarSkins = useMemo(() => {
    return AVATAR_SKINS.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const unlockedAvatarHairs = useMemo(() => {
    return AVATAR_HAIRS.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const unlockedAvatarTops = useMemo(() => {
    return AVATAR_TOPS.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const unlockedAvatarBottoms = useMemo(() => {
    return AVATAR_BOTTOMS.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const unlockedAvatarAccessories = useMemo(() => {
    return AVATAR_ACCESSORIES.filter(option => option.unlockLevel <= energyLevel.level);
  }, [energyLevel.level]);

  const selectedAvatarFrame = AVATAR_FRAMES.find(option => option.id === avatarFrameId) ?? AVATAR_FRAMES[0];
  const selectedAvatarSkin = AVATAR_SKINS.find(option => option.id === avatarSkinId) ?? AVATAR_SKINS[0];
  const selectedAvatarHair = AVATAR_HAIRS.find(option => option.id === avatarHairId) ?? AVATAR_HAIRS[0];
  const selectedAvatarTop = AVATAR_TOPS.find(option => option.id === avatarTopId) ?? AVATAR_TOPS[0];
  const selectedAvatarBottom = AVATAR_BOTTOMS.find(option => option.id === avatarBottomId) ?? AVATAR_BOTTOMS[0];
  const selectedAvatarAccessory = AVATAR_ACCESSORIES.find(option => option.id === avatarAccessoryId) ?? AVATAR_ACCESSORIES[0];

  const renderFullBodyAvatar = (size: 'small' | 'large' = 'small') => {
    const isLarge = size === 'large';
    const frameSize = isLarge ? 'w-14 h-20 rounded-2xl' : 'w-10 h-12 rounded-xl';
    const headSize = isLarge ? 'w-8 h-8' : 'w-6 h-6';
    const torso = isLarge ? 'w-6 h-6' : 'w-4 h-4';
    const legs = isLarge ? 'w-2 h-5' : 'w-1.5 h-3';
    const armHeight = isLarge ? 'h-5' : 'h-3';
    const accessorySize = isLarge ? 'text-sm' : 'text-[10px]';
    const hairTop = isLarge ? '-top-1' : '-top-0.5';

    const hairShape = (() => {
      switch (selectedAvatarHair.id) {
        case 'curly':
          return 'rounded-full';
        case 'bob':
          return 'rounded-t-2xl rounded-b-sm';
        case 'bun':
          return 'rounded-t-full';
        default:
          return 'rounded-t-full rounded-b-sm';
      }
    })();

    return (
      <div className={`${frameSize} ${selectedAvatarFrame.className} relative flex items-end justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-white/10" />
        <div className={`absolute top-1 left-1/2 -translate-x-1/2 rounded-full shadow-sm ${selectedAvatarSkin.className} ${headSize}`}>
          <div className={`absolute ${hairTop} left-1/2 -translate-x-1/2 ${headSize} ${selectedAvatarHair.colorClass} ${hairShape}`} />
          {selectedAvatarAccessory.id !== 'none' && (
            <span className={`absolute -top-1 right-0 ${accessorySize}`} role="img" aria-label={`Accessory: ${selectedAvatarAccessory.label}`}>
              {selectedAvatarAccessory.emoji}
            </span>
          )}
        </div>
        <div className={`absolute top-[42%] left-1/2 -translate-x-1/2 rounded-t-md ${selectedAvatarTop.className} ${torso}`} />
        <div className={`absolute top-[45%] left-[28%] w-1 ${armHeight} rounded-full ${selectedAvatarSkin.className} rotate-12`} />
        <div className={`absolute top-[45%] right-[28%] w-1 ${armHeight} rounded-full ${selectedAvatarSkin.className} -rotate-12`} />
        <div className={`absolute bottom-1 left-[42%] rounded-full ${selectedAvatarBottom.className} ${legs}`} />
        <div className={`absolute bottom-1 right-[42%] rounded-full ${selectedAvatarBottom.className} ${legs}`} />
      </div>
    );
  };

  useEffect(() => {
    if (!unlockedAvatarFrames.some(option => option.id === avatarFrameId)) {
      setAvatarFrameId(unlockedAvatarFrames[0].id);
    }
    if (!unlockedAvatarSkins.some(option => option.id === avatarSkinId)) {
      setAvatarSkinId(unlockedAvatarSkins[0].id);
    }
    if (!unlockedAvatarHairs.some(option => option.id === avatarHairId)) {
      setAvatarHairId(unlockedAvatarHairs[0].id);
    }
    if (!unlockedAvatarTops.some(option => option.id === avatarTopId)) {
      setAvatarTopId(unlockedAvatarTops[0].id);
    }
    if (!unlockedAvatarBottoms.some(option => option.id === avatarBottomId)) {
      setAvatarBottomId(unlockedAvatarBottoms[0].id);
    }
    if (!unlockedAvatarAccessories.some(option => option.id === avatarAccessoryId)) {
      setAvatarAccessoryId(unlockedAvatarAccessories[0].id);
    }
  }, [
    avatarFrameId,
    avatarSkinId,
    avatarHairId,
    avatarTopId,
    avatarBottomId,
    avatarAccessoryId,
    unlockedAvatarFrames,
    unlockedAvatarSkins,
    unlockedAvatarHairs,
    unlockedAvatarTops,
    unlockedAvatarBottoms,
    unlockedAvatarAccessories,
  ]);

  useEffect(() => {
    localStorage.setItem('spoon_user_name', userName);
  }, [userName]);

  useEffect(() => {
    const savedName = localStorage.getItem('spoon_user_name');
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      setShowOnboardingModal(true);
      localStorage.setItem('spoon_has_seen_onboarding', 'true');
      setHasSeenOnboarding(true);
    }
  }, []);

  const handleNextOnboardingStep = () => {
    if (onboardingStep < 4) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setShowOnboardingModal(false);
    }
  };

  const renderOnboardingModal = () => {
    const steps = [
      {
        title: 'Velkommen til Spoonie! 🌟',
        subtitle: 'Dit energi-budgeterings værktøj',
        description: 'Spoonie hjælper dig med at styre din daglige energi ved hjælp af \"spoons\" - en konkret måde at målemetro din kapacitet.',
        icon: <Zap className="w-12 h-12" />,
      },
      {
        title: 'Hvad er \"Spoons\"? 🥄',
        subtitle: 'Din daglige energi-valuta',
        description: 'Hver aktivitet koster spoons. Du starter med 12 spoons daglig. Når du planlægger aktiviteter, bruger du spoons. Hvis du løber tør, er det fint - du kan låne fra i morgen (men det har konsekvenser).',
        icon: <Coffee className="w-12 h-12" />,
      },
      {
        title: 'Udvikl din energi-kompetence ⭐',
        subtitle: 'Små skridt, tydelig udvikling',
        description: 'Når du gennemfører aktiviteter og passer på din energi, optjener du XP, som løfter dit niveau i energi-kompetence. Fokus er på personlig udvikling og bedre selvforståelse over tid.',
        icon: <TrendingUp className="w-12 h-12" />,
      },
      {
        title: 'Træt-Streak 😴',
        subtitle: 'Registrer når du har det dårligt',
        description: 'Hvis du slutter en dag med færre end 2 spoons tilbage, tæller det som en \"træt dag\". Efter 3 dage i træk med få spoons, låses konkrete valg op som gør det lettere at bruge appen.',
        icon: <Moon className="w-12 h-12" />,
      },
      {
        title: 'Du er klar! 🚀',
        subtitle: 'Kom i gang med din første dag',
        description: 'Start med at tilføje aktiviteter til din plan. Estimér hvor meget energi hver aktivitet bruger, og luk dagen når du er færdig. Din data gemmes automatisk.',
        icon: <CheckCircle2 className="w-12 h-12" />,
      },
    ];

    const step = steps[onboardingStep];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-pastel-mint to-pastel-lavender rounded-2xl flex items-center justify-center text-white">
              {step.icon}
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-[#2D3436]">{step.title}</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
          </div>

          <div className="flex gap-2 justify-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i <= onboardingStep ? 'bg-pastel-mint w-6' : 'bg-gray-200 w-2'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNextOnboardingStep}
            className="w-full py-4 bg-gradient-to-r from-pastel-mint to-pastel-lavender text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:shadow-lg transition-all"
          >
            {onboardingStep === 4 ? 'Kom i gang' : 'Næste'}
          </button>
        </motion.div>
      </motion.div>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const displayName = userName || 'Friend';
    if (hour >= 5 && hour < 12) return `Good morning, ${displayName}`;
    if (hour >= 18 || hour < 5) return `Good evening, ${displayName}`;
    return `Hello, ${displayName}`;
  };

  const totalSpoons = useMemo(() => {
    const modifierSum = dayState.modifiers.reduce((acc, m) => acc + m.value, 0);
    // Borrowing from tomorrow adds to today's total
    return dayState.initialSpoons + modifierSum + dayState.savedFromYesterday + dayState.borrowedFromTomorrow;
  }, [dayState]);

  const usedSpoons = useMemo(() => {
    return dayState.activities
      .filter(a => a.completed)
      .reduce((acc, a) => {
        if (a.category === 'recovery') {
          return acc - (a.estimatedSpoons || 0);
        }
        const baseCost = a.estimatedSpoons || 0;
        const effectiveCost = sickMode ? baseCost * 2 : baseCost;
        return acc + effectiveCost;
      }, 0);
  }, [dayState.activities, sickMode]);

  const remainingSpoons = totalSpoons - usedSpoons;

  const tiredStreak = useMemo(() => {
    const byDate = new Map<string, number>();

    history.forEach(day => {
      byDate.set(day.date, getDayRemainingSpoons(day));
    });

    byDate.set(dayState.date, remainingSpoons);

    let currentDate = new Date(`${dayState.date}T00:00:00`);
    let streakCount = 0;

    while (true) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayRemaining = byDate.get(dateKey);

      if (dayRemaining === undefined || dayRemaining > LOW_SPOON_THRESHOLD) {
        break;
      }

      streakCount += 1;
      currentDate = subDays(currentDate, 1);
    }

    return streakCount;
  }, [history, dayState.date, remainingSpoons]);

  const showInteractiveSpoonTraining = tiredStreak < 3;

  const maxInteractiveEstimate = useMemo(() => {
    return Math.max(8, totalSpoons, estimate);
  }, [totalSpoons, estimate]);

  const plannedSpoons = useMemo(() => {
    return dayState.activities.reduce((acc, a) => {
      const spoons = a.estimatedSpoons || 0;
      if (a.category === 'recovery') {
        return acc - spoons;
      }
      const sickModeCost = sickMode ? spoons * 2 : spoons;
      // In work from home mode, halve the cost for uncompleted activities
      const cost = workFromHomeMode && !a.completed ? sickModeCost / 2 : sickModeCost;
      return acc + cost;
    }, 0);
  }, [dayState.activities, workFromHomeMode, sickMode]);

  const getDisplaySpoons = (activity: Partial<Activity>) => {
    const spoons = activity.estimatedSpoons || 0;
    if (activity.category === 'recovery') {
      return spoons;
    }
    return sickMode ? spoons * 2 : spoons;
  };

  useEffect(() => {
    if (!breakReminderEnabled) return;

    const lowSpoonThreshold = Math.min(Math.max(1, breakReminderThreshold), totalSpoons);
    if (remainingSpoons <= lowSpoonThreshold && !showBreakModal && !breakReminderAcknowledged) {
      setShowBreakModal(true);
    }

    if (remainingSpoons > lowSpoonThreshold && breakReminderAcknowledged) {
      setBreakReminderAcknowledged(false);
    }
  }, [breakReminderEnabled, remainingSpoons, totalSpoons, showBreakModal, breakReminderAcknowledged, breakReminderThreshold]);

  const handleAddModifier = (label: string, value: number) => {
    setDayState(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, { id: Math.random().toString(), label, value }]
    }));
  };

  const handleStartActivity = (activity: Partial<Activity>) => {
    setCurrentActivity(activity);
    const initialEstimate = activity.estimatedSpoons || 2;
    setEstimate(initialEstimate);
    setCustomName(activity.name || '');
    
    // If it's an existing activity (has id), always go to edit
    if (activity.id) {
      setHasEstimated(true);
      setScreen('edit-activity');
      return;
    }

    // Quick Add logic: if enabled and we have an estimate (from template)
    if (quickAddEnabled && activity.estimatedSpoons !== undefined) {
      const newActivity: Activity = {
        id: Math.random().toString(),
        name: activity.name || '',
        estimatedSpoons: activity.estimatedSpoons,
        category: activity.category as 'suggested' | 'recovery',
        completed: false,
      };
      setDayState(prev => ({
        ...prev,
        activities: [...prev.activities, newActivity]
      }));
      return;
    }

    setHasEstimated(false);
    setScreen('activity');
  };

  const handleStartCustomActivity = (category: 'suggested' | 'recovery') => {
    setCustomCategory(category);
    setCustomName('');
    setScreen('custom-activity');
  };

  const handleConfirmCustomName = () => {
    if (customName.trim()) {
      handleStartActivity({ name: customName, category: customCategory });
    }
  };

  const handleRemoveSuggested = (name: string) => {
    setSuggestedActivities(prev => prev.filter(a => a.name !== name));
  };

  const handleRemoveRecovery = (name: string) => {
    setRecoveryActivities(prev => prev.filter(a => a.name !== name));
  };

  const handleEditSuggested = (act: Partial<Activity>, index: number) => {
    setCustomName(act.name || '');
    setCustomCategory('suggested');
    setEditingTemplate({ index, category: 'suggested' });
    setCurrentActivity(act);
    setEstimate(act.estimatedSpoons || 2);
    setHasEstimated(true);
    setScreen('edit-activity');
  };

  const handleEditRecovery = (act: Partial<Activity>, index: number) => {
    setCustomName(act.name || '');
    setCustomCategory('recovery');
    setEditingTemplate({ index, category: 'recovery' });
    setCurrentActivity(act);
    setEstimate(act.estimatedSpoons || 2);
    setHasEstimated(true);
    setScreen('edit-activity');
  };

  const handleConfirmActivity = (finalName: string, finalEstimate: number) => {
    if (currentActivity) {
      if (currentActivity.id) {
        // Editing existing in plan
        setDayState(prev => ({
          ...prev,
          activities: prev.activities.map(a => 
            a.id === currentActivity.id ? { ...a, name: finalName, estimatedSpoons: finalEstimate } : a
          )
        }));
      } else {
        // Adding new OR updating template
        if (editingTemplate) {
          const updateList = (prev: Partial<Activity>[]) => {
            const newList = [...prev];
            newList[editingTemplate.index] = { 
              ...newList[editingTemplate.index], 
              name: finalName, 
              estimatedSpoons: finalEstimate 
            };
            return newList;
          };

          if (editingTemplate.category === 'suggested') {
            setSuggestedActivities(updateList);
          } else {
            setRecoveryActivities(updateList);
          }
          setEditingTemplate(null);
        } else {
          // Adding new
          const newActivity: Activity = {
            id: Math.random().toString(),
            name: finalName,
            estimatedSpoons: finalEstimate,
            category: currentActivity.category!,
            completed: false,
          };
          setDayState(prev => ({
            ...prev,
            activities: [...prev.activities, newActivity]
          }));

          // Add to suggested/recovery lists if it's a new custom activity
          if (currentActivity.category === 'suggested') {
            const exists = suggestedActivities.some(a => a.name === finalName);
            if (!exists) {
              setSuggestedActivities(prev => [...prev, { name: finalName, category: 'suggested', estimatedSpoons: finalEstimate }]);
            }
          } else if (currentActivity.category === 'recovery') {
            const exists = recoveryActivities.some(a => a.name === finalName);
            if (!exists) {
              setRecoveryActivities(prev => [...prev, { name: finalName, category: 'recovery', estimatedSpoons: finalEstimate }]);
            }
          }
        }
      }
    }
    setScreen('main');
    setCurrentActivity(null);
  };

  const handleToggleComplete = (id: string) => {
    setDayState(prev => {
      const updatedActivities = prev.activities.map(a => 
        a.id === id ? { ...a, completed: !a.completed } : a
      );

      // Award XP when completing (not when unchecking)
      const activity = prev.activities.find(a => a.id === id);
      if (activity && !activity.completed) {
        const xpGain = Math.max(5, (activity.estimatedSpoons || 1) * 10);
        setTotalXP(prev => prev + xpGain);
      }

      return {
        ...prev,
        activities: updatedActivities
      };
    });
  };

  const handleDeleteActivity = (id: string) => {
    setDayState(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id)
    }));
  };

  const handleReorderPlanActivities = (targetId: string) => {
    if (!draggedPlanActivityId || draggedPlanActivityId === targetId) return;

    setDayState(prev => {
      const fromIndex = prev.activities.findIndex(a => a.id === draggedPlanActivityId);
      const toIndex = prev.activities.findIndex(a => a.id === targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }

      return {
        ...prev,
        activities: moveItem(prev.activities, fromIndex, toIndex),
      };
    });

    setDraggedPlanActivityId(null);
  };

  const handleReorderTemplates = (category: 'suggested' | 'recovery', targetIndex: number) => {
    if (!draggedTemplate || draggedTemplate.category !== category || draggedTemplate.index === targetIndex) return;

    if (category === 'suggested') {
      setSuggestedActivities(prev => moveItem(prev, draggedTemplate.index, targetIndex));
    } else {
      setRecoveryActivities(prev => moveItem(prev, draggedTemplate.index, targetIndex));
    }

    setDraggedTemplate(null);
  };

  const moveOneSpoonToSelected = () => {
    setEstimate(prev => Math.min(maxInteractiveEstimate, prev + 1));
  };

  const moveOneSpoonBack = () => {
    setEstimate(prev => Math.max(1, prev - 1));
  };

  const handleEstimateDrop = (target: 'available' | 'selected') => {
    if (dragSource === 'available' && target === 'selected') {
      moveOneSpoonToSelected();
    }

    if (dragSource === 'selected' && target === 'available') {
      moveOneSpoonBack();
    }

    setDragSource(null);
  };

  const renderInteractiveEstimateSelector = (isRecovery: boolean) => {
    const selectedCount = Math.max(1, estimate);
    const availableCount = Math.max(0, maxInteractiveEstimate - selectedCount);

    return (
      <div className="bg-gray-50 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-gray-500 font-medium text-center">
          Tag en ske ad gangen og flyt den ned i feltet.
        </p>

        <div className="w-full space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleEstimateDrop('selected')}
            className="bg-white border-2 border-dashed border-pastel-mint/40 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valgt felt</span>
              <span className={`text-sm font-black ${isRecovery ? 'text-pastel-green' : 'text-pastel-mint'}`}>
                {isRecovery ? '+' : ''}{selectedCount}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {Array.from({ length: selectedCount }).map((_, i) => (
                <button
                  key={`selected-${i}`}
                  type="button"
                  draggable
                  onDragStart={() => setDragSource('selected')}
                  onClick={moveOneSpoonBack}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm active:scale-95 transition-all ${isRecovery ? 'bg-pastel-green' : 'bg-pastel-mint'}`}
                  aria-label="Fjern en ske"
                >
                  <Zap className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleEstimateDrop('available')}
            className="bg-white border border-gray-100 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tilgaengelige skeer</span>
              <span className="text-sm font-bold text-gray-500">{availableCount}</span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {Array.from({ length: availableCount }).map((_, i) => (
                <button
                  key={`available-${i}`}
                  type="button"
                  draggable
                  onDragStart={() => setDragSource('available')}
                  onClick={moveOneSpoonToSelected}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                  aria-label="Tilfoej en ske"
                >
                  <Zap className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleEditPlanActivity = (act: Activity) => {
    setCustomName(act.name);
    setCustomCategory(act.category);
    setCurrentActivity(act);
    setEstimate(act.estimatedSpoons);
    setHasEstimated(true); // Already has an estimate
    setScreen('edit-activity');
  };

  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowAmount, setBorrowAmount] = useState(2);

  const handleBorrowSpoons = () => {
    setBorrowAmount(2);
    setIsBorrowModalOpen(true);
  };

  const confirmBorrow = () => {
    setDayState(prev => ({
      ...prev,
      borrowedFromTomorrow: prev.borrowedFromTomorrow + borrowAmount
    }));
    setIsBorrowModalOpen(false);
    setShowBorrowWarning(true);
    setTimeout(() => setShowBorrowWarning(false), 3000);
  };

  const handleSaveSpoons = () => {
    setScreen('summary');
  };

  const handleCompleteDay = () => {
    const completedDay: DayState = {
      ...dayState,
      reflection,
      totalSpoons,
      remainingSpoons,
    };

    // Award bonus XP if day went well (remaining spoons >= 0)
    if (remainingSpoons >= 0) {
      const bonusXP = Math.min(50, remainingSpoons * 5);
      setTotalXP(prev => prev + bonusXP);
    }

    // Update history, avoiding duplicates for the same date
    setHistory(prev => {
      const filtered = prev.filter(d => d.date !== completedDay.date);
      return [...filtered, completedDay].sort((a, b) => b.date.localeCompare(a.date));
    });

    // Reset for tomorrow (or just clear today's activities if they want to stay on the same date for some reason, 
    // but usually this means they are done for today)
    // We don't necessarily need to reset dayState here because the initial state logic 
    // will handle it when the date changes. 
    // But we might want to clear it so they see a fresh start if they stay up late.
    
    setScreen('history');
    setReflection('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3436] font-sans selection:bg-pastel-mint selection:text-white">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {renderFullBodyAvatar('small')}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#2D3436]">Spoonie</h1>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-pastel-lavender" />
                <span className="text-[10px] font-bold text-pastel-lavender uppercase tracking-wider">Niveau {energyLevel.level}: {energyLevel.title}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setScreen('history')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <History className="w-6 h-6 text-gray-400" />
            </button>
            <button onClick={() => setScreen('quests')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Trophy className="w-6 h-6 text-pastel-peach" />
            </button>
            <button onClick={() => setScreen('settings')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 pb-24 overflow-y-auto">
          <AnimatePresence mode="wait">
            {screen === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Greeting */}
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <h2 className="text-3xl font-black text-[#2D3436]">{getGreeting()}</h2>
                </div>

                <button
                  onClick={() => setScreen('avatar')}
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-pastel-lavender/50 hover:bg-pastel-lavender/5 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {renderFullBodyAvatar('small')}
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800">Avatar Studio</p>
                      <p className="text-xs text-gray-500">Aendre din avatar direkte herfra</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>

                {/* Spoon Indicator */}
                <section className="bg-gradient-to-br from-pastel-mint to-pastel-lavender rounded-3xl p-6 text-gray-800 shadow-xl shadow-pastel-mint/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Today's Spoons</p>
                      <h2 className={`text-4xl font-black transition-all duration-300 ${
                        remainingSpoons <= 2 
                          ? 'text-pastel-pink bg-white/95 px-3 py-1 rounded-2xl inline-block shadow-sm' 
                          : 'text-gray-800'
                      }`}>
                        {remainingSpoons} / {totalSpoons}
                      </h2>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                      {Array.from({ length: Math.max(0, remainingSpoons) }).map((_, i) => (
                        <Zap key={i} className="w-5 h-5 text-gray-800/80" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                      onClick={() => handleAddModifier('Slept badly', -2)}
                      className="whitespace-nowrap bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Moon className="w-3 h-3" /> Slept badly -2
                    </button>
                    <button 
                      onClick={() => handleAddModifier('Extra rest', 2)}
                      className="whitespace-nowrap bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Sun className="w-3 h-3" /> +2 from yesterday
                    </button>
                  </div>

                  <div className="mt-4 bg-white/80 border border-gray-100 rounded-3xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-pastel-blue" />
                        <div>
                          <h4 className="font-bold">Work from Home Mode</h4>
                          <p className="text-xs text-gray-500">Halves planned spoon costs for uncompleted activities.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setWorkFromHomeMode(!workFromHomeMode)}
                        className={`w-12 h-6 rounded-full transition-all relative ${workFromHomeMode ? 'bg-pastel-blue' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${workFromHomeMode ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* My Plan Section */}
                {dayState.activities.length > 0 && (
                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">My Plan</h3>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition-colors ${
                          (plannedSpoons > totalSpoons || remainingSpoons <= 2) ? 'bg-pastel-pink/30 text-pastel-pink border-pastel-pink/50' : 'bg-pastel-mint/30 text-pastel-mint border-pastel-mint/50'
                        }`}>
                          {plannedSpoons} SPOONS
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {dayState.activities.filter(a => a.completed).length}/{dayState.activities.length} Done
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-3">Drag aktiviteter for at aendre raekkefolgen.</p>
                    <div className="space-y-3">
                      {dayState.activities.map((act) => (
                        <div
                          key={act.id}
                          draggable
                          onDragStart={() => setDraggedPlanActivityId(act.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleReorderPlanActivities(act.id)}
                          onDragEnd={() => setDraggedPlanActivityId(null)}
                          className={`relative group flex items-center justify-between p-4 bg-white border rounded-2xl transition-all shadow-sm ${
                            act.completed ? 'border-pastel-green/50 bg-pastel-green/10 opacity-60' : 'border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleToggleComplete(act.id)}>
                            <div className={`p-2 rounded-lg ${act.completed ? 'bg-pastel-green/30 text-pastel-green' : 'bg-pastel-mint/30 text-pastel-mint'}`}>
                              {act.completed ? <CheckCircle2 className="w-5 h-5" /> : (ACTIVITY_ICONS[act.name] || <Zap className="w-5 h-5" />)}
                            </div>
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm ${act.completed ? 'line-through text-gray-400' : ''}`}>
                                {act.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-semibold ${act.category === 'recovery' ? 'text-pastel-green' : 'text-gray-400'}`}>
                                  {act.category === 'recovery' ? '+' : ''}{getDisplaySpoons(act)}
                                </span>
                                <Zap className={`w-3 h-3 ${act.category === 'recovery' ? 'text-pastel-green' : 'text-pastel-mint'}`} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="p-1 text-gray-300 cursor-grab active:cursor-grabbing" title="Drag for at flytte">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <circle cx="9" cy="6" r="1.2" />
                                <circle cx="15" cy="6" r="1.2" />
                                <circle cx="9" cy="12" r="1.2" />
                                <circle cx="15" cy="12" r="1.2" />
                                <circle cx="9" cy="18" r="1.2" />
                                <circle cx="15" cy="18" r="1.2" />
                              </svg>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditPlanActivity(act)}
                                className="p-2 hover:bg-pastel-mint/20 rounded-full text-pastel-mint transition-colors"
                                title="Edit activity"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-2 hover:bg-pastel-pink/20 rounded-full text-pastel-pink transition-colors"
                                title="Remove from plan"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={() => handleStartActivity(act)}
                              className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Suggested Activities */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Suggested for today</h3>
                    <button 
                      onClick={() => handleStartCustomActivity('suggested')}
                      className="text-pastel-mint text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add activity
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-3">Drag kort for at aendre raekkefolgen.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {suggestedActivities.map((act, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => setDraggedTemplate({ category: 'suggested', index: i })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleReorderTemplates('suggested', i)}
                        onDragEnd={() => setDraggedTemplate(null)}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleStartActivity(act)}
                          className="w-full flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-pastel-mint/50 hover:bg-pastel-mint/10 transition-all text-left shadow-sm"
                        >
                          <div className="p-2 bg-pastel-mint/30 text-pastel-mint rounded-lg shrink-0">
                            {ACTIVITY_ICONS[act.name!] || <Zap className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm line-clamp-1">{act.name}</span>
                            {act.estimatedSpoons && (
                              <span className="text-[10px] text-gray-400 font-bold">{getDisplaySpoons(act)} Spoons</span>
                            )}
                          </div>
                        </button>
                        <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSuggested(act, i);
                            }}
                            className="p-1 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-pastel-mint hover:border-pastel-mint shadow-sm"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSuggested(act.name!);
                            }}
                            className="p-1 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-pastel-pink hover:border-pastel-pink shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recovery Activities */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Recovery / Low-energy</h3>
                    <button 
                      onClick={() => handleStartCustomActivity('recovery')}
                      className="text-pastel-green text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 font-semibold mb-3">Drag kort for at aendre raekkefolgen.</p>
                  <div className="space-y-3">
                    {recoveryActivities.map((act, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => setDraggedTemplate({ category: 'recovery', index: i })}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleReorderTemplates('recovery', i)}
                        onDragEnd={() => setDraggedTemplate(null)}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleStartActivity(act)}
                          className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-pastel-green/50 hover:bg-pastel-green/10 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-pastel-green/30 text-pastel-green rounded-lg shrink-0">
                              {ACTIVITY_ICONS[act.name!] || <Zap className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{act.name}</span>
                              {act.estimatedSpoons && (
                                <span className="text-[10px] text-gray-400 font-bold">+{getDisplaySpoons(act)} Spoons</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRecovery(act, i);
                            }}
                            className="p-1.5 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-pastel-mint hover:border-pastel-mint shadow-sm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRecovery(act.name!);
                            }}
                            className="p-1.5 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-pastel-pink hover:border-pastel-pink shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Carry Over Indicator */}
                <div className="flex items-center gap-3 p-4 bg-pastel-peach/30 rounded-2xl border border-pastel-peach/50">
                  <Info className="w-5 h-5 text-pastel-peach shrink-0" />
                  <p className="text-sm text-pastel-peach font-medium">
                    Remaining spoons will carry over to tomorrow.
                  </p>
                </div>
              </motion.div>
            )}

            {screen === 'custom-activity' && (
              <motion.div
                key="custom-activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    setScreen('main');
                    setEditingTemplate(null);
                  }} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-mint uppercase tracking-widest">New Activity</h2>
                    <h3 className="text-3xl font-black">What's the plan?</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm focus-within:border-pastel-mint/50 transition-all">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="e.g. Reading, Grocery shopping..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirmCustomName()}
                      className="w-full text-xl font-bold outline-none placeholder:text-gray-300"
                    />
                  </div>
                  <p className="text-sm text-gray-400 text-center px-4">
                    Give your activity a name that helps you remember it later.
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    disabled={!customName.trim()}
                    onClick={handleConfirmCustomName}
                    className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    Next: Estimate energy
                  </button>
                  <button 
                    onClick={() => setScreen('main')}
                    className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:border-pastel-mint/50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
            {screen === 'edit-activity' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    setScreen('main');
                    setCurrentActivity(null);
                  }} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-mint uppercase tracking-widest">Edit Plan</h2>
                    <h3 className="text-3xl font-black">Adjust Activity</h3>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm focus-within:border-pastel-mint/50 transition-all">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Activity Name</p>
                    <input 
                      type="text"
                      placeholder="Activity name..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full text-xl font-bold outline-none placeholder:text-gray-300"
                    />
                  </div>

                  {showInteractiveSpoonTraining
                    ? renderInteractiveEstimateSelector(currentActivity?.category === 'recovery')
                    : (
                      <div className="bg-gray-50 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6">
                        <p className="text-gray-500 font-medium">
                          {currentActivity?.category === 'recovery' ? 'How many spoons will this restore?' : 'How many spoons will this take?'}
                        </p>
                        <div className="flex items-center gap-8">
                          <button 
                            onClick={() => setEstimate(Math.max(1, estimate - 1))}
                            className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                          >
                            <Minus className="w-6 h-6" />
                          </button>
                          <div className="flex flex-col items-center">
                            <span className={`text-6xl font-black ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-[#2D3436]'}`}>
                              {currentActivity?.category === 'recovery' ? '+' : ''}{estimate}
                            </span>
                            <div className="flex gap-1 mt-2">
                              {Array.from({ length: estimate }).map((_, i) => (
                                <Zap key={i} className={`w-4 h-4 ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-pastel-mint'}`} />
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => setEstimate(estimate + 1)}
                            className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                          >
                            <Plus className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                <div className="space-y-3">
                  <button 
                    disabled={!customName.trim()}
                    onClick={() => {
                      if (currentActivity) {
                        handleConfirmActivity(customName, estimate);
                      }
                    }}
                    className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      if (editingTemplate) {
                        if (editingTemplate.category === 'suggested') {
                          setSuggestedActivities(prev => prev.filter((_, i) => i !== editingTemplate.index));
                        } else {
                          setRecoveryActivities(prev => prev.filter((_, i) => i !== editingTemplate.index));
                        }
                        setEditingTemplate(null);
                        setScreen('main');
                        setCurrentActivity(null);
                      } else if (currentActivity?.id) {
                        handleDeleteActivity(currentActivity.id);
                        setScreen('main');
                        setCurrentActivity(null);
                      }
                    }}
                    className="w-full py-4 bg-pastel-pink/30 text-pastel-pink rounded-2xl font-bold border border-pastel-pink/50 hover:bg-pastel-pink/50 transition-all"
                  >
                    {editingTemplate ? 'Delete template' : 'Remove from plan'}
                  </button>
                </div>
              </motion.div>
            )}

            {screen === 'activity' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    setScreen('main');
                    setEditingTemplate(null);
                    setCurrentActivity(null);
                  }} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-mint uppercase tracking-widest">Activity</h2>
                    <h3 className="text-3xl font-black">{currentActivity?.name}</h3>
                  </div>
                </div>

                {showInteractiveSpoonTraining
                  ? renderInteractiveEstimateSelector(currentActivity?.category === 'recovery')
                  : (
                    <div className="bg-gray-50 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6">
                      <p className="text-gray-500 font-medium">
                        {currentActivity?.category === 'recovery' ? 'How many spoons will this restore?' : 'How many spoons will this take?'}
                      </p>
                      <div className="flex items-center gap-8">
                        <button 
                          onClick={() => setEstimate(Math.max(1, estimate - 1))}
                          className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col items-center">
                          <span className={`text-6xl font-black ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-[#2D3436]'}`}>
                            {currentActivity?.category === 'recovery' ? '+' : ''}{estimate}
                          </span>
                          <div className="flex gap-1 mt-2">
                            {Array.from({ length: estimate }).map((_, i) => (
                              <Zap key={i} className={`w-4 h-4 ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-pastel-mint'}`} />
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => setEstimate(estimate + 1)}
                          className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  )}

                <AnimatePresence>
                  {!hasEstimated && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <button 
                        onClick={() => setIsLearningModalOpen(true)}
                        className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all flex items-center justify-center gap-2"
                      >
                        Check community estimate <ChevronRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                  {hasEstimated && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <button 
                        onClick={() => handleConfirmActivity(currentActivity?.name || '', estimate)}
                        className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all"
                      >
                        {currentActivity?.id ? 'Update estimate' : 'Confirm estimate'}
                      </button>
                      {currentActivity?.id && (
                        <button 
                          onClick={() => {
                            handleDeleteActivity(currentActivity.id!);
                            setScreen('main');
                            setCurrentActivity(null);
                          }}
                          className="w-full py-4 bg-pastel-pink/30 text-pastel-pink rounded-2xl font-bold border border-pastel-pink/50 hover:bg-pastel-pink/50 transition-all"
                        >
                          Remove from plan
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-center text-xs text-gray-400 px-8">
                  Estimating helps you learn your energy patterns over time.
                </p>
              </motion.div>
            )}

            {screen === 'quests' && (
              <motion.div
                key="quests"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('main')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-2xl font-black">Quests & Rewards</h2>
                </div>

                <div className="bg-gradient-to-r from-pastel-peach to-pastel-pink p-6 rounded-3xl text-white shadow-xl shadow-pastel-peach/20">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Current Streak</h3>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">Day {tiredStreak}/7</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <div key={d} className={`flex-1 h-2 rounded-full ${d <= tiredStreak ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pastel-mint/30 rounded-2xl flex items-center justify-center text-pastel-mint">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Consistency Bonus</h4>
                        <p className="text-xs text-gray-500">3-day streak reward</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-pastel-mint font-bold block">+2 spoons</span>
                      <span className="text-[10px] text-pastel-lavender font-black uppercase tracking-tighter">Unlocks Quick Add</span>
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pastel-green/30 rounded-2xl flex items-center justify-center text-pastel-green">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Recovery Master</h4>
                        <p className="text-xs text-gray-500">3 recovery activities</p>
                      </div>
                    </div>
                    <span className="text-pastel-green font-bold">+1 spoon</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pastel-lavender to-pastel-mint p-6 rounded-3xl text-white shadow-xl shadow-pastel-lavender/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">Energi-kompetence</h3>
                      <p className="text-xs font-semibold opacity-80">Niveau {energyLevel.level}: {energyLevel.title}</p>
                    </div>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{totalXP}</span>
                    <span className="text-sm font-semibold opacity-90">XP samlet</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                      <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${energyProgress}%` }} />
                    </div>
                    <p className="text-xs opacity-90">
                      {nextEnergyLevel
                        ? `${xpToNextLevel} XP til niveau ${nextEnergyLevel.level}: ${nextEnergyLevel.title}`
                        : 'Du har nået højeste niveau i energi-kompetence.'}
                    </p>
                    <p className="text-xs opacity-75">XP markerer din udvikling i at forstå og regulere din energi, ikke et spilscore.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  <h3 className="font-bold">Status</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Remaining spoons today</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-lg">{remainingSpoons}</span>
                      <Zap className="w-4 h-4 text-pastel-mint" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {screen === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('main')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-mint uppercase tracking-widest">Preferences</h2>
                    <h3 className="text-3xl font-black">Settings</h3>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-gray-900">
                      <User className="w-5 h-5 text-pastel-mint" />
                      <h4 className="font-bold">Your Name</h4>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Personalize your experience by adding your name.
                    </p>
                    <input 
                      type="text"
                      placeholder="Enter your name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-pastel-mint/30 text-sm font-medium"
                    />
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-gray-900">
                      <Zap className="w-5 h-5 text-pastel-mint" />
                      <h4 className="font-bold">Daily Spoon Budget</h4>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      How many spoons do you usually start your day with? You can adjust this based on your baseline energy.
                    </p>
                    <div className="flex items-center justify-center gap-6 py-4">
                      <button 
                        onClick={() => setDayState(prev => ({ ...prev, initialSpoons: Math.max(1, prev.initialSpoons - 1) }))}
                        className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-pastel-mint transition-all"
                      >
                        <Minus className="w-6 h-6" />
                      </button>
                      <span className="text-4xl font-black text-gray-900">{dayState.initialSpoons}</span>
                      <button 
                        onClick={() => setDayState(prev => ({ ...prev, initialSpoons: prev.initialSpoons + 1 }))}
                        className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-pastel-mint transition-all"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-900">
                        <Clock className="w-5 h-5 text-pastel-mint" />
                        <h4 className="font-bold">Break Reminder</h4>
                      </div>
                      <button 
                        onClick={() => setBreakReminderEnabled(!breakReminderEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${breakReminderEnabled ? 'bg-pastel-mint' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${breakReminderEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Få en blid påmindelse om at tage en pause, når dine spoons bliver lave.
                    </p>
                    {breakReminderEnabled && (
                      <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Påmind mig ved</span>
                          <span className="text-sm font-bold text-pastel-mint">{breakReminderThreshold} spoons</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max={Math.max(1, totalSpoons)} 
                          step="1"
                          value={breakReminderThreshold}
                          onChange={(e) => setBreakReminderThreshold(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-pastel-mint"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <span>1 spoon</span>
                          <span>{Math.max(1, totalSpoons)} spoons</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-900">
                        <AlertCircle className="w-5 h-5 text-pastel-pink" />
                        <h4 className="font-bold">Sick Mode</h4>
                      </div>
                      <button
                        onClick={() => setSickMode(!sickMode)}
                        className={`w-12 h-6 rounded-full transition-all relative ${sickMode ? 'bg-pastel-pink' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sickMode ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Når Sick Mode er aktiv, koster alle energi-krævende aktiviteter dobbelt antal spoons.
                    </p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-900">
                        <Zap className="w-5 h-5 text-pastel-lavender" />
                        <h4 className="font-bold">Quick Add</h4>
                      </div>
                      {tiredStreak < 3 ? (
                        <div className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl">
                          <History className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Streak {tiredStreak}/3
                          </span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setQuickAddEnabled(!quickAddEnabled)}
                          className={`w-12 h-6 rounded-full transition-all relative ${quickAddEnabled ? 'bg-pastel-lavender' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${quickAddEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Skip the estimation steps for activities you've already set up. Perfect for busy days!
                    </p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-gray-900">
                      <History className="w-5 h-5 text-pastel-peach" />
                      <h4 className="font-bold">Reset Day</h4>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Want to start fresh? This will clear all activities and resets your spoons for today.
                    </p>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to reset your day? This cannot be undone.')) {
                          setDayState({
                            date: new Date().toISOString().split('T')[0],
                            initialSpoons: INITIAL_SPOONS,
                            modifiers: [],
                            activities: [],
                            borrowedFromTomorrow: 0,
                            savedFromYesterday: 0,
                          });
                          setScreen('main');
                        }
                      }}
                      className="w-full py-4 bg-pastel-pink/30 text-pastel-pink rounded-2xl font-bold border border-pastel-pink/50 hover:bg-pastel-pink/50 transition-all"
                    >
                      Reset Today's Progress
                    </button>
                  </div>

                  <div className="bg-pastel-mint/30 p-6 rounded-3xl space-y-3 border border-pastel-mint/50">
                    <div className="flex items-center gap-2 text-pastel-mint">
                      <Info className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-wider">About Spoonie</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Spoonie is a tool designed to help people with chronic illness or limited energy manage their "spoons" throughout the day. 
                      Remember: your worth is not defined by your productivity.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setScreen('main')}
                  className="w-full py-4 bg-[#2D3436] text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all"
                >
                  Save & Return
                </button>
              </motion.div>
            )}

            {screen === 'avatar' && (
              <motion.div
                key="avatar"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('main')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-lavender uppercase tracking-widest">Customization</h2>
                    <h3 className="text-3xl font-black">Avatar</h3>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Dress up din avatar med hud, har, toj og accessories. Flere dele lases op, nar dit energi-kompetence niveau stiger.
                  </p>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    {renderFullBodyAvatar('large')}
                    <div>
                      <p className="text-sm font-bold text-gray-800">Din avatar</p>
                      <p className="text-xs text-gray-500">Niveau {energyLevel.level}: {energyLevel.title}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hudtone</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_SKINS.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarSkinId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarSkinId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-lavender bg-pastel-lavender/10'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-lavender/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full ${option.className}`} />
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Har</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_HAIRS.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarHairId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarHairId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-peach bg-pastel-peach/20'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-peach/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-4 rounded-t-full ${option.colorClass}`} />
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overdel</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_TOPS.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarTopId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarTopId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-mint bg-pastel-mint/15'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-mint/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded ${option.className}`} />
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Underdel</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_BOTTOMS.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarBottomId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarBottomId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-blue bg-pastel-blue/15'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-blue/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded ${option.className}`} />
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Accessory</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_ACCESSORIES.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarAccessoryId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarAccessoryId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-lavender bg-pastel-lavender/10'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-lavender/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base" role="img" aria-hidden="true">{option.emoji || '○'}</span>
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Baggrund</p>
                    <div className="grid grid-cols-2 gap-2">
                      {AVATAR_FRAMES.map(option => {
                        const unlocked = option.unlockLevel <= energyLevel.level;
                        const active = option.id === avatarFrameId;
                        return (
                          <button
                            key={option.id}
                            disabled={!unlocked}
                            onClick={() => unlocked && setAvatarFrameId(option.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'border-pastel-mint bg-pastel-mint/10'
                                : 'border-gray-200 bg-white'
                            } ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-pastel-mint/60'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full ${option.className}`} />
                              <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                            </div>
                            {!unlocked && (
                              <p className="text-[10px] text-gray-500 mt-1">Låses op ved niveau {option.unlockLevel}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {screen === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('main')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-2xl font-black">Day Summary</h2>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-gray-500">Remaining spoons</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-5xl font-black">{remainingSpoons}</span>
                      <Zap className="w-8 h-8 text-pastel-mint" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <p className="font-bold text-center">Reflect on your day</p>
                    <p className="text-sm text-gray-600 text-center px-4">
                      {remainingSpoons < 0 
                        ? "Why did you run out of spoons today? It's okay to overspend sometimes, but let's look at what happened."
                        : "Great job managing your energy! You have some spoons left for tomorrow."}
                    </p>
                    <textarea 
                      placeholder="Write a quick note..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-pastel-mint/50 text-sm h-32 resize-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCompleteDay}
                  className="w-full py-4 bg-[#2D3436] text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all"
                >
                  Complete Day
                </button>
              </motion.div>
            )}

            {screen === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8 py-4"
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => setScreen('main')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1 text-center pr-10">
                    <h2 className="text-sm font-bold text-pastel-mint uppercase tracking-widest">Insights</h2>
                    <h3 className="text-3xl font-black">History</h3>
                  </div>
                </div>

                {/* Statistics Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Avg Spoons</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black">
                        {history.length > 0 
                          ? (history.reduce((acc, d) => acc + (d.remainingSpoons || 0), 0) / history.length).toFixed(1)
                          : '0'}
                      </span>
                      <Zap className="w-4 h-4 text-pastel-mint" />
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Days</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black">{history.length}</span>
                      <CheckCircle2 className="w-4 h-4 text-pastel-green" />
                    </div>
                  </div>
                </div>

                {/* Energy Trend Chart */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-pastel-mint" />
                    Energy Trend
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[...history].reverse().slice(-7)}>
                        <defs>
                          <linearGradient id="colorSpoons" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D9F2E6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#D9F2E6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F2F6" />
                        <XAxis 
                          dataKey="date" 
                          hide 
                        />
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as DayState;
                              return (
                                <div className="bg-[#2D3436] text-white p-3 rounded-2xl shadow-xl text-xs">
                                  <p className="font-bold mb-1">{format(new Date(data.date), 'MMM d')}</p>
                                  <p className="text-pastel-mint">{data.remainingSpoons} spoons left</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="remainingSpoons" 
                          stroke="#D9F2E6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSpoons)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">Last 7 recorded days</p>
                </div>

                {/* Calendar View */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">Calendar</h4>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </button>
                      <span className="text-sm font-bold">{format(currentMonth, 'MMMM yyyy')}</span>
                      <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                      <div key={day} className="text-center text-[10px] font-black text-gray-300 uppercase">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const start = startOfWeek(startOfMonth(currentMonth));
                      const end = endOfWeek(endOfMonth(currentMonth));
                      const days = eachDayOfInterval({ start, end });

                      return days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = history.find(d => d.date === dateStr);
                        const isCurrentMonth = format(day, 'MM') === format(currentMonth, 'MM');
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div 
                            key={dateStr}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                              !isCurrentMonth ? 'opacity-20' : 'opacity-100'
                            } ${
                              dayData 
                                ? dayData.remainingSpoons! < 0 ? 'bg-pastel-pink/30' : 'bg-pastel-mint/30' 
                                : isToday ? 'border-2 border-pastel-mint/50' : ''
                            }`}
                          >
                            <span className={`text-xs font-bold ${
                              dayData 
                                ? dayData.remainingSpoons! < 0 ? 'text-pastel-pink' : 'text-pastel-mint'
                                : isToday ? 'text-pastel-mint' : 'text-gray-400'
                            }`}>
                              {format(day, 'd')}
                            </span>
                            {dayData && (
                              <div className={`w-1 h-1 rounded-full mt-1 ${
                                dayData.remainingSpoons! < 0 ? 'bg-pastel-pink' : 'bg-pastel-mint'
                              }`} />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Recent Reflections */}
                <div className="space-y-4">
                  <h4 className="font-bold px-2">Recent Reflections</h4>
                  <div className="space-y-3">
                    {history.slice(0, 3).map(day => (
                      <div key={day.date} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {format(new Date(day.date), 'EEEE, MMM d')}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${day.remainingSpoons! < 0 ? 'text-pastel-pink' : 'text-pastel-mint'}`}>
                              {day.remainingSpoons}
                            </span>
                            <Zap className={`w-3 h-3 ${day.remainingSpoons! < 0 ? 'text-pastel-pink' : 'text-pastel-mint'}`} />
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 italic leading-relaxed">
                          "{day.reflection || "No reflection added."}"
                        </p>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No history yet. Complete a day to see insights!</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation / Actions */}
        {screen === 'main' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
            <div className="flex gap-3">
              <button 
                onClick={handleBorrowSpoons}
                className="flex-1 py-4 bg-pastel-peach/30 text-pastel-peach rounded-2xl font-bold border border-pastel-peach/50 flex items-center justify-center gap-2 hover:bg-pastel-peach/50 transition-all"
              >
                <AlertCircle className="w-5 h-5" /> Borrow
              </button>
              <button 
                onClick={handleSaveSpoons}
                className="flex-1 py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all"
              >
                Save Spoons
              </button>
            </div>
          </div>
        )}

        {/* Onboarding Modal */}
        <AnimatePresence>
          {showOnboardingModal && renderOnboardingModal()}
        </AnimatePresence>

        {/* Borrow Warning Overlay */}
        <AnimatePresence>
          {showBorrowWarning && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-24 left-6 right-6 z-50"
            >
              <div className="bg-[#2D3436] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-pastel-peach" />
                <div>
                  <p className="font-bold text-sm">Borrowed {borrowAmount} spoons</p>
                  <p className="text-xs text-gray-400">You'll have {borrowAmount} fewer spoons tomorrow.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Learning Moment Modal */}
        <AnimatePresence>
          {isLearningModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 bg-pastel-mint/30 rounded-2xl flex items-center justify-center text-pastel-mint mx-auto">
                  <Users className="w-10 h-10" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black">Learning Moment</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {estimate === 3 
                      ? `You estimated 3. Others also rate this as 3. Spot on!`
                      : estimate < 3
                        ? `You estimated ${estimate}. Others usually rate this as 3. You might be underestimating, or this is just easier for you!`
                        : `You estimated ${estimate}. Others usually rate this as 3. This might be a learning moment for your energy patterns.`
                    }
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setEstimate(Math.max(1, estimate - 1))}
                      className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className={`text-4xl font-black ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-pastel-mint'}`}>
                        {currentActivity?.category === 'recovery' ? '+' : ''}{estimate}
                      </span>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: Math.min(estimate, 10) }).map((_, i) => (
                          <Zap key={i} className={`w-3 h-3 ${currentActivity?.category === 'recovery' ? 'text-pastel-green' : 'text-pastel-mint'}`} />
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => setEstimate(estimate + 1)}
                      className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-pastel-mint active:scale-95 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="bg-pastel-mint/30 p-4 rounded-2xl space-y-3 border border-pastel-mint/50">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Community Insight</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">Average Rating</span>
                    <span className="font-bold text-pastel-mint">3 Spoons</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    Comparing your energy needs with others helps you build a more accurate map of your own capacity.
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setHasEstimated(true);
                      setIsLearningModalOpen(false);
                    }}
                    className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all"
                  >
                    Keep my estimate ({estimate})
                  </button>
                  <button 
                    onClick={() => {
                      setEstimate(3);
                      setHasEstimated(true);
                      setIsLearningModalOpen(false);
                    }}
                    className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:border-pastel-mint/50 transition-all"
                  >
                    Adjust to 3 spoons
                  </button>
                  <button 
                    onClick={() => setIsLearningModalOpen(false)}
                    className="w-full py-2 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                  >
                    Go back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Borrow Modal (Learning Moment) */}
        <AnimatePresence>
          {isBorrowModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 bg-pastel-peach/30 rounded-2xl flex items-center justify-center text-pastel-peach mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black">Borrowing Spoons?</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    How many spoons do you need to borrow from tomorrow?
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setBorrowAmount(Math.max(1, borrowAmount - 1))}
                      className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-pastel-peach active:scale-95 transition-all"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-black text-pastel-peach">
                        {borrowAmount}
                      </span>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: Math.min(borrowAmount, 10) }).map((_, i) => (
                          <Zap key={i} className="w-3 h-3 text-pastel-peach" />
                        ))}
                        {borrowAmount > 10 && <span className="text-[10px] font-bold text-pastel-peach">+</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => setBorrowAmount(borrowAmount + 1)}
                      className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-pastel-peach active:scale-95 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-pastel-peach/30 p-4 rounded-2xl space-y-3 border border-pastel-peach/50">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">The Consequence</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">Tomorrow's Energy</span>
                    <span className="font-bold text-pastel-peach">-{borrowAmount} Spoons</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight">
                    Borrowing is like a high-interest loan. Overspending today often leads to a "crash" tomorrow.
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={confirmBorrow}
                    className="w-full py-4 bg-pastel-peach text-white rounded-2xl font-bold shadow-lg shadow-pastel-peach/20 hover:bg-pastel-peach/80 transition-all"
                  >
                    I understand, borrow anyway
                  </button>
                  <button 
                    onClick={() => setIsBorrowModalOpen(false)}
                    className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:border-gray-200 transition-all"
                  >
                    Wait, I'll adjust my plan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Break Reminder Modal */}
        <AnimatePresence>
          {showBreakModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
              >
                <div className="w-20 h-20 bg-pastel-mint/30 rounded-3xl flex items-center justify-center text-pastel-mint mx-auto relative">
                  <Coffee className="w-10 h-10" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-pastel-mint rounded-full flex items-center justify-center text-white"
                  >
                    <Zap className="w-3 h-3" />
                  </motion.div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Tid til en pause?</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Dine spoons er ved at være lave. En kort pause nu kan hjælpe dig med at bevare energi til senere!
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      setShowBreakModal(false);
                      setBreakReminderAcknowledged(true);
                      setScreen('main'); // Go to main to see recovery activities
                    }}
                    className="w-full py-4 bg-pastel-mint text-white rounded-2xl font-bold shadow-lg shadow-pastel-mint/20 hover:bg-pastel-mint/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Coffee className="w-5 h-5" /> Tag en pause
                  </button>
                  <button 
                    onClick={() => {
                      setShowBreakModal(false);
                      setBreakReminderAcknowledged(true);
                    }}
                    className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                  >
                    Jeg hviler senere
                  </button>
                </div>
                
                <p className="text-[11px] text-gray-400 italic">
                  "Rest is not a reward, it's a requirement."
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
