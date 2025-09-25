// netlify/functions/cer-list.js  (PING TEMPORANEO)
module.exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ping: 'cer-list vPING-1' })
  };
};
