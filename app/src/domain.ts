// SAIL domain model (client copy, kept in sync with server/src/domain.ts).
export type Phase = 'forethought' | 'performance' | 'reflection';
export type Condition = 'metacog' | 'plain';
export type StrategyKind =
  | 'retrieval_practice'
  | 'self_explanation'
  | 'worked_example'
  | 'interleaving'
  | 'spaced'
  | 'other';

export interface SessionGoal { id: string; text: string; isTicked: boolean; createdAt: string }
export interface TimerSegment { startTime: string; endTime?: string }
export interface StrategyChoice { id: string; kind: StrategyKind; note?: string }
export type Rating = 1 | 2 | 3 | 4 | 5;

export type ScaffoldStyle = 'problematizing' | 'structuring';   // RQ11
export type ScaffoldTiming = 'responsive' | 'proactive';        // RQ9
export type TaskKind = 'coursework' | 'seminar_reading' | 'exam_prep' | 'research_writing' | 'thesis_dissertation' | 'project_lab';
export type PlaceCategory = 'stable_study' | 'classroom' | 'home_like' | 'transit' | 'work_social' | 'other' | 'not_shared';
export type PolicyAction = 'abstain' | 'prompt_monitoring' | 'prompt_control' | 'prompt_reflection' | 'fade' | 'escalate';
export type HelpSeekingQuality = 'instrumental' | 'executive' | 'avoidance' | 'none';
export type ScaffoldFidelity = 'aligned' | 'drift' | 'not_applicable';
export type SpatialSource = 'gps' | 'device_motion' | 'manual';
export type SpatialPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'error';
export type MobilityState = 'still' | 'moving' | 'unknown';
export type SpatialTrackingState = 'off' | 'live' | 'ended';
export type SpatialTrackingMode = 'study_spot' | 'route';

export interface ContextTrace {
  placeCategory: PlaceCategory;
  placeLabel?: string;
  intentionallyChosen?: boolean;
  rawLocationStored: false;
}

export interface SpatialTrace {
  acquisitionMode: 'off' | 'manual' | 'auto';
  capturedAt?: string;
  sources: SpatialSource[];
  permissionState?: SpatialPermissionState;
  coarseLatitude?: number;
  coarseLongitude?: number;
  accuracyMeters?: number;
  speedMetersPerSecond?: number | null;
  motionMagnitude?: number | null;
  mobilityState: MobilityState;
  trackingState?: SpatialTrackingState;
  trackingMode?: SpatialTrackingMode;
  trackingStartedAt?: string;
  trackingEndedAt?: string;
  lastSampleAt?: string;
  sampleCount?: number;
  distanceMeters?: number;
  dwellSeconds?: number;
  transitionCount?: number;
  routePreview?: { x: number; y: number }[];
  rawLocationStored: false;
}

export interface PolicyDecision {
  action: PolicyAction;
  phaseTarget: Phase;
  intensity: 'none' | 'low' | 'medium' | 'high';
  reason: string;
  confidence: number;
}

export interface StudySession {
  id: string;
  studentId: string;
  subject: string;
  taskKind: TaskKind;
  date: string;
  condition: Condition;
  scaffoldStyle: ScaffoldStyle;
  scaffoldTiming: ScaffoldTiming;
  goals: SessionGoal[];
  strategies: StrategyChoice[];
  plannedMinutes: number;
  confidencePre?: number;      // JOL prediction 0-100 (pre-task)
  contextTrace?: ContextTrace;
  spatialTrace?: SpatialTrace;
  timerSegments: TimerSegment[];
  actualMinutes: number;
  inProgress: boolean;
  focus?: Rating;
  progress?: Rating;
  satisfaction?: Rating;
  notes?: string;
  adjustment?: string;
  usefulStrategy?: StrategyKind;
  performanceActual?: number;  // self-assessed actual mastery 0-100 (post-task)
  contextHelpfulness?: Rating;
  contextReflection?: string;
  learnerModelCorrection?: string;
  lastPolicy?: PolicyDecision;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile { studentId: string; baselineSRL: number; items: number[]; createdAt: string; remindersOn?: boolean; lastRemindedAt?: string }

export type MentorLabel = 'SOCRATIC' | 'HINT_L1' | 'HINT_L2' | 'HINT_L3' | 'EXPLAIN' | 'VERIFY' | 'FINISH';
export interface CheckpointOption { id: string; text: string }
export interface Checkpoint { prompt: string; options: CheckpointOption[]; allowFreeText: boolean }
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  label?: MentorLabel;
  hintLevel?: number;
  checkpoint?: Checkpoint;
  latencyMs?: number;
  createdAt: string;
}

export type MetricEventType =
  | 'session_started'
  | 'goal_ticked'
  | 'strategy_selected'
  | 'hint_requested'
  | 'checkpoint_answered'
  | 'reflection_submitted'
  | 'session_completed'
  | 'state_detected'
  | 'policy_decided'
  | 'context_corrected'
  | 'help_seeking_classified'
  | 'scaffold_fidelity'
  | 'client_app_opened'
  | 'client_auth_started'
  | 'client_auth_completed'
  | 'client_anonymous_started'
  | 'forethought_changed'
  | 'spatial_consent_opened'
  | 'spatial_consent_accepted'
  | 'spatial_consent_declined'
  | 'spatial_detection_started'
  | 'spatial_detection_completed'
  | 'spatial_detection_failed'
  | 'map_rendered'
  | 'timer_started'
  | 'timer_paused'
  | 'live_tracking_started'
  | 'live_tracking_stopped'
  | 'live_tracking_mode_changed'
  | 'live_tracking_sampled'
  | 'mentor_turn_started'
  | 'mentor_turn_completed'
  | 'voice_input_started'
  | 'voice_input_stopped'
  | 'reflection_changed'
  | 'research_exported'
  | 'client_error';

export const STRATEGY_LABELS: Record<StrategyKind, string> = {
  retrieval_practice: 'Retrieval practice',
  self_explanation: 'Self-explanation',
  worked_example: 'Worked-example study',
  interleaving: 'Interleaving',
  spaced: 'Spaced practice',
  other: 'Other',
};

export const TASK_LABELS: Record<TaskKind, string> = {
  coursework: 'Coursework',
  seminar_reading: 'Seminar reading',
  exam_prep: 'Exam prep',
  research_writing: 'Research writing',
  thesis_dissertation: 'Thesis / dissertation',
  project_lab: 'Project / lab',
};
