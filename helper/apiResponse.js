const { STATUS_CODES } = require("./statusCodes");

module.exports = (res, data, error, message, status) => {
  error = error || false;
  data = data || null;
  let payload = {
    error,
    data,
    message,
    status,
  };
  let statusCode = STATUS_CODES[status];
  return res.status(statusCode).json(payload);
};
