const { execSync } = require('child_process');
require('dotenv').config();

const command = `mongodump ${process.env.REMOTE_MONGODB_URI} && mongorestore ${process.env.LOCAL_MONGODB_URI} --drop --dir=dump/helium-kudos`;

execSync(command, { stdio: 'inherit' });
