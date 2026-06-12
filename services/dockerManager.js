import { execSync, exec } from 'child_process';

/**
 * Automatically audits, verifies, and initializes the local Piston execution container engine.
 */
export const ensurePistonIsRunning = () => {
  const containerName = "piston"; // Ensure this matches your local container name or ID
  console.log("🐳 [Docker Sync] Inspecting local Piston container states...");

  try {
    // 1. Verify if Docker Daemon is running at all
    execSync('docker info', { stdio: 'ignore' });
  } catch (err) {
    console.error("❌ [Docker Sync] Docker Desktop is completely offline. Please open Docker Desktop first!");
    return;
  }

  try {
    // 2. Check if the specific piston container is already up and running
    const runningStatus = execSync(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`).toString().trim();
    
    if (runningStatus.toLowerCase().includes('up')) {
      console.log("✅ [Docker Sync] Piston container is already online and running on port 2000.");
      return;
    }

    // 3. Check if the container exists but is stopped
    const allContainers = execSync(`docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`).toString().trim();

    if (allContainers.includes(containerName)) {
      console.log(`🔄 [Docker Sync] Found stopped container "${containerName}". Launching container block...`);
      exec(`docker start ${containerName}`, (startErr) => {
        if (startErr) console.error(`❌ Failed to start container: ${startErr.message}`);
        else console.log("🚀 [Docker Sync] Stopped Piston container successfully brought back online!");
      });
    } else {
      // 4. If container doesn't exist at all, dynamically pull and run a fresh image instance
      console.log("⚠️ [Docker Sync] No existing container found. Spin-up initialization starting...");
      const spinUpCommand = `docker run -d --name ${containerName} -p 2000:2000 engineor/piston:latest`; // Adjust image tag name if using a customized copy
      
      exec(spinUpCommand, (runErr) => {
        if (runErr) console.error(`❌ Failed to pull and boot Piston image: ${runErr.message}`);
        else console.log("🎉 [Docker Sync] Fresh Piston compiler engine pulled and exposed cleanly on port 2000!");
      });
    }

  } catch (globalDockerError) {
    console.error("⚠️ [Docker Sync] Internal automation exception:", globalDockerError.message);
  }
};