import fs from 'fs';
import moment from 'moment';

export default
function flog(...args: any[]) {
  return;
  const time = moment().format('HH:mm:ss');
  fs.appendFileSync('flog.log', `[${time}]\n`);
  args.forEach((argv, index) => {
    index = index + 1;
    try {
      fs.appendFileSync('flog.log', `\t${index}: ${JSON.stringify(argv)}\n`);
    } catch (error) {
      fs.appendFileSync('flog.log', `\t${index}-source: ${argv}\n`);
    }
  });
  fs.appendFileSync('flog.log', '\n\n');
}
