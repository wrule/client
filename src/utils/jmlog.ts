import fs from 'fs';
import moment from 'moment';

export default
function flog(...args: any[]) {
  const time = moment().format('HH:mm:ss');
  fs.appendFileSync('flog.log', `[${time}]\n`);
  args.forEach((argv, index) => {
    fs.appendFileSync('flog.log', `\t${index + 1}:\n`);
    try {
      fs.appendFileSync('flog.log', `\t${JSON.stringify(argv)}\n`);
    } catch (error) {
      fs.appendFileSync('flog.log', '\tsource: ' + argv);
    }
  });
}
