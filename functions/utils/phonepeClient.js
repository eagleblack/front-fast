const { StandardCheckoutClient, Env } = require("pg-sdk-node");

let clientInstance = null;

function initPhonePeClient({ clientId, clientSecret, clientVersion, env }) {
  if (!clientInstance) {
    clientInstance = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      parseInt(clientVersion),
      env === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
    );
  }
  return clientInstance;
}

module.exports = { initPhonePeClient };
