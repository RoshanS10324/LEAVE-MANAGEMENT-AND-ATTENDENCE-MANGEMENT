/**
 * LAMS Biometric Bridge Script
 * ----------------------------
 * This script runs on a local machine on the same network as the biometric device.
 * It connects to the device via TCP/IP, polls for new attendances, and pushes 
 * them to the LAMS cloud webhook.
 * 
 * Dependencies: npm install node-zklib node-fetch dotenv
 */

require('dotenv').config();
const ZKLib = require('node-zklib');
const fetch = require('node-fetch');

const DEVICE_IP = process.env.BIOMETRIC_DEVICE_IP || '192.168.1.200';
const DEVICE_PORT = process.env.BIOMETRIC_DEVICE_PORT || 4370;
const LAMS_WEBHOOK_URL = process.env.LAMS_WEBHOOK_URL;
const LAMS_API_KEY = process.env.LAMS_API_KEY;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24h

async function pollDevice() {
  console.log(`[${new Date().toISOString()}] Connecting to device at ${DEVICE_IP}:${DEVICE_PORT}...`);
  
  let zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
  
  try {
    await zkInstance.createSocket();
    
    // Get all attendances (this might fetch all logs depending on device, we filter them)
    const logs = await zkInstance.getAttendances();
    console.log(`Retrieved ${logs.data.length} total logs from device.`);

    // Filter for new logs since last sync
    const newLogs = logs.data.filter(log => new Date(log.recordTime) > lastSyncTime);
    
    if (newLogs.length > 0) {
      console.log(`Found ${newLogs.length} new punch logs. Pushing to LAMS Cloud...`);
      
      const payload = newLogs.map(log => ({
        device_emp_id: log.deviceUserId,
        timestamp: log.recordTime,
        punch_type: log.recordTime // ZKLib sometimes requires mapping to in/out based on state
      }));

      // Push to Cloud
      const response = await fetch(LAMS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LAMS_API_KEY}`
        },
        body: JSON.stringify({ punches: payload })
      });

      if (!response.ok) {
        throw new Error(`Cloud webhook failed: ${response.statusText}`);
      }

      console.log('✅ Successfully synced with LAMS Cloud.');
      
      // Update last sync time to the latest log
      lastSyncTime = new Date(Math.max(...newLogs.map(l => new Date(l.recordTime).getTime())));
    } else {
      console.log('No new logs to sync.');
    }

  } catch (error) {
    console.error('❌ Error during biometric sync:', error.message);
  } finally {
    try {
      await zkInstance.disconnect();
    } catch (e) {}
  }
}

// Start polling
console.log('Biometric Bridge Service Started.');
pollDevice(); // Run immediately
setInterval(pollDevice, SYNC_INTERVAL_MS);
