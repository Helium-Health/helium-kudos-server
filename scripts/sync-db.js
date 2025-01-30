const { execSync } = require('child_process');
require('dotenv').config();

try {
    const command = `mongodump ${process.env.REMOTE_MONGODB_URI} && mongorestore ${process.env.LOCAL_MONGODB_URI} --drop --dir=dump/helium-kudos`;

  
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

