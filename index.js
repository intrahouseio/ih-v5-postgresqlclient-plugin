/**
 * postgresql
 */
const util = require('util');

const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
  plugin.log('PostgreSQL request plugin', 0);

  try {
    // Получить каналы
    plugin.channels.data = await plugin.channels.get();
    plugin.log('Received channels...');

    // Получить параметры
    plugin.params.data = await plugin.params.get();
    plugin.log('Received params...');

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error: ${util.inspect(err)}`);
  }
})();
