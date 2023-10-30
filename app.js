/**
 * app.js
 */

const util = require('util');
const client = require('./lib/client');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function(plugin) {

  plugin.log('Options' + util.inspect(plugin.params.data), 1);
  const delay = plugin.params.data.delay;
  const options = {
    host: plugin.params.data.host,
    port: plugin.params.data.port,
    user: plugin.params.data.user,
    password: plugin.params.data.password,
    database: plugin.params.data.database
  }
  plugin.log('Channels=' + util.inspect(plugin.channels.data, null, 4), 1);
  const reqs = prepare(plugin.channels.data);
  plugin.log('Reqs=' + util.inspect(reqs, null, 4), 1);

  try {
    await client.createPoolToDatabase(options);
  } catch (error) {
    plugin.log('Error' + error, 1)
    process.exit(0);
  }
  let currentReqIdx = -1;
  sendNext();
  //setInterval(next, delay);

  async function sendNext() {
    let reqResult;
    let scriptResult;
    try {
      currentReqIdx = currentReqIdx < reqs.length - 1 ? currentReqIdx + 1 : 0;
      const item = reqs[currentReqIdx];


      // Выполнить запрос
      reqResult = await runReq(item.req);
      plugin.log('reqResult=' + util.inspect(reqResult),1);

      // Обработать результат с помощью функции scriptfile
      if (reqResult && item.fn) {
        scriptResult = item.fn(reqResult, plugin);
      }
      plugin.log('scriptResult=' + util.inspect(scriptResult),1);

      const data = [];
      if (scriptResult && Array.isArray(item.children)) {
        // Подставить из children
        item.children.forEach(child => {
          if (scriptResult[child.id] != undefined) {
            data.push({ id: child.id, value: scriptResult[child.id] });
          }
        });
      }

      // Отправить на сервер
      plugin.log('data=' + util.inspect(data),1);
      if (data.length) plugin.sendData(data);
    } catch (e) {
      plugin.log('ERROR: ' + util.inspect(e), 1);
    }

    await sleep(delay || 1000);
    setImmediate(() => {
      sendNext();
    });
  }

  async function runReq(sqlReq) {
    let ts = Date.now();
    const result = await client.query(sqlReq);
    return result
  }

  function prepare(data) {
    const folders = [];
    const children = {};
    plugin.log('prepare data=' + util.inspect(data, null, 4), 1);

    data.forEach(item => {
      if (!item.parentid) {
        folders.push(item);
      } else {
        if (!children[item.parentid]) {
          children[item.parentid] = [];
        }
        children[item.parentid].push(item);
      }
    });
    //
    return folders.map(item => ({ ...item, fn: prepareFn(item), children: children[item.id] || [] }));
  }

  function prepareFn(item) {
    if (!item.scriptfile) return '';

    try {
      let fn = require(item.scriptfile);
      return fn;
    } catch (e) {
      plugin.log(util.inspect(item) + ' Script error ' + util.inspect(e), 1);
      return '';
    }
  }

  process.on('SIGTERM', () => {
    process.exit(0);
  });
};
