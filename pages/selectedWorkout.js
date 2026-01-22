import Head from 'next/head';
import { useRouter } from 'next/router';
import { useRef } from 'react';
import ConnectPill from '../components/ConnectPill';
import RecommendedSetCard from '../components/RecommendedSetCard';
import WarmUpBanner from '../components/WarmUpBanner';
import WorkoutActionButton from '../components/WorkoutActionButton';
import { useBluetooth } from '../context/BluetoothProvider';

const workoutDetails = {
  Barbell: {
    'Flat Bench Barbell Press': {
      description: 'Target your chest, shoulders, and triceps with this fundamental compound movement.',
      recommendedSets: 4,
      recommendedReps: '6-8',
      difficulty: 'Intermediate',
      tutorialVideo: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    },
    'Front Squats': {
      description: 'Strengthen your quadriceps, core, and lower back with controlled leg movements.',
      recommendedSets: 4,
      recommendedReps: '6-8',
      difficulty: 'Intermediate',
      tutorialVideo: 'https://www.youtube.com/watch?v=uYumuL_G_V0',
    },
  },
  Dumbell: {
    'Concentration Curls': {
      description: 'Isolate your biceps for peak contraction and muscle growth.',
      recommendedSets: 3,
      recommendedReps: '8-12',
      difficulty: 'Beginner',
      tutorialVideo: 'https://www.youtube.com/watch?v=Jvj2wV0vOYU',
    },
    'Single-arm Overhead Extension': {
      description: 'Work your triceps and shoulders with controlled overhead movement.',
      recommendedSets: 3,
      recommendedReps: '8-12',
      difficulty: 'Beginner',
      tutorialVideo: 'https://www.youtube.com/watch?v=YbX7Wd8jQ-Q',
    },
  },
  'Weight Stack': {
    'Lateral Pulldown': {
      description: 'Build a wider back and stronger lats with machine-guided movement.',
      recommendedSets: 4,
      recommendedReps: '8-10',
      difficulty: 'Beginner',
      tutorialVideo: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    },
    'Seated Leg Extension': {
      description: 'Isolate and strengthen your quadriceps with smooth, controlled motion.',
      recommendedSets: 3,
      recommendedReps: '10-12',
      difficulty: 'Beginner',
      tutorialVideo: 'https://www.youtube.com/watch?v=YyvSfVjQeL0',
    },
  },
};

const equipmentColors = {
  Barbell: '#fbbf24', // yellow
  Dumbell: '#3b82f6', // blue
  'Weight Stack': '#f97316', // orange
};

const workoutImages = {
  Barbell: {
    'Flat Bench Barbell Press': '/images/workout-cards/barbell-flat-bench-press.jpg',
    'Front Squats': '/images/workout-cards/barbell-front-squats.jpg',
  },
  Dumbell: {
    'Concentration Curls': '/images/workout-cards/dumbell-concentration-curls.jpg',
    'Single-arm Overhead Extension': '/images/workout-cards/dumbell-overhead-extension.jpg',
  },
  'Weight Stack': {
    'Lateral Pulldown': '/images/workout-cards/weightstack-lateral-pulldown.jpg',
    'Seated Leg Extension': '/images/workout-cards/weightstack-seated-leg-extension.jpg',
  },
};

export default function SelectedWorkout() {
  const router = useRouter();
  const { equipment, workout } = router.query;
  const mainRef = useRef(null);

  const {
    connected,
    device,
    connecting,
    scanning,
    error,
    permissionGranted,
    availability,
    devicesFound,
    scanDevices,
    connectToDevice,
    disconnect,
  } = useBluetooth();

  const details = workoutDetails[equipment]?.[workout];
  const equipmentColor = equipmentColors[equipment] || '#7c3aed';
  const workoutImage = workoutImages[equipment]?.[workout] || '/images/workout-cards/barbell-flat-bench-press.jpg';

  if (!details) {
    return (
      <div className="relative min-h-screen bg-black text-white pb-24">
        <Head>
          <title>Workout — AppLift</title>
        </Head>
        <main className="mx-auto w-full max-w-[640px] px-4 pt-10">
          <p>Loading workout details...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Head>
        <title>{workout} — AppLift</title>
      </Head>

      <main ref={mainRef} className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-24 space-y-6 h-screen overflow-y-auto">
        {/* Header with back button and connection pill */}
        <div className="flex items-center justify-between content-fade-up-1">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 shrink-0"
            aria-label="Go back"
          >
            <img
              src="/images/icons/arrow-point-to-left.png"
              alt="Back"
              className="w-5 h-5 filter brightness-0 invert"
            />
          </button>

          {/* Connection pill */}
          <ConnectPill
            connected={connected}
            device={device}
            onScan={scanDevices}
            onConnect={connectToDevice}
            onDisconnect={disconnect}
            scanning={scanning}
            devicesFound={devicesFound}
            availability={availability}
          />
        </div>

        {/* Recommended Set Card */}
        <div className="content-fade-up-2">
          <RecommendedSetCard
            equipment={equipment}
            workout={workout}
            recommendedSets={details.recommendedSets}
            recommendedReps={details.recommendedReps}
            image={workoutImage}
            equipmentColor={equipmentColor}
          />
        </div>

        {/* Exercise Information */}
        <div className="content-fade-up-2 space-y-3" style={{ animationDelay: '0.1s' }}>
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">About This Exercise</h3>
              <p className="text-xs text-white/70 leading-relaxed">{details.description}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Form Tips</h3>
              <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                <li>Keep your core tight throughout the movement</li>
                <li>Control the weight on the way down</li>
                <li>Maintain steady breathing rhythm</li>
              </ul>
            </div>
          </div>

          {/* Target Muscles - Separate Container */}
          <div className="rounded-2xl bg-white/5 p-4 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">Target Muscles</h3>
              <p className="text-xs text-white/70">
                {equipment === 'Barbell' && workout === 'Flat Bench Barbell Press'
                  ? 'Chest, Shoulders, Triceps'
                  : equipment === 'Barbell' && workout === 'Front Squats'
                  ? 'Quadriceps, Core, Lower Back'
                  : equipment === 'Dumbell' && workout === 'Concentration Curls'
                  ? 'Biceps'
                  : equipment === 'Dumbell' && workout === 'Single-arm Overhead Extension'
                  ? 'Triceps, Shoulders'
                  : equipment === 'Weight Stack' && workout === 'Lateral Pulldown'
                  ? 'Back, Lats'
                  : 'Quadriceps'}
              </p>
            </div>
          </div>
        </div>

        {/* Watch Tutorial Button */}
        {details.tutorialVideo && (
          <div className="content-fade-up-2 flex justify-center" style={{ animationDelay: '0.15s' }}>
            <a
              href={details.tutorialVideo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-white/80 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 hover:border-white/40"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Tutorial
            </a>
          </div>
        )}

        {/* Warm Up Banner */}
        <div className="content-fade-up-3 mb-20" style={{ animationDelay: '0.2s' }}>
          <WarmUpBanner />
        </div>
      </main>

      {/* Fixed Bottom Workout Action Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-6" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 60%, rgba(0,0,0,0) 100%)',
      }}>
        <div className="mx-auto w-full max-w-[640px]">
          <WorkoutActionButton
            onClick={() => {
              // Handle workout start
              console.log('Starting workout...');
            }}
          />
        </div>
      </div>
    </div>
  );
}
