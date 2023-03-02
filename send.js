const amqp = require('amqplib');

(async () => {
  const conn = await amqp.connect('amqp://10.0.0.8');
  const channel = await conn.createChannel();
  const queue = 'hello2';
  const msg = 'Hello World!';

  await channel.assertExchange('exchange', 'direct', {
    durable: false,
  });

  // const q = await channel.assertQueue(null, {
  //   exclusive: true,
  // });

  await channel.bindQueue('RABBITMQ', 'test', 'tkey');
  // console.log(q);
  // const a = await channel.get(q.queue);
  // console.log(a);

  channel.consume('RABBITMQ', (m) => {
    console.log(" [x] %s: '%s'", m.fields.routingKey, m.content.toString());
  }, {
    noAck: true,
  });
  // await channel.bindExchange('exchange', 'exchange', 'key2');
  // channel.publish('exchange', 'key2', Buffer.from(msg));

  // const a = await channel.get('hello');
  // console.log(a);

  // console.log(1234);
  // await channel.close();
  // await conn.close();
  // const c = await channel.get('', { noAck: true });
  // console.log(c);
  // channel.get('hello', (aaa) => {
  //   console.log(aaa);
  // });
})();
