# Hardware Integration Guide: Smart Waste Bins

This guide provides step-by-step instructions for integrating physical Raspberry Pi-based smart waste bins with the Sortyx Intelligence Platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Physical Hardware Setup](#physical-hardware-setup)
3. [Python Integration Script](#python-integration-script)
4. [Telemetry Payload Reference](#telemetry-payload-reference)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The smart waste bin integration follows this data flow:

```
┌──────────────────┐
│  Raspberry Pi    │
│  (Smart Bin)     │
│                  │
│ • Sensors        │
│ • Camera         │
│ • Battery        │
│ • Connectivity   │
└────────┬─────────┘
         │
         │ MQTT Publish
         │ (telemetry data)
         ▼
┌──────────────────┐
│   MQTT Broker    │
│  (Mosquitto)     │
└────────┬─────────┘
         │
         │ MQTT Subscribe
         │ (mqtt-bridge service)
         ▼
┌──────────────────┐
│  MQTT Bridge     │
│  (Node.js)       │
│                  │
│ • Validate       │
│ • Transform      │
│ • Create Alerts  │
└────────┬─────────┘
         │
         │ Supabase Client
         │ (write telemetry)
         ▼
┌──────────────────┐
│   Supabase DB    │
│  PostgreSQL      │
│                  │
│ • bins table     │
│ • telemetry      │
│ • alerts         │
└────────┬─────────┘
         │
         │ Real-time updates
         │ (PostgREST)
         ▼
┌──────────────────┐
│  Next.js Web     │
│  Dashboard       │
│                  │
│ • Maps view      │
│ • KPI cards      │
│ • Alerts        │
│ • Reports        │
└──────────────────┘
```

### Key Components

- **Raspberry Pi Device:** Collects sensor data and publishes via MQTT
- **MQTT Broker:** Centralized message hub (Mosquitto or similar)
- **MQTT Bridge Service:** Node.js service that validates, transforms, and stores data
- **Supabase Database:** PostgreSQL backend with row-level security
- **Next.js Dashboard:** Real-time visualization and admin interface

---

## Physical Hardware Setup

### Requirements

- **Raspberry Pi:** Model 4B (2GB+ RAM) or Raspberry Pi 5 recommended
- **Sensors:** Ultrasonic distance, temperature/humidity, camera (optional)
- **Power:** 5V USB-C power supply, optional UPS battery
- **Connectivity:** Ethernet or WiFi (WiFi recommended for installation flexibility)
- **SD Card:** 32GB+ microSD card for OS and applications
- **Enclosure:** Weatherproof case suitable for outdoor bins

### Step 1: OS Installation

1. **Download Raspberry Pi OS (Lite):**
   - Visit [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
   - Choose "Raspberry Pi OS Lite" (headless, minimal resources)

2. **Flash to microSD Card:**
   - Use Raspberry Pi Imager or Balena Etcher
   - During flashing, set configuration:
     - Hostname: `smartbin-001` (or unique identifier)
     - Enable SSH (for remote access)
     - Configure WiFi with SSID/password or use Ethernet

3. **First Boot:**
   ```bash
   ssh pi@smartbin-001.local
   # Default password: raspberry
   ```

### Step 2: System Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip git mosquitto-clients

# Install Python packages
pip3 install paho-mqtt RPi.GPIO adafruit-circuitpython-dht

# Optional: Install for camera support
pip3 install picamera2 opencv-python
```

### Step 3: Configure Connectivity

**For WiFi:**
```bash
sudo raspi-config
# Navigate to: System Options > Wireless LAN
# Enter SSID and password
```

**For Static IP (optional but recommended):**
```bash
# Edit netplan config
sudo nano /etc/netplan/50-cloud-init.yaml

# Example:
# network:
#   version: 2
#   wifis:
#     wlan0:
#       dhcp4: false
#       addresses:
#         - 192.168.1.101/24
#       gateway4: 192.168.1.1
#       nameservers:
#         addresses:
#           - 8.8.8.8

sudo netplan apply
```

### Step 4: Hardware Sensor Connections

**GPIO Pinout Reference:**
```
Ultrasonic Sensor (HC-SR04):
  VCC → Pin 2 (5V)
  GND → Pin 6 (GND)
  TRIG → GPIO 23 (Pin 16)
  ECHO → GPIO 24 (Pin 18)

Temperature/Humidity (DHT22):
  VCC → Pin 4 (5V)
  GND → Pin 9 (GND)
  DATA → GPIO 4 (Pin 7)

Camera (optional):
  Connect to Camera Serial Interface (CSI) port
  Enable with: raspi-config > Interface Options > Camera
```

### Step 5: Clone and Deploy Integration Script

```bash
# Clone the repository (adjust URL as needed)
git clone https://github.com/your-org/sortyx-platform.git ~/sortyx-bin

# Navigate to the bin firmware directory
cd ~/sortyx-bin/firmware/raspberry-pi

# Install requirements
pip3 install -r requirements.txt
```

---

## Python Integration Script

Create a file: `/home/pi/smartbin/bin_telemetry.py`

This script reads real hardware sensors and publishes to the MQTT broker every 60 seconds:

```python
#!/usr/bin/env python3
"""
Smart Waste Bin Telemetry Publisher
Reads sensors and publishes telemetry data to MQTT broker.
Compatible with Sortyx Intelligence Platform.
"""

import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import board
import busio
import adafruit_dht
import paho.mqtt.client as mqtt
from enum import Enum
import os
import signal
import sys

# ============================================================================
# CONFIGURATION
# ============================================================================

# Hardware Configuration
DEVICE_ID = os.getenv("BIN_DEVICE_ID", "bin-001")
DEVICE_NAME = os.getenv("BIN_NAME", "Smart Bin #1")

# MQTT Configuration
MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")
MQTT_TOPIC = f"bins/{DEVICE_ID}/telemetry"

# Sensor Configuration
DHT_PIN = int(os.getenv("DHT_PIN", "4"))  # GPIO 4
DISTANCE_TRIGGER_PIN = int(os.getenv("DISTANCE_TRIGGER_PIN", "23"))  # GPIO 23
DISTANCE_ECHO_PIN = int(os.getenv("DISTANCE_ECHO_PIN", "24"))  # GPIO 24

# Telemetry Configuration
PUBLISH_INTERVAL = int(os.getenv("PUBLISH_INTERVAL", "60"))  # seconds
BIN_CAPACITY_CM = float(os.getenv("BIN_CAPACITY_CM", "100"))  # Empty = 100cm
BIN_BOTTOM_CM = float(os.getenv("BIN_BOTTOM_CM", "10"))  # Full = 10cm (waste level)

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# SENSOR CLASSES
# ============================================================================

class CameraStatus(str, Enum):
    """Camera status enum."""
    OK = "ok"
    ERROR = "error"
    OFFLINE = "offline"


class SensorHealth(str, Enum):
    """Sensor health enum."""
    OK = "ok"
    DEGRADED = "degraded"
    ERROR = "error"


class InternetStatus(str, Enum):
    """Internet connectivity status enum."""
    ONLINE = "online"
    OFFLINE = "offline"


class AlertType(str, Enum):
    """Alert types that can be triggered."""
    FULL_BIN = "full_bin"
    OFFLINE = "offline"
    SENSOR_FAILURE = "sensor_failure"
    CAMERA_FAILURE = "camera_failure"
    LOW_BATTERY = "low_battery"
    AD_EXPIRY = "ad_expiry"


class DistanceSensor:
    """HC-SR04 Ultrasonic distance sensor."""
    
    def __init__(self, trigger_pin: int, echo_pin: int):
        import RPi.GPIO as GPIO
        self.GPIO = GPIO
        self.trigger_pin = trigger_pin
        self.echo_pin = echo_pin
        
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(trigger_pin, GPIO.OUT)
        GPIO.setup(echo_pin, GPIO.IN)
        GPIO.output(trigger_pin, False)
        time.sleep(0.5)
    
    def read_distance_cm(self) -> Optional[float]:
        """
        Read distance in centimeters.
        Returns None if read fails.
        """
        try:
            # Trigger pulse
            self.GPIO.output(self.trigger_pin, True)
            time.sleep(0.00001)
            self.GPIO.output(self.trigger_pin, False)
            
            # Measure echo time
            timeout = time.time() + 1.0
            while self.GPIO.input(self.echo_pin) == 0:
                pulse_start = time.time()
                if pulse_start > timeout:
                    return None
            
            timeout = time.time() + 1.0
            while self.GPIO.input(self.echo_pin) == 1:
                pulse_end = time.time()
                if pulse_end > timeout:
                    return None
            
            # Calculate distance
            pulse_duration = pulse_end - pulse_start
            distance = pulse_duration * 17150  # 343 m/s / 2
            
            # Filter out unrealistic values
            if distance < 2 or distance > 400:
                return None
            
            return distance
        except Exception as e:
            logger.error(f"Distance sensor read failed: {e}")
            return None
    
    def cleanup(self):
        """Clean up GPIO."""
        self.GPIO.cleanup()


class TelemetryCollector:
    """Collects sensor readings and formats telemetry payload."""
    
    def __init__(self):
        """Initialize sensors."""
        try:
            # Initialize DHT sensor for temperature/humidity
            self.dht_sensor = adafruit_dht.DHT22(board.D4)
            self.dht_health = SensorHealth.OK
        except Exception as e:
            logger.warning(f"DHT sensor initialization failed: {e}")
            self.dht_sensor = None
            self.dht_health = SensorHealth.ERROR
        
        try:
            # Initialize distance sensor
            self.distance_sensor = DistanceSensor(
                DISTANCE_TRIGGER_PIN,
                DISTANCE_ECHO_PIN
            )
        except Exception as e:
            logger.warning(f"Distance sensor initialization failed: {e}")
            self.distance_sensor = None
        
        # Device state tracking
        self.battery_percent = 100
        self.last_alert_time = {}
        self.is_online = True
    
    def read_temperature_humidity(self) -> tuple[Optional[float], Optional[float]]:
        """Read temperature and humidity from DHT22."""
        if not self.dht_sensor:
            return None, None
        
        try:
            temperature = self.dht_sensor.temperature
            humidity = self.dht_sensor.humidity
            
            if temperature is None or humidity is None:
                return None, None
            
            self.dht_health = SensorHealth.OK
            return temperature, humidity
        except Exception as e:
            logger.warning(f"DHT read failed: {e}")
            self.dht_health = SensorHealth.ERROR
            return None, None
    
    def read_fill_level(self) -> tuple[Optional[float], SensorHealth]:
        """
        Read bin fill level as percentage (0-100).
        Returns (fill_percent, sensor_health).
        """
        if not self.distance_sensor:
            return None, SensorHealth.ERROR
        
        distance = self.distance_sensor.read_distance_cm()
        
        if distance is None:
            return None, SensorHealth.ERROR
        
        # Calculate fill percentage
        # 0% = BIN_CAPACITY_CM (empty, far distance)
        # 100% = BIN_BOTTOM_CM (full, close distance)
        fill_percent = max(0, min(100, 
            ((BIN_CAPACITY_CM - distance) / (BIN_CAPACITY_CM - BIN_BOTTOM_CM)) * 100
        ))
        
        return fill_percent, SensorHealth.OK
    
    def get_battery_percent(self) -> float:
        """
        Get battery percentage.
        In demo mode, simulate gradual discharge.
        For real hardware, read from ADC or power management IC.
        """
        # Simulated: In production, read from power management device
        # Example: ADS1115 ADC for battery voltage
        return max(0, self.battery_percent)
    
    def simulate_battery_discharge(self):
        """Simulate battery discharge (remove in production)."""
        self.battery_percent = max(0, self.battery_percent - 0.5)
    
    def collect(self) -> Dict[str, Any]:
        """
        Collect all telemetry data and return as payload dict.
        Matches telemetryPayloadSchema from @sortyx/shared.
        """
        temperature, humidity = self.read_temperature_humidity()
        fill_percent, distance_health = self.read_fill_level()
        battery_percent = self.get_battery_percent()
        
        # Simulate battery discharge
        self.simulate_battery_discharge()
        
        # Determine sensor health status
        overall_sensor_health = SensorHealth.OK
        if distance_health != SensorHealth.OK or self.dht_health != SensorHealth.OK:
            overall_sensor_health = SensorHealth.ERROR
        
        # Build compartment data (single compartment per bin for this example)
        compartments = [
            {
                "id": f"{DEVICE_ID}-compartment-1",
                "index": 1,
                "fillPercent": fill_percent if fill_percent is not None else 0,
                "temperature": temperature if temperature is not None else None,
                "humidity": humidity if humidity is not None else None,
                "lastEmptied": None,
                "lastFullAlert": None,
            }
        ]
        
        # Determine alerts
        alerts = []
        if fill_percent is not None and fill_percent >= 85:
            alerts.append(AlertType.FULL_BIN.value)
        if battery_percent < 20:
            alerts.append(AlertType.LOW_BATTERY.value)
        if overall_sensor_health == SensorHealth.ERROR:
            alerts.append(AlertType.SENSOR_FAILURE.value)
        
        # Build telemetry payload
        payload = {
            "deviceId": DEVICE_ID,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "compartments": compartments,
            "cameraStatus": CameraStatus.OK.value,  # Set to ok unless camera module fails
            "sensorHealth": overall_sensor_health.value,
            "internetStatus": InternetStatus.ONLINE.value if self.is_online else InternetStatus.OFFLINE.value,
            "batteryPercent": battery_percent,
        }
        
        if alerts:
            payload["alerts"] = alerts
        
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        return payload
    
    def cleanup(self):
        """Clean up resources."""
        if self.distance_sensor:
            self.distance_sensor.cleanup()
        if self.dht_sensor:
            self.dht_sensor.deinit()


class MQTTPublisher:
    """Manages MQTT connection and publishing."""
    
    def __init__(self):
        """Initialize MQTT client."""
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_publish = self.on_publish
        self.connected = False
        
        # Set credentials if provided
        if MQTT_USERNAME and MQTT_PASSWORD:
            self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    def on_connect(self, client, userdata, flags, rc):
        """Called when connected to broker."""
        if rc == 0:
            logger.info("Connected to MQTT broker successfully")
            self.connected = True
        else:
            logger.error(f"Failed to connect to MQTT broker. Code: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Called when disconnected from broker."""
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected MQTT disconnection. Code: {rc}")
    
    def on_publish(self, client, userdata, mid):
        """Called when message is published."""
        logger.debug(f"Message published (id: {mid})")
    
    def connect(self):
        """Connect to MQTT broker."""
        try:
            logger.info(f"Connecting to MQTT broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
            self.client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
            self.client.loop_start()
            
            # Wait for connection
            timeout = time.time() + 10
            while not self.connected and time.time() < timeout:
                time.sleep(0.1)
            
            if not self.connected:
                logger.error("Failed to connect within timeout")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    def publish(self, payload: Dict[str, Any]) -> bool:
        """
        Publish telemetry payload to MQTT broker.
        Returns True if successful.
        """
        try:
            message = json.dumps(payload)
            result = self.client.publish(
                topic=MQTT_TOPIC,
                payload=message,
                qos=1,
                retain=False
            )
            
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                logger.error(f"Publish failed with code {result.rc}")
                return False
            
            logger.info(f"Published telemetry to {MQTT_TOPIC}")
            return True
        except Exception as e:
            logger.error(f"Publish failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from broker."""
        self.client.loop_stop()
        self.client.disconnect()


# ============================================================================
# MAIN APPLICATION
# ============================================================================

class SmartBinApplication:
    """Main application for smart bin telemetry."""
    
    def __init__(self):
        self.telemetry = TelemetryCollector()
        self.mqtt = MQTTPublisher()
        self.running = True
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info("Shutdown signal received")
        self.running = False
    
    def run(self):
        """Main application loop."""
        logger.info(f"Starting Smart Bin Telemetry - Device: {DEVICE_ID}")
        logger.info(f"Publishing to {MQTT_TOPIC} every {PUBLISH_INTERVAL}s")
        
        # Connect to MQTT
        if not self.mqtt.connect():
            logger.error("Failed to connect to MQTT broker. Exiting.")
            return
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Main loop
        try:
            while self.running:
                # Collect telemetry
                payload = self.telemetry.collect()
                
                # Publish to MQTT
                if self.mqtt.connected:
                    self.mqtt.publish(payload)
                else:
                    logger.warning("MQTT not connected, reconnecting...")
                    self.mqtt.connect()
                
                # Wait for next interval
                time.sleep(PUBLISH_INTERVAL)
        except KeyboardInterrupt:
            logger.info("Interrupted")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Cleanup resources."""
        logger.info("Cleaning up...")
        self.mqtt.disconnect()
        self.telemetry.cleanup()


if __name__ == "__main__":
    app = SmartBinApplication()
    app.run()
```

### Configuration via Environment Variables

Create `/home/pi/smartbin/.env`:

```bash
# Device Identity
BIN_DEVICE_ID=bin-001
BIN_NAME="Smart Bin #1"

# MQTT Configuration
MQTT_BROKER_HOST=192.168.1.100  # IP of MQTT broker
MQTT_BROKER_PORT=1883
MQTT_USERNAME=smartbin
MQTT_PASSWORD=your_secure_password

# GPIO Pins (BCM numbering)
DHT_PIN=4
DISTANCE_TRIGGER_PIN=23
DISTANCE_ECHO_PIN=24

# Telemetry
PUBLISH_INTERVAL=60
BIN_CAPACITY_CM=100
BIN_BOTTOM_CM=10

# Logging
LOG_LEVEL=INFO
```

### Running the Script

```bash
# Make executable
chmod +x ~/smartbin/bin_telemetry.py

# Run directly
python3 ~/smartbin/bin_telemetry.py

# Or run via systemd service (for auto-start on reboot)
sudo nano /etc/systemd/system/smartbin.service
```

**systemd Service File** (`/etc/systemd/system/smartbin.service`):

```ini
[Unit]
Description=Sortyx Smart Bin Telemetry Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/smartbin
EnvironmentFile=/home/pi/smartbin/.env
ExecStart=/usr/bin/python3 /home/pi/smartbin/bin_telemetry.py
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable smartbin.service
sudo systemctl start smartbin.service

# View logs
journalctl -u smartbin.service -f
```

---

## Telemetry Payload Reference

The integration script publishes payloads matching `telemetryPayloadSchema` from `@sortyx/shared/src/telemetry.ts`.

### Example Payload

```json
{
  "deviceId": "bin-001",
  "timestamp": "2026-05-21T14:23:45.123Z",
  "compartments": [
    {
      "id": "bin-001-compartment-1",
      "index": 1,
      "fillPercent": 45.2,
      "temperature": 22.5,
      "humidity": 65.3,
      "lastEmptied": "2026-05-20T10:00:00Z",
      "lastFullAlert": "2026-05-21T08:30:00Z"
    }
  ],
  "cameraStatus": "ok",
  "sensorHealth": "ok",
  "internetStatus": "online",
  "batteryPercent": 87.5,
  "alerts": [
    "low_battery"
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | string | Yes | Unique bin identifier (must match bin registration in database) |
| `timestamp` | ISO 8601 | No | UTC timestamp of reading (auto-set if omitted) |
| `compartments` | array | Yes | Array of compartment data (1-4 items) |
| `compartments[].id` | string | Yes | Unique compartment ID |
| `compartments[].index` | number | Yes | Compartment index (1-4) |
| `compartments[].fillPercent` | number | Yes | Fill percentage (0-100) |
| `compartments[].temperature` | number | No | Temperature in Celsius |
| `compartments[].humidity` | number | No | Relative humidity (0-100%) |
| `compartments[].lastEmptied` | ISO 8601 | No | Timestamp of last emptying |
| `compartments[].lastFullAlert` | ISO 8601 | No | Timestamp of last full alert |
| `cameraStatus` | enum | Yes | `"ok"`, `"error"`, or `"offline"` |
| `sensorHealth` | enum | Yes | `"ok"`, `"degraded"`, or `"error"` |
| `internetStatus` | enum | Yes | `"online"` or `"offline"` |
| `batteryPercent` | number | No | Battery level (0-100%) |
| `snapshotUrl` | URL | No | URL of latest bin snapshot (optional) |
| `alerts` | array | No | Array of alert strings (see below) |

### Alert Types

Valid alert values:
- `"full_bin"` — Bin capacity exceeded 85%
- `"offline"` — Device offline
- `"sensor_failure"` — Sensor malfunction detected
- `"camera_failure"` — Camera module offline
- `"low_battery"` — Battery below 20%
- `"ad_expiry"` — Advertisement rotation expired

---

## Verification Steps

After deploying your hardware, follow these steps to verify integration:

### 1. Check MQTT Connectivity

**From Raspberry Pi:**
```bash
# Subscribe to the topic and view published messages
mosquitto_sub -h 192.168.1.100 -t "bins/bin-001/telemetry" -u smartbin -P your_password
```

You should see JSON telemetry appearing every 60 seconds.

### 2. Verify Database Ingestion

**Check if bin is registered:**
```sql
SELECT id, name, device_id, status FROM bins WHERE device_id = 'bin-001';
```

**Check if telemetry is being recorded:**
```sql
SELECT 
  id, 
  device_id, 
  fill_percent, 
  sensor_health, 
  battery_percent, 
  created_at 
FROM telemetry_events 
WHERE device_id = 'bin-001' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Check if alerts were created:**
```sql
SELECT id, bin_id, alert_type, severity, created_at FROM alerts 
WHERE bin_id = (SELECT id FROM bins WHERE device_id = 'bin-001') 
ORDER BY created_at DESC 
LIMIT 5;
```

### 3. Verify Dashboard Display

**Log in as admin:**
1. Navigate to http://localhost:3000/login
2. Sign in with `admin@sortyx.demo`
3. Go to "Bins" page
4. Verify your bin appears in the list with:
   - ✅ Device ID matches
   - ✅ Fill level showing correct percentage
   - ✅ Battery percentage updating
   - ✅ Sensor health status displaying
5. Click on the bin to see:
   - ✅ Latest telemetry readings
   - ✅ Recent alerts (if any)
   - ✅ Activity history

**View on Map:**
1. Go to "Dashboard" → Real-time map
2. Verify bin location marker appears
3. Click marker to see live fill percentage

### 4. Test Alert Triggering

**Simulate a full bin:**
1. Edit the Python script to set `fill_percent = 90` for testing
2. Restart the service
3. Within 60 seconds, a "full_bin" alert should appear in the database
4. Check that the alert is visible in the dashboard Alerts page

---

## Troubleshooting

### MQTT Connection Issues

**Problem:** Script cannot connect to MQTT broker

**Solutions:**
1. Verify broker IP and port are correct:
   ```bash
   ping 192.168.1.100
   nc -zv 192.168.1.100 1883
   ```

2. Check broker is running:
   ```bash
   sudo systemctl status mosquitto
   sudo systemctl restart mosquitto
   ```

3. Verify credentials:
   ```bash
   mosquitto_sub -h 192.168.1.100 -t "test/topic" -u smartbin -P your_password
   ```

4. Check firewall rules:
   ```bash
   sudo ufw allow 1883/tcp
   ```

### Sensor Read Failures

**Problem:** Distance sensor returns None or invalid values

**Solutions:**
1. Verify GPIO pins match your physical wiring
2. Check sensor power supply:
   ```bash
   gpio readall  # View pin states
   ```

3. Test sensor manually:
   ```bash
   python3 -c "
   from bin_telemetry import DistanceSensor
   sensor = DistanceSensor(23, 24)
   print(f'Distance: {sensor.read_distance_cm()} cm')
   "
   ```

4. Verify sensor is not damaged (try with another Pi)

### DHT Sensor Issues

**Problem:** DHT22 returns None for temperature/humidity

**Solutions:**
1. Verify DHT is properly connected (data pin voltage should be ~3.3V)
2. Check for cable interference (shielded cable recommended)
3. Restart the service to reinitialize
4. Try a different GPIO pin

### Database Not Updating

**Problem:** Telemetry publishes to MQTT but doesn't appear in database

**Solutions:**
1. Verify MQTT bridge service is running:
   ```bash
   docker logs mqtt-bridge  # or check PM2 logs
   ```

2. Check bridge subscriptions:
   ```bash
   mosquitto_sub -h 192.168.1.100 -t "bins/+/telemetry"
   ```

3. Verify bin is registered in database:
   ```sql
   SELECT * FROM bins WHERE device_id = 'bin-001';
   ```
   If not found, create it:
   ```sql
   INSERT INTO bins (
     id, organization_id, customer_id, device_id, name, status,
     latitude, longitude, address
   ) VALUES (
     gen_random_uuid(),
     'a0000000-0000-4000-8000-000000000001',  -- Sortyx Demo org
     'b0000000-0000-4000-8000-000000000001',  -- Green City Mall
     'bin-001',
     'Smart Bin #1',
     'active',
     40.7128,  -- Your latitude
     -74.0060, -- Your longitude
     '123 Main St'
   );
   ```

4. Check MQTT bridge logs for validation errors
5. Verify payload matches schema (see [Telemetry Payload Reference](#telemetry-payload-reference))

### Python Script Crashes

**Problem:** Service stops unexpectedly

**Solutions:**
1. Check logs:
   ```bash
   journalctl -u smartbin.service -n 50
   ```

2. Verify dependencies installed:
   ```bash
   pip3 install paho-mqtt RPi.GPIO adafruit-circuitpython-dht
   ```

3. Test import statements manually:
   ```bash
   python3 -c "import paho.mqtt.client; import RPi.GPIO; print('OK')"
   ```

4. Check for insufficient memory:
   ```bash
   free -h
   ```

5. Try running with debug logging:
   ```bash
   LOG_LEVEL=DEBUG systemctl start smartbin.service
   ```

### Dashboard Not Showing Bin

**Problem:** Bin doesn't appear on maps or in lists after weeks of data

**Solutions:**
1. Verify admin user is viewing correct organization (RLS policies filter by org)
2. Check bin status is "active" (not "maintenance" or "offline")
3. Verify lat/long are valid (not 0,0)
4. Try logging out and back in to refresh session
5. Check browser console for API errors (F12 → Console)

---

## Production Considerations

### Security

- **MQTT Authentication:** Always use username/password in production
- **TLS/SSL:** Enable MQTT over TLS (port 8883) for encrypted communication
- **Device ID:** Use unique identifiers; consider cryptographic signatures
- **Database:** Ensure RLS policies prevent cross-organization data leakage

### Reliability

- **Network Resilience:** Implement reconnect logic with exponential backoff (script includes this)
- **Data Buffering:** Queue telemetry locally if broker is unavailable
- **Heartbeat Monitoring:** Track device "last seen" timestamp to detect offline bins
- **Backup Power:** Use UPS or large battery for continuous operation

### Maintenance

- **Log Rotation:** Configure logrotate for `/var/log/smartbin/`
- **OTA Updates:** Consider mechanism to push firmware updates to devices
- **Monitoring:** Set up alerts in dashboard for offline bins or sensor failures
- **Calibration:** Periodically verify distance sensor accuracy

### Scaling

For multiple bins (10+):
- Deploy MQTT broker on dedicated server or use managed MQTT service
- Use MQTT topic hierarchy: `bins/{region}/{customer}/{device_id}/telemetry`
- Implement load balancing for MQTT bridge service
- Consider message batching to reduce database writes

---

## Support & Additional Resources

For issues or questions:
1. Check logs (both Raspberry Pi and MQTT bridge)
2. Verify payload format against schema
3. Test MQTT connectivity independently
4. Check database RLS policies for permission issues

For documentation:
- [Raspberry Pi Official Docs](https://www.raspberrypi.com/documentation/)
- [Paho MQTT Python Docs](https://github.com/eclipse/paho.mqtt.python)
- [Adafruit CircuitPython DTH](https://circuitpython.readthedocs.io/projects/dht/en/latest/)
- [MQTT Specification](https://mqtt.org/)
