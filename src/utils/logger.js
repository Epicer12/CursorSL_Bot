const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function createLogger(level = "info") {
  const threshold = levels[level] ?? levels.info;

  function log(logLevel, message, meta = undefined) {
    if ((levels[logLevel] ?? levels.info) < threshold) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level: logLevel,
      msg: message,
      ...meta,
    };

    const serialized = JSON.stringify(payload);
    if (logLevel === "error") {
      console.error(serialized);
      return;
    }
    if (logLevel === "warn") {
      console.warn(serialized);
      return;
    }
    console.log(serialized);
  }

  return {
    debug: (message, meta) => log("debug", message, meta),
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta),
  };
}

module.exports = { createLogger };
