const { execSync } = require('child_process');
require('dotenv').config();
const dumpDir = process.env.NODE_ENV === 'production' ? 'dump/helium_kudos' : 'dump/helium-kudos';

console.log('Starting database sync to ', dumpDir);

try {
    const command = `mongodump ${process.env.REMOTE_MONGODB_URI} && mongorestore ${process.env.LOCAL_MONGODB_URI} --drop --dir=${dumpDir}`;

  
  execSync(command, { 
    stdio: 'inherit',
    // This ensures command errors are thrown
    shell: true 
  });
  
  console.log('Database sync completed successfully!');
} catch (error) {
  console.error('Database sync failed:', error.message);
  process.exit(1);
}

