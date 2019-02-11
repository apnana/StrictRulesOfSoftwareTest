const functions = require('firebase-functions');
const rp = require('request-promise');
const algolia = require('algoliasearch');

const ALGOLIA_APP_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.admin_key;
const ALGOLIA_INDEX = functions.config().algolia.index_name;
const client = algolia(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX);
const webHookURL = functions.config().slack.webhook_url;

const randRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// 検索対象の設定
index.setSettings({
  searchableAttributes: [
    'rule-number'
  ]
});

exports.rule = functions.https.onRequest((request, response) => {
  // 通知するルール番号作成
  const keyword = "鉄則" + ('00' + randRange(1, 293)).slice(-3);

  // Algoliaを検索
  index.search({
    query: keyword
  })
  .then(result => {
    if (result.hits.length !== 1) {
      response.status(500).send('Invalid data length: ' + result.hits.length);
      return false;
    }

    // Slackに通知
    item = result.hits[0];
    const err = notify(item.chapter, keyword, item.rule);
    if (err) {
      response.status(500).send('Notify error');
      return false;
    }
    response.status(200).send('Notify success');
    return true;
  })
  .catch(e => {
    response.status(500).send('Exception occured: ' + e);
    return false;
  });
});

// Slackに通知
function notify(title, rule, data) {
  rp.post({
    uri: webHookURL,
    body: {
      text: "【" + title + "】 \n" + rule + ": " + data
    },
    json: true
  })
  .then(() => {
    return false;
  })
  .catch((err) => {
    console.error(err)
    return true;
  })
}
