import EquipmentIcon from './EquipmentIcon';

export default function EquipmentSelectionModal({ isOpen, onClose, onSelect, connected = true }) {
  if (!isOpen) return null;

  // Get colors based on equipment type (matching workouts.js)
  const getEquipmentColors = (equipmentType) => {
    switch (equipmentType) {
      case 'Barbell':
        return {
          outerBg: 'bg-[#b87700]',
          outerBorder: 'border-[#e69b00]',
          innerBg: 'bg-[#f0b233]',
          innerBorder: 'border-[#f5c042]',
        };
      case 'Dumbell':
        return {
          outerBg: 'bg-[#0C4A6E]',
          outerBorder: 'border-[#0369A1]',
          innerBg: 'bg-[#3B82F6]',
          innerBorder: 'border-[#60A5FA]',
        };
      case 'Weight Stack':
        return {
          outerBg: 'bg-[#7C2D12]',
          outerBorder: 'border-[#DC2626]',
          innerBg: 'bg-[#F97316]',
          innerBorder: 'border-[#FB923C]',
        };
      default:
        return {
          outerBg: 'bg-[#5B21B6]',
          outerBorder: 'border-[#7C3AED]',
          innerBg: 'bg-[#7C3AED]',
          innerBorder: 'border-[#8B5CF6]',
        };
    }
  };

  // If not connected, show message instead of equipment selection
  if (!connected) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={onClose}
      >
        <div 
          className="relative max-w-md w-full p-8 rounded-3xl bg-[#1a1a1a] border border-white/10"
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <img src="/images/device-icon/Applift_Device_White.png" alt="AppLift Device" className="w-12 h-12" />
            <h2 className="text-xl font-bold text-white text-center">Connect Your Device</h2>
            <p className="text-white/70 text-center text-sm">
              Connect to your AppLift device before choosing an equipment
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  const equipmentOptions = [
    { type: 'Barbell' },
    { type: 'Dumbell' },
    { type: 'Weight Stack' },
  ];

  const handleSelect = (type) => {
    onSelect({ type, deviceId: 'MANUAL' });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-md w-full p-6 rounded-3xl bg-black/60 border border-white/10"
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Select Equipment</h2>

        <div className="space-y-3">
          {equipmentOptions.map((equipment) => {
            const colors = getEquipmentColors(equipment.type);
            return (
              <button
                key={equipment.type}
                onClick={() => handleSelect(equipment.type)}
                className={`w-full p-4 rounded-2xl transition-all duration-300 hover:scale-102 flex items-center gap-4 ${colors.outerBg} border ${colors.outerBorder}`}
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-xl p-2 ${colors.innerBg} border ${colors.innerBorder}`}>
                  <EquipmentIcon type={equipment.type} className="w-16 h-15" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold text-lg">{equipment.type}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
