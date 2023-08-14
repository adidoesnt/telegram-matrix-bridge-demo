const sdk = require("matrix-js-sdk");
require("dotenv").config();

async function authenticate() {
  // URL for a hosted matrix server
  const baseUrl = process.env.BASE_URL;

  // martrix.org credentials
  const user = process.env.USERNAME;
  const password = process.env.PASSWORD;

  // create client with only server URL
  const client = sdk.createClient({
    baseUrl,
  });

  // use credentials to obtain access token
  const { access_token } = await client.loginWithPassword(user, password);

  // modify client by setting access token
  client.setAccessToken(access_token);
  return client;
}

async function main(client) {
  console.log(client);
}

authenticate().then(async (client) => {
  await main(client);
});
