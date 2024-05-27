import path from 'path';

let xconfig: any = { };

try {
  const configPath = path.resolve('xconfig.json');
  console.log(`Read xconfig.json from ${configPath}`);
  xconfig = require(configPath);
} catch (error) {
  console.log(`Failed to read xconfig.json`);
}

export default xconfig;
