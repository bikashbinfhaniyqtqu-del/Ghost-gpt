const statuses = {
  database: 'unknown',
  ai: 'unknown',
  memory: 'unknown',
  webSearch: 'unknown',
  newsSearch: 'unknown',
  telegram: 'unknown',
};

function setStatus(service, status) {
  if (service in statuses) {
    statuses[service] = status;
    console.log(`Service status ${service}: ${status}`);
  }
}

function getStatuses() {
  return { ...statuses };
}

module.exports = { setStatus, getStatuses };
