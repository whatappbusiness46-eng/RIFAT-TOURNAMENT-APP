const base = require('./app.json');

module.exports = ({ config }) => {
  const expo = base.expo || config || {};
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL || expo.extra?.apiUrl || '').trim().replace(/\/$/, '');
  if (!apiUrl || !/^https:\/\//i.test(apiUrl)) {
    throw new Error('EXPO_PUBLIC_API_URL must be a public HTTPS API base URL');
  }
  return {
    ...expo,
    extra: { ...(expo.extra || {}), apiUrl },
  };
};
