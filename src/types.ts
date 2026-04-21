/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Activity {
  id: string;
  name: string;
  estimatedSpoons: number;
  actualSpoons?: number;
  category: 'suggested' | 'recovery';
  completed: boolean;
}

export interface Modifier {
  id: string;
  label: string;
  value: number;
}

export interface Quest {
  id: string;
  label: string;
  reward: number;
  daysRequired: number;
  currentStreak: number;
}

export interface DayState {
  date: string;
  initialSpoons: number;
  modifiers: Modifier[];
  activities: Activity[];
  borrowedFromTomorrow: number;
  savedFromYesterday: number;
  reflection?: string;
  totalSpoons?: number;
  remainingSpoons?: number;
}
