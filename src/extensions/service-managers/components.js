import log from "../../server/log";

export const getServiceManagerComponent = (serviceName, componentName) => {
  try {
    // eslint-disable-next-line global-require
    const component = require(`./${serviceName}/react-component.js`);
    return component && component[componentName];
  } catch (caught) {
    log.error({
      category: 'extension',
      err: caught,
    }, `SERVICE_MANAGER failed to load react component for ${serviceName}`);
    return null;
  }
};
