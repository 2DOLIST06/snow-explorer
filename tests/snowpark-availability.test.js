const test = require("node:test");
const assert = require("node:assert/strict");

const {
  disabledSnowparkRedirect,
  isSnowparkEnabled,
} = require("../src/lib/snowparkAvailability");

test("snowpark links are exposed only when the widget is explicitly enabled", () => {
  assert.equal(isSnowparkEnabled({ snowpark: { enabled: true } }), true);
  assert.equal(isSnowparkEnabled({ snowpark: { enabled: false } }), false);
  assert.equal(isSnowparkEnabled({ snowpark: {} }), false);
  assert.equal(isSnowparkEnabled(null), false);
});

test("a disabled or missing snowpark redirects to its station page", () => {
  const expected = {
    redirect: {
      destination: "/stations/isola-2000",
      permanent: false,
    },
  };

  assert.deepEqual(disabledSnowparkRedirect("isola-2000", { snowpark: { enabled: false } }), expected);
  assert.deepEqual(disabledSnowparkRedirect("isola-2000", null), expected);
  assert.equal(disabledSnowparkRedirect("isola-2000", { snowpark: { enabled: true } }), null);
});

test("redirect destinations encode unexpected slug characters", () => {
  assert.equal(
    disabledSnowparkRedirect("station test", null).redirect.destination,
    "/stations/station%20test"
  );
});
