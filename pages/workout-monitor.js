import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import AccelerationChart from '../components/workoutMonitor/AccelerationChart';
import WorkoutNotification from '../components/workoutMonitor/WorkoutNotification';
import { useBluetooth } from '../context/BluetoothProvider';
import { KalmanFilter } from '../utils/KalmanFilter';
import { RepCounter } from '../utils/RepCounter';
import { useIMUData } from '../utils/useIMUData';

const MAX_CHART_POINTS = 100; // Last 5 seconds at 20Hz

export default function WorkoutMonitor() {
  const router = useRouter();
  const { equipment, workout } = router.query;
  const { device, connected } = useBluetooth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [countdownActive, setCountdownActive] = useState(false);
  const recordingStartTime = useRef(0);
  const rawDataLog = useRef([]);
  
  // Rep counter
  const repCounterRef = useRef(new RepCounter());
  const [repStats, setRepStats] = useState(repCounterRef.current.getStats());
  const [lastRepNotification, setLastRepNotification] = useState(null);
  
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
    
    // Only process data if recording AND countdown is complete
    if (isRecording && !isPaused && !countdownActive) {
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
  }, [isRecording, isPaused, countdownActive]);

  // Subscribe to IMU data (no NFC handler needed)
  const { isSubscribed, error: imuError, resetFilters } = useIMUData(handleIMUData, null);

  // Watch for rep count changes to show notifications
  useEffect(() => {
    if (repStats.repCount > 0) {
      setLastRepNotification({
        type: 'rep',
        message: `Rep #${repStats.repCount}`
      });
      setTimeout(() => setLastRepNotification(null), 500);
    }
  }, [repStats.repCount]);

  // Start recording with countdown
  const startRecording = async () => {
    if (!connected || !isSubscribed) {
      alert('Please connect to your IMU device first!');
      return;
    }
    
    // Set recording state immediately but block counting during countdown
    setIsRecording(true);
    setCountdownActive(true);
    setIsPaused(false);
    
    // Reset data
    recordingStartTime.current = 0;
    rawDataLog.current = [];
    repCounterRef.current.reset();
    resetFilters();
    setRepStats(repCounterRef.current.getStats());
    setTimeData([]);
    setRawAccelData([]);
    setFilteredAccelData([]);
    setSampleCount(0);
    
    // Show countdown overlay
    setShowCountdown(true);
    setCountdownValue(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdownValue(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdownValue('GO!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Countdown complete - enable recording and counting
    setCountdownActive(false);
    setShowCountdown(false);
    setCountdownActive(false);
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    
    if (rawDataLog.current.length > 0) {
      const shouldExport = confirm(`Recorded ${repStats.repCount} reps with ${rawDataLog.current.length} samples. Download CSV?`);
      if (shouldExport) {
        exportToCSV();
      }
    }
  };

  // Pause/Resume
  const togglePause = () => {
    setIsPaused(prev => !prev);
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

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Head>
        <title>Workout Monitor — {workout} — AppLift</title>
      </Head>

      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-9xl font-bold text-white animate-pulse">
            {countdownValue}
          </div>
        </div>
      )}

      {/* Rep Notification */}
      <WorkoutNotification 
        notification={lastRepNotification}
        onDismiss={() => setLastRepNotification(null)}
      />

      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            aria-label="Go back"
          >
            <img
              src="/images/icons/arrow-point-to-left.png"
              alt="Back"
              className="w-5 h-5 filter brightness-0 invert"
            />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold">{workout}</h1>
            <p className="text-xs text-white/60">{equipment}</p>
          </div>
          
          <div className="w-10" />
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/50 p-4 text-center">
            <p className="text-sm text-red-300">⚠️ Device not connected. Please connect your IMU device.</p>
          </div>
        )}

        {/* Rep Count Card - Hero */}
        <div className="rounded-2xl p-6 text-center" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <h3 className="text-sm font-semibold text-white/80 mb-2">Rep Count</h3>
          <p className="text-6xl font-bold text-white mb-2">{repStats.repCount}</p>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            repStats.state === 'LIFTING' ? 'bg-green-500' : 'bg-white/20'
          }`}>
            {repStats.state}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!connected || !isSubscribed}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(to bottom right, #10b981 0%, #059669 100%)'
              }}
            >
              Start Workout
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white"
                style={{
                  background: 'linear-gradient(to bottom right, #f59e0b 0%, #d97706 100%)'
                }}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white"
                style={{
                  background: 'linear-gradient(to bottom right, #ef4444 0%, #dc2626 100%)'
                }}
              >
                Stop & Save
              </button>
            </>
          )}
          <button
            onClick={resetReps}
            className="py-3 px-4 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20"
          >
            Reset
          </button>
        </div>

        {/* Chart */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">Real-time Acceleration</h3>
          <AccelerationChart
            timeData={timeData}
            rawData={rawAccelData}
            filteredData={filteredAccelData}
            thresholdHigh={repStats.thresholdHigh}
            thresholdLow={repStats.thresholdLow}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Accelerometer Raw */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Accelerometer (Raw)</h3>
            <div className="space-y-1 text-sm">
              <div>X: <span className="font-bold text-blue-400">{currentIMU.accelX.toFixed(2)}</span> m/s²</div>
              <div>Y: <span className="font-bold text-green-400">{currentIMU.accelY.toFixed(2)}</span> m/s²</div>
              <div>Z: <span className="font-bold text-purple-400">{currentIMU.accelZ.toFixed(2)}</span> m/s²</div>
              <div>Mag: <span className="font-bold text-yellow-400">{currentIMU.rawMagnitude.toFixed(2)}</span> m/s²</div>
            </div>
          </div>

          {/* Accelerometer Filtered */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Accelerometer (Filtered)</h3>
            <div className="space-y-1 text-sm">
              <div>X: <span className="font-bold text-blue-400">{currentIMU.filteredX?.toFixed(2) || '0.00'}</span> m/s²</div>
              <div>Y: <span className="font-bold text-green-400">{currentIMU.filteredY?.toFixed(2) || '0.00'}</span> m/s²</div>
              <div>Z: <span className="font-bold text-purple-400">{currentIMU.filteredZ?.toFixed(2) || '0.00'}</span> m/s²</div>
              <div>Mag: <span className="font-bold text-yellow-400">{currentIMU.filteredMagnitude.toFixed(2)}</span> m/s²</div>
            </div>
          </div>

          {/* Gyroscope */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Gyroscope</h3>
            <div className="space-y-1 text-sm">
              <div>X: <span className="font-bold">{currentIMU.gyroX.toFixed(2)}</span> rad/s</div>
              <div>Y: <span className="font-bold">{currentIMU.gyroY.toFixed(2)}</span> rad/s</div>
              <div>Z: <span className="font-bold">{currentIMU.gyroZ.toFixed(2)}</span> rad/s</div>
            </div>
          </div>

          {/* Orientation */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Orientation</h3>
            <div className="space-y-1 text-sm">
              <div>Roll: <span className="font-bold">{currentIMU.roll.toFixed(1)}°</span></div>
              <div>Pitch: <span className="font-bold">{currentIMU.pitch.toFixed(1)}°</span></div>
              <div>Yaw: <span className="font-bold">{currentIMU.yaw.toFixed(1)}°</span></div>
            </div>
          </div>

          {/* Rep Detection Info */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Rep Detection</h3>
            <div className="space-y-1 text-sm">
              <div>State: <span className="font-bold">{repStats.state}</span></div>
              <div>Buffer: <span className="font-bold">{repStats.bufferSize}/{repStats.windowSize}</span></div>
              <div>Range: <span className="font-bold">{repStats.repHeight.toFixed(3)}</span> m/s²</div>
            </div>
          </div>

          {/* Dynamic Thresholds */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Thresholds</h3>
            <div className="space-y-1 text-sm">
              <div>High: <span className="font-bold text-cyan-400">{repStats.thresholdHigh.toFixed(2)}</span></div>
              <div>Low: <span className="font-bold text-orange-400">{repStats.thresholdLow.toFixed(2)}</span></div>
              <div>Range: <span className="font-bold">{(repStats.thresholdHigh - repStats.thresholdLow).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Statistics</h3>
            <div className="space-y-1 text-sm">
              <div>Avg Time: <span className="font-bold">{repStats.averageRepTime.toFixed(2)}s</span></div>
              <div>Last Rep: <span className="font-bold">{repStats.lastRepTime.toFixed(2)}s</span></div>
              <div>Samples: <span className="font-bold">{sampleCount}</span></div>
            </div>
          </div>

          {/* Connection */}
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Connection</h3>
            <div className="space-y-1 text-sm">
              <div>Status: <span className={`font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span></div>
              <div>IMU: <span className={`font-bold ${isSubscribed ? 'text-green-400' : 'text-yellow-400'}`}>
                {isSubscribed ? 'Active' : 'Inactive'}
              </span></div>
              <div>Rate: <span className="font-bold">{dataRate} Hz</span></div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
