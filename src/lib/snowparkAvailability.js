function isSnowparkEnabled(config) {
  return config?.snowpark?.enabled === true;
}

function getSnowparksCount(config) {
  const count = config?.snowparks?.count;
  return typeof count === "number" && Number.isFinite(count) ? count : 0;
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

module.exports = { disabledSnowparkRedirect, getSnowparksCount, isSnowparkEnabled };
