const amqp = require('amqplib');

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ||
  'amqp://root:root@sio-rabbitmq:5672';

const EXCHANGE_NAME = 'sio.events';

let connection;
let channel;

async function getChannel() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(
    EXCHANGE_NAME,
    'topic',
    { durable: true }
  );

  console.log('Connected to RabbitMQ');

  return channel;
}

async function publishEvent(routingKey, data) {
  const channel = await getChannel();

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(data)),
    {
      persistent: true,
      contentType: 'application/json'
    }
  );
}

module.exports = {
  getChannel,
  publishEvent,
  EXCHANGE_NAME
};