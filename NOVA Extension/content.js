console.log('✅ Shot Metrics: content.js loaded');

// Calculate carry distance using proper aerodynamic model from research
function calculateCarry(shotData) {
  // Physical constants
  const g = 9.81; // gravity in m/s²
  const rho = 1.225; // air density in kg/m³
  const mass = 0.0459; // golf ball mass in kg
  const radius = 0.0213; // golf ball radius in m
  const area = Math.PI * radius * radius;
  
  // Convert inputs
  const v0 = shotData.ballSpeed * 0.44704; // mph to m/s
  const theta = shotData.verticalLaunchAngle * Math.PI / 180; // vertical angle in radians
  const psi = (shotData.horizontalLaunchAngle || 0) * Math.PI / 180; // horizontal angle in radians
  const spin = (shotData.spin || 2500) / 60; // rpm to rev/s
  const alpha = (shotData.spinAxis || 0) * Math.PI / 180; // spin axis in radians
  
  // Initial velocity components (3D)
  let vx = v0 * Math.cos(theta) * Math.sin(psi); // lateral (side to side)
  let vy = v0 * Math.cos(theta) * Math.cos(psi); // forward (down range)
  let vz = v0 * Math.sin(theta); // vertical (up/down)
  
  // Position
  let x = 0, y = 0, z = 0;
  
  // Constant B from aerodynamic model
  const B = rho * area / (2 * mass);
  
  // Time step
  const dt = 0.01;
  let t = 0;
  const maxTime = 10;
  
  // Lift coefficient lookup table from A.J. Smits (1994)
  const sn_Cl_spin = [0, 0.04, 0.1, 0.2, 0.4];
  const sn_Cl_lift = [0, 0.1, 0.16, 0.23, 0.33];
  
  function interpolate(x, xp, fp) {
    if (x <= xp[0]) return fp[0];
    if (x >= xp[xp.length - 1]) return fp[fp.length - 1];
    
    for (let i = 0; i < xp.length - 1; i++) {
      if (x >= xp[i] && x <= xp[i + 1]) {
        const t = (x - xp[i]) / (xp[i + 1] - xp[i]);
        return fp[i] + t * (fp[i + 1] - fp[i]);
      }
    }
    return fp[fp.length - 1];
  }
  
  // Numerical integration
  while (z >= 0 && t < maxTime) {
    // Current velocity magnitude
    const v = Math.sqrt(vx*vx + vy*vy + vz*vz);
    
    if (v > 0.1) {
      // Effective spin parameter (dimensionless)
      const sn = spin * 2 * Math.PI * radius / v;
      
      // Drag coefficient from MacDonald and Hanzely (1991)
      const Cd = 0.24 + 0.18 * sn;
      
      // Lift coefficient from Smits table
      const Cl = interpolate(sn, sn_Cl_spin, sn_Cl_lift);
      
      // Accelerations from aerodynamic forces
      const dvxdt = -B * v * (Cd * vx + Cl * vy * Math.sin(alpha));
      const dvydt = -B * v * (Cd * vy - Cl * (vx * Math.sin(alpha) - vz * Math.cos(alpha)));
      const dvzdt = -g - B * v * (Cd * vz - Cl * vy * Math.cos(alpha));
      
      // Update velocities
      vx += dvxdt * dt;
      vy += dvydt * dt;
      vz += dvzdt * dt;
    } else {
      // Simple gravity for very low speeds
      vz -= g * dt;
    }
    
    // Update positions
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    
    t += dt;
  }
  
  // Convert to yards (y is the forward distance)
  const carryYards = y * 1.09361;
  
  console.log('🎯 Simulation results: y=' + y.toFixed(2) + 'm, carry=' + carryYards.toFixed(1) + ' yards');
  
  return Math.round(carryYards * 10) / 10;
}

// Parse shot data from text
function parseShot(text) {
  console.log('🔍 Parsing text, length:', text.length);
  
  try {
    const ballSpeedMatch = text.match(/"ball_speed"[\s\S]*?"doubleValue":\s*([\d.]+)/);
    const verticalMatch = text.match(/"vertical_launch_angle"[\s\S]*?"doubleValue":\s*([\d.]+)/);
    const horizontalMatch = text.match(/"horizontal_launch_angle"[\s\S]*?"doubleValue":\s*([-\d.]+)/);
    const spinMatch = text.match(/"spin"[\s\S]*?"doubleValue":\s*([\d.]+)/);
    const spinAxisMatch = text.match(/"spin_axis"[\s\S]*?"doubleValue":\s*([\d.]+)/);
    
    if (ballSpeedMatch && verticalMatch) {
      // Ball speed appears to be in m/s in raw data, convert to mph
      const ballSpeedMS = parseFloat(ballSpeedMatch[1]);
      const ballSpeedMPH = ballSpeedMS * 2.23694; // m/s to mph
      
      const data = {
        ballSpeed: ballSpeedMPH,
        ballSpeedRaw: ballSpeedMS,
        verticalLaunchAngle: parseFloat(verticalMatch[1]),
        horizontalLaunchAngle: horizontalMatch ? parseFloat(horizontalMatch[1]) : null,
        spin: spinMatch ? parseFloat(spinMatch[1]) : null,
        spinAxis: spinAxisMatch ? parseFloat(spinAxisMatch[1]) : null
      };
      
      console.log('✅ Parsed shot data:', data);
      console.log('📊 Raw ball speed (m/s):', ballSpeedMS, '→ MPH:', ballSpeedMPH.toFixed(1));
      return data;
    } else {
      console.log('⚠️ Required fields not found');
    }
  } catch (e) {
    console.error('❌ Parse error:', e);
  }
  
  return null;
}

// Create sidebar
function createSidebar() {
  console.log('🎨 Creating sidebar');
  
  const sidebar = document.createElement('div');
  sidebar.id = 'shot-metrics-sidebar';
  sidebar.className = 'shot-metrics-container';
  sidebar.innerHTML = `
    <div class="metrics-header">
      <h3>Shot Metrics</h3>
    </div>
    <div class="metrics-content">
      <div class="metric-row">
        <span class="metric-label">Ball Speed:</span>
        <span class="metric-value" id="ball-speed">--</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Vertical Launch:</span>
        <span class="metric-value" id="vertical-angle">--</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Horizontal Launch:</span>
        <span class="metric-value" id="horizontal-angle">--</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Spin:</span>
        <span class="metric-value" id="total-spin">--</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Spin Axis:</span>
        <span class="metric-value" id="spin-axis">--</span>
      </div>
      <div class="metric-row highlight">
        <span class="metric-label">Carry:</span>
        <span class="metric-value" id="carry">--</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  console.log('✅ Sidebar added to DOM');
}

// Update metrics
function updateMetrics(data) {
  console.log('📊 Updating metrics with:', data);
  
  const update = (id, value, unit = '') => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value ? `${value}${unit}` : '--';
      el.parentElement.classList.add('updated');
      setTimeout(() => el.parentElement.classList.remove('updated'), 1000);
    }
  };
  
  update('ball-speed', data.ballSpeed?.toFixed(1), ' mph');
  update('vertical-angle', data.verticalLaunchAngle?.toFixed(1), '°');
  update('horizontal-angle', data.horizontalLaunchAngle?.toFixed(1), '°');
  update('total-spin', data.spin ? Math.round(data.spin) : null, ' rpm');
  update('spin-axis', data.spinAxis?.toFixed(1), '°');
  
  if (data.ballSpeed && data.verticalLaunchAngle) {
    const carry = calculateCarry(data);
    update('carry', carry, ' yards');
    console.log('✅ Carry calculated:', carry, 'yards');
  }
}

// Inject script
function injectScript() {
  console.log('💉 Injecting script into page');
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    console.log('✅ inject.js loaded and executed');
    this.remove();
  };
  script.onerror = function() {
    console.error('❌ Failed to load inject.js');
  };
  
  (document.head || document.documentElement).appendChild(script);
}

// Listen for events
window.addEventListener('shotMetricsData', (event) => {
  console.log('📨 Received shotMetricsData event');
  const data = parseShot(event.detail);
  if (data) {
    updateMetrics(data);
  }
});

// Initialize
function init() {
  console.log('🚀 Initializing Shot Metrics extension');
  
  // Inject immediately
  injectScript();
  
  // Create sidebar after delay
  setTimeout(() => {
    createSidebar();
  }, 2000);
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
