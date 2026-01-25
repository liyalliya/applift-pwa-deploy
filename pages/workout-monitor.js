import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import AccelerationChart from '../components/workoutMonitor/AccelerationChart';
import WorkoutNotification from '../components/workoutMonitor/WorkoutNotification';
import WorkoutFinishedModal from '../components/workoutMonitor/WorkoutFinishedModal';
import ConnectPill from '../components/ConnectPill';
import { useBluetooth } from '../context/BluetoothProvider';
import { KalmanFilter } from '../utils/KalmanFilter';
import { RepCounter } from '../utils/RepCounter';
import { useIMUData } from '../utils/useIMUData';

const MAX_CHART_POINTS = 100; // Last 5 seconds at 20Hz

export default function WorkoutMonitor() {
  const router = useRouter();
  const { equipment, workout } = router.query;
  
  // Helper function to get the correct background image based on equipment and workout
  const getWorkoutImage = () => {
    if (!equipment || !workout) return null;
    
    const equipmentLower = equipment.toLowerCase();
    const workoutLower = workout.toLowerCase();
    
    // Map equipment and workout to actual image filenames
    if (equipmentLower.includes('barbell')) {
      if (workoutLower.includes('bench') || workoutLower.includes('press')) {
        return '/images/workout-cards/barbell-flat-bench-press.jpg';
      } else if (workoutLower.includes('squat')) {
        return '/images/workout-cards/barbell-front-squats.jpg';
      }
      return '/images/workout-cards/barbell-comingsoon.jpg';
    } else if (equipmentLower.includes('dumbbell') || equipmentLower.includes('dumbell')) {
      if (workoutLower.includes('curl')) {
        return '/images/workout-cards/dumbell-concentration-curls.jpg';
      } else if (workoutLower.includes('extension') || workoutLower.includes('tricep')) {
        return '/images/workout-cards/dumbell-overhead-extension.jpg';
      }
      return '/images/workout-cards/dumbell-comingsoon.jpg';
    } else if (equipmentLower.includes('weight stack') || equipmentLower.includes('weightstack') || equipmentLower.includes('cable')) {
      if (workoutLower.includes('pulldown') || workoutLower.includes('lat')) {
        return '/images/workout-cards/weightstack-lateral-pulldown.jpg';
      } else if (workoutLower.includes('leg') && workoutLower.includes('extension')) {
        return '/images/workout-cards/weightstack-seated-leg-extension.jpg';
      }
      return '/images/workout-cards/weightstack-comingsoon.jpg';
    }
    
    // Default fallback
    return '/images/workout-cards/barbell-comingsoon.jpg';
  };
  
  const {
    connected,
    device,
    scanning,
    devicesFound,
    availability,
    scanDevices,
    connectToDevice,
    disconnect,
  } = useBluetooth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [countdownActive, setCountdownActive] = useState(false);
  const recordingStartTime = useRef(0);
  const rawDataLog = useRef([]);
  
  // Refs to avoid closure issues in callbacks
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const countdownActiveRef = useRef(false);
  
  // Break state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(30); // 30 seconds break
  const [breakPaused, setBreakPaused] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const breakTimerRef = useRef(null);
  
  // Congratulations modal
  const [showCongrats, setShowCongrats] = useState(false);
  
  // Workout stats tracking across all sets
  const [workoutStats, setWorkoutStats] = useState({
    totalReps: 0,
    allRepDurations: [],
    completedSets: 0,
    totalTime: 0
  });
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef(null);
  
  // Rep counter
  const repCounterRef = useRef(new RepCounter());
  const [repStats, setRepStats] = useState(repCounterRef.current.getStats());
  const [lastRepNotification, setLastRepNotification] = useState(null);
  
  // Workout tracking - Backend integration ready
  const [currentSet, setCurrentSet] = useState(1);
  const [recommendedSets, setRecommendedSets] = useState(2); // Placeholder - will be from backend
  const [recommendedReps, setRecommendedReps] = useState(5); // Placeholder - will be from backend
  
  // Chart data
  const [timeData, setTimeData] = useState([]);
  const [rawAccelData, setRawAccelData] = useState([]);
  const [filteredAccelData, setFilteredAccelData] = useState([]);
  
  // IMU data display
  const [currentIMU, setCurrentIMU] = useState({
    accelX: 0, accelY: 0, accelZ: 0,
    gyroX: 0, gyroY: 0, gyroZ: 0,
    roll: 0, pitch: 0, yaw: 0,
    rawMagnitude: 0, filteredMagnitude: 0
  });
  
  // Statistics
  const [sampleCount, setSampleCount] = useState(0);
  const [dataRate, setDataRate] = useState(0);
  const lastSampleTime = useRef(Date.now());
  const sampleCounter = useRef(0);

  // Handle IMU data callback
  const handleIMUData = useCallback((data) => {
    // Always update display values (even during countdown)
    setCurrentIMU(data);
    
    // Update sample count
    sampleCounter.current++;
    const now = Date.now();
    if (now - lastSampleTime.current >= 1000) {
      setDataRate(sampleCounter.current);
      setSampleCount(prev => prev + sampleCounter.current);
      sampleCounter.current = 0;
      lastSampleTime.current = now;
    }
    
    // Start chart and counting after countdown completes - use refs to avoid closure issues
    if (isRecordingRef.current && !isPausedRef.current && !countdownActiveRef.current) {
      if (recordingStartTime.current === 0) {
        recordingStartTime.current = data.timestamp;
      }
      
      const relativeTime = data.timestamp - recordingStartTime.current;
      
      // Log raw data
      rawDataLog.current.push({
        timestamp: relativeTime,
        ...data
      });
      
      // Update chart data
      const seconds = Math.floor(relativeTime / 1000);
      const milliseconds = relativeTime % 1000;
      const displayTime = `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
      
      setTimeData(prev => {
        const newData = [...prev, displayTime];
        return newData.length > MAX_CHART_POINTS ? newData.slice(-MAX_CHART_POINTS) : newData;
      });
      
      setRawAccelData(prev => {
        const newData = [...prev, data.rawMagnitude];
        return newData.length > MAX_CHART_POINTS ? newData.slice(-MAX_CHART_POINTS) : newData;
      });
      
      setFilteredAccelData(prev => {
        const newData = [...prev, data.filteredMagnitude];
        return newData.length > MAX_CHART_POINTS ? newData.slice(-MAX_CHART_POINTS) : newData;
      });
      
      // Rep counting
      repCounterRef.current.addSample(
        data.accelX, data.accelY, data.accelZ,
        data.gyroX, data.gyroY, data.gyroZ,
        data.roll, data.pitch, data.yaw,
        data.filteredMagnitude, relativeTime
      );
      
      setRepStats(repCounterRef.current.getStats());
    }
  }, []); // Empty deps - using refs instead to avoid closure issues

  // Subscribe to IMU data (no NFC handler needed)
  const { isSubscribed, error: imuError, resetFilters } = useIMUData(handleIMUData, null);
  
  // Sync state to refs to avoid closure issues in callbacks
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
    countdownActiveRef.current = countdownActive;
  }, [isRecording, isPaused, countdownActive]);

  // Timer effect - starts after countdown completes
  useEffect(() => {
    if (isRecording && !isPaused && !countdownActive) {
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording, isPaused, countdownActive]);

  // Pause/Resume
  const togglePause = () => {
    setIsPaused(prev => {
      const newValue = !prev;
      isPausedRef.current = newValue;
      return newValue;
    });
  };

  // Start break between sets
  const startBreak = () => {
    const messages = [
      "You're doing amazing!",
      "Keep up the great work!",
      "Stay strong, you've got this!",
      "Almost there, keep pushing!",
      "You're crushing it!",
      "Breathe and recover!",
      "Rest up for the next set!",
      "You're making progress!"
    ];
    setMotivationalMessage(messages[Math.floor(Math.random() * messages.length)]);
    setIsOnBreak(true);
    setIsPaused(true);
    setBreakTimeRemaining(30); // 30 seconds break
  };

  // End break and start next set automatically
  const endBreak = async () => {
    // Fade out the break timer first
    const breakOverlay = document.querySelector('.break-overlay');
    if (breakOverlay) {
      breakOverlay.classList.add('animate-fadeOut');
      await new Promise(resolve => setTimeout(resolve, 400)); // Wait for fade out
    }
    
    setIsOnBreak(false);
    setBreakPaused(false);
    
    // Reset reps and increment set
    repCounterRef.current.reset();
    setRepStats(repCounterRef.current.getStats());
    setCurrentSet(prev => prev + 1);
    
    // Clear chart data for new set BEFORE countdown
    setTimeData([]);
    setRawAccelData([]);
    setFilteredAccelData([]);
    recordingStartTime.current = 0;
    rawDataLog.current = [];
    resetFilters();
    setElapsedTime(0);
    
    // Set states for countdown phase
    setCountdownActive(true);
    countdownActiveRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsRecording(true);
    isRecordingRef.current = true;
    
    // Show countdown overlay
    setShowCountdown(true);
    setCountdownValue(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdownValue(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdownValue('GO!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add fade-out animation
    const countdownOverlay = document.querySelector('.countdown-overlay');
    if (countdownOverlay) {
      countdownOverlay.classList.add('animate-fadeOut');
      await new Promise(resolve => setTimeout(resolve, 400)); // Wait for fade out
    }
    
    // Countdown complete - enable recording and counting
    setShowCountdown(false);
    setCountdownActive(false);
    countdownActiveRef.current = false; // Update ref immediately
    setIsPaused(false);
    isPausedRef.current = false;
    setIsRecording(true);
    isRecordingRef.current = true;
    
    // Scroll to top to show chart
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stop break and start next set immediately
  const stopBreak = () => {
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current);
      breakTimerRef.current = null;
    }
    setBreakTimeRemaining(30); // Reset timer
    endBreak();
  };
  
  // Toggle pause for break timer
  const toggleBreakPause = () => {
    setBreakPaused(prev => !prev);
  };

  // Check if set is complete (reps reached target)
  useEffect(() => {
    if (isRecording && !isPaused && !countdownActive && !isOnBreak) {
      if (repStats.repCount >= recommendedReps && repStats.repCount > 0) {
        // Track stats for this completed set
        const currentRepData = repCounterRef.current.exportData();
        const repDurations = currentRepData.reps.map(rep => rep.duration);
        
        setWorkoutStats(prev => ({
          totalReps: prev.totalReps + repStats.repCount,
          allRepDurations: [...prev.allRepDurations, ...repDurations],
          completedSets: prev.completedSets + 1,
          totalTime: prev.totalTime + elapsedTime
        }));
        
        // Set complete - trigger break or congratulations
        if (currentSet >= recommendedSets) {
          // Last set complete - show congratulations
          setIsRecording(false);
          setIsPaused(false);
          setShowCongrats(true);
        } else {
          // More sets remaining - take a break
          startBreak();
        }
      }
    }
  }, [repStats.repCount, recommendedReps, isRecording, isPaused, countdownActive, isOnBreak, currentSet, recommendedSets]);

  // Break timer effect
  useEffect(() => {
    if (isOnBreak && !breakPaused) {
      breakTimerRef.current = setInterval(() => {
        setBreakTimeRemaining(prev => {
          if (prev <= 1) {
            // Break finished
            endBreak();
            return 30; // Reset for next break
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
    }

    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
      }
    };
  }, [isOnBreak, breakPaused]);

  // Start recording with countdown
  const startRecording = async () => {
    if (!connected || !isSubscribed) {
      alert('Please connect to your IMU device first!');
      return;
    }
    
    // Reset data BEFORE countdown
    recordingStartTime.current = 0;
    rawDataLog.current = [];
    repCounterRef.current.reset();
    resetFilters();
    setRepStats(repCounterRef.current.getStats());
    setTimeData([]);
    setRawAccelData([]);
    setFilteredAccelData([]);
    setSampleCount(0);
    setElapsedTime(0);
    // Don't reset currentSet here - only reset when truly starting fresh
    
    // Set states for countdown phase
    setCountdownActive(true);
    countdownActiveRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsRecording(true);
    isRecordingRef.current = true;
    
    // Show countdown overlay
    setShowCountdown(true);
    setCountdownValue(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdownValue(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdownValue('GO!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add fade-out animation
    const countdownOverlay = document.querySelector('.countdown-overlay');
    if (countdownOverlay) {
      countdownOverlay.classList.add('animate-fadeOut');
      await new Promise(resolve => setTimeout(resolve, 400)); // Wait for fade out
    }
    
    // Countdown complete - enable recording and counting
    setShowCountdown(false);
    setCountdownActive(false);
    countdownActiveRef.current = false; // Update ref immediately
    setIsPaused(false);
    isPausedRef.current = false;
    setIsRecording(true);
    isRecordingRef.current = true;
    
    // Scroll to top to show chart
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsOnBreak(false);
    
    if (rawDataLog.current.length > 0) {
      const shouldExport = confirm(`Recorded ${repStats.repCount} reps with ${rawDataLog.current.length} samples. Download CSV?`);
      if (shouldExport) {
        exportToCSV();
      }
    }
    
    // Reset for next session
    setCurrentSet(1);
    setWorkoutStats({ totalReps: 0, allRepDurations: [], completedSets: 0, totalTime: 0 });
    repCounterRef.current.reset();
    setRepStats(repCounterRef.current.getStats());
    
    // Don't clear chart data - let it persist so user can see their last set
  };

  // Export data to CSV
  const exportToCSV = () => {
    const data = repCounterRef.current.exportData();
    const samples = data.samples;
    
    if (samples.length === 0) {
      alert('No data to export!');
      return;
    }
    
    // Create CSV header
    const headers = [
      'rep', 'timestamp', 'timestamp_ms',
      'accelX', 'accelY', 'accelZ', 'accelMag',
      'gyroX', 'gyroY', 'gyroZ',
      'roll', 'pitch', 'yaw',
      'filteredX', 'filteredY', 'filteredZ', 'filteredMag'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    samples.forEach(sample => {
      const seconds = Math.floor(sample.timestamp / 1000);
      const milliseconds = sample.timestamp % 1000;
      const formattedTime = `${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
      
      const row = [
        sample.repNumber,
        formattedTime,
        sample.timestamp,
        sample.accelX.toFixed(4),
        sample.accelY.toFixed(4),
        sample.accelZ.toFixed(4),
        sample.accelMag.toFixed(4),
        sample.gyroX.toFixed(4),
        sample.gyroY.toFixed(4),
        sample.gyroZ.toFixed(4),
        sample.roll.toFixed(2),
        sample.pitch.toFixed(2),
        sample.yaw.toFixed(2),
        // Note: filtered values not stored in RepCounter, using raw
        sample.accelX.toFixed(4),
        sample.accelY.toFixed(4),
        sample.accelZ.toFixed(4),
        sample.accelMag.toFixed(4)
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applift_${workout}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Reset rep counter
  const resetReps = () => {
    repCounterRef.current.reset();
    setRepStats(repCounterRef.current.getStats());
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Head>
        <title>Workout Monitor — {workout} — AppLift</title>
      </Head>

      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="countdown-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fadeIn">
          <div className="text-7xl sm:text-8xl md:text-9xl font-bold text-white animate-pulse">
            {countdownValue}
          </div>
        </div>
      )}

      {/* Break Overlay */}
      {isOnBreak && (
        <div className="break-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black px-4 animate-fadeIn">
          <div className="flex flex-col items-center gap-8 sm:gap-10">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
                Take a break!
              </div>
              <div className="text-base sm:text-lg md:text-xl text-white/70">
                {motivationalMessage}
              </div>
            </div>
            
            {/* Circular Progress Timer - Bigger and centered */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                {/* Background circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="16"
                  fill="none"
                />
                {/* Glow effect circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="url(#breakGradient)"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 110}`}
                  strokeDashoffset={`${2 * Math.PI * 110 * (1 - (30 - breakTimeRemaining) / 30)}`}
                  style={{ 
                    transition: breakPaused ? 'none' : 'stroke-dashoffset 1s linear',
                    filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.8))'
                  }}
                />
                {/* Gradient definition - light to dark as time progresses */}
                <defs>
                  <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={breakTimeRemaining > 20 ? "#e9d5ff" : breakTimeRemaining > 10 ? "#c084fc" : "#9333ea"} />
                    <stop offset="50%" stopColor={breakTimeRemaining > 15 ? "#c084fc" : "#a855f7"} />
                    <stop offset="100%" stopColor={breakTimeRemaining > 10 ? "#a855f7" : "#7c3aed"} />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Timer text in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl sm:text-7xl md:text-8xl font-bold text-white">
                  {Math.floor(breakTimeRemaining / 60)}:{(breakTimeRemaining % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
            
            {/* Pause and Stop buttons */}
            <div className="flex items-center gap-8 sm:gap-12">
              {/* Pause button */}
              <button
                onClick={toggleBreakPause}
                className="flex flex-col items-center gap-2 transition-all hover:scale-110"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center">
                  {breakPaused ? (
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm sm:text-base text-white/80">{breakPaused ? 'Resume' : 'Pause'}</span>
              </button>
              
              {/* Stop button */}
              <button
                onClick={stopBreak}
                className="flex flex-col items-center gap-2 transition-all hover:scale-110"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-7 h-7 sm:w-9 sm:h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </div>
                <span className="text-sm sm:text-base text-white/80">End</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Finished Modal */}
      <WorkoutFinishedModal
        show={showCongrats}
        workoutName={workout}
        equipment={equipment}
        backgroundImage={getWorkoutImage()}
        stats={{
          totalReps: workoutStats.totalReps,
          totalTime: workoutStats.totalTime,
          averageConsistency: workoutStats.allRepDurations.length > 0
            ? Math.round(
                (1 - (Math.max(...workoutStats.allRepDurations) - Math.min(...workoutStats.allRepDurations)) / 
                Math.max(...workoutStats.allRepDurations)) * 100
              )
            : 85,
          tempoMessage: workoutStats.allRepDurations.length > 0 && 
                       Math.round((1 - (Math.max(...workoutStats.allRepDurations) - Math.min(...workoutStats.allRepDurations)) / Math.max(...workoutStats.allRepDurations)) * 100) >= 80
            ? "Your reps stayed steady and controlled."
            : "Keep working on maintaining consistent tempo.",
          averageLoad: null, // Backend integration needed
          progressMessage: null // Backend comparison needed
        }}
        onExport={exportToCSV}
        onClose={() => setShowCongrats(false)}
        onDoAnother={() => {
          setShowCongrats(false);
          setCurrentSet(1);
          setWorkoutStats({ totalReps: 0, allRepDurations: [], completedSets: 0, totalTime: 0 });
          repCounterRef.current.reset();
          setRepStats(repCounterRef.current.getStats());
          setTimeData([]);
          setRawAccelData([]);
          setFilteredAccelData([]);
          recordingStartTime.current = 0;
          rawDataLog.current = [];
          setElapsedTime(0);
        }}
      />

      {/* Rep Notification */}
      <WorkoutNotification 
        notification={lastRepNotification}
        onDismiss={() => setLastRepNotification(null)}
      />

      <main className="mx-auto w-full max-w-4xl px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-80 sm:pb-96 space-y-3 sm:space-y-4 overflow-y-auto min-h-screen">
        {/* Header with back button and connection pill */}
        <div className="flex items-center justify-between content-fade-up-1">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-white/20 transition-all"
            aria-label="Go back"
          >
            <img
              src="/images/icons/arrow-point-to-left.png"
              alt="Back"
              className="w-5 h-5 filter brightness-0 invert"
            />
          </button>

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

        {/* Workout Title */}
        <div className="text-center content-fade-up-2" style={{ animationDelay: '0.05s' }}>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{workout}</h1>
          <p className="text-xs sm:text-sm text-white/60">{equipment}</p>
        </div>

        {/* Disconnection Warning during session */}
        {!connected && isRecording && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/50 p-4 text-center animate-pulse content-fade-up-2" style={{ animationDelay: '0.15s' }}>
            <p className="text-sm text-red-300 font-semibold">⚠️ Device disconnected. Please reconnect to continue session.</p>
          </div>
        )}

        {/* Connection Status - Before Starting */}
        {!connected && !isRecording && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/50 p-4 text-center content-fade-up-2" style={{ animationDelay: '0.15s' }}>
            <p className="text-sm text-red-300">⚠️ Device not connected. Please connect your IMU device.</p>
          </div>
        )}

        {/* Chart */}
        <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 mb-4 sm:mb-5 content-fade-up-3" style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animationDelay: '0.25s'
        }}>
          <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3 text-center">Real-time Acceleration</h3>
          <AccelerationChart
            timeData={timeData}
            filteredData={filteredAccelData}
            thresholdHigh={repStats.thresholdHigh}
            thresholdLow={repStats.thresholdLow}
          />
        </div>
      </main>

      {/* Bottom Container - Fixed at bottom - Buttons and Info Cards */}
      <div className="fixed bottom-0 left-0 right-0 px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 pt-2 sm:pt-3" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 70%, rgba(0,0,0,0) 100%)',
      }}>
        <div className="mx-auto w-full max-w-4xl">
          {/* Bottom Container - Buttons and Info Cards */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden content-fade-up-4" style={{
              animationDelay: '0.35s',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}>
              {/* Timer/Start Button Bar */}
              <div className="p-3 sm:p-4 flex items-center justify-between" >
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!connected || !isSubscribed}
                    className="w-full py-3 sm:py-4 rounded-full font-bold text-white text-lg sm:text-xl md:text-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3"
                    style={{
                      background: 'linear-gradient(to bottom right, #c084fc 0%, #9333ea 100%)',
                      boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
                    }}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={togglePause}
                        className="w-full py-3 sm:py-4 rounded-full font-bold text-white text-lg sm:text-xl md:text-2xl transition-all flex items-center justify-center gap-2 sm:gap-3"
                        style={{
                          background: 'linear-gradient(to bottom right, #c084fc 0%, #9333ea 100%)',
                          boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
                        }}
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        </div>
                        <span>{formatTime(elapsedTime)}</span>
                      </button>
                    ) : (
                      <button
                        onClick={togglePause}
                        className="w-full py-3 sm:py-4 rounded-full font-bold text-white text-lg sm:text-xl md:text-2xl transition-all flex items-center justify-between px-4 sm:px-6 md:px-8"
                        style={{
                          background: 'linear-gradient(to bottom right, #c084fc 0%, #9333ea 100%)',
                          boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
                        }}
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        <span>{formatTime(elapsedTime)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopRecording();
                          }}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="6" width="12" height="12"/>
                          </svg>
                        </button>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Info Cards Row - Inside same container */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 pb-3 sm:pb-4 px-3 sm:px-4">
                {/* Rep Count Card */}
                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 relative" style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="flex items-center gap-3 sm:gap-4 mb-7 sm:mb-8">
                    <img src="/images/applift-logo/AppLift_Logo_White.png" alt="AppLift" className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span className="text-sm sm:text-base font-semibold text-white/90">Reps</span>
                  </div>
                  <div className="flex items-baseline gap-1 sm:gap-1.5">
                    <span className="text-5xl sm:text-6xl font-bold text-white">{repStats.repCount}</span>
                    <span className="text-2xl sm:text-3xl font-semibold text-white/60">/</span>
                    <span className="text-3xl sm:text-4xl font-semibold text-white/70">{recommendedReps}</span>
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-500/30 text-purple-200">
                    {repStats.state.toLowerCase()}
                  </span>
                </div>

                {/* Set Card */}
                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between" style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xl sm:text-2xl">📊</span>
                    <span className="text-xs sm:text-sm font-semibold text-white/90">Set</span>
                  </div>
                  <div className="flex items-baseline gap-1 sm:gap-1.5">
                    <span className="text-5xl sm:text-6xl font-bold text-white">{currentSet}</span>
                    <span className="text-2xl sm:text-3xl font-semibold text-white/60">/</span>
                    <span className="text-3xl sm:text-4xl font-semibold text-white/70">{recommendedSets}</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
