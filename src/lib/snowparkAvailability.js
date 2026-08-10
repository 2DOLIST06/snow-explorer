function isSnowparkEnabled(config) {
  return config?.snowpark?.enabled === true;
}

function disabledSnowparkRedirect(slug, config) {
  if (isSnowparkEnabled(config)) return null;

  return {
    redirect: {
      destination: `/stations/${encodeURIComponent(slug)}`,
      permanent: false,
    },
  };
}

module.exports = { disabledSnowparkRedirect, isSnowparkEnabled };
