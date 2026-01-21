import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';
import ConnectPill from '../components/ConnectPill';
import { useBluetooth } from '../context/BluetoothProvider';

const workoutDetails = {
  Barbell: {
    'Flat Bench Barbell Press': {
      description: 'Target your chest, shoulders, and triceps with this fundamental compound movement.',
      recommendedSets: 4,
      recommendedReps: '6-8',
      difficulty: 'Intermediate',
    },
    'Front Squats': {
      description: 'Strengthen your quadriceps, core, and lower back with controlled leg movements.',
      recommendedSets: 4,
      recommendedReps: '6-8',
      difficulty: 'Intermediate',
    },
  },
  Dumbell: {
    'Concentration Curls': {
      description: 'Isolate your biceps for peak contraction and muscle growth.',
      recommendedSets: 3,
      recommendedReps: '8-12',
      difficulty: 'Beginner',
    },
    'Single-arm Overhead Extension': {
      description: 'Work your triceps and shoulders with controlled overhead movement.',
      recommendedSets: 3,
      recommendedReps: '8-12',
      difficulty: 'Beginner',
    },
  },
  'Weight Stack': {
    'Lateral Pulldown': {
      description: 'Build a wider back and stronger lats with machine-guided movement.',
      recommendedSets: 4,
      recommendedReps: '8-10',
      difficulty: 'Beginner',
    },
    'Seated Leg Extension': {
      description: 'Isolate and strengthen your quadriceps with smooth, controlled motion.',
      recommendedSets: 3,
      recommendedReps: '10-12',
      difficulty: 'Beginner',
    },
  },
};

const equipmentColors = {
  Barbell: '#fbbf24', // yellow
  Dumbell: '#3b82f6', // blue
  'Weight Stack': '#f97316', // orange
};

export default function SelectedWorkout() {
  const router = useRouter();
  const { equipment, workout } = router.query;
  const [scrollPosition, setScrollPosition] = useState(0);
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

  // Track scroll position for connection pill collapse
  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setScrollPosition(mainRef.current.scrollTop);
      }
    };

    const main = mainRef.current;
    if (main) {
      main.addEventListener('scroll', handleScroll);
      return () => main.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Collapse threshold - when scrollPosition > 50px, start collapsing
  const collapseThreshold = 50;
  const collapseProgress = Math.min(Math.max((scrollPosition - collapseThreshold) / 100, 0), 1);

  const details = workoutDetails[equipment]?.[workout];
  const equipmentColor = equipmentColors[equipment] || '#7c3aed';

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
    <div className="relative min-h-screen bg-black text-white pb-24">
      <Head>
        <title>{workout} — AppLift</title>
      </Head>

      <main ref={mainRef} className="mx-auto w-full max-w-[640px] px-4 pt-6 space-y-6 h-screen overflow-y-auto">
        {/* Header with back button and connection pill */}
        <div className="flex items-center justify-between content-fade-up-1 transition-all duration-300" style={{
          marginRight: `-${collapseProgress * 16}px`,
        }}>
          {/* Back button - fades in as pill collapses */}
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300"
            style={{
              opacity: collapseProgress * 0.8,
              marginLeft: `${collapseProgress * 8}px`,
            }}
            aria-label="Go back"
          >
            <span className="text-xl font-light text-white">&lt;</span>
          </button>

          {/* Connection pill - collapses to right */}
          <div style={{
            transform: `translateX(${collapseProgress * 120}px)`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <ConnectPill
              connected={connected}
              device={device}
              onScan={scanDevices}
              onConnect={connectToDevice}
              onDisconnect={disconnect}
              scanning={scanning}
              devicesFound={devicesFound}
              availability={availability}
              collapse={collapseProgress}
            />
          </div>
        </div>

        {/* Workout Title and Equipment Tag */}
        <div className="space-y-4 content-fade-up-2">
          <h1 className="text-4xl font-bold text-white">{workout}</h1>

          {/* Recommended Set Component */}
          <div
            className="rounded-2xl px-4 py-4 border"
            style={{
              backgroundColor: `${equipmentColor}20`,
              borderColor: equipmentColor,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: equipmentColor }}
              >
                ⚙
              </div>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                {equipment}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-white/60">Recommended Sets</p>
                <p className="text-2xl font-bold" style={{ color: equipmentColor }}>
                  {details.recommendedSets}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/60">Recommended Reps</p>
                <p className="text-2xl font-bold" style={{ color: equipmentColor }}>
                  {details.recommendedReps}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white/60">Difficulty</p>
                <p className="text-xl font-bold" style={{ color: equipmentColor }}>
                  {details.difficulty}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workout Description */}
        <div className="space-y-3 content-fade-up-3">
          <h2 className="text-lg font-semibold text-white">About This Exercise</h2>
          <p className="text-sm text-white/70 leading-relaxed">{details.description}</p>
        </div>

        {/* Additional Info Sections */}
        <div className="space-y-4 content-fade-up-3" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-2 rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white">Form Tips</h3>
            <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
              <li>Keep your core tight throughout the movement</li>
              <li>Control the weight on the way down</li>
              <li>Maintain steady breathing rhythm</li>
            </ul>
          </div>

          <div className="space-y-2 rounded-2xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white">Target Muscles</h3>
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

        {/* Start Workout Button */}
        <button
          className="w-full py-4 px-6 rounded-full font-semibold text-white transition-all duration-300 hover:scale-105 content-fade-up-3 mt-8"
          style={{
            background: `linear-gradient(135deg, ${equipmentColor} 0%, ${equipmentColor}dd 100%)`,
            animationDelay: '0.2s',
          }}
        >
          Start Workout
        </button>
      </main>

      {/* Existing bottom nav */}
      <BottomNav />
    </div>
  );
}
